// Generacion de outfits con la IA (OpenRouter -> Llama gratis por defecto).
//
// Esta funcion vive en el SERVIDOR (la importan Server Actions o Route
// Handlers). Hace todo el trabajo pesado:
//   1. Lee el armario y las preferencias del usuario via Supabase (con RLS).
//   2. Construye un prompt en espanol listando las prendas con sus IDs.
//   3. Llama al modelo via OpenRouter pidiendo `response_format: json_object`.
//   4. Parsea la respuesta toleramente (a veces el modelo agrega texto extra).
//   5. Valida que los IDs existan en el armario del usuario (anti-alucinacion).
//   6. Devuelve los outfits hidratados con la info completa de cada prenda
//      (incluyendo signed URLs para mostrar las fotos).
//
// El consumidor de esta funcion solo tiene que renderizar el resultado.

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { getAiClient, getAiModelName } from "@/lib/ai/aiClient";
import type { ClothingItem, UserPreferences } from "@/types/database";

// ---------------------------------------------------------------------------
// Tipos publicos.
// ---------------------------------------------------------------------------

export type GenerateMode = "occasion" | "description" | "surprise";

export type GenerateOutfitsInput = {
  userId: string;
  mode: GenerateMode;
  /** Solo se usa cuando mode === "occasion". */
  occasion?: string;
  /** Solo se usa cuando mode === "description". Limite blando: 200 chars. */
  description?: string;
};

/** Codigos de error que la UI puede traducir a mensajes amigables. */
export type GenerateOutfitsErrorCode =
  | "NO_API_KEY"
  | "NO_CREDITS"
  | "EMPTY_WARDROBE"
  | "NOT_ENOUGH_ITEMS"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "NO_VALID_OUTFITS"
  | "UNKNOWN";

export class GenerateOutfitsError extends Error {
  code: GenerateOutfitsErrorCode;
  constructor(code: GenerateOutfitsErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "GenerateOutfitsError";
  }
}

/** Outfit ya hidratado con la info completa de cada prenda. */
export type GeneratedOutfit = {
  /** Nombre que la IA le puso al outfit. */
  name: string;
  /** Texto corto explicando por que combina. */
  explanation: string;
  /** Prendas en el orden en que la IA las propuso. */
  items: ClothingItem[];
};

// ---------------------------------------------------------------------------
// Funcion principal.
// ---------------------------------------------------------------------------

export async function generateOutfits(
  input: GenerateOutfitsInput
): Promise<GeneratedOutfit[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Leer el armario del usuario. RLS ya filtra por user_id, pero le ponemos
  //    el filtro explicito para ser claros y soportar service-role en tests.
  const { data: itemsData, error: itemsError } = await supabase
    .from("clothing_items")
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, created_at, updated_at"
    )
    .eq("user_id", input.userId);

  if (itemsError) {
    console.error("[generateOutfits] error leyendo clothing_items", itemsError);
    throw new GenerateOutfitsError(
      "UNKNOWN",
      "No pudimos leer tu armario. Intenta de nuevo en unos segundos."
    );
  }

  const items = (itemsData ?? []) as ClothingItem[];
  if (items.length === 0) {
    throw new GenerateOutfitsError(
      "EMPTY_WARDROBE",
      "Tu armario está vacío. Subí al menos 2 prendas para generar outfits."
    );
  }
  if (items.length < 2) {
    throw new GenerateOutfitsError(
      "NOT_ENOUGH_ITEMS",
      "Necesitas al menos 2 prendas en tu armario para generar outfits."
    );
  }

  // 2. Leer preferencias (es opcional: si no existen, usamos defaults).
  const { data: prefsData } = await supabase
    .from("user_preferences")
    .select("style_tags, favorite_occasions")
    .eq("user_id", input.userId)
    .maybeSingle();

  const prefs = (prefsData ?? null) as Pick<
    UserPreferences,
    "style_tags" | "favorite_occasions"
  > | null;

  // 3. Construir prompt y llamar al modelo via OpenRouter.
  const prompt = buildPrompt({
    items,
    prefs,
    mode: input.mode,
    occasion: input.occasion,
    description: input.description,
  });

  const rawJson = await callAiModel(prompt);

  // 4. Parsear de forma tolerante.
  const parsed = parseOutfitsJson(rawJson);

  // 5. Validar IDs contra el armario real (anti-alucinacion).
  const validIds = new Set(items.map((i) => i.id));
  const itemsById = new Map(items.map((i) => [i.id, i] as const));

  const validOutfits = parsed
    .map((o) => {
      const cleanIds = o.clothing_item_ids.filter((id) => validIds.has(id));
      // Sin al menos 2 prendas validas, el outfit no tiene sentido.
      if (cleanIds.length < 2) return null;
      return { ...o, clothing_item_ids: cleanIds };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  if (validOutfits.length === 0) {
    throw new GenerateOutfitsError(
      "NO_VALID_OUTFITS",
      "La IA propuso prendas que no existen en tu armario. Intenta de nuevo."
    );
  }

  // 6. Hidratar las prendas con signed URLs para las fotos.
  const usedPaths = new Set<string>();
  for (const o of validOutfits) {
    for (const id of o.clothing_item_ids) {
      const it = itemsById.get(id);
      if (it?.image_path) usedPaths.add(it.image_path);
    }
  }
  const signedUrls = await createSignedUrlMap(supabase, [...usedPaths]);

  return validOutfits.map((o) => ({
    name: o.name,
    explanation: o.explanation,
    items: o.clothing_item_ids
      .map((id) => itemsById.get(id))
      .filter((it): it is ClothingItem => Boolean(it))
      .map((it) => ({
        ...it,
        image_url: it.image_path
          ? signedUrls.get(it.image_path) ?? null
          : null,
      })),
  }));
}

// ---------------------------------------------------------------------------
// Prompt builder.
// ---------------------------------------------------------------------------

function buildPrompt(args: {
  items: ClothingItem[];
  prefs: Pick<UserPreferences, "style_tags" | "favorite_occasions"> | null;
  mode: GenerateMode;
  occasion?: string;
  description?: string;
}): string {
  const { items, prefs, mode, occasion, description } = args;

  // Listamos las prendas en formato compacto: ID + categoria/subcategoria +
  // color + ocasiones. Suficiente para que la IA combine sin pasarnos del
  // limite de tokens.
  const inventario = items
    .map((it) => {
      const subcat = it.subcategory ?? it.category;
      const nombre = it.name?.trim();
      const color = it.primary_color ?? "color desconocido";
      const ocasiones =
        it.occasions && it.occasions.length > 0
          ? it.occasions.join(", ")
          : "varias";
      return `- id="${it.id}" | categoria=${it.category} | tipo=${subcat}${nombre ? ` "${nombre}"` : ""} | color=${color} | ocasiones=[${ocasiones}]`;
    })
    .join("\n");

  const stylePrefs =
    prefs?.style_tags && prefs.style_tags.length > 0
      ? prefs.style_tags.join(", ")
      : "sin preferencia declarada";
  const occasionPrefs =
    prefs?.favorite_occasions && prefs.favorite_occasions.length > 0
      ? prefs.favorite_occasions.join(", ")
      : "sin preferencia declarada";

  let instruccionDeOcasion = "";
  if (mode === "occasion" && occasion) {
    instruccionDeOcasion = `El usuario quiere outfits para la ocasión: "${occasion}". Priorizá prendas cuya lista de ocasiones incluya algo similar.`;
  } else if (mode === "description" && description) {
    // Cortamos a 200 chars en backend también por seguridad.
    const trimmed = description.slice(0, 200);
    instruccionDeOcasion = `El usuario describe lo que necesita asi: "${trimmed}". Interpreta el tono y elige prendas coherentes.`;
  } else {
    instruccionDeOcasion = `Modo "sorprendeme": elegí libremente. Combiná prendas de forma creativa pero usable, mezclando colores que armonicen.`;
  }

  return [
    `Eres un estilista personal. Tu tarea es proponer EXACTAMENTE 2 outfits distintos combinando SOLO prendas del armario del usuario que se lista más abajo.`,
    ``,
    `Reglas de composición (importantes):`,
    `- Cada outfit debe tener: 1 prenda superior (top) + 1 prenda inferior (bottom), O bien 1 vestido (dress).`,
    `- Cada outfit debe tener 1 calzado (footwear).`,
    `- Opcionalmente podés añadir 1 outerwear y 1-2 accesorios si combinan.`,
    `- No repitas IDs dentro del mismo outfit.`,
    `- Los 2 outfits deben ser claramente distintos entre sí (diferente vibe o paleta).`,
    `- Solo podés usar IDs que aparecen en el armario. NO inventes IDs nuevos.`,
    ``,
    `Preferencias del usuario (recomendación, no obligación):`,
    `- Estilos favoritos: ${stylePrefs}`,
    `- Ocasiones favoritas: ${occasionPrefs}`,
    ``,
    instruccionDeOcasion,
    ``,
    `Armario disponible:`,
    inventario,
    ``,
    `Respondé EXCLUSIVAMENTE con un JSON válido (sin markdown, sin texto extra) con esta estructura exacta:`,
    `{`,
    `  "outfits": [`,
    `    {`,
    `      "name": "Nombre corto del outfit, ej: Casual relajado",`,
    `      "clothing_item_ids": ["uuid1", "uuid2", "uuid3"],`,
    `      "explanation": "1-2 frases explicando por que esta combinacion funciona."`,
    `    },`,
    `    {`,
    `      "name": "...",`,
    `      "clothing_item_ids": ["..."],`,
    `      "explanation": "..."`,
    `    }`,
    `  ]`,
    `}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Llamada al modelo (con manejo defensivo).
// ---------------------------------------------------------------------------

async function callAiModel(prompt: string): Promise<string> {
  let client;
  try {
    client = getAiClient();
  } catch (err) {
    // El unico error que lanza getAiClient es por API key faltante.
    throw new GenerateOutfitsError(
      "NO_API_KEY",
      err instanceof Error ? err.message : "Falta la API key de OpenRouter."
    );
  }

  try {
    const completion = await client.chat.completions.create({
      model: getAiModelName(),
      // Mensajes: separamos el "rol" del estilista (system) de la peticion
      // concreta del usuario para que el modelo respete mejor las reglas.
      messages: [
        {
          role: "system",
          content:
            "Eres un estilista personal experto. Respondé SIEMPRE en español correcto. ES OBLIGATORIO usar correctamente ñ, tildes (á é í ó ú) y signos de apertura (¿ ¡). NUNCA reemplaces ñ por n, ni omitas tildes. Respondés EXCLUSIVAMENTE con JSON válido según el esquema que el usuario te indique, sin markdown ni texto extra.",
        },
        { role: "user", content: prompt },
      ],
      // En OpenRouter (formato OpenAI) el modo JSON estricto se pide asi.
      // Aun asi parseamos defensivamente porque algunos modelos open-source
      // ignoran este flag y devuelven el JSON envuelto en markdown.
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";
    if (!text || text.trim().length === 0) {
      throw new GenerateOutfitsError(
        "INVALID_RESPONSE",
        "La IA devolvio una respuesta vacia."
      );
    }
    return text;
  } catch (err) {
    if (err instanceof GenerateOutfitsError) throw err;
    console.error("[generateOutfits] error llamando al modelo", err);

    // El SDK de OpenAI expone `status` en sus errores HTTP. Lo usamos cuando
    // existe; si no, caemos al texto del mensaje como ultimo recurso.
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status
        : undefined;
    const message = err instanceof Error ? err.message : String(err);

    if (status === 401 || /\b401\b|invalid api key|unauthorized/i.test(message)) {
      throw new GenerateOutfitsError(
        "NO_API_KEY",
        "La API key de OpenRouter no es valida. Revisa tu configuracion en `.env.local`."
      );
    }
    if (status === 402 || /\b402\b|insufficient.?credit|payment required/i.test(message)) {
      throw new GenerateOutfitsError(
        "NO_CREDITS",
        "No tienes creditos en OpenRouter. Verifica tu cuenta o usa un modelo con sufijo `:free`."
      );
    }
    if (status === 429 || /\b429\b|rate.?limit|too many requests/i.test(message)) {
      throw new GenerateOutfitsError(
        "RATE_LIMITED",
        "Has excedido el limite de la IA. Intentalo en unos segundos."
      );
    }
    throw new GenerateOutfitsError(
      "NETWORK_ERROR",
      "No pudimos contactar a la IA. Revisa tu conexion e intenta de nuevo."
    );
  }
}

// ---------------------------------------------------------------------------
// Parser tolerante de la respuesta de la IA.
// ---------------------------------------------------------------------------

type ParsedOutfit = {
  name: string;
  clothing_item_ids: string[];
  explanation: string;
};

function parseOutfitsJson(raw: string): ParsedOutfit[] {
  // Estrategias en orden:
  // 1. JSON.parse directo.
  // 2. Quitar fences ```json ... ```.
  // 3. Recortar al primer "{" y al ultimo "}".
  const candidatos: string[] = [raw];

  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) candidatos.push(fenceMatch[1]);

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidatos.push(raw.slice(firstBrace, lastBrace + 1));
  }

  for (const cand of candidatos) {
    try {
      const obj = JSON.parse(cand.trim());
      const outfits = (obj?.outfits ?? obj) as unknown;
      if (!Array.isArray(outfits)) continue;
      const valid: ParsedOutfit[] = [];
      for (const o of outfits) {
        if (!o || typeof o !== "object") continue;
        const oo = o as Record<string, unknown>;
        const name = typeof oo.name === "string" ? oo.name : "Outfit";
        const ids = Array.isArray(oo.clothing_item_ids)
          ? oo.clothing_item_ids.filter(
              (id): id is string => typeof id === "string"
            )
          : [];
        const explanation =
          typeof oo.explanation === "string" ? oo.explanation : "";
        if (ids.length === 0) continue;
        valid.push({ name, clothing_item_ids: ids, explanation });
      }
      if (valid.length > 0) return valid;
    } catch {
      // probar el siguiente candidato
    }
  }

  console.error("[generateOutfits] no se pudo parsear JSON. Raw:", raw);
  throw new GenerateOutfitsError(
    "INVALID_RESPONSE",
    "La IA devolvio una respuesta que no pudimos interpretar como JSON."
  );
}

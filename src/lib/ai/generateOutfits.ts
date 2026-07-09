// Generacion de outfits con la IA (Anthropic API -> Claude Haiku por defecto).
//
// Esta funcion vive en el SERVIDOR (la importan Server Actions o Route
// Handlers). Hace todo el trabajo pesado:
//   1. Lee el armario y las preferencias del usuario via Supabase (con RLS).
//   2. Construye un prompt en espanol listando las prendas con sus IDs.
//   3. Llama al modelo via Anthropic API.
//   4. Parsea la respuesta toleramente (a veces el modelo agrega texto extra).
//   5. Valida que los IDs existan en el armario del usuario (anti-alucinacion).
//   6. Devuelve los outfits hidratados con la info completa de cada prenda
//      (incluyendo signed URLs para mostrar las fotos).
//
// El consumidor de esta funcion solo tiene que renderizar el resultado.

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { callAnthropicApi } from "@/lib/ai/aiClient";
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
  /** ID de la prenda que DEBE aparecer en todos los outfits generados. */
  lockedItemId?: string;
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
  /** Justificación (2-3 frases) de por qué este outfit responde a lo que pidió el usuario. */
  explanation: string;
  /**
   * Qué tan bien cumple la solicitud del usuario, 0-100. Es `null` en modo
   * "sorpréndeme" (no hay solicitud explícita que medir).
   */
  matchPercentage: number | null;
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
      "Tu armario está vacío. Sube al menos 2 prendas para generar outfits."
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

  // 3. Construir prompt y llamar al modelo via Anthropic.
  const prompt = buildPrompt({
    items,
    prefs,
    mode: input.mode,
    occasion: input.occasion,
    description: input.description,
    lockedItemId: input.lockedItemId,
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
      // Sin al menos 3 prendas validas el outfit queda incompleto (base minima: top+bottom+footwear o dress+footwear no alcanza 3 si se pierde una).
      if (cleanIds.length < 3) return null;
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

  // En modo sorpresa no hay solicitud que medir: forzamos el % a null aunque
  // el modelo lo haya devuelto.
  const isSurprise = input.mode === "surprise";

  return validOutfits.map((o) => ({
    name: o.name,
    explanation: o.explanation,
    matchPercentage: isSurprise ? null : o.match_percentage,
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
  lockedItemId?: string;
}): string {
  const { items, prefs, mode, occasion, description, lockedItemId } = args;

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
  let solicitudTexto = "";
  if (mode === "occasion" && occasion) {
    solicitudTexto = `la ocasión "${occasion}"`;
    instruccionDeOcasion = `El usuario quiere outfits para la ocasión: "${occasion}". Prioriza prendas cuya lista de ocasiones incluya algo similar.`;
  } else if (mode === "description" && description) {
    // Cortamos a 200 chars en backend también por seguridad.
    const trimmed = description.slice(0, 200);
    solicitudTexto = `lo que pidió: "${trimmed}"`;
    instruccionDeOcasion = `El usuario describe lo que necesita asi: "${trimmed}". Interpreta el tono y elige prendas coherentes.`;
  } else {
    instruccionDeOcasion = `Modo "sorprendeme": elige libremente. Combina prendas de forma creativa pero usable, mezclando colores que armonicen.`;
  }

  const esSorpresa = mode === "surprise";

  // Instrucciones para la justificación y el % de match, distintas según haya
  // o no una solicitud explícita que medir.
  const reglaJustificacion = esSorpresa
    ? `- "explanation": 2-3 frases explicando por qué esta combinación funciona (paleta, ocasión, vibe), mencionando prendas concretas del outfit.`
    : `- "explanation": 2-3 frases explicando por qué ESTE outfit responde a ${solicitudTexto}, mencionando prendas concretas del outfit.`;
  const reglaPorcentaje = esSorpresa
    ? `- "match_percentage": usa null (en modo sorpresa no hay solicitud que medir).`
    : `- "match_percentage": entero 0-100 que refleje HONESTAMENTE qué tan bien el outfit cumple ${solicitudTexto}. No lo infles: si tu armario no tiene la prenda ideal para el pedido, baja el número en consecuencia.`;

  const reglaLockedItem = lockedItemId
    ? `REGLA OBLIGATORIA: CADA outfit generado DEBE incluir la prenda con id="${lockedItemId}". Esta regla no es negociable ni opcional; es un requisito estricto.`
    : "";

  return [
    `Eres un estilista personal. Tu tarea es proponer EXACTAMENTE 2 outfits distintos combinando SOLO prendas del armario del usuario que se lista más abajo.`,
    ...(reglaLockedItem ? [reglaLockedItem, ``] : []),
    ``,
    `Reglas de composición (importantes):`,
    `- Cada outfit debe incluir entre 3 y 6 prendas en total.`,
    `- Base mínima obligatoria (siempre que existan en el armario): 1 prenda superior (top) + 1 prenda inferior (bottom), O bien 1 vestido/jumpsuit (dress); más 1 calzado (footwear).`,
    `- Si el armario lo permite, enriquece el outfit con prendas opcionales: outerwear (chaqueta, abrigo, blazer), accesorios (bolso, cinturón, gafas, bufanda, joyería), gorra o sombrero (hat/cap).`,
    `- Adapta la cantidad al armario real: si hay accesorios, gorras u outerwear disponibles y tienen sentido estético, úsalos. No fuerces prendas que no combinen.`,
    `- No repitas IDs dentro del mismo outfit.`,
    `- Los 2 outfits deben ser claramente distintos entre sí (diferente vibe o paleta).`,
    `- Solo puedes usar IDs que aparecen en el armario. NO inventes IDs nuevos.`,
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
    `Contenido de cada outfit:`,
    reglaJustificacion,
    reglaPorcentaje,
    ``,
    `Responde EXCLUSIVAMENTE con un JSON válido (sin markdown, sin texto extra) con esta estructura exacta:`,
    `{`,
    `  "outfits": [`,
    `    {`,
    `      "name": "Nombre corto del outfit, ej: Casual relajado",`,
    `      "clothing_item_ids": ["uuid1", "uuid2", "uuid3", "uuid4"],`,
    `      "explanation": "2-3 frases justificando el outfit.",`,
    `      "match_percentage": ${esSorpresa ? "null" : "87"}`,
    `    },`,
    `    {`,
    `      "name": "...",`,
    `      "clothing_item_ids": ["..."],`,
    `      "explanation": "...",`,
    `      "match_percentage": ${esSorpresa ? "null" : "72"}`,
    `    }`,
    `  ]`,
    `}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Llamada al modelo (con manejo defensivo y reintentos).
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "Eres el asistente de moda de StrandIA, una app colombiana de armario digital con IA. Tu trabajo es generar outfits creativos y coherentes usando las prendas reales del usuario. Responde SIEMPRE en español colombiano neutro (tuteo, NO voseo argentino). Ejemplos correctos: 'usa', 'agrega', 'combina', 'tienes', 'puedes'. Ejemplos INCORRECTOS: 'usá', 'agregá', 'combiná', 'tenés', 'podés'. Usa tildes y ñ correctamente siempre. Sé específico sobre por qué cada combinación funciona. Responde SOLO en el formato JSON que se te pide, sin texto adicional ni backticks.";

const MAX_RETRIES = 2;

async function callAiModel(prompt: string): Promise<string> {
  let lastError: GenerateOutfitsError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const text = await callAnthropicApi({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: prompt,
        maxTokens: 1536,
        temperature: 0.85,
      });

      if (!text || text.trim().length === 0) {
        lastError = new GenerateOutfitsError(
          "INVALID_RESPONSE",
          "La IA devolvio una respuesta vacia."
        );
        continue;
      }
      return text;
    } catch (err) {
      if (err instanceof GenerateOutfitsError) throw err;
      console.error(`[generateOutfits] error llamando al modelo (intento ${attempt + 1})`, err);

      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const message = err instanceof Error ? err.message : String(err);

      if (status === 401 || /\b401\b|invalid api key|unauthorized/i.test(message)) {
        throw new GenerateOutfitsError(
          "NO_API_KEY",
          "La API key de Anthropic no es valida. Revisa ANTHROPIC_API_KEY en `.env.local`."
        );
      }
      if (status === 402 || /\b402\b|insufficient.?credit|payment required/i.test(message)) {
        throw new GenerateOutfitsError(
          "NO_CREDITS",
          "No hay creditos en la cuenta de Anthropic. Verifica tu cuenta."
        );
      }
      if (status === 429 || /\b429\b|rate.?limit|too many requests/i.test(message)) {
        throw new GenerateOutfitsError(
          "RATE_LIMITED",
          "Has excedido el limite de la IA. Intentalo en unos segundos."
        );
      }
      if (!message.includes("ANTHROPIC_API_KEY") && attempt < MAX_RETRIES) {
        lastError = new GenerateOutfitsError(
          "NETWORK_ERROR",
          "No pudimos contactar a la IA. Revisa tu conexion e intenta de nuevo."
        );
        continue;
      }
      if (message.includes("ANTHROPIC_API_KEY")) {
        throw new GenerateOutfitsError("NO_API_KEY", message);
      }
      throw new GenerateOutfitsError(
        "NETWORK_ERROR",
        "No pudimos contactar a la IA. Revisa tu conexion e intenta de nuevo."
      );
    }
  }

  throw lastError ?? new GenerateOutfitsError("INVALID_RESPONSE", "La IA no devolvio una respuesta valida tras varios intentos.");
}

// ---------------------------------------------------------------------------
// Parser tolerante de la respuesta de la IA.
// ---------------------------------------------------------------------------

type ParsedOutfit = {
  name: string;
  clothing_item_ids: string[];
  explanation: string;
  /** 0-100 ya saneado, o null si la IA no lo dio o no aplica. */
  match_percentage: number | null;
};

/** Sanea el match_percentage: acepta número 0-100, redondea y clampa; si no, null. */
function parseMatchPercentage(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

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
        const match_percentage = parseMatchPercentage(oo.match_percentage);
        if (ids.length === 0) continue;
        valid.push({ name, clothing_item_ids: ids, explanation, match_percentage });
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

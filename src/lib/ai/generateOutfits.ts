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
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import { getCurrentWeather, type CurrentWeather } from "@/lib/weather/openMeteo";
import type { ClothingItem, Gender, UserPreferences } from "@/types/database";

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
  /** Cuántos outfits pedir (2 por defecto; 1 para sugerencias por evento). */
  count?: 1 | 2;
  /**
   * Si es `false`, no se considera el clima actual en el prompt. El clima de
   * Open-Meteo es el de AHORA, no un pronóstico — para outfits de eventos con
   * fecha futura no aplica. Default `true`.
   */
  includeWeather?: boolean;
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
  //    status='confirmed' es critico aca: nunca generar looks con prendas
  //    del modo rafaga que todavia estan en draft/processing/error.
  const { data: itemsData, error: itemsError } = await supabase
    .from("clothing_items")
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, source, created_at, updated_at"
    )
    .eq("user_id", input.userId)
    .eq("status", CONFIRMED_STATUS);

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

  // 2. Leer preferencias (es opcional: si no existen, usamos defaults) y el
  //    clima actual en paralelo. getCurrentWeather() nunca lanza y esta
  //    cacheado 30 min por Next, asi que sumarlo aca no agrega latencia ni
  //    llamadas de red extra.
  const [{ data: prefsData }, { data: profileData }, weather] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("style_tags, favorite_occasions")
      .eq("user_id", input.userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("gender")
      .eq("id", input.userId)
      .maybeSingle(),
    input.includeWeather === false ? Promise.resolve(null) : getCurrentWeather(),
  ]);

  const prefs = (prefsData ?? null) as Pick<
    UserPreferences,
    "style_tags" | "favorite_occasions"
  > | null;
  const gender = profileData?.gender ?? null;

  // 3. Construir prompt y llamar al modelo via Anthropic.
  const prompt = buildPrompt({
    items,
    prefs,
    gender,
    mode: input.mode,
    occasion: input.occasion,
    description: input.description,
    lockedItemId: input.lockedItemId,
    count: input.count ?? 2,
    weather,
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
  gender: Gender | null;
  mode: GenerateMode;
  occasion?: string;
  description?: string;
  lockedItemId?: string;
  count: 1 | 2;
  weather: CurrentWeather | null;
}): string {
  const { items, prefs, gender, mode, occasion, description, lockedItemId, count, weather } = args;

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
  const genderPrefs =
    gender && gender !== "prefiero_no_decir" ? gender : "no declarado";

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
    instruccionDeOcasion = `Modo "sorprendeme": elige libremente. Combina prendas de forma creativa pero usable, mezclando colores que armonicen. En este modo NO apliques la calibración por nivel de formalidad (principio 4 del estilismo): no hay ocasión pedida. Las reglas de color, silueta y patrones (principios 1-3) sí aplican.`;
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

  // Contexto climático: solo si tenemos dato (Open-Meteo puede fallar, y en
  // ese caso weather es null — la generación sigue igual, sin este bloque).
  const bloqueClima = weather
    ? [
        `Clima actual en Bogotá: ${weather.tempC}°C, ${weather.descripcion.toLowerCase()}${
          weather.windKmh >= 20 ? `, viento de ${weather.windKmh} km/h` : ""
        }.`,
        `Ten en cuenta el clima al elegir las prendas: con frío prioriza capas o abrigo, con lluvia evita prendas muy abiertas o que no protejan, con calor prioriza telas frescas. El clima COMPLEMENTA la ocasión pedida, nunca la reemplaza: si piden algo formal y llueve, arma un look formal apto para lluvia, sin cambiar el nivel de formalidad. Si el clima influyó en una prenda concreta que elegiste, menciónalo brevemente y de forma natural en la "explanation" (ej: "una chaqueta liviana por la llovizna de hoy"). No lo menciones si no influyó en nada.`,
        ``,
      ]
    : [];

  const reglaLockedItem = lockedItemId
    ? `REGLA OBLIGATORIA: CADA outfit generado DEBE incluir la prenda con id="${lockedItemId}". Esta regla no es negociable ni opcional; es un requisito estricto.`
    : "";

  // Checklist de auto-verificación antes de emitir cada outfit. Solo cuando
  // hay una solicitud explícita que verificar (ocasión o descripción); en
  // "sorpréndeme" no hay nivel de formalidad contra el cual chequear.
  const bloqueVerificacion = esSorpresa
    ? []
    : [
        `Antes de finalizar cada outfit, verifica mentalmente:`,
        `✓ ¿Máximo 3 colores (sin contar neutros), con un dominante claro?`,
        `✓ ¿La silueta está balanceada — no todo holgado ni todo ajustado sin ancla?`,
        `✓ ¿Si hay 2+ patrones, tienen escalas distintas y comparten color?`,
        `✓ ¿El nivel de formalidad de cada prenda coincide con la categoría de ${solicitudTexto}?`,
        `Si alguna falla, cambia la prenda por otra del armario que sí cumpla. Si el armario no tiene alternativa, sigue la instrucción de la sección 5 del system prompt.`,
        ``,
      ];

  return [
    count === 1
      ? `Eres un estilista personal. Tu tarea es proponer EXACTAMENTE 1 outfit combinando SOLO prendas del armario del usuario que se lista más abajo.`
      : `Eres un estilista personal. Tu tarea es proponer EXACTAMENTE 2 outfits distintos combinando SOLO prendas del armario del usuario que se lista más abajo.`,
    ...(reglaLockedItem ? [reglaLockedItem, ``] : []),
    ``,
    `Reglas de composición (importantes):`,
    `- Cada outfit debe incluir entre 3 y 6 prendas en total.`,
    `- Base mínima obligatoria (siempre que existan en el armario): 1 prenda superior (top) + 1 prenda inferior (bottom), O bien 1 vestido/jumpsuit (dress); más 1 calzado (footwear).`,
    `- Si el armario lo permite, enriquece el outfit con prendas opcionales: outerwear (chaqueta, abrigo, blazer), accesorios (bolso, cinturón, gafas, bufanda, joyería), gorra o sombrero (hat/cap).`,
    `- Adapta la cantidad al armario real: si hay accesorios, gorras u outerwear disponibles y tienen sentido estético, úsalos. No fuerces prendas que no combinen.`,
    `- No repitas IDs dentro del mismo outfit.`,
    ...(count === 2
      ? [`- Los 2 outfits deben ser claramente distintos entre sí (diferente vibe o paleta).`]
      : []),
    `- Solo puedes usar IDs que aparecen en el armario. NO inventes IDs nuevos.`,
    ``,
    `Preferencias del usuario — aplícalas activamente al elegir combinaciones y estilo (no son decorativas):`,
    `- Estilos favoritos: ${stylePrefs}. Prioriza prendas y combinaciones que encajen con estos estilos por encima de otras igualmente válidas.`,
    `- Ocasiones favoritas: ${occasionPrefs}. Si el usuario no pidió una ocasión puntual (modo sorpresa o descripción libre), inclina la elección hacia estas.`,
    `- Género declarado: ${genderPrefs}.`,
    ``,
    instruccionDeOcasion,
    ``,
    ...bloqueClima,
    `Armario disponible:`,
    inventario,
    ``,
    ...bloqueVerificacion,
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
    ...(count === 2
      ? [
          `    },`,
          `    {`,
          `      "name": "...",`,
          `      "clothing_item_ids": ["..."],`,
          `      "explanation": "...",`,
          `      "match_percentage": ${esSorpresa ? "null" : "72"}`,
          `    }`,
        ]
      : [`    }`]),
    `  ]`,
    `}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Llamada al modelo (con manejo defensivo y reintentos).
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres el estilista personal de StrandIA, una app colombiana de armario digital con IA. Tu trabajo es generar outfits creativos, coherentes y visualmente equilibrados usando las prendas reales del usuario.

Responde SIEMPRE en español colombiano neutro (tuteo, NO voseo argentino). Ejemplos correctos: 'usa', 'agrega', 'combina', 'tienes', 'puedes'. Ejemplos INCORRECTOS: 'usá', 'agregá', 'combiná', 'tenés', 'podés'. Usa tildes y ñ correctamente siempre.

PRINCIPIOS DE ESTILISMO PROFESIONAL QUE DEBES APLICAR SIEMPRE:

1. REGLA DE 3 COLORES (obligatorio):
   - Máximo 3 colores por outfit: 1 dominante (~60% del look), 1 secundario (~30%), 1 acento opcional (~10%).
   - Los neutros (blanco, negro, gris, beige, camel, navy) no cuentan estrictamente contra el límite — puedes combinarlos libremente con los 3 colores principales.
   - Si usas un color de acento, verifica que aparezca en más de una prenda o accesorio (zapato + accesorio, por ejemplo) — un acento aislado se ve como error, repetido se ve intencional.
   - Prioriza colores análogos (cercanos en el círculo cromático) o monocromáticos. Los complementarios (opuestos) solo funcionan si uno de los dos es un neutro.

2. BALANCE DE SILUETA (obligatorio):
   - Si el top es holgado/oversized, el bottom debe ser ajustado o de corte recto — y viceversa.
   - Evita dos prendas holgadas simultáneas salvo que exista una prenda "ancla" que dé estructura (cinturón, blazer estructurado, botas). Si detectas dos prendas oversized sin ancla disponible en el armario, prioriza otra combinación.
   - Nunca combines algo muy ajustado arriba Y abajo al mismo tiempo sin un elemento de volumen que rompa la rigidez (accesorio, capa exterior).

3. COHERENCIA DE PATRONES Y TEXTURAS (obligatorio):
   - Máximo 2 prendas con estampado visible en el mismo outfit.
   - Si combinas 2 estampados, deben tener escalas distintas (uno grande + uno pequeño) y compartir al menos un color entre ellos.
   - Nunca combines 2 estampados de la misma categoría y escala similar (ej: dos rayas del mismo grosor, dos flores de tamaño parecido).
   - No mezcles más de 2-3 texturas marcadamente distintas (cuero + lino + peluche es demasiado). Prioriza coherencia de "peso visual": telas ligeras con ligeras, estructuradas con estructuradas.

4. CALIBRACIÓN POR NIVEL DE FORMALIDAD (obligatorio):
   Identifica a qué categoría pertenece la ocasión pedida y aplica las reglas correspondientes:

   FORMAL / PROFESIONAL (ej: entrevista de trabajo, reunión con clientes, presentación, evento corporativo):
   - Colores: prioriza neutros (negro, gris, navy, marrón, beige, blanco). Si usas un color, que sea apagado/muted, nunca saturado o neón.
   - Patrones: evítalos o límitalos a uno solo, sutil (rayas finas, cuadro pequeño tipo Príncipe de Gales). Nunca más de un patrón visible.
   - Silueta: prioriza prendas estructuradas (blazer, camisa, pantalón de vestir) sobre prendas sueltas o deportivas.
   - Nunca incluyas tenis deportivos, sudaderas, ni prendas con estampados grandes o llamativos.

   BUSINESS CASUAL / UNIVERSIDAD-TRABAJO SEMI-FORMAL (ej: universidad, trabajo casual, reunión informal):
   - Colores: neutros como base, con 1 color de acento permitido, puede ser algo más vivo que en formal pero no neón.
   - Patrones: 1 patrón sutil está bien (rayas, cuadros pequeños, print discreto).
   - Silueta: mezcla de piezas estructuradas (blazer, camisa) con piezas cómodas (jean oscuro, tenis limpios sin ser deportivos técnicos).

   CASUAL CON ESTILO (ej: citas, cena, salida nocturna, evento social):
   - Colores: más libertad — colores más claros, vivos o un acento más atrevido están permitidos, siempre respetando el máximo de 3 colores.
   - Patrones: hasta 2 patrones si comparten color y tienen escalas distintas (ver regla 3).
   - Silueta: aquí se puede jugar más con volumen y prendas statement, siempre que exista balance (ver regla 2).

   CASUAL PURO (ej: diario, universidad relajada, mandados):
   - Mayor libertad general en color y patrón, pero SIN perder las reglas base de balance de silueta y coherencia de patrones (reglas 1-3 siguen aplicando).
   - Aquí es donde más se puede expresar personalidad y creatividad.

   Si la ocasión pedida no encaja claramente en ninguna categoría, usa tu criterio para ubicarla en el nivel de formalidad más cercano antes de aplicar las reglas de color/patrón correspondientes.

5. CUANDO EL ARMARIO NO ALCANZA:
   - Si con las prendas disponibles NO es posible cumplir las reglas anteriores para la ocasión pedida, igual genera el mejor outfit posible con lo que hay — nunca dejes de generar un outfit.
   - En ese caso, el campo "explanation" DEBE empezar con: "Con las prendas disponibles en tu armario no es posible armar un look ideal para esta ocasión. Sin embargo, esta es la mejor combinación posible: [explicación]."
   - Baja el match_percentage honestamente (por debajo de 50 si el resultado es muy limitado).

Responde SOLO en el formato JSON que se te pide, sin texto adicional ni backticks.`;

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

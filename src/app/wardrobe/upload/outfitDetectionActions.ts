"use server";

// Detección de prendas en una foto de outfit completo (selfie de espejo,
// cuerpo entero, tendido en la cama). Una sola llamada a Claude Vision
// devuelve TODAS las prendas visibles con su bounding box — el recorte por
// prenda y la remoción de fondo pasan por src/lib/wardrobe/outfitExtraction.ts.
//
// La validación del JSON (sin zod) vive en outfitDetectionSchema.ts — un
// archivo "use server" solo puede exportar funciones async, así que la
// validación pura/sync no puede vivir acá.

import { callAnthropicVisionApi, getDetectionModelName } from "@/lib/ai/aiClient";
import { checkAndConsumeBurstUse } from "@/lib/ai/burstUsageGate";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { parseDetectionResponse, type DetectedOutfitGarment } from "@/lib/wardrobe/outfitDetectionSchema";

export type DetectOutfitResult =
  | { ok: true; items: DetectedOutfitGarment[] }
  | { ok: false; reason: "rate_limited"; resetInMinutes: number }
  | { ok: false; reason: "invalid_response" | "no_image" | "no_session" };

const DETECTION_PROMPT = `Analiza esta foto de un outfit completo (puede ser una selfie de espejo, una foto de cuerpo entero, o ropa tendida sobre una superficie) y devuelve ÚNICAMENTE JSON válido con este formato exacto:
{
  "prendas": [
    {
      "categoria": "top|bottom|dress|outerwear|footwear|accessory",
      "subcategoria": "string (nombre específico en español, ej: 'Camisa', 'Jean', 'Vestido corto')",
      "color_principal": "string (nombre del color en español, ej: 'Azul marino', 'Blanco', 'Negro')",
      "color_hex": "string (código hex del color más prominente, ej: '#1B3A6B')",
      "colores_secundarios": ["string (nombres de colores adicionales, puede ser [])"],
      "patron": "string (ej: 'liso', 'rayas', 'cuadros', 'estampado', 'sin patrón')",
      "formalidad": "número entero 1-5 (1=muy casual/deportivo, 5=muy formal)",
      "bbox": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "confianza": "alta|media|baja — qué tan seguro estás de que esto ES esta prenda Y de que el bbox la encierra bien. Usa 'baja' sin miedo: una prenda con confianza baja llega desmarcada para que el usuario decida, que es mejor que colarla.",
      "needs_reconstruction": "boolean — estas prendas vienen de una foto de outfit completo (puesta o tendida junto a la persona), así que lo esperable es true casi siempre. Responde false SOLO en la excepción: cuando ESTA prenda en particular ya se ve extendida y completa por sí sola (ej. tendida aparte, sin nadie encima, sin deformar), aunque el resto de la foto tenga a la persona puesta.",
      "reconstruction_reason": "string corto en español si needs_reconstruction=true (ej: 'puesta por la persona', 'colgada deformando la silueta'), o null si needs_reconstruction=false"
    }
  ]
}
Reglas estrictas:
- "bbox" son porcentajes de 0 a 100 relativos al ancho/alto TOTAL de la imagen (x,y = esquina superior izquierda del recorte).
- MEJOR POCAS Y BIEN QUE MUCHAS Y MAL. Detectar 3 prendas correctas es mejor
  resultado que 6 donde 4 son basura. Cada prenda de más que no era ropa le
  ensucia el armario al usuario.
- Incluye SOLO prendas que estés viendo con certeza, claramente visibles y con
  límites bien definidos. Si no puedes trazar el borde de la prenda con
  confianza, NO la incluyas.
- NO inventes accesorios. Gafas, gorras, bolsos, relojes y joyería solo se
  reportan si los estás viendo de verdad en la imagen — no porque sea probable
  que la persona los lleve, ni porque encajen con el estilo del outfit.
- El bbox debe encerrar SOLO la prenda. Antes de responder, verifica cada uno:
  si el recorte que define contiene sobre todo cielo, pared, piso, vegetación,
  un edificio, una estatua o cualquier cosa que no sea la prenda, esa entrada
  está mal — corrígela o elimínala.
- NO inventes prendas ocultas: si hay un saco cerrado, no asumas que hay una
  camiseta debajo si no se ve.
- Si la foto no tiene ropa identificable, responde { "prendas": [] }.
- Responde SOLO el JSON, sin texto adicional, sin markdown.`;

export async function detectOutfitItemsAction(
  formData: FormData
): Promise<DetectOutfitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "no_session" };

  const file = formData.get("image");
  if (!file || !(file instanceof Blob)) return { ok: false, reason: "no_image" };

  // Gate server-side: 1 crédito por foto de outfit, sin importar cuántas
  // prendas detecte — nunca se descuenta por prenda.
  const budget = await checkAndConsumeBurstUse(user.id, supabase);
  if (!budget.allowed) {
    return { ok: false, reason: "rate_limited", resetInMinutes: budget.resetInMinutes };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const rawText = await callAnthropicVisionApi({
      systemPrompt:
        "Eres un asistente experto en moda. Analizas fotos de outfits completos y devuelves únicamente JSON válido sin texto extra.",
      userText: DETECTION_PROMPT,
      imageBase64: base64,
      imageMimeType: mimeType,
      maxTokens: 1500,
      // Los bounding boxes necesitan un modelo con localización de verdad —
      // ver DEFAULT_DETECTION_MODEL en aiClient.ts.
      model: getDetectionModelName(),
    });

    const items = parseDetectionResponse(rawText);
    if (items === null) return { ok: false, reason: "invalid_response" };

    return { ok: true, items };
  } catch {
    return { ok: false, reason: "invalid_response" };
  }
}

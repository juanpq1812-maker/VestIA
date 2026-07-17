"use server";

// Detección de prendas en una foto de outfit completo (selfie de espejo,
// cuerpo entero, tendido en la cama). Una sola llamada a Claude Vision
// devuelve TODAS las prendas visibles con su bounding box — el recorte por
// prenda y el Remove.bg pasan por src/lib/wardrobe/outfitExtraction.ts.
//
// La validación del JSON (sin zod) vive en outfitDetectionSchema.ts — un
// archivo "use server" solo puede exportar funciones async, así que la
// validación pura/sync no puede vivir acá.

import { callAnthropicVisionApi } from "@/lib/ai/aiClient";
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
      "categoria": "top|bottom|dress|outerwear|footwear|accessory|body",
      "subcategoria": "string (nombre específico en español, ej: 'Camisa', 'Jean', 'Vestido corto')",
      "color_principal": "string (nombre del color en español, ej: 'Azul marino', 'Blanco', 'Negro')",
      "color_hex": "string (código hex del color más prominente, ej: '#1B3A6B')",
      "colores_secundarios": ["string (nombres de colores adicionales, puede ser [])"],
      "patron": "string (ej: 'liso', 'rayas', 'cuadros', 'estampado', 'sin patrón')",
      "formalidad": "número entero 1-5 (1=muy casual/deportivo, 5=muy formal)",
      "bbox": { "x": 0, "y": 0, "width": 0, "height": 0 }
    }
  ]
}
Reglas estrictas:
- "bbox" son porcentajes de 0 a 100 relativos al ancho/alto TOTAL de la imagen (x,y = esquina superior izquierda del recorte).
- Ignora accesorios diminutos o poco visibles (aretes chicos, anillos, etc — solo incluye lo claramente identificable).
- NO inventes prendas ocultas: si hay un saco cerrado, no asumas que hay una camiseta debajo si no se ve.
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
      maxTokens: 1200,
    });

    const items = parseDetectionResponse(rawText);
    if (items === null) return { ok: false, reason: "invalid_response" };

    return { ok: true, items };
  } catch {
    return { ok: false, reason: "invalid_response" };
  }
}

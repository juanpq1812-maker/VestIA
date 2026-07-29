"use server";

import { callAnthropicVisionApi } from "@/lib/ai/aiClient";
import { parseClothingAnalysis, type AIClothingAnalysis } from "@/lib/wardrobe/clothingAnalysisSchema";
import { SUBCATEGORIES } from "@/lib/wardrobe/constants";
import type { ClothingCategory } from "@/types/database";

// No reexportar el tipo desde acá: un archivo "use server" solo puede
// exportar funciones async — reexportar un type rompe en runtime dev (no en
// build). Los consumidores importan AIClothingAnalysis directamente de
// clothingAnalysisSchema.ts.
export type AnalyzeResult =
  | { ok: true; data: AIClothingAnalysis }
  | { ok: false };

// Lista cerrada de subcategorías válidas por categoría, generada desde
// SUBCATEGORIES en vez de escrita a mano: así agregar una subcategoría a la
// constante actualiza el prompt solo, sin que se desincronicen.
//
// Antes `subcategoria` era string libre con tres ejemplos, y Vision devolvía
// frases ad-hoc ("crop top sin mangas", "zapatilla deportiva") que el match de
// aiMapping.ts tenía que adivinar. Con la lista completa el modelo elige de un
// menú. La red de seguridad (SUBCATEGORY_SYNONYMS + subcategory_ai_raw) sigue
// intacta: esto reduce los fallos, no los elimina.
const SUBCATEGORY_LIST = (
  Object.entries(SUBCATEGORIES) as [ClothingCategory, readonly string[]][]
)
  .map(([category, subs]) => `- ${category}: ${subs.join(" | ")}`)
  .join("\n");

const ANALYSIS_PROMPT = `Analiza esta foto de una prenda de ropa y responde ÚNICAMENTE en JSON válido con este formato exacto:
{
  "categoria": "top|bottom|dress|outerwear|footwear|accessory",
  "subcategoria": "string — elige EXACTAMENTE UNA de la lista de abajo que corresponda a la categoría que elegiste. Cópiala tal cual, con sus acentos y mayúsculas. No inventes valores nuevos ni agregues adjetivos.",
  "color_principal": "string (nombre del color en español, ej: 'Azul marino', 'Blanco', 'Negro')",
  "color_hex": "string (código hex del color más prominente, ej: '#1B3A6B')",
  "ocasiones": ["casual","formal","deportivo","fiesta","trabajo","universidad"],
  "confianza": "alta|media|baja",
  "needs_reconstruction": "boolean — true SOLO si la foto tiene un problema que una simple remoción de fondo no resuelve bien:
    - hay una persona vistiendo o sosteniendo la prenda (partes del cuerpo visibles)
    - la prenda está colgada en gancho/percha de forma que deforma su silueta
    - la prenda está muy arrugada, doblada o amontonada (no se aprecia su forma)
    - el fondo es tan cargado que una remoción de fondo simple probablemente recorte mal
    Si la prenda se ve razonablemente extendida y completa, aunque la foto no sea perfecta, responde false. ANTE LA DUDA, responde false.",
  "reconstruction_reason": "string corto en español si needs_reconstruction=true (ej: 'persona visible', 'fondo cargado', 'prenda arrugada'), o null si needs_reconstruction=false"
}

Subcategorías válidas por categoría (elige una de la lista de la categoría que hayas elegido):
${SUBCATEGORY_LIST}

Solo responde el JSON, sin texto adicional.`;

export async function analyzeClothingImageAction(
  formData: FormData
): Promise<AnalyzeResult> {
  try {
    const file = formData.get("image");
    if (!file || !(file instanceof Blob)) return { ok: false };

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const rawText = await callAnthropicVisionApi({
      systemPrompt:
        "Eres un asistente experto en moda. Analizas fotos de prendas y devuelves únicamente JSON válido sin texto extra.",
      userText: ANALYSIS_PROMPT,
      imageBase64: base64,
      imageMimeType: mimeType,
      maxTokens: 400,
    });

    const data = parseClothingAnalysis(rawText);
    if (!data) return { ok: false };

    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

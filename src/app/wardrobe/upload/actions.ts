"use server";

import { callAnthropicVisionApi } from "@/lib/ai/aiClient";

export type AIClothingAnalysis = {
  categoria: string;
  subcategoria: string;
  color_principal: string;
  color_hex: string;
  ocasiones: string[];
  confianza: "alta" | "media" | "baja";
};

export type AnalyzeResult =
  | { ok: true; data: AIClothingAnalysis }
  | { ok: false };

const ANALYSIS_PROMPT = `Analiza esta foto de una prenda de ropa y responde ÚNICAMENTE en JSON válido con este formato exacto:
{
  "categoria": "top|bottom|dress|outerwear|footwear|accessory|body",
  "subcategoria": "string (nombre específico en español, ej: 'Camisa', 'Jean', 'Vestido corto')",
  "color_principal": "string (nombre del color en español, ej: 'Azul marino', 'Blanco', 'Negro')",
  "color_hex": "string (código hex del color más prominente, ej: '#1B3A6B')",
  "ocasiones": ["casual","formal","deportivo","fiesta","trabajo","universidad"],
  "confianza": "alta|media|baja"
}
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
      maxTokens: 350,
    });

    const stripped = rawText.replace(/```json\s*|\s*```/g, "").trim();
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first === -1 || last === -1) return { ok: false };

    const data = JSON.parse(stripped.slice(first, last + 1)) as AIClothingAnalysis;

    if (!data.categoria || !data.subcategoria) return { ok: false };

    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

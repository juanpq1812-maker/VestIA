// Validación manual estricta de la respuesta de Claude Vision para el
// análisis de una prenda individual (flujo individual y ráfaga no-outfit).
// No hay zod en el proyecto — cada campo se valida a mano antes de confiar
// en cualquier valor del modelo. Mismo estilo que outfitDetectionSchema.ts.
//
// Separado de actions.ts (server action) porque un archivo "use server" solo
// puede exportar funciones async — esta es pura y sync.

export type AIClothingAnalysis = {
  categoria: string;
  subcategoria: string;
  color_principal: string;
  color_hex: string;
  ocasiones: string[];
  confianza: "alta" | "media" | "baja";
  /** true si Vision detectó evidencia de que la foto necesita reconstrucción con Gemini. */
  needs_reconstruction: boolean;
  /** Motivo corto (ej. "persona visible"). Solo se conserva cuando needs_reconstruction=true. */
  reconstruction_reason: string | null;
};

const VALID_CONFIANZA = new Set(["alta", "media", "baja"]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Parsea y valida el JSON crudo del modelo. Devuelve null si no cumple el formato mínimo. */
export function parseClothingAnalysis(raw: string): AIClothingAnalysis | null {
  try {
    const stripped = raw.replace(/```json\s*|\s*```/g, "").trim();
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first === -1 || last === -1) return null;

    const parsed: unknown = JSON.parse(stripped.slice(first, last + 1));
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;

    if (!isNonEmptyString(p.categoria)) return null;
    if (!isNonEmptyString(p.subcategoria)) return null;
    if (!isNonEmptyString(p.color_principal)) return null;
    if (typeof p.color_hex !== "string") return null;
    if (!Array.isArray(p.ocasiones) || !p.ocasiones.every((o) => typeof o === "string")) {
      return null;
    }

    const confianza =
      typeof p.confianza === "string" && VALID_CONFIANZA.has(p.confianza)
        ? (p.confianza as AIClothingAnalysis["confianza"])
        : "baja";

    // Campos nuevos: si faltan (respuesta vieja o el modelo los omite), default
    // seguro es "no hace falta reconstruir" — un falso negativo cuesta una foto
    // mediocre, no plata.
    const needs_reconstruction = typeof p.needs_reconstruction === "boolean" ? p.needs_reconstruction : false;
    const reconstruction_reason =
      needs_reconstruction && isNonEmptyString(p.reconstruction_reason)
        ? p.reconstruction_reason.trim()
        : null;

    return {
      categoria: p.categoria,
      subcategoria: p.subcategoria,
      color_principal: p.color_principal,
      color_hex: p.color_hex,
      ocasiones: p.ocasiones as string[],
      confianza,
      needs_reconstruction,
      reconstruction_reason,
    };
  } catch {
    return null;
  }
}

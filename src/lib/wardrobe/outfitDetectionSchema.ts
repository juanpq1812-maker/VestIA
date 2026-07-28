// Validación manual estricta de la respuesta de Claude Vision para la
// detección de outfit completo. No hay zod en el proyecto — cada campo se
// valida a mano antes de confiar en cualquier valor del modelo.
//
// Separado de outfitDetectionActions.ts (server action) porque un archivo
// "use server" solo puede exportar funciones async — esta es pura y sync.

import type { ClothingCategory } from "@/types/database";

const VALID_CATEGORIES: readonly ClothingCategory[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
];

export type DetectedOutfitGarment = {
  categoria: ClothingCategory;
  subcategoria: string;
  color_principal: string;
  color_hex: string;
  colores_secundarios: string[];
  patron: string;
  formalidad: 1 | 2 | 3 | 4 | 5;
  bbox: { x: number; y: number; width: number; height: number };
  /** true si Vision detectó evidencia de que este recorte necesita reconstrucción con Gemini. */
  needs_reconstruction: boolean;
  /** Motivo corto (ej. "puesta por la persona"). Solo se conserva cuando needs_reconstruction=true. */
  reconstruction_reason: string | null;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidBBox(v: unknown): v is DetectedOutfitGarment["bbox"] {
  if (!v || typeof v !== "object") return false;
  const b = v as Record<string, unknown>;
  if (!isFiniteNumber(b.x) || !isFiniteNumber(b.y)) return false;
  if (!isFiniteNumber(b.width) || !isFiniteNumber(b.height)) return false;
  if (b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0) return false;
  // Margen de tolerancia (2%) por redondeos del modelo.
  if (b.x + b.width > 102 || b.y + b.height > 102) return false;
  return true;
}

/** Valida solo los campos "core" — needs_reconstruction/reconstruction_reason se normalizan aparte (ver toDetectedGarment). */
function isValidGarmentCore(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;

  if (typeof g.categoria !== "string" || !VALID_CATEGORIES.includes(g.categoria as ClothingCategory)) {
    return false;
  }
  if (typeof g.subcategoria !== "string" || g.subcategoria.trim().length === 0) return false;
  if (typeof g.color_principal !== "string" || g.color_principal.trim().length === 0) return false;
  if (typeof g.color_hex !== "string") return false;
  if (
    !Array.isArray(g.colores_secundarios) ||
    !g.colores_secundarios.every((c) => typeof c === "string")
  ) {
    return false;
  }
  if (typeof g.patron !== "string") return false;
  if (!isFiniteNumber(g.formalidad) || !Number.isInteger(g.formalidad)) return false;
  if (g.formalidad < 1 || g.formalidad > 5) return false;
  if (!isValidBBox(g.bbox)) return false;

  return true;
}

/**
 * Completa needs_reconstruction/reconstruction_reason con un default seguro
 * si el modelo los omite. A diferencia del análisis individual, acá el
 * default es `true`: estas prendas vienen recortadas de una foto de outfit
 * completo (puesta, tendida junto a la persona, etc.) — el comportamiento
 * histórico era reconstruir siempre, así que ante ausencia del campo
 * preservamos ese comportamiento en vez de asumir que no hace falta.
 */
function toDetectedGarment(g: Record<string, unknown>): DetectedOutfitGarment {
  const needs_reconstruction =
    typeof g.needs_reconstruction === "boolean" ? g.needs_reconstruction : true;
  const reconstruction_reason =
    needs_reconstruction
      ? typeof g.reconstruction_reason === "string" && g.reconstruction_reason.trim().length > 0
        ? g.reconstruction_reason.trim()
        : "no especificado"
      : null;

  return {
    categoria: g.categoria as ClothingCategory,
    subcategoria: g.subcategoria as string,
    color_principal: g.color_principal as string,
    color_hex: g.color_hex as string,
    colores_secundarios: g.colores_secundarios as string[],
    patron: g.patron as string,
    formalidad: g.formalidad as 1 | 2 | 3 | 4 | 5,
    bbox: g.bbox as DetectedOutfitGarment["bbox"],
    needs_reconstruction,
    reconstruction_reason,
  };
}

/** Valida el JSON crudo del modelo. Items malformados se descartan, no abortan el batch. */
export function parseDetectionResponse(raw: string): DetectedOutfitGarment[] | null {
  try {
    const stripped = raw.replace(/```json\s*|\s*```/g, "").trim();
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first === -1 || last === -1) return null;

    const parsed: unknown = JSON.parse(stripped.slice(first, last + 1));
    if (!parsed || typeof parsed !== "object" || !("prendas" in parsed)) return null;

    const prendas = (parsed as { prendas: unknown }).prendas;
    if (!Array.isArray(prendas)) return null;

    return prendas.filter(isValidGarmentCore).map(toDetectedGarment);
  } catch {
    return null;
  }
}

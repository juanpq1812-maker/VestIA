// Constantes de Fashion Quests + nivel de Comunidad (segundo pilar de
// gamificación de StrandIA, junto a Hebri — ver src/lib/pet/).
//
// Los puntos por quest los define el admin al crear cada quest (no son fijos
// acá) — lo único fijo es el catálogo de `quest_type` (la verificación de
// cada tipo vive en SQL, supabase/migrations/0014_complete_quest.sql, y en
// TS en query.ts para mostrar el progreso sin tener que llamar al RPC).

export type QuestType =
  | "generate_outfits"
  | "use_outfits"
  | "upload_items"
  | "active_days"
  | "rescue_forgotten_item";

export const QUEST_TYPE_LABEL: Record<QuestType, string> = {
  generate_outfits: "Generar outfits con IA",
  use_outfits: "Usar outfits",
  upload_items: "Subir prendas nuevas",
  active_days: "Días activos",
  rescue_forgotten_item: "Rescatar una prenda olvidada",
};

// Copy corta para la UI de usuario cuando el quest no define su propia
// descripción de meta (fallback, no debería usarse si el admin llenó bien
// el formulario).
export function questTargetCopy(type: QuestType, targetCount: number, windowDays: number): string {
  switch (type) {
    case "generate_outfits":
      return `Genera ${targetCount} ${targetCount === 1 ? "outfit" : "outfits"} con IA en ${windowDays} días.`;
    case "use_outfits":
      return `Usa ${targetCount} ${targetCount === 1 ? "outfit" : "outfits"} en ${windowDays} días.`;
    case "upload_items":
      return `Sube ${targetCount} ${targetCount === 1 ? "prenda" : "prendas"} nuevas en ${windowDays} días.`;
    case "active_days":
      return `Usa StrandIA ${targetCount} días distintos en una ventana de ${windowDays} días.`;
    case "rescue_forgotten_item":
      return `Vuelve a usar una prenda que no usabas hace tiempo.`;
  }
}

export type CommunityLevel = "Rookie" | "Curador" | "Estilista" | "Ícono";

const LEVEL_THRESHOLDS: { level: CommunityLevel; min: number }[] = [
  { level: "Ícono", min: 700 },
  { level: "Estilista", min: 300 },
  { level: "Curador", min: 100 },
  { level: "Rookie", min: 0 },
];

export function levelFromPoints(points: number): CommunityLevel {
  for (const { level, min } of LEVEL_THRESHOLDS) {
    if (points >= min) return level;
  }
  return "Rookie";
}

// Puntos que faltan para el siguiente nivel (null si ya es el máximo) — útil
// para una barra de progreso de nivel en /comunidad.
export function pointsToNextLevel(points: number): number | null {
  const ascending = [...LEVEL_THRESHOLDS].reverse();
  const next = ascending.find((t) => t.min > points);
  return next ? next.min - points : null;
}

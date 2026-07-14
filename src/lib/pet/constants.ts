// Constantes del sistema de Hebri (mascota de gamificación de StrandIA).
//
// Los puntos por acción viven también en la función SQL `record_pet_action`
// (supabase/migrations/0012_pet_score.sql) — esa es la fuente de verdad real
// porque ahí se aplican de forma segura (SECURITY DEFINER). Los duplicamos
// acá solo para que la UI pueda mostrar mensajes/previews sin adivinar
// valores ("generar un outfit suma 25" en algún tooltip futuro, por ejemplo).
// Si cambian los puntos, hay que actualizar los dos lugares.

export type PetActionType =
  | "outfit_generated"
  | "outfit_shared"
  | "user_followed"
  | "garment_uploaded"
  | "app_opened"
  | "quest_completed";

export const PET_ACTION_POINTS: Record<PetActionType, number> = {
  outfit_generated: 25,
  outfit_shared: 25,
  user_followed: 12,
  garment_uploaded: 12,
  app_opened: 3,
  quest_completed: 20,
};

export type PetMood = "feliz" | "aburrida" | "sassy" | "triste" | "hibernando";

// Decaimiento: puntos que pierde el score por cada día calendario sin acción.
export const PET_SCORE_DAILY_DECAY = 8;

// Días sin abrir la app a partir de los cuales se activa la capa "sucia".
export const PET_DIRTY_THRESHOLD_DAYS = 3;

// Nombre de archivo por estado, dentro de /public/hebri/estados/.
// Ilustraciones finales del diseñador (PNG con transparencia, 480px máx).
export const PET_MOOD_ASSET: Record<PetMood, string> = {
  feliz: "/hebri/estados/hebri_feliz.png",
  aburrida: "/hebri/estados/hebri_aburrida.png",
  sassy: "/hebri/estados/hebri_sassy.png",
  triste: "/hebri/estados/hebri_triste.png",
  hibernando: "/hebri/estados/hebri_hibernando.png",
};

export const PET_DIRTY_OVERLAY_ASSET = "/hebri/overlay/hebri_overlay_sucia.png";

// Score → estado de ánimo. Umbrales inclusivos por abajo (>=).
export function moodFromScore(score: number): PetMood {
  if (score >= 80) return "feliz";
  if (score >= 60) return "aburrida";
  if (score >= 40) return "sassy";
  if (score >= 20) return "triste";
  return "hibernando";
}

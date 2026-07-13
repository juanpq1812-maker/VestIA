// Cálculo puro del health_score mostrado de Hebri.
//
// El score se cachea "perezoso" en `profiles.pet_score_base` +
// `pet_score_updated_at` (ver supabase/migrations/0012_pet_score.sql): el
// decaimiento de PET_SCORE_DAILY_DECAY puntos/día no se persiste en cada
// lectura, se deriva acá con aritmética simple — así el Home no dispara
// ningún UPDATE solo por cargar.

import {
  PET_DIRTY_THRESHOLD_DAYS,
  PET_SCORE_DAILY_DECAY,
  moodFromScore,
  type PetMood,
} from "./constants";

export type PetState = {
  score: number;
  mood: PetMood;
  isDirty: boolean;
};

function daysElapsed(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function computePetState(params: {
  scoreBase: number;
  scoreUpdatedAt: string | Date;
  lastOpenedAt: string | Date;
  now?: Date;
}): PetState {
  const now = params.now ?? new Date();
  const updatedAt = new Date(params.scoreUpdatedAt);
  const lastOpenedAt = new Date(params.lastOpenedAt);

  const daysSinceUpdate = daysElapsed(updatedAt, now);
  const score = Math.max(
    0,
    Math.min(100, params.scoreBase - PET_SCORE_DAILY_DECAY * daysSinceUpdate)
  );

  const daysSinceOpened = daysElapsed(lastOpenedAt, now);
  const isDirty = daysSinceOpened >= PET_DIRTY_THRESHOLD_DAYS;

  return { score, mood: moodFromScore(score), isDirty };
}

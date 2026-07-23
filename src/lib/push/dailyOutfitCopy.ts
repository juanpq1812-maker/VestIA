// Copy rotativo del recordatorio diario. Array separado y facil de extender
// — cuando Fase 2 sume mas variantes (o mas tipos de notificacion), este es
// el unico archivo que crece.

import type { PushPayload } from "./types";

export const DAILY_OUTFIT_VARIANTS: readonly Omit<PushPayload, "url" | "icon">[] = [
  {
    title: "¿Todavía en pijama? 🌞",
    body: "Hebri ya te armó el outfit del día. Míralo aquí.",
  },
  {
    title: "¿Qué te vas a poner hoy? 👗",
    body: "Hebri tiene una idea lista para ti. Échale un ojo 🧶",
  },
];

export function pickRandomDailyOutfitCopy(): PushPayload {
  const variant =
    DAILY_OUTFIT_VARIANTS[Math.floor(Math.random() * DAILY_OUTFIT_VARIANTS.length)];
  return {
    ...variant,
    url: "/outfits",
    icon: "/icon-192.png",
  };
}

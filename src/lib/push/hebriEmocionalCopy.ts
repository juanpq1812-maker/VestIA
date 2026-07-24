// Copy rotativo del emocional vespertino de Hebri, por estado. Archivo
// aparte y facil de extender, mismo patron que dailyOutfitCopy.ts.

import type { PushPayload } from "./types";

type EstadoElegible = "triste" | "hibernando";

const VARIANTS: Record<EstadoElegible, readonly Omit<PushPayload, "url" | "icon">[]> = {
  triste: [
    {
      title: "Hebri te extraña 🧶",
      body: "Hace días que no vienes. ¿Armamos un look?",
    },
    {
      title: "Hebri está aburrida 😿",
      body: "Tu armario está esperando. Ven un rato.",
    },
  ],
  hibernando: [
    {
      title: "Hebri se quedó dormida 💤",
      body: "Vuelve y despiértala con un outfit nuevo.",
    },
    {
      title: "¿Te acuerdas de Hebri? 🧶",
      body: "Lleva días hibernando. Te está esperando.",
    },
  ],
};

export function pickRandomHebriEmocionalCopy(estado: EstadoElegible): PushPayload {
  const variants = VARIANTS[estado];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  return {
    ...variant,
    url: "/pet",
    icon: "/icon-192.png",
  };
}

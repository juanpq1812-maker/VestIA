// Copy de Hebri por estado de ánimo. "Sassy" debe leerse como actitud/humor,
// nunca como regaño — nada de culpa en ningún estado, ni siquiera en
// Hibernando (siempre debe sentirse reversible con una sola visita).

import type { PetMood } from "@/lib/pet/constants";

export const PET_MOOD_LABEL: Record<PetMood, string> = {
  feliz: "Feliz",
  aburrida: "Aburrida",
  sassy: "Sassy",
  triste: "Triste",
  hibernando: "Hibernando",
};

// Mensaje corto — Home (widget).
export const PET_MOOD_SHORT_MESSAGE: Record<PetMood, string> = {
  feliz: "Contenta y con ganas de jugar hoy.",
  aburrida: "Ya pasaron algunos días — sigue ahí, esperando.",
  sassy: "“Ah, ya te acordaste de mí.”",
  triste: "Te extraña de verdad.",
  hibernando: "Es solo un ovillo por ahora. Un toque y vuelve.",
};

// Mensaje largo — /pet (pantalla completa).
export const PET_MOOD_LONG_MESSAGE: Record<PetMood, string> = {
  feliz: "Hebri está feliz porque hoy usaste StrandIA. Su cola no para de moverse.",
  aburrida: "Ya pasaron algunos días. Todavía está ahí, pero empieza a decaer un poco.",
  sassy: "“Ah, ya te apareciste.” Te ignora con estilo — nada grave, solo actitud.",
  triste: "Hace rato que no la visitás. Se nota que te extraña de verdad.",
  hibernando: "Volvió a ser solo un ovillo de hilo. Basta con abrir la app para despertarla.",
};

export const PET_DIRTY_MESSAGE =
  "Además está un poco despeinada — hace unos días que no abrís StrandIA.";

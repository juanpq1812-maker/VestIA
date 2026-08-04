// Razones por las que un usuario rechaza un outfit generado, y cómo se
// resumen para el prompt de la siguiente generación.
//
// Esto NO es machine learning: no se entrena ningún modelo. Es personalización
// por contexto — se guardan los rechazos y se resumen dentro del prompt. Es el
// patrón estándar con LLMs y funciona desde el tercer feedback.
//
// Módulo compartido cliente/servidor: la UI lee las etiquetas, el servidor
// valida el slug contra la misma lista que el CHECK de la migración 0032.

/** Slugs tal como se guardan en `outfit_feedback.reason`. */
export const FEEDBACK_REASONS = [
  "demasiados_colores",
  "no_combinan",
  "no_es_mi_estilo",
  "no_sirve_ocasion",
  "muy_formal",
  "muy_informal",
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

/** Lo que ve el usuario en el sheet. Un tap, sin texto libre en v1. */
export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = {
  demasiados_colores: "Demasiados colores",
  no_combinan: "No combinan entre sí",
  no_es_mi_estilo: "No es mi estilo",
  no_sirve_ocasion: "No sirve para la ocasión",
  muy_formal: "Muy formal",
  muy_informal: "Muy informal",
};

/** Cómo se le describe cada razón al modelo, en tercera persona. */
const FEEDBACK_REASON_FOR_PROMPT: Record<FeedbackReason, string> = {
  demasiados_colores: "demasiados colores",
  no_combinan: "prendas que no combinan entre sí",
  no_es_mi_estilo: "no ser su estilo",
  no_sirve_ocasion: "no servir para la ocasión pedida",
  muy_formal: "ser demasiado formal",
  muy_informal: "ser demasiado informal",
};

export function isFeedbackReason(value: unknown): value is FeedbackReason {
  return (
    typeof value === "string" &&
    (FEEDBACK_REASONS as readonly string[]).includes(value)
  );
}

/**
 * Cuántos rechazos hacen falta antes de meter el bloque en el prompt.
 *
 * Por debajo de 3 el patrón no es señal, es ruido — y sesgar la generación con
 * un solo rechazo hace más daño que bien.
 */
export const MIN_FEEDBACK_FOR_PROMPT = 3;

/** Cuántas filas recientes se leen. Más allá, el gusto ya cambió. */
export const FEEDBACK_PROMPT_WINDOW = 10;

/**
 * Resume los rechazos recientes en un bloque corto para el prompt.
 * Devuelve `null` cuando no hay suficiente señal.
 */
export function buildFeedbackPromptBlock(
  reasons: readonly FeedbackReason[]
): string | null {
  if (reasons.length < MIN_FEEDBACK_FOR_PROMPT) return null;

  const conteo = new Map<FeedbackReason, number>();
  for (const r of reasons) conteo.set(r, (conteo.get(r) ?? 0) + 1);

  // De mayor a menor, y solo lo que se repitió: una razón suelta dentro de 10
  // rechazos no dice nada.
  const relevantes = [...conteo.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);

  if (relevantes.length === 0) return null;

  const frases = relevantes.map(
    ([reason, n]) =>
      `${n} outfit${n === 1 ? "" : "s"} por ${FEEDBACK_REASON_FOR_PROMPT[reason]}`
  );

  return [
    `Historial de este usuario — ha rechazado ${frases.join(", ")}.`,
    `Ten esto en cuenta al elegir: evita repetir el patrón que ya rechazó. No lo menciones nunca en la "explanation" ni le hagas notar al usuario que estás usando su historial.`,
  ].join("\n");
}

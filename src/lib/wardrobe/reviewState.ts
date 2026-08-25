// Estado de cada prenda en la pantalla de revisión (/wardrobe/upload/review),
// para ráfaga y para outfit completo — es la misma pantalla.
//
// Vive acá y no dentro del componente porque es EL criterio de la pantalla:
// qué prenda se abre sola, cuáles cuentan en la barra de "necesitan un toque",
// y cuáles bloquean el guardado. Todo eso es lógica pura y se testea sin DOM
// (reviewState.test.ts).
//
// Restricción del runner: `npm test` corre node --test con type-stripping
// nativo, sin bundler. Por eso este módulo solo puede tener imports de TIPO
// con el alias `@/` — Node los borra y nunca intenta resolverlos. Si necesitas
// un valor en runtime (una etiqueta, una constante), pásalo por parámetro; no
// lo importes. Ver la nota equivalente en outfitRules.test.ts.

import type { ClothingCategory } from "@/types/database";

export type ReviewEdits = {
  category: ClothingCategory | "";
  subcategory: string;
  color: string;
  occasions: string[];
};

// ---------------------------------------------------------------------------
// Campos obligatorios
// ---------------------------------------------------------------------------
//
// Los cuatro. Mismo criterio que UploadForm.tsx (individual) y EditItemForm.tsx
// (editar prenda) — la subcategoría obligatoria es una decisión ya tomada y
// documentada: era opcional en ráfaga, dejaba prendas guardadas con
// subcategory=null ("Sin cat." en el armario), y ganó la regla estricta
// consistente en los tres flujos. `name` NO es obligatorio (ni siquiera se
// pide en ráfaga).
export const REQUIRED_FIELDS = ["categoría", "subcategoría", "color", "ocasión"] as const;
export type MissingField = (typeof REQUIRED_FIELDS)[number];

export function missingFields(e: ReviewEdits): MissingField[] {
  const missing: MissingField[] = [];
  if (!e.category) missing.push("categoría");
  if (!e.subcategory) missing.push("subcategoría");
  if (!e.color) missing.push("color");
  if (e.occasions.length === 0) missing.push("ocasión");
  return missing;
}

export function isComplete(e: ReviewEdits): boolean {
  return missingFields(e).length === 0;
}

// ---------------------------------------------------------------------------
// Señales persistidas
// ---------------------------------------------------------------------------
//
// OJO — la ráfaga NO guarda la `confianza` que devuelve Vision. UploadForm la
// usa en memoria para decidir si salta al paso de detalle, pero burstQueue la
// descarta: no hay columna. Lo que SÍ queda en la fila es el resultado del
// mapeo, y eso es la señal real de "Vision dudó":
//
//   - `subcategory_ai_raw` no nulo  → Vision devolvió una subcategoría que no
//     matcheó contra SUBCATEGORIES (ver matchSubcategory en aiMapping.ts), así
//     que la subcategoría quedó vacía. Además nos dice QUÉ dijo ("buzo"), que
//     es mejor copy que un "revisa esto" pelado.
//   - un campo obligatorio vacío    → el mapeo no resolvió ese campo.
//
// Es el mismo criterio que `background_removed`: un valor medido del
// resultado, no una suposición sobre lo que la IA "debería" haber acertado.
export type ReviewSignals = {
  /** `clothing_items.subcategory_ai_raw` — string crudo de Vision que no matcheó. */
  subcategoryAiRaw: string | null;
  /** La heurística de duplicados encontró una prenda parecida ya confirmada. */
  duplicate: boolean;
  reconstructed: boolean;
  reconstructionReason: string | null;
  backgroundRemoved: boolean;
};

export type ReviewNote =
  /** Vision dijo algo que no matcheó y la subcategoría quedó vacía. */
  | "subcategoria_dudosa"
  /** Parecida a una prenda que ya está en el armario (solo outfit_extraction). */
  | "posible_duplicado"
  /** Se marcó para reconstrucción y la reconstrucción falló. */
  | "foto_sin_mejorar"
  /** El recorte de fondo no surtió efecto — reprocesable con "Mejora esta foto". */
  | "fondo_sin_quitar";

export type ReviewState =
  /** Completa: se guarda sin abrirla. */
  | "confirmada"
  /** Falta un campo obligatorio. BLOQUEA el guardado del lote entero. */
  | "incompleta";

export type ReviewVerdict = {
  state: ReviewState;
  missing: MissingField[];
  notes: ReviewNote[];
  /** Lo que dijo Vision cuando no matcheó, para el copy. null si matcheó bien. */
  subcategoryHint: string | null;
  /**
   * Entra en el conteo de la barra de arriba y en el recorrido guiado.
   *
   * SOLO lo activa que falte un campo obligatorio, porque es lo único que
   * bloquea el guardado. Ninguna nota lo activa — ni las de imagen
   * (foto_sin_mejorar, fondo_sin_quitar) ni el duplicado.
   *
   * El duplicado SÍ lo activaba, y medido contra un armario real fue un
   * error: la heurística compara solo categoría + color, así que en un
   * armario con varias prendas azules marca casi todo. Visto en producción:
   * las 3 prendas de un lote señaladas como duplicadas, la barra diciendo
   * "3 prendas necesitan un toque" y el recorrido guiado paseando por tres
   * tarjetas donde no había nada que arreglar. Un recorrido que se dispara
   * siempre no dirige la atención: la gasta.
   *
   * El aviso no desaparece — sigue como nota, visible en la fila y con sus
   * botones Descartar / Guardar igual en la tarjeta abierta. Lo que deja de
   * hacer es reclamar el recorrido.
   */
  needsAttention: boolean;
};

export function reviewVerdict(e: ReviewEdits, s: ReviewSignals): ReviewVerdict {
  const missing = missingFields(e);
  const notes: ReviewNote[] = [];

  // El hint solo tiene sentido mientras la subcategoría siga vacía: en cuanto
  // el usuario elige una, lo que Vision creyó ver deja de ser relevante.
  const hintVivo = Boolean(s.subcategoryAiRaw?.trim()) && !e.subcategory;
  if (hintVivo) notes.push("subcategoria_dudosa");
  if (s.duplicate) notes.push("posible_duplicado");
  if (s.reconstructionReason && !s.reconstructed) notes.push("foto_sin_mejorar");
  if (!s.backgroundRemoved) notes.push("fondo_sin_quitar");

  const state: ReviewState = missing.length > 0 ? "incompleta" : "confirmada";

  return {
    state,
    missing,
    notes,
    subcategoryHint: hintVivo ? s.subcategoryAiRaw!.trim() : null,
    needsAttention: state === "incompleta",
  };
}

// ---------------------------------------------------------------------------
// Resumen de la fila colapsada
// ---------------------------------------------------------------------------

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * La línea que se lee de un vistazo: `Suéter · Beige · Casual`.
 *
 * `categoryLabel` entra por parámetro (no se importa CLOTHING_CATEGORIES) por
 * la restricción del runner explicada arriba.
 *
 * Los campos que faltan NO se omiten: se dicen. Una línea que calla lo que
 * falta es exactamente cómo se pierde una prenda incompleta de vista.
 */
export function summaryLine(e: ReviewEdits, categoryLabel: string | null): string {
  const que = e.subcategory || categoryLabel || "Falta categoría";
  const color = e.color ? capitalizar(e.color) : "Falta color";
  const ocasion =
    e.occasions.length === 0
      ? "Falta ocasión"
      : e.occasions.length === 1
        ? e.occasions[0]
        : `${e.occasions[0]} +${e.occasions.length - 1}`;
  return `${que} · ${color} · ${ocasion}`;
}

// ---------------------------------------------------------------------------
// Qué se abre solo
// ---------------------------------------------------------------------------

/**
 * Id de la única tarjeta que se expande sola al entrar, o null.
 *
 * Criterio: se abre sola SOLO cuando hay exactamente una que necesita
 * atención. Con una, abrirla cuesta cero scroll y es el principio de la app —
 * la app decide, el usuario confirma. Con dos o más, abrirlas todas devuelve
 * el scroll infinito que esta pantalla existe para matar: ahí no se abre
 * ninguna y el usuario las recorre de a una desde la barra de arriba
 * (`attentionIds` da el orden del recorrido).
 */
export function autoExpandId(
  verdicts: ReadonlyArray<{ id: string; verdict: ReviewVerdict }>
): string | null {
  const atencion = attentionIds(verdicts);
  return atencion.length === 1 ? atencion[0] : null;
}

/** Ids que necesitan atención, EN EL ORDEN DE LA LISTA — es el orden del recorrido guiado. */
export function attentionIds(
  verdicts: ReadonlyArray<{ id: string; verdict: ReviewVerdict }>
): string[] {
  return verdicts.filter((v) => v.verdict.needsAttention).map((v) => v.id);
}

/**
 * Id de la siguiente tarjeta que necesita atención después de `currentId`.
 * Da la vuelta al final: si `currentId` era la última, vuelve a la primera —
 * el usuario que llegó al final sin resolver alguna la vuelve a ver, en vez de
 * quedarse sin "Siguiente" con cosas todavía pendientes.
 * null si no queda ninguna (o si la única pendiente es la actual).
 */
export function nextAttentionId(
  verdicts: ReadonlyArray<{ id: string; verdict: ReviewVerdict }>,
  currentId: string
): string | null {
  const atencion = attentionIds(verdicts);
  const restantes = atencion.filter((id) => id !== currentId);
  if (restantes.length === 0) return null;

  const posicionActual = verdicts.findIndex((v) => v.id === currentId);
  const siguiente = restantes.find(
    (id) => verdicts.findIndex((v) => v.id === id) > posicionActual
  );
  return siguiente ?? restantes[0];
}

// ---------------------------------------------------------------------------
// Qué se pinta en la lista
// ---------------------------------------------------------------------------

export type ReviewListState =
  /** Primera carga sin resolver. */
  | "cargando"
  /** No se pudo leer la cola y no hay nada en pantalla que conservar. */
  | "error"
  /** Respuesta EXITOSA sin prendas: el usuario de verdad no tiene nada en cola. */
  | "vacia"
  /** Hay prendas para revisar. */
  | "lista";

/**
 * Qué pantalla corresponde. Existe para que el vacío no pueda volver a ser
 * la pantalla por defecto ante cualquier cosa rara.
 *
 * Dos reglas, en este orden, y las dos vienen de un incidente:
 *
 *   1. **Con prendas en pantalla, un fetch fallido no cambia la pantalla.**
 *      El sondeo corre cada 2.5s. Uno solo que falle —trivial en una conexión
 *      lenta— no puede borrar un lote que el usuario está editando. El fallo
 *      se avisa aparte, sin tocar la lista.
 *   2. **El vacío exige una respuesta exitosa.** "No capturaste ninguna foto"
 *      es una afirmación sobre el estado del usuario. Si la consulta falló, no
 *      sabemos nada: eso es "error", con su reintento, no un vacío.
 *
 * Antes las dos se rompían por el mismo motivo: `fetchPendingItems` se comía
 * el error y devolvía `[]`, así que "se cayó la red" y "no hay nada" llegaban
 * acá como el mismo valor y eran indistinguibles.
 */
export function reviewListState(args: {
  loading: boolean;
  fetchFailed: boolean;
  itemCount: number;
}): ReviewListState {
  if (args.loading) return "cargando";
  if (args.itemCount > 0) return "lista";
  if (args.fetchFailed) return "error";
  return "vacia";
}

// ---------------------------------------------------------------------------
// El aviso de "esto bloquea el guardado"
// ---------------------------------------------------------------------------

export type IncompleteRef = {
  /** Etiqueta legible de la prenda ("Abrigos blanco"). */
  label: string;
  missing: MissingField[];
};

/**
 * Frase que nombra qué falta y en cuál prenda.
 *
 * `total` es cuántas prendas hay en la lista: cuando hay más de una, la
 * posición entra en la frase. Sin eso, dos prendas de la misma categoría y
 * color producen etiquetas IDÉNTICAS ("Abrigos blanco" y "Abrigos blanco") y
 * el usuario no puede saber a cuál de las dos se refiere el aviso — que es
 * exactamente cómo se termina mirando una tarjeta que está bien y creyendo
 * que el validador se contradice.
 */
export function incompleteNotice(
  refs: ReadonlyArray<IncompleteRef & { position: number }>,
  total: number
): string {
  if (refs.length === 0) return "";
  const detalle = refs
    .map((r) => {
      const donde = total > 1 ? ` — prenda ${r.position} de ${total}` : "";
      return `${r.label}${donde} (falta ${r.missing.join(", ")})`;
    })
    .join("; ");
  return `Completa estos campos antes de guardar — ${detalle}.`;
}

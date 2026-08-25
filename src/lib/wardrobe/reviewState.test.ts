// Tests del criterio de la pantalla de revisión. Ver nota sobre el runner en
// src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  attentionIds,
  autoExpandId,
  isComplete,
  missingFields,
  nextAttentionId,
  reviewListState,
  reviewVerdict,
  summaryLine,
  type ReviewEdits,
  type ReviewSignals,
} from "./reviewState.ts";

const COMPLETA: ReviewEdits = {
  category: "top",
  subcategory: "Suéter",
  color: "beige",
  occasions: ["Casual"],
};

const LIMPIO: ReviewSignals = {
  subcategoryAiRaw: null,
  duplicate: false,
  reconstructed: false,
  reconstructionReason: null,
  backgroundRemoved: true,
};

function edits(patch: Partial<ReviewEdits> = {}): ReviewEdits {
  return { ...COMPLETA, ...patch };
}

function signals(patch: Partial<ReviewSignals> = {}): ReviewSignals {
  return { ...LIMPIO, ...patch };
}

function fila(id: string, e: ReviewEdits, s: ReviewSignals = LIMPIO) {
  return { id, verdict: reviewVerdict(e, s) };
}

// ── Campos obligatorios ──────────────────────────────────────────────────────

test("los cuatro campos son obligatorios", () => {
  assert.deepEqual(missingFields(edits()), []);
  assert.deepEqual(missingFields(edits({ category: "" })), ["categoría"]);
  assert.deepEqual(missingFields(edits({ subcategory: "" })), ["subcategoría"]);
  assert.deepEqual(missingFields(edits({ color: "" })), ["color"]);
  assert.deepEqual(missingFields(edits({ occasions: [] })), ["ocasión"]);
});

test("una prenda vacía reporta los cuatro, en orden", () => {
  const vacia: ReviewEdits = { category: "", subcategory: "", color: "", occasions: [] };
  assert.deepEqual(missingFields(vacia), ["categoría", "subcategoría", "color", "ocasión"]);
  assert.equal(isComplete(vacia), false);
});

// ── Estado ───────────────────────────────────────────────────────────────────

test("completa y sin señales queda confirmada y no pide atención", () => {
  const v = reviewVerdict(edits(), signals());
  assert.equal(v.state, "confirmada");
  assert.equal(v.needsAttention, false);
  assert.deepEqual(v.notes, []);
});

test("un campo faltante la vuelve incompleta y pide atención", () => {
  const v = reviewVerdict(edits({ color: "" }), signals());
  assert.equal(v.state, "incompleta");
  assert.equal(v.needsAttention, true);
  assert.deepEqual(v.missing, ["color"]);
});

test("un duplicado con todo lleno es 'revisar', no 'incompleta' — no bloquea guardar", () => {
  const v = reviewVerdict(edits(), signals({ duplicate: true }));
  assert.equal(v.state, "revisar");
  assert.equal(v.needsAttention, true);
  assert.deepEqual(v.missing, []);
  assert.ok(v.notes.includes("posible_duplicado"));
});

test("faltar un campo gana sobre el duplicado: lo que bloquea manda", () => {
  const v = reviewVerdict(edits({ occasions: [] }), signals({ duplicate: true }));
  assert.equal(v.state, "incompleta");
  assert.ok(v.notes.includes("posible_duplicado"));
});

// ── Señal de "Vision dudó" ───────────────────────────────────────────────────

test("subcategory_ai_raw con subcategoría vacía deja el hint y marca la nota", () => {
  const v = reviewVerdict(edits({ subcategory: "" }), signals({ subcategoryAiRaw: "buzo" }));
  assert.equal(v.state, "incompleta");
  assert.equal(v.subcategoryHint, "buzo");
  assert.ok(v.notes.includes("subcategoria_dudosa"));
});

test("en cuanto el usuario elige subcategoría, el hint muere", () => {
  const v = reviewVerdict(edits({ subcategory: "Suéter" }), signals({ subcategoryAiRaw: "buzo" }));
  assert.equal(v.state, "confirmada");
  assert.equal(v.subcategoryHint, null);
  assert.deepEqual(v.notes, []);
});

test("un subcategory_ai_raw en blanco no cuenta como hint", () => {
  const v = reviewVerdict(edits({ subcategory: "" }), signals({ subcategoryAiRaw: "   " }));
  assert.equal(v.subcategoryHint, null);
  assert.equal(v.notes.includes("subcategoria_dudosa"), false);
});

// ── Notas informativas ───────────────────────────────────────────────────────

test("las notas de imagen informan pero no piden atención ni bloquean", () => {
  const v = reviewVerdict(
    edits(),
    signals({
      backgroundRemoved: false,
      reconstructionReason: "prenda sobre maniquí",
      reconstructed: false,
    })
  );
  assert.equal(v.state, "confirmada");
  assert.equal(v.needsAttention, false);
  assert.ok(v.notes.includes("fondo_sin_quitar"));
  assert.ok(v.notes.includes("foto_sin_mejorar"));
});

test("si la reconstrucción sí funcionó, no hay nota de foto sin mejorar", () => {
  const v = reviewVerdict(
    edits(),
    signals({ reconstructionReason: "prenda sobre maniquí", reconstructed: true })
  );
  assert.equal(v.notes.includes("foto_sin_mejorar"), false);
});

// ── Qué se abre solo ─────────────────────────────────────────────────────────

test("con una sola prenda por revisar, esa se abre sola", () => {
  const filas = [
    fila("a", edits()),
    fila("b", edits({ color: "" })),
    fila("c", edits()),
  ];
  assert.equal(autoExpandId(filas), "b");
});

test("con dos o más por revisar no se abre ninguna — eso es el scroll infinito", () => {
  const filas = [
    fila("a", edits({ color: "" })),
    fila("b", edits({ subcategory: "" })),
    fila("c", edits()),
  ];
  assert.equal(autoExpandId(filas), null);
  assert.deepEqual(attentionIds(filas), ["a", "b"]);
});

test("con todo en orden no se abre ninguna", () => {
  const filas = [fila("a", edits()), fila("b", edits())];
  assert.equal(autoExpandId(filas), null);
  assert.deepEqual(attentionIds(filas), []);
});

test("un lote entero vacío abre ninguna, no ocho", () => {
  const vacia: ReviewEdits = { category: "", subcategory: "", color: "", occasions: [] };
  const filas = Array.from({ length: 8 }, (_, i) => fila(`i${i}`, vacia));
  assert.equal(autoExpandId(filas), null);
  assert.equal(attentionIds(filas).length, 8);
});

// ── Recorrido guiado ─────────────────────────────────────────────────────────

test("el recorrido sigue el orden de la lista, salteando las que están bien", () => {
  const filas = [
    fila("a", edits({ color: "" })),
    fila("b", edits()),
    fila("c", edits({ occasions: [] })),
    fila("d", edits({ subcategory: "" })),
  ];
  assert.equal(nextAttentionId(filas, "a"), "c");
  assert.equal(nextAttentionId(filas, "c"), "d");
});

test("al llegar al final da la vuelta a la primera pendiente", () => {
  const filas = [
    fila("a", edits({ color: "" })),
    fila("b", edits()),
    fila("c", edits({ occasions: [] })),
  ];
  assert.equal(nextAttentionId(filas, "c"), "a");
});

test("si la única pendiente es la actual, no hay siguiente", () => {
  const filas = [fila("a", edits({ color: "" })), fila("b", edits())];
  assert.equal(nextAttentionId(filas, "a"), null);
});

test("el recorrido arranca aunque la actual ya esté resuelta", () => {
  const filas = [
    fila("a", edits()),
    fila("b", edits({ color: "" })),
  ];
  assert.equal(nextAttentionId(filas, "a"), "b");
});

// ── Resumen ──────────────────────────────────────────────────────────────────

test("el resumen se lee de un vistazo", () => {
  assert.equal(summaryLine(edits(), "Tops"), "Suéter · Beige · Casual");
});

test("sin subcategoría cae a la categoría, no a un hueco", () => {
  assert.equal(summaryLine(edits({ subcategory: "" }), "Tops"), "Tops · Beige · Casual");
});

test("el resumen DICE lo que falta en vez de callarlo", () => {
  const vacia: ReviewEdits = { category: "", subcategory: "", color: "", occasions: [] };
  assert.equal(summaryLine(vacia, null), "Falta categoría · Falta color · Falta ocasión");
});

test("con varias ocasiones muestra la primera y cuenta el resto", () => {
  assert.equal(
    summaryLine(edits({ occasions: ["Casual", "Trabajo", "Citas"] }), "Tops"),
    "Suéter · Beige · Casual +2"
  );
});

// ── Qué pantalla se pinta ────────────────────────────────────────────────────

test("con prendas en pantalla, un fetch fallido NO cambia la pantalla", () => {
  // El caso del incidente: el sondeo cada 2.5s falla una vez en Slow 4G y el
  // lote que el usuario está editando desaparece de la vista.
  assert.equal(
    reviewListState({ loading: false, fetchFailed: true, itemCount: 3 }),
    "lista"
  );
});

test("sin prendas y con la consulta caída es error, nunca vacío", () => {
  assert.equal(
    reviewListState({ loading: false, fetchFailed: true, itemCount: 0 }),
    "error"
  );
});

test("el vacío exige una respuesta exitosa", () => {
  assert.equal(
    reviewListState({ loading: false, fetchFailed: false, itemCount: 0 }),
    "vacia"
  );
});

test("mientras carga no se afirma ni vacío ni error", () => {
  assert.equal(
    reviewListState({ loading: true, fetchFailed: false, itemCount: 0 }),
    "cargando"
  );
  assert.equal(
    reviewListState({ loading: true, fetchFailed: true, itemCount: 0 }),
    "cargando"
  );
});

test("el camino normal con prendas", () => {
  assert.equal(
    reviewListState({ loading: false, fetchFailed: false, itemCount: 3 }),
    "lista"
  );
});

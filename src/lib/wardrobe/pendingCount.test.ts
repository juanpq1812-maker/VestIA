// Ver nota sobre el runner en src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import { DIAS_ANTES_DE_LIMPIAR, textoPendientes } from "./pendingCount.ts";

test("sin pendientes no hay aviso", () => {
  assert.equal(textoPendientes(0), null);
});

test("un número negativo tampoco inventa un aviso", () => {
  assert.equal(textoPendientes(-1), null);
});

test("una sola prenda va en singular, incluido el detalle", () => {
  const t = textoPendientes(1);
  assert.equal(t?.titulo, "Tienes 1 prenda sin confirmar");
  assert.equal(t?.detalle, "No aparece en tu armario hasta que la revises.");
  assert.equal(t?.cta, "Revisarla");
});

test("varias prendas van en plural", () => {
  const t = textoPendientes(3);
  assert.equal(t?.titulo, "Tienes 3 prendas sin confirmar");
  assert.equal(t?.detalle, "No aparecen en tu armario hasta que las revises.");
  assert.equal(t?.cta, "Revisarlas");
});

// Guardia de sincronía: DIAS_ANTES_DE_LIMPIAR es un espejo de
// STALE_DRAFT_DAYS en burstQueue.ts, que no se puede importar acá (arrastra
// las Server Actions del pipeline de imagen). Si allá cambia el número y acá
// no, el aviso vuelve a contar prendas que la limpieza va a borrar antes de
// que el usuario llegue a verlas.
test("el corte de limpieza sigue siendo 7 días — si cambia STALE_DRAFT_DAYS, cambia acá", () => {
  assert.equal(DIAS_ANTES_DE_LIMPIAR, 7);
});

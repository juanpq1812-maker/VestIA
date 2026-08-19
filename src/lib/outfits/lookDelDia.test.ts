// Ver nota sobre el runner en src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  pickLookDelDia,
  seedDelDia,
  type OutfitCandidato,
} from "./lookDelDia.ts";

const USER = "11111111-1111-1111-1111-111111111111";

function outfit(id: string, prendas = 4): OutfitCandidato {
  return {
    id,
    name: `Look ${id}`,
    occasion: "casual",
    clothing_item_ids: Array.from({ length: prendas }, (_, i) => `${id}-item-${i}`),
  };
}

const SIN_USOS: ReadonlySet<string> = new Set();

test("el mismo día devuelve siempre el mismo look", () => {
  const outfits = [outfit("a"), outfit("b"), outfit("c"), outfit("d")];
  const seed = seedDelDia(USER, "2026-08-18");

  const primera = pickLookDelDia({ seed, outfits, usadosRecientemente: SIN_USOS });
  const segunda = pickLookDelDia({ seed, outfits, usadosRecientemente: SIN_USOS });

  assert.equal(primera?.id, segunda?.id);
});

test("el orden en que llegan los outfits no cambia el resultado", () => {
  const seed = seedDelDia(USER, "2026-08-18");
  const enOrden = [outfit("a"), outfit("b"), outfit("c")];
  const alReves = [outfit("c"), outfit("b"), outfit("a")];

  assert.equal(
    pickLookDelDia({ seed, outfits: enOrden, usadosRecientemente: SIN_USOS })?.id,
    pickLookDelDia({ seed, outfits: alReves, usadosRecientemente: SIN_USOS })?.id
  );
});

test("días distintos proponen looks distintos", () => {
  const outfits = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => outfit(id));
  const elegidos = new Set(
    ["2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"].map(
      (dia) =>
        pickLookDelDia({
          seed: seedDelDia(USER, dia),
          outfits,
          usadosRecientemente: SIN_USOS,
        })?.id
    )
  );
  // No exigimos 4 distintos (el módulo puede repetir), pero sí que rote.
  assert.ok(elegidos.size > 1, "el look no rotó entre días");
});

test("dos usuarios el mismo día no reciben forzosamente el mismo look", () => {
  const outfits = ["a", "b", "c", "d", "e", "f"].map((id) => outfit(id));
  const otroUser = "22222222-2222-2222-2222-222222222222";
  const uno = pickLookDelDia({
    seed: seedDelDia(USER, "2026-08-18"),
    outfits,
    usadosRecientemente: SIN_USOS,
  });
  const dos = pickLookDelDia({
    seed: seedDelDia(otroUser, "2026-08-18"),
    outfits,
    usadosRecientemente: SIN_USOS,
  });
  assert.ok(uno && dos);
});

test("evita los outfits usados recientemente", () => {
  const outfits = [outfit("a"), outfit("b"), outfit("c")];
  const elegido = pickLookDelDia({
    seed: seedDelDia(USER, "2026-08-18"),
    outfits,
    usadosRecientemente: new Set(["a", "b"]),
  });
  assert.equal(elegido?.id, "c");
});

test("si TODOS son recientes cae sobre la lista completa en vez de no proponer nada", () => {
  const outfits = [outfit("a"), outfit("b")];
  const elegido = pickLookDelDia({
    seed: seedDelDia(USER, "2026-08-18"),
    outfits,
    usadosRecientemente: new Set(["a", "b"]),
  });
  assert.ok(elegido, "debía caer sobre el pool completo");
});

test("descarta outfits con menos de 3 prendas", () => {
  const outfits = [outfit("corto", 2), outfit("completo", 4)];
  const elegido = pickLookDelDia({
    seed: seedDelDia(USER, "2026-08-18"),
    outfits,
    usadosRecientemente: SIN_USOS,
  });
  assert.equal(elegido?.id, "completo");
});

test("sin outfits utilizables devuelve null", () => {
  assert.equal(
    pickLookDelDia({
      seed: seedDelDia(USER, "2026-08-18"),
      outfits: [outfit("corto", 1)],
      usadosRecientemente: SIN_USOS,
    }),
    null
  );
  assert.equal(
    pickLookDelDia({
      seed: seedDelDia(USER, "2026-08-18"),
      outfits: [],
      usadosRecientemente: SIN_USOS,
    }),
    null
  );
});

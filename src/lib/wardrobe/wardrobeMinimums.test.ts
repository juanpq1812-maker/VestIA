// Tests de los mínimos de armario. Ver nota sobre el runner en outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  checkWardrobeMinimums,
  countByCategory,
  describeMissingMinimums,
} from "./wardrobeMinimums.ts";

test("armario vacío", () => {
  const min = checkWardrobeMinimums({});
  assert.equal(min.ok, false);
  assert.equal(min.empty, true);
  assert.equal(min.satisfiedVia, null);
});

test("el mínimo justo (1 calzado, 2 tops, 2 bottoms) desbloquea la generación", () => {
  const min = checkWardrobeMinimums({ top: 2, bottom: 2, footwear: 1 });
  assert.equal(min.ok, true);
  assert.equal(min.satisfiedVia, "tops-bottoms");
});

test("1 top + 1 bottom NO alcanza: los 2 outfits saldrían iguales", () => {
  const min = checkWardrobeMinimums({ top: 1, bottom: 1, footwear: 1 });
  assert.equal(min.ok, false);
  assert.equal(min.tops.ok, false);
  assert.equal(min.bottoms.ok, false);
});

test("sin calzado no se genera aunque sobren tops y bottoms", () => {
  const min = checkWardrobeMinimums({ top: 8, bottom: 6 });
  assert.equal(min.ok, false);
  assert.equal(min.footwear.ok, false);
  assert.equal(min.satisfiedVia, "tops-bottoms");
});

test("un vestido más una prenda extra y calzado cumple por la vía del vestido", () => {
  const min = checkWardrobeMinimums({ dress: 1, top: 1, footwear: 1 });
  assert.equal(min.ok, true);
  assert.equal(min.satisfiedVia, "dress");
});

test("un vestido solo, sin acompañante, no alcanza", () => {
  const min = checkWardrobeMinimums({ dress: 1, footwear: 1 });
  assert.equal(min.ok, false);
  assert.equal(min.satisfiedVia, null);
});

test("outerwear y accesorios no cuentan para la base", () => {
  const min = checkWardrobeMinimums({ outerwear: 5, accessory: 9, footwear: 2 });
  assert.equal(min.ok, false);
  assert.equal(min.empty, false);
});

test("countByCategory agrupa las prendas", () => {
  const counts = countByCategory([
    { category: "top" },
    { category: "top" },
    { category: "footwear" },
  ]);
  assert.deepEqual(counts, { top: 2, footwear: 1 });
});

test("el mensaje de una línea nombra lo que falta, en tuteo", () => {
  const msg = describeMissingMinimums(checkWardrobeMinimums({ top: 2, bottom: 1 }));
  assert.match(msg, /1 par de zapatos/);
  assert.match(msg, /1 prenda de abajo/);
  assert.match(msg, /necesitas subir/);
  assert.ok(!/prendas de abajo/.test(msg), "singular cuando falta una sola");
});

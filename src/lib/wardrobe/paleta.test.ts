// Ver nota sobre el runner en src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import { calcularPaleta, PALETA_MINIMO_PRENDAS } from "./paleta.ts";

function repetir(color: string, n: number): string[] {
  return Array.from({ length: n }, () => color);
}

test("bajo el mínimo de prendas no devuelve tramos", () => {
  const pocas = repetir("negro", PALETA_MINIMO_PRENDAS - 1);
  assert.deepEqual(calcularPaleta(pocas), []);
});

test("los porcentajes suman exactamente 100", () => {
  // 3 colores en tercios: con Math.round suelto esto daría 33+33+33 = 99.
  const tercios = [...repetir("negro", 5), ...repetir("azul", 5), ...repetir("verde", 5)];
  const tramos = calcularPaleta(tercios);
  assert.equal(tramos.reduce((a, t) => a + t.pct, 0), 100);
});

test("suman 100 también con repartos feos", () => {
  const feo = [
    ...repetir("negro", 7),
    ...repetir("azul", 3),
    ...repetir("verde", 3),
    ...repetir("beige", 1),
  ];
  assert.equal(calcularPaleta(feo).reduce((a, t) => a + t.pct, 0), 100);
});

test("ordena de más a menos frecuente", () => {
  const items = [...repetir("azul", 2), ...repetir("negro", 6), ...repetir("verde", 3)];
  const tramos = calcularPaleta(items);
  assert.deepEqual(
    tramos.map((t) => t.nombre),
    ["negro", "verde", "azul"]
  );
});

test("agrupa la cola en 'otros' pasado el tope de tramos", () => {
  const muchos = [
    ...repetir("negro", 5),
    ...repetir("azul", 4),
    ...repetir("verde", 3),
    ...repetir("beige", 2),
    ...repetir("rojo", 1),
    ...repetir("rosa", 1),
  ];
  const tramos = calcularPaleta(muchos);
  assert.equal(tramos.length, 5);
  assert.equal(tramos[tramos.length - 1].nombre, "otros");
  assert.equal(tramos[tramos.length - 1].cantidad, 2); // rojo + rosa
});

test("ignora prendas sin color y normaliza mayúsculas y espacios", () => {
  const mezcla = [
    ...repetir("Negro", 4),
    ...repetir(" negro ", 2),
    ...repetir("azul", 3),
    null,
    null,
    "",
    "   ",
  ];
  const tramos = calcularPaleta(mezcla);
  assert.equal(tramos.length, 2);
  assert.equal(tramos[0].nombre, "negro");
  assert.equal(tramos[0].cantidad, 6);
});

test("un solo color da 100%", () => {
  const tramos = calcularPaleta(repetir("negro", 12));
  assert.deepEqual(tramos, [{ nombre: "negro", cantidad: 12, pct: 100 }]);
});

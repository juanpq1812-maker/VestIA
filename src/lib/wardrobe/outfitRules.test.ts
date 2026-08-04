// Tests de las reglas duras del generador de outfits.
//
// Corre con `npm test` (node --test, type-stripping nativo — sin runner extra).
// Por eso el módulo bajo prueba solo puede tener imports de TIPO con el alias
// `@/`: Node los borra y nunca intenta resolverlos.

import test from "node:test";
import assert from "node:assert/strict";

import {
  validateOutfit,
  thermalWeight,
  isNeutralColor,
  type OutfitItemLike,
} from "./outfitRules.ts";

function prenda(
  category: OutfitItemLike["category"],
  subcategory: string | null,
  primary_color: string | null
): OutfitItemLike {
  return { category, subcategory, primary_color };
}

// ---------------------------------------------------------------------------
// Los dos casos reales que motivaron todo el trabajo.
// ---------------------------------------------------------------------------

test("el outfit malo real (chaqueta + saco + pantaloneta + tenis) falla por capas y por térmica", () => {
  const outfit = [
    prenda("outerwear", "Chaqueta", "blanco"),
    prenda("outerwear", "Saco", "verde"),
    prenda("bottom", "Short", "beige"),
    prenda("footwear", "Tenis", "negro"),
  ];

  const { valid, violations } = validateOutfit(outfit);
  assert.equal(valid, false);

  const reglas = violations.map((v) => v.rule);
  assert.ok(reglas.includes("layers"), "dos outerwear deben violar 'layers'");
  assert.ok(
    reglas.includes("thermal"),
    "short (cálido) + saco (frío) deben violar 'thermal'"
  );
  // Bonus: el outfit tampoco tiene top ni vestido.
  assert.ok(reglas.includes("base"));
});

test("blanco + beige + negro + verde falla por el tope de neutros", () => {
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("bottom", "Jean", "beige"),
    prenda("footwear", "Tenis", "negro"),
    prenda("accessory", "Bolso", "verde"),
  ];

  const { valid, violations } = validateOutfit(outfit);
  assert.equal(valid, false);
  assert.deepEqual(
    violations.map((v) => v.rule),
    ["color"]
  );
  assert.match(violations[0].message, /neutros distintos/);
});

// ---------------------------------------------------------------------------
// Capas.
// ---------------------------------------------------------------------------

test("un top más una capa exterior es válido", () => {
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("outerwear", "Blazer", "negro"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Tenis", "blanco"),
  ];
  assert.equal(validateOutfit(outfit).valid, true);
});

test("dos tops violan 'layers' aunque no haya outerwear", () => {
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("top", "Camisa", "azul"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Tenis", "blanco"),
  ];
  const violations = validateOutfit(outfit).violations;
  assert.deepEqual(
    violations.map((v) => v.rule),
    ["layers"]
  );
});

test("cardigan y chaleco cuentan como outerwear: no hay excepción", () => {
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("outerwear", "Cardigan", "gris"),
    prenda("outerwear", "Chaleco", "negro"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Tenis", "blanco"),
  ];
  const violations = validateOutfit(outfit).violations;
  assert.ok(violations.some((v) => v.rule === "layers"));
});

// ---------------------------------------------------------------------------
// Térmica.
// ---------------------------------------------------------------------------

test("clasificación térmica por subcategoría, con tildes y sin ellas", () => {
  assert.equal(thermalWeight(prenda("bottom", "Short", null)), "ligero");
  assert.equal(thermalWeight(prenda("top", "Suéter", null)), "abrigado");
  assert.equal(thermalWeight(prenda("top", "sueter", null)), "abrigado");
  assert.equal(thermalWeight(prenda("outerwear", "Gabán", null)), "abrigado");
  assert.equal(thermalWeight(prenda("bottom", "Jean", null)), "medio");
  // Subcategoría desconocida o nula → "medio", que nunca genera violaciones.
  assert.equal(thermalWeight(prenda("top", null, null)), "medio");
  assert.equal(thermalWeight(prenda("top", "Prenda rarísima", null)), "medio");
});

test("sandalias con abrigo violan 'thermal'", () => {
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("outerwear", "Abrigo", "negro"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Sandalias", "café"),
  ];
  assert.ok(validateOutfit(outfit).violations.some((v) => v.rule === "thermal"));
});

test("los accesorios no disparan la regla térmica", () => {
  // Bufanda (abrigado) con sandalias (ligero): raro, pero no lo castigamos —
  // castigarlo quema reintentos sin mejorar el outfit de verdad.
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Sandalias", "café"),
    prenda("accessory", "Bufanda", "café"),
  ];
  assert.ok(!validateOutfit(outfit).violations.some((v) => v.rule === "thermal"));
});

test("prendas intermedias combinan con cálido y con frío", () => {
  const conCalor = [
    prenda("top", "Camiseta", "blanco"),
    prenda("bottom", "Short", "azul"),
    prenda("footwear", "Tenis", "blanco"),
  ];
  const conFrio = [
    prenda("top", "Camisa", "blanco"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Botas", "negro"),
  ];
  assert.equal(validateOutfit(conCalor).valid, true);
  assert.equal(validateOutfit(conFrio).valid, true);
});

// ---------------------------------------------------------------------------
// Colores.
// ---------------------------------------------------------------------------

test("los neutros son los reales de la paleta; camel y navy solo como alias", () => {
  for (const c of ["negro", "blanco", "gris", "beige", "café"]) {
    assert.equal(isNeutralColor(c), true, `${c} debería ser neutro`);
  }
  assert.equal(isNeutralColor("camel"), true); // alias defensivo
  assert.equal(isNeutralColor("navy"), true); // alias defensivo
  assert.equal(isNeutralColor("Café"), true); // mayúsculas
  assert.equal(isNeutralColor("verde"), false);
  assert.equal(isNeutralColor("multicolor"), false);
  assert.equal(isNeutralColor(null), false);
});

test("cuatro colores no neutros violan la regla de 3 colores", () => {
  const outfit = [
    prenda("top", "Camiseta", "rojo"),
    prenda("bottom", "Jean", "azul"),
    prenda("footwear", "Tenis", "verde"),
    prenda("accessory", "Bolso", "morado"),
  ];
  const violations = validateOutfit(outfit).violations;
  assert.ok(violations.some((v) => v.rule === "color"));
});

test("dos neutros más tres colores es el máximo permitido", () => {
  const outfit = [
    prenda("top", "Camiseta", "blanco"),
    prenda("bottom", "Jean", "negro"),
    prenda("footwear", "Tenis", "rojo"),
    prenda("accessory", "Bolso", "azul"),
    prenda("outerwear", "Blazer", "verde"),
  ];
  assert.equal(validateOutfit(outfit).valid, true);
});

test("repetir el mismo color en varias prendas no suma al conteo", () => {
  const outfit = [
    prenda("top", "Camiseta", "negro"),
    prenda("bottom", "Jean", "negro"),
    prenda("footwear", "Tenis", "negro"),
    prenda("accessory", "Bolso", "negro"),
  ];
  assert.equal(validateOutfit(outfit).valid, true);
});

test("las prendas sin color no rompen la validación", () => {
  const outfit = [
    prenda("top", "Camiseta", null),
    prenda("bottom", "Jean", ""),
    prenda("footwear", "Tenis", "blanco"),
  ];
  assert.equal(validateOutfit(outfit).valid, true);
});

// ---------------------------------------------------------------------------
// Base mínima.
// ---------------------------------------------------------------------------

test("un vestido con calzado cumple la base", () => {
  const outfit = [prenda("dress", "Vestido largo", "negro"), prenda("footwear", "Tacones", "negro")];
  assert.equal(validateOutfit(outfit).valid, true);
});

test("sin calzado falla la base", () => {
  const outfit = [prenda("top", "Camiseta", "blanco"), prenda("bottom", "Jean", "azul")];
  const violations = validateOutfit(outfit).violations;
  assert.ok(violations.some((v) => v.rule === "base"));
  assert.match(violations.find((v) => v.rule === "base")!.message, /calzado/);
});

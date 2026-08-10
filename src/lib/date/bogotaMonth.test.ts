// Ver nota sobre el runner en src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import { getCurrentBogotaMonth } from "./bogotaMonth.ts";

// Bogotá es UTC-5 fijo, sin horario de verano.
test("31 de agosto 23:30 en Bogotá (ya 1 de septiembre en UTC) sigue siendo agosto", () => {
  // 2026-09-01T04:30:00Z = 2026-08-31T23:30:00-05:00
  const enUtcYaEsSeptiembre = new Date("2026-09-01T04:30:00Z");
  assert.equal(getCurrentBogotaMonth(enUtcYaEsSeptiembre), "2026-08");
});

test("1 de septiembre 00:00 en Bogotá ya es septiembre", () => {
  // 2026-09-01T05:00:00Z = 2026-09-01T00:00:00-05:00
  const medianocheBogota = new Date("2026-09-01T05:00:00Z");
  assert.equal(getCurrentBogotaMonth(medianocheBogota), "2026-09");
});

test("formato siempre YYYY-MM con ceros a la izquierda", () => {
  const enero = new Date("2026-01-15T12:00:00Z");
  assert.equal(getCurrentBogotaMonth(enero), "2026-01");
});

// Ver nota sobre el runner en src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import {
  isPremiumFrom,
  resolveGenerationDecision,
  resolvePhotoImprovementDecision,
} from "./planLogic.ts";

const LIMIT = 10;

test("isPremiumFrom: free nunca es premium", () => {
  assert.equal(isPremiumFrom("free", null), false);
});

test("isPremiumFrom: premium sin premium_until (trial/cortesía sin tope) es premium", () => {
  assert.equal(isPremiumFrom("premium", null), true);
});

test("isPremiumFrom: premium con premium_until en el futuro es premium", () => {
  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isPremiumFrom("premium", manana), true);
});

test("isPremiumFrom: premium con premium_until vencido se comporta como free", () => {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isPremiumFrom("premium", ayer), false);
});

test("resolveGenerationDecision: premium permite siempre y no escribe nada", () => {
  const d = resolveGenerationDecision({
    isPremium: true,
    monthlyGenerations: LIMIT,
    monthlyGenerationsMonth: "2026-08",
    currentMonth: "2026-08",
    limit: LIMIT,
  });
  assert.equal(d.allowed, true);
  if (d.allowed) {
    assert.equal(d.write, null);
    assert.equal(d.remaining, null);
  }
});

test("resolveGenerationDecision: mes guardado distinto al actual resetea a 1", () => {
  const d = resolveGenerationDecision({
    isPremium: false,
    monthlyGenerations: 9,
    monthlyGenerationsMonth: "2026-07",
    currentMonth: "2026-08",
    limit: LIMIT,
  });
  assert.equal(d.allowed, true);
  if (d.allowed) {
    assert.deepEqual(d.write, { monthly_generations: 1, monthly_generations_month: "2026-08" });
    assert.equal(d.remaining, LIMIT - 1);
  }
});

test("resolveGenerationDecision: mes guardado null (perfil nuevo) también resetea", () => {
  const d = resolveGenerationDecision({
    isPremium: false,
    monthlyGenerations: 0,
    monthlyGenerationsMonth: null,
    currentMonth: "2026-08",
    limit: LIMIT,
  });
  assert.equal(d.allowed, true);
  if (d.allowed) assert.deepEqual(d.write, { monthly_generations: 1, monthly_generations_month: "2026-08" });
});

test("resolveGenerationDecision: mismo mes con cupo incrementa", () => {
  const d = resolveGenerationDecision({
    isPremium: false,
    monthlyGenerations: 3,
    monthlyGenerationsMonth: "2026-08",
    currentMonth: "2026-08",
    limit: LIMIT,
  });
  assert.equal(d.allowed, true);
  if (d.allowed) {
    assert.deepEqual(d.write, { monthly_generations: 4, monthly_generations_month: "2026-08" });
    assert.equal(d.remaining, LIMIT - 4);
  }
});

test("resolveGenerationDecision: mismo mes con cupo agotado bloquea sin escribir", () => {
  const d = resolveGenerationDecision({
    isPremium: false,
    monthlyGenerations: LIMIT,
    monthlyGenerationsMonth: "2026-08",
    currentMonth: "2026-08",
    limit: LIMIT,
  });
  assert.equal(d.allowed, false);
  if (!d.allowed) assert.equal(d.reason, "plan_limit");
});

test("resolvePhotoImprovementDecision: premium permite siempre sin escribir", () => {
  const d = resolvePhotoImprovementDecision({
    isPremium: true,
    photoImprovementsUsed: 5,
    limit: 5,
  });
  assert.equal(d.allowed, true);
  if (d.allowed) assert.equal(d.write, null);
});

test("resolvePhotoImprovementDecision: free con cupo incrementa (contador de por vida)", () => {
  const d = resolvePhotoImprovementDecision({
    isPremium: false,
    photoImprovementsUsed: 2,
    limit: 5,
  });
  assert.equal(d.allowed, true);
  if (d.allowed) assert.deepEqual(d.write, { photo_improvements_used: 3 });
});

test("resolvePhotoImprovementDecision: free con cupo agotado bloquea", () => {
  const d = resolvePhotoImprovementDecision({
    isPremium: false,
    photoImprovementsUsed: 5,
    limit: 5,
  });
  assert.equal(d.allowed, false);
});

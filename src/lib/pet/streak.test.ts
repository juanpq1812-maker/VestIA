// Ver nota sobre el runner en src/lib/wardrobe/outfitRules.test.ts.

import test from "node:test";
import assert from "node:assert/strict";

import { bogotaDay, computeStreak, STREAK_WINDOW_DAYS } from "./streak.ts";

// 2026-08-18T15:00:00Z = 2026-08-18T10:00:00-05:00 (miércoles por la mañana).
const HOY = new Date("2026-08-18T15:00:00Z");

test("bogotaDay respeta UTC-5: 23:30 del 18 en Bogotá no es todavía el 19", () => {
  // 2026-08-19T04:30:00Z = 2026-08-18T23:30:00-05:00
  assert.equal(bogotaDay(new Date("2026-08-19T04:30:00Z")), "2026-08-18");
  // 2026-08-19T05:00:00Z = 2026-08-19T00:00:00-05:00
  assert.equal(bogotaDay(new Date("2026-08-19T05:00:00Z")), "2026-08-19");
});

test("la ventana son 7 días, del más antiguo al de hoy", () => {
  const { days } = computeStreak([], HOY);
  assert.equal(days.length, STREAK_WINDOW_DAYS);
  assert.equal(days[0].day, "2026-08-12");
  assert.equal(days[days.length - 1].day, "2026-08-18");
});

test("hoy cuenta como activo aunque no haya fila — el after() aún no corrió", () => {
  const { days, current } = computeStreak([], HOY);
  assert.equal(days[days.length - 1].active, true);
  assert.equal(current, 1);
});

test("cuenta solo los días consecutivos que terminan hoy", () => {
  // Activo el 12 y 13 (racha vieja, cortada), y el 16 y 17 pegados a hoy.
  const { current } = computeStreak(
    ["2026-08-12", "2026-08-13", "2026-08-16", "2026-08-17"],
    HOY
  );
  assert.equal(current, 3); // 16, 17, 18
});

test("un hueco justo ayer deja la racha en 1", () => {
  const { current } = computeStreak(
    ["2026-08-14", "2026-08-15", "2026-08-16"],
    HOY
  );
  assert.equal(current, 1);
});

test("la racha se topa en la ventana aunque la actividad venga de más atrás", () => {
  const todosLosDias = [
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
    "2026-08-17",
  ];
  assert.equal(computeStreak(todosLosDias, HOY).current, STREAK_WINDOW_DAYS);
});

test("días repetidos o desordenados no alteran el resultado", () => {
  const { current } = computeStreak(
    ["2026-08-17", "2026-08-16", "2026-08-17", "2026-08-16"],
    HOY
  );
  assert.equal(current, 3);
});

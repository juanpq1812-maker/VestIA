// Reglas duras de coherencia de un outfit.
//
// Este archivo es la ÚNICA fuente de verdad de las tres reglas que el system
// prompt le pide a Haiku y que el validador post-generación verifica. Si
// cambias una regla acá, `buildRulesPromptBlock()` la refleja automáticamente en
// el prompt — no hay que editar el texto a mano en dos lugares.
//
// Por qué existe el validador y no basta el prompt: el outfit que motivó todo
// esto (chaqueta blanca + saco verde + pantaloneta beige + tenis negros)
// CUMPLÍA las reglas que había. Blanco, beige y negro son neutros, y la regla
// decía que los neutros no cuentan contra el límite de 3 colores, así que el
// outfit tenía "un solo color". Haiku obedeció al pie de la letra y el
// resultado igual fue malo. Las tres reglas de acá cierran esos huecos:
//
//   a) coherencia térmica  — pantaloneta (calor) + saco/chaqueta (frío)
//   b) capas superiores    — chaqueta + saco apilados
//   c) tope de neutros     — blanco + beige + negro + verde
//
// Función pura, sin dependencias de runtime (solo `import type`, que Node borra
// con type-stripping): testeable con `node --test` sin resolver el alias `@/`.

import type { ClothingCategory } from "@/types/database";

/** Lo mínimo que necesita saber el validador de cada prenda. */
export type OutfitItemLike = {
  category: ClothingCategory;
  subcategory: string | null;
  primary_color: string | null;
};

// ---------------------------------------------------------------------------
// (c) Neutros.
// ---------------------------------------------------------------------------

// OJO: la lista vieja del system prompt decía "blanco, negro, gris, beige,
// camel, navy", pero camel y navy NO existen en `COLOR_PALETTE`
// (lib/wardrobe/constants.ts) — la app nunca los guarda, así que eran letra
// muerta. Estos son los neutros reales de la paleta. Los alias van solo por si
// la IA (o una prenda vieja) escribió el color en texto libre.
export const NEUTRAL_COLORS: readonly string[] = [
  "negro",
  "blanco",
  "gris",
  "beige",
  "café",
];

const NEUTRAL_ALIASES: readonly string[] = [
  "cafe", // sin tilde
  "camel",
  "navy",
  "marino",
  "azul marino",
  "crema",
  "marrón",
  "marron",
];

/** Máximo de colores NO neutros distintos (la clásica "regla de 3 colores"). */
export const MAX_NON_NEUTRAL_COLORS = 3;
/**
 * Máximo de neutros DISTINTOS, pero SOLO cuando el outfit ya tiene al menos un
 * color no neutro.
 *
 * Este es el tope que faltaba: sin él, blanco + beige + negro + verde pasaba
 * como "un solo color". La condición del color de por medio salió de medir la
 * primera versión contra un armario real: sin ella la regla se disparaba en
 * outfits perfectamente buenos (gris + negro + blanco), gastaba un reintento de
 * ~7s en casi toda generación y terminaba devolviendo la violación igual.
 *
 * Un look enteramente neutro es una paleta monocroma deliberada y se permite.
 * Lo que se rompe es apilar neutros ADEMÁS de un color: ahí la paleta deja de
 * leerse.
 */
export const MAX_NEUTRAL_COLORS = 2;

function normalizeColor(raw: string | null): string | null {
  const c = raw?.trim().toLowerCase();
  return c && c.length > 0 ? c : null;
}

export function isNeutralColor(raw: string | null): boolean {
  const c = normalizeColor(raw);
  if (!c) return false;
  return NEUTRAL_COLORS.includes(c) || NEUTRAL_ALIASES.includes(c);
}

// ---------------------------------------------------------------------------
// (a) Peso térmico por subcategoría.
// ---------------------------------------------------------------------------

export type ThermalWeight = "ligero" | "medio" | "abrigado";

// Cubre las 56 subcategorías de SUBCATEGORIES (lib/wardrobe/constants.ts). Solo
// se listan las que NO son "medio": el default es "medio", que combina con
// todo. Se escriben tal como el usuario las ve — la comparación normaliza
// (minúsculas, sin tildes) y el prompt las muestra tal cual.
const THERMAL_LIGERO: readonly string[] = [
  // top
  "Tank top",
  "Crop Top",
  "Body",
  "Corset",
  // bottom
  "Short",
  "Bermuda",
  "Falda",
  "Falda denim",
  "Falda cargo",
  // dress
  "Vestido corto",
  // footwear
  "Sandalias",
  "Chanclas",
  "Zuecos",
  // accessory
  "Gafas de sol",
  "Gorra",
  "Sombrero",
];

const THERMAL_ABRIGADO: readonly string[] = [
  // top
  "Suéter",
  "Hoodie",
  // outerwear
  // "Saco" en Colombia es la prenda tejida de abrigo, no el saco de vestir
  // (eso es "Blazer", que sí queda como intermedio). Por eso va acá: saco con
  // pantaloneta es justo la incoherencia que reportó el usuario.
  "Saco",
  "Gabán",
  "Abrigo",
  "Abrigo largo",
  "Gabardina",
  "Impermeable",
  "Cortavientos",
  // footwear
  "Botas",
  // accessory
  "Bufanda",
  "Guantes",
  "Gorro",
];

/** Minúsculas y sin tildes, para que "Suéter" y "sueter" caigan en la misma clave. */
function normalizeSubcategory(raw: string | null): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const LIGERO_KEYS = new Set(THERMAL_LIGERO.map(normalizeSubcategory));
const ABRIGADO_KEYS = new Set(THERMAL_ABRIGADO.map(normalizeSubcategory));

export function thermalWeight(item: OutfitItemLike): ThermalWeight {
  const sub = normalizeSubcategory(item.subcategory);
  if (LIGERO_KEYS.has(sub)) return "ligero";
  if (ABRIGADO_KEYS.has(sub)) return "abrigado";
  // Sin subcategoría reconocida caemos a "medio", que no genera violaciones.
  // Preferimos un falso negativo (dejar pasar un outfit raro) antes que un
  // falso positivo que queme un reintento por un dato incompleto.
  return "medio";
}

// ---------------------------------------------------------------------------
// (b) Capas superiores.
// ---------------------------------------------------------------------------

export const MAX_OUTERWEAR = 1;
/** 1 top + 1 outerwear. Nunca 2 tops, nunca 2 abrigos. */
export const MAX_UPPER_LAYERS = 2;

// Deliberadamente SIN excepción para Chaleco y Cardigan: el outfit malo era
// exactamente chaqueta + saco, y una excepción "esta capa no cuenta" reabre esa
// misma puerta. "1 outerwear y ya" es una regla que el modelo obedece sin
// ambigüedad.

// ---------------------------------------------------------------------------
// Validador.
// ---------------------------------------------------------------------------

export type OutfitViolationRule = "layers" | "thermal" | "color" | "base";

export type OutfitViolation = {
  rule: OutfitViolationRule;
  /**
   * Redactado en español, en segunda persona neutra, para dos usos a la vez:
   * el log de diagnóstico y el bloque de CORRECCIÓN que se le reinyecta al
   * modelo en el reintento (un reintento a ciegas repite el mismo error).
   */
  message: string;
};

export type OutfitValidation = {
  valid: boolean;
  violations: OutfitViolation[];
};

/**
 * Valida las reglas DURAS de un outfit ya armado.
 *
 * NO valida balance de silueta ni coherencia de patrones: esos datos no están
 * estructurados en la base (no guardamos "oversized" ni "estampado"), así que
 * quedan solo como guía del prompt.
 */
export function validateOutfit(items: readonly OutfitItemLike[]): OutfitValidation {
  const violations: OutfitViolation[] = [];

  // ── (b) Capas superiores ────────────────────────────────────────────────
  const tops = items.filter((i) => i.category === "top");
  const outerwear = items.filter((i) => i.category === "outerwear");
  const upperCount = tops.length + outerwear.length;

  if (outerwear.length > MAX_OUTERWEAR) {
    violations.push({
      rule: "layers",
      message: `El outfit tiene ${outerwear.length} prendas de abrigo (${listar(outerwear)}). Solo puede llevar una capa exterior.`,
    });
  }
  if (tops.length > 1) {
    violations.push({
      rule: "layers",
      message: `El outfit tiene ${tops.length} prendas superiores (${listar(tops)}). Solo puede llevar un top.`,
    });
  }
  if (
    upperCount > MAX_UPPER_LAYERS &&
    outerwear.length <= MAX_OUTERWEAR &&
    tops.length <= 1
  ) {
    violations.push({
      rule: "layers",
      message: `El outfit apila ${upperCount} prendas en la parte superior. El máximo es 2 (un top más una capa exterior).`,
    });
  }

  // ── (a) Coherencia térmica ──────────────────────────────────────────────
  // Los accesorios se clasifican pero no cuentan acá: castigar "bufanda con
  // sandalias" genera falsos positivos que queman reintentos sin mejorar el
  // outfit de verdad.
  const termicas = items.filter((i) => i.category !== "accessory");
  const ligeras = termicas.filter((i) => thermalWeight(i) === "ligero");
  const abrigadas = termicas.filter((i) => thermalWeight(i) === "abrigado");

  if (ligeras.length > 0 && abrigadas.length > 0) {
    violations.push({
      rule: "thermal",
      message: `El outfit mezcla prendas de clima cálido (${listar(ligeras)}) con prendas de clima frío (${listar(abrigadas)}). Elige un solo registro de temperatura.`,
    });
  }

  // ── (c) Colores ─────────────────────────────────────────────────────────
  // Solo miramos `primary_color`: `secondary_colors` es demasiado ruidoso para
  // una regla dura. "multicolor" cuenta como un no-neutro más (no es
  // verificable más allá de eso).
  const neutros = new Set<string>();
  const noNeutros = new Set<string>();
  for (const item of items) {
    const c = normalizeColor(item.primary_color);
    if (!c) continue;
    if (isNeutralColor(c)) neutros.add(c);
    else noNeutros.add(c);
  }

  if (noNeutros.size > MAX_NON_NEUTRAL_COLORS) {
    violations.push({
      rule: "color",
      message: `El outfit usa ${noNeutros.size} colores distintos (${[...noNeutros].join(", ")}). El máximo son ${MAX_NON_NEUTRAL_COLORS} sin contar neutros.`,
    });
  }
  // Solo con un color de por medio: un look todo-neutro es monocromo a
  // propósito y se deja pasar (ver la nota en MAX_NEUTRAL_COLORS).
  if (neutros.size > MAX_NEUTRAL_COLORS && noNeutros.size > 0) {
    violations.push({
      rule: "color",
      message: `El outfit combina ${neutros.size} neutros distintos (${[...neutros].join(", ")}) con color (${[...noNeutros].join(", ")}). Con un color de por medio, el máximo son ${MAX_NEUTRAL_COLORS} neutros: quita uno o deja el look enteramente neutro.`,
    });
  }

  // ── Base mínima ─────────────────────────────────────────────────────────
  const tieneCalzado = items.some((i) => i.category === "footwear");
  const tieneVestido = items.some((i) => i.category === "dress");
  const tieneBottom = items.some((i) => i.category === "bottom");
  const baseOk = tieneCalzado && (tieneVestido || (tops.length > 0 && tieneBottom));

  if (!baseOk) {
    const faltantes: string[] = [];
    if (!tieneCalzado) faltantes.push("calzado");
    if (!tieneVestido && tops.length === 0) faltantes.push("una prenda superior");
    if (!tieneVestido && !tieneBottom) faltantes.push("una prenda inferior");
    violations.push({
      rule: "base",
      message: `Al outfit le falta ${faltantes.join(" y ")}. Todo outfit necesita calzado más un top con un bottom, o bien un vestido.`,
    });
  }

  return { valid: violations.length === 0, violations };
}

function listar(items: readonly OutfitItemLike[]): string {
  return items.map((i) => i.subcategory ?? i.category).join(" + ");
}

// ---------------------------------------------------------------------------
// Proyección de las mismas reglas hacia el prompt.
// ---------------------------------------------------------------------------

/**
 * Bloque de reglas para el system prompt. Se genera desde las mismas constantes
 * que usa `validateOutfit`, para que el modelo y el validador nunca se
 * contradigan.
 */
export function buildRulesPromptBlock(): string {
  return [
    `COHERENCIA FÍSICA DEL OUTFIT (obligatorio, se verifica automáticamente después de tu respuesta):`,
    ``,
    `   A. CAPAS SUPERIORES:`,
    `   - Máximo ${MAX_OUTERWEAR} prenda de outerwear (chaqueta, saco, blazer, abrigo, cardigan, chaleco, gabán, gabardina, impermeable, cortavientos) por outfit. NUNCA dos.`,
    `   - Máximo ${MAX_UPPER_LAYERS} prendas superiores en total: 1 top + 1 outerwear. NUNCA dos tops (nada de camiseta + camisa, ni camisa + suéter).`,
    `   - No hay excepciones: el cardigan y el chaleco cuentan como outerwear igual que una chaqueta.`,
    ``,
    `   B. COHERENCIA TÉRMICA:`,
    `   - Cada prenda tiene un registro de temperatura. NUNCA mezcles prendas de clima cálido con prendas de clima frío en el mismo outfit.`,
    `   - Clima cálido: ${THERMAL_LIGERO.join(", ")}.`,
    `   - Clima frío: ${THERMAL_ABRIGADO.join(", ")}.`,
    `   - El resto (camiseta, camisa, blusa, jean, pantalón, leggings, chaqueta, blazer, cardigan, chaleco, tenis, zapatos formales, tacones, mocasines, etc.) es intermedio y combina con cualquiera de los dos.`,
    `   - Ejemplo de lo que está PROHIBIDO: pantaloneta o short con saco, suéter o abrigo. Sandalias con bufanda.`,
    ``,
    `   C. LÍMITE DE COLORES:`,
    `   - Máximo ${MAX_NON_NEUTRAL_COLORS} colores no neutros distintos por outfit.`,
    `   - Los neutros son exactamente: ${NEUTRAL_COLORS.join(", ")}. No cuentan contra ese límite de ${MAX_NON_NEUTRAL_COLORS}.`,
    `   - PERO: en cuanto el outfit incluye aunque sea UN color no neutro, puedes usar máximo ${MAX_NEUTRAL_COLORS} neutros distintos. Apilar neutros ADEMÁS de un color desarma la paleta.`,
    `   - Un outfit ENTERAMENTE neutro (sin ningún color) es una paleta monocroma deliberada y está permitido con los neutros que quieras.`,
    `   - PROHIBIDO: blanco + beige + negro + verde (3 neutros distintos más un color).`,
    `   - PERMITIDO: gris + negro + blanco (todo neutro, monocromo).`,
    ``,
    `   Estas tres reglas aplican SIEMPRE, incluido el modo "sorpréndeme": son de coherencia física, no de ocasión.`,
  ].join("\n");
}

/**
 * Bloque de corrección para el reintento. Un reintento a ciegas repite el mismo
 * error, así que le decimos al modelo exactamente qué falló.
 */
export function buildCorrectionPromptBlock(
  violationsByOutfit: readonly { name: string; violations: readonly OutfitViolation[] }[]
): string {
  const detalles = violationsByOutfit
    .filter((o) => o.violations.length > 0)
    .map((o) => [`- Outfit "${o.name}":`, ...o.violations.map((v) => `  · ${v.message}`)].join("\n"));

  return [
    `CORRECCIÓN OBLIGATORIA — tu propuesta anterior violó reglas de coherencia física:`,
    ...detalles,
    ``,
    `Vuelve a proponer los outfits corrigiendo EXACTAMENTE esos problemas, cambiando las prendas necesarias por otras del armario. No repitas las combinaciones que acabo de rechazar.`,
  ].join("\n");
}

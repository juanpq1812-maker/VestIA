// Mapea la respuesta de Claude Vision (analyzeClothingImageAction) a las
// opciones válidas del formulario de subida (categoría/subcategoría/color/
// ocasiones). Compartido entre el flujo individual (UploadForm.tsx) y el
// modo ráfaga (burstQueue.ts).

import { COLOR_PALETTE, ITEM_OCCASIONS, SUBCATEGORIES } from "@/lib/wardrobe/constants";
import type { ClothingCategory } from "@/types/database";

const COLOR_RGB: Record<string, [number, number, number]> = {
  negro: [17, 17, 17],
  blanco: [255, 255, 255],
  gris: [107, 114, 128],
  azul: [37, 99, 235],
  rojo: [220, 38, 38],
  verde: [22, 163, 74],
  amarillo: [250, 204, 21],
  rosa: [236, 72, 153],
  morado: [124, 58, 237],
  beige: [214, 199, 163],
  café: [107, 63, 29],
  naranja: [249, 115, 22],
};

export function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const n = parseInt(clean, 16);
  if (isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexToColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "negro";
  let minDist = Infinity;
  let closest = "negro";
  for (const [name, rep] of Object.entries(COLOR_RGB)) {
    const dist = Math.sqrt(
      (rgb[0] - rep[0]) ** 2 + (rgb[1] - rep[1]) ** 2 + (rgb[2] - rep[2]) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      closest = name;
    }
  }
  return closest;
}

export function normStr(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function matchColorToPalette(colorName: string, colorHex: string): string {
  const n = normStr(colorName);
  const exact = COLOR_PALETTE.find((c) => normStr(c.name) === n);
  if (exact) return exact.name;
  const partial = COLOR_PALETTE.find((c) => {
    const p = normStr(c.name);
    return n.includes(p) || p.includes(n);
  });
  if (partial) return partial.name;
  if (colorHex) return hexToColorName(colorHex);
  return "";
}

// Colombianismos que Vision puede devolver y que no matchean por texto
// contra SUBCATEGORIES (ni exacto ni substring) — reportados en el bug
// original (foto de un "buzo blanco" y un "saco negro" que quedaron sin
// subcategoría), pero OJO: son hipótesis, no confirmados con datos reales de
// `subcategory_ai_raw` (esa columna se agregó después de esos casos, nunca
// quedó registrado el string exacto que devolvió Vision para ellos). Se
// resuelven ANTES del match exacto/substring, uno por categoría porque el
// mismo colombianismo puede significar cosas distintas según la prenda (ej.
// "saco" en `top` es un suéter tejido; en `outerwear` ya matchea exacto
// contra "Saco" sin necesitar sinónimo).
const SUBCATEGORY_SYNONYMS: Partial<Record<ClothingCategory, Record<string, string>>> = {
  top: {
    buzo: "Suéter",
    saco: "Suéter",
    pulover: "Suéter", // normStr ya le quita el acento a "pulóver"
    sudadera: "Hoodie",
  },
};

// Reglas por palabra clave (substring, no string exacto) — para cuando
// Vision devuelve una frase descriptiva distinta cada vez pero que casi
// siempre incluye una palabra reconocible. A diferencia de
// SUBCATEGORY_SYNONYMS, esto SÍ está confirmado con datos reales de
// `subcategory_ai_raw`: las 3 menciones de "zapatilla" vistas en producción
// (footwear) las corrigió el usuario a mano a "Tenis" las 3 veces. No se
// agregó una regla equivalente para `top` — ahí Vision genera frases ad-hoc
// ("crop top sin mangas", "top fruncido con volantes", "corset"...) que no
// comparten una palabra clave estable, y el criterio humano al corregirlas
// fue inconsistente entre sí — cualquier regla ahí sería adivinar, no datos.
const SUBCATEGORY_KEYWORD_RULES: Partial<Record<ClothingCategory, Array<{ keyword: string; result: string }>>> = {
  footwear: [{ keyword: "zapatilla", result: "Tenis" }],
};

export function matchSubcategory(category: string, aiSubcat: string): string {
  const opts = SUBCATEGORIES[category as ClothingCategory] ?? [];
  const n = normStr(aiSubcat);

  const synonym = SUBCATEGORY_SYNONYMS[category as ClothingCategory]?.[n];
  if (synonym && opts.includes(synonym)) return synonym;

  const keywordRule = SUBCATEGORY_KEYWORD_RULES[category as ClothingCategory]?.find((r) =>
    n.includes(normStr(r.keyword))
  );
  if (keywordRule && opts.includes(keywordRule.result)) return keywordRule.result;

  const exact = opts.find((o) => normStr(o) === n);
  if (exact) return exact;

  // Entre todas las opciones que matchean parcialmente gana la MAS LARGA, no
  // la primera del array. Con subcategorias compuestas ("Falda denim",
  // "Abrigo largo") un `find` normal devolvia siempre la generica, porque
  // "Falda"/"Abrigo" aparecen antes en la lista: Vision decia "falda denim" y
  // la prenda terminaba como "Falda". Asi el orden de SUBCATEGORIES sigue
  // siendo el orden de los chips en el formulario, sin afectar al match.
  //
  // OJO — esto NO resuelve el caso inverso, cuando la generica es la cadena
  // mas larga que la especifica: "pantalon cargo" sigue cayendo en "Pantalon"
  // (8) y no en "Cargo" (5). Es el unico par conocido con ese problema —
  // "short bermuda" si resuelve bien porque "Bermuda" (7) le gana a "Short"
  // (5). No agrego una regla a SUBCATEGORY_KEYWORD_RULES para forzarlo
  // porque no hay datos de `subcategory_ai_raw` que confirmen que Vision
  // devuelve esa frase — mismo criterio que el resto del archivo: reglas con
  // datos, no por intuicion.
  let partial = "";
  let partialLen = 0;
  for (const o of opts) {
    const on = normStr(o);
    if (n.includes(on) || on.includes(n)) {
      if (on.length > partialLen) {
        partial = o;
        partialLen = on.length;
      }
    }
  }
  if (partial) return partial;

  // Nunca queda rastro de esto en ningún otro lado — el caller es quien
  // tiene acceso a la fila de DB, así que este console.error es defensa
  // best-effort para desarrollo local; la persistencia real de `aiSubcat`
  // pasa por `subcategory_ai_raw` en cada call site (ver UploadForm.tsx,
  // burstQueue.ts, outfitExtraction.ts).
  if (aiSubcat.trim()) {
    console.error(
      `[aiMapping] subcategoria sin match — categoria="${category}" valor crudo de Vision="${aiSubcat}"`
    );
  }
  return "";
}

export function mapAiOccasions(aiOccasions: string[]): string[] {
  return aiOccasions
    .map((o) => {
      const norm = o.toLowerCase();
      return ITEM_OCCASIONS.find((io) => io.toLowerCase() === norm) ?? null;
    })
    .filter((o): o is string => o !== null);
}

/**
 * Prellena `occasions` a partir de la "formalidad" (1-5) que devuelve la
 * detección de outfit completo — el usuario lo sigue pudiendo editar en la
 * revisión igual que cualquier otro campo, esto es solo un punto de partida.
 */
export function mapFormalityToOccasions(formalidad: number): string[] {
  if (formalidad <= 2) return ["Casual", "Deportivo"];
  if (formalidad === 3) return ["Casual", "Trabajo"];
  if (formalidad === 4) return ["Trabajo", "Citas"];
  return ["Formal", "Eventos formales"];
}

// Geometría del "Style Journal" (Premium): plantillas fijas por cantidad de
// prendas, no layout automático — un layout que se acomoda solo cubre más
// casos pero nunca se ve tan bien como uno compuesto a mano, y esta feature
// vive de verse bien.
//
// Coordenadas en unidades del viewBox REAL de `public/cuaderno.svg`
// (`viewBox="0 0 400 500"`), no un 0-100 abstracto — así los números de
// cada plantilla se pueden verificar directo contra el arte (espiral,
// sombra de página) sin traducir entre dos sistemas.

import type { ClothingCategory } from "@/types/database";

// ── Sistema de coordenadas del cuaderno ─────────────────────────────────
//
// Zona útil del arte (fuera de eso no puede haber nada: foto, etiqueta ni
// flecha — la espiral vive entre x=34 y x=66, por eso el mínimo es 80).
export const CONTENT_LEFT = 80;
export const CONTENT_RIGHT = 366;
export const CONTENT_TOP = 100; // debajo de la banda de encabezado
export const CONTENT_BOTTOM = 458;

// Banda de encabezado (eyebrow + nombre del outfit): dentro de la zona útil
// pero por ENCIMA de donde puede empezar cualquier prenda/etiqueta.
export const HEADER_TOP = 40;
export const HEADER_LEFT = CONTENT_LEFT;
export const HEADER_RIGHT = CONTENT_RIGHT;
export const HEADER_BOTTOM = CONTENT_TOP;

const CONTENT_W = CONTENT_RIGHT - CONTENT_LEFT;
const CONTENT_H = CONTENT_BOTTOM - CONTENT_TOP;

/** viewBox unit (eje x, 0-400) → % del lienzo completo. */
export function vx(n: number): number {
  return (n / 400) * 100;
}
/** viewBox unit (eje y, 0-500) → % del lienzo completo. */
export function vy(n: number): number {
  return (n / 500) * 100;
}

// ── Rotación determinista (mismo algoritmo que OutfitMoodboard.tsx) ────────
//
// Duplicado a propósito: OutfitMoodboard.tsx no exporta `jitter()` y está
// fuera de alcance tocarlo. Son 4 líneas de hash — el costo de duplicarlas
// es menor que el de crear un acoplamiento entre el moodboard de free y el
// cuaderno de premium, que deben poder evolucionar sin pisarse.
export function jitter(id: string, span = 3): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % (span * 2 + 1)) - span;
}

// ── Escala relativa por categoría ───────────────────────────────────────
//
// Los slots de cada plantilla tienen un tamaño base pensado para "una prenda
// mediana" (top/bottom); esta tabla lo ajusta según qué categoría cayó en
// ese slot — un anillo no puede ocupar lo mismo que un blazer aunque los dos
// quepan en el mismo hueco del layout. 1 = tamaño base del slot.
//
// Esto solo funciona si la imagen ya está recortada a su bbox alfa (ver
// useAlphaCroppedImage.ts) — si no, el tamaño final lo define el margen
// transparente del PNG, no esta tabla (medido: 53% de las prendas reales
// tenían >20% de "hueco" por área antes del recorte).
export const CATEGORY_SCALE: Record<ClothingCategory, number> = {
  outerwear: 1.15,
  dress: 1.25,
  top: 1,
  bottom: 1,
  footwear: 0.82,
  accessory: 0.75,
};

// Prioridad al recortar cuando el outfit trae más prendas que slots: las
// categorías base siempre entran, los accesorios son lo primero que sobra.
// Menor número = más prioridad.
const CATEGORY_PRIORITY: Record<ClothingCategory, number> = {
  dress: 0,
  top: 1,
  bottom: 1,
  outerwear: 2,
  footwear: 3,
  accessory: 4,
};

const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: "Top",
  bottom: "Pantalón",
  dress: "Vestido",
  outerwear: "Abrigo",
  footwear: "Calzado",
  accessory: "Accesorio",
};

export function categoryLabel(category: ClothingCategory): string {
  return CATEGORY_LABELS[category];
}

/**
 * Ordena y recorta las prendas de un outfit a como mucho `limit` (tope 6,
 * igual que OutfitMoodboard). Prioriza categorías base sobre accesorios; a
 * igual prioridad conserva el orden en que la IA propuso las prendas.
 */
export function prioritizeItems<T extends { category: ClothingCategory }>(
  items: T[],
  limit = 6
): T[] {
  return items
    .map((item, order) => ({ item, order }))
    .sort((a, b) => {
      const diff = CATEGORY_PRIORITY[a.item.category] - CATEGORY_PRIORITY[b.item.category];
      return diff !== 0 ? diff : a.order - b.order;
    })
    .slice(0, limit)
    .sort((a, b) => a.order - b.order) // se restaura el orden original para pintar
    .map(({ item }) => item);
}

// ── Plantillas ──────────────────────────────────────────────────────────

export type JournalSlot = {
  /** Tamaño/posición base del slot, en unidades absolutas del viewBox. Se
   * multiplica por CATEGORY_SCALE y se re-centra sobre el mismo punto medio. */
  w: number;
  h: number;
  top: number;
  left: number;
  /** Rotación base del slot; se le suma jitter(id) al pintar. */
  rot: number;
  z: number;
  /** Punto de anclaje de la etiqueta (esquina de texto), en viewBox units. */
  labelTop: number;
  labelLeft: number;
  labelAlign: "left" | "right";
  /** Ancho de la etiqueta, en % del lienzo completo. Default 30 (ver
   * StyleJournal.tsx) — las filas de 3 columnas (TEMPLATE_5) necesitan uno
   * más angosto o las etiquetas vecinas se tocan. */
  labelWidthPct?: number;
  /** Punto donde la flechita toca la prenda (borde de la caja), en viewBox units. */
  arrowTargetTop: number;
  arrowTargetLeft: number;
  /** Curvatura de la flechita: signo = lado hacia el que se arquea. */
  arrowCurve: number;
};

// Los slots se autoran como FRACCIONES (0-100) de la zona útil de contenido
// (CONTENT_LEFT/RIGHT/TOP/BOTTOM) — así el ritmo relativo entre filas y
// columnas se define una sola vez, independiente de las coordenadas
// absolutas del arte. `toAbsolute()` los convierte al sistema real.
type FractionalSlot = JournalSlot;

function toAbsolute(slots: FractionalSlot[]): JournalSlot[] {
  const frac = (v: number, size: number) => (v / 100) * size;
  return slots.map((s) => ({
    w: frac(s.w, CONTENT_W),
    h: frac(s.h, CONTENT_H),
    top: CONTENT_TOP + frac(s.top, CONTENT_H),
    left: CONTENT_LEFT + frac(s.left, CONTENT_W),
    rot: s.rot,
    z: s.z,
    labelTop: CONTENT_TOP + frac(s.labelTop, CONTENT_H),
    labelLeft: CONTENT_LEFT + frac(s.labelLeft, CONTENT_W),
    labelAlign: s.labelAlign,
    labelWidthPct: s.labelWidthPct,
    arrowTargetTop: CONTENT_TOP + frac(s.arrowTargetTop, CONTENT_H),
    arrowTargetLeft: CONTENT_LEFT + frac(s.arrowTargetLeft, CONTENT_W),
    arrowCurve: s.arrowCurve,
  }));
}

// Estrategia común a las 4 plantillas: filas de 1-3 prendas en dos o tres
// columnas fijas, con la etiqueta SIEMPRE en el hueco vertical entre filas
// (nunca al lado/encima de una foto) — así ninguna combinación de categorías
// puede terminar con el texto cruzando una prenda, sin importar qué tan
// angosta (pantalón) o ancha (chaqueta) sea la foto real. El primer label de
// cada plantilla empieza en top:15 (fracción), nunca en 0 — dentro de la
// zona de contenido eso ya cae después de CONTENT_TOP=100, respetando la
// banda de encabezado.

// Regla común de espaciado, las 4 plantillas: cada etiqueta deja un hueco de
// 10 puntos de fracción (~36 unidades absolutas) antes de que arranque la
// fila de prendas — por encima de ARROW_LABEL_CLEARANCE_Y (30), así la
// flecha siempre termina de salir del texto antes de curvar hacia la prenda.

// 4 prendas — 2 filas de 2, repartidas en TODA la altura útil (hasta ~98,
// no solo la mitad superior — antes las filas se apretaban arriba y sobraba
// papel abajo). Escala base más grande: hay menos prendas compitiendo por
// espacio que en la de 6.
const TEMPLATE_4_FRACTIONS: FractionalSlot[] = [
  {
    w: 40, h: 32, top: 12, left: 4, rot: -4, z: 20,
    labelTop: 2, labelLeft: 4, labelAlign: "left",
    arrowTargetTop: 14, arrowTargetLeft: 18, arrowCurve: 1,
  },
  {
    w: 36, h: 30, top: 12, left: 56, rot: 5, z: 25,
    labelTop: 2, labelLeft: 56, labelAlign: "left",
    arrowTargetTop: 14, arrowTargetLeft: 70, arrowCurve: -1,
  },
  {
    w: 38, h: 34, top: 64, left: 4, rot: 4, z: 15,
    labelTop: 54, labelLeft: 4, labelAlign: "left",
    arrowTargetTop: 66, arrowTargetLeft: 20, arrowCurve: -1,
  },
  {
    w: 34, h: 32, top: 64, left: 58, rot: -6, z: 22,
    labelTop: 54, labelLeft: 58, labelAlign: "left",
    arrowTargetTop: 66, arrowTargetLeft: 74, arrowCurve: 1,
  },
];

// 3 prendas — hero centrado arriba, 2 más chicas abajo, empujadas hasta
// cerca del borde inferior de la zona útil por la misma razón que la de 4.
const TEMPLATE_3_FRACTIONS: FractionalSlot[] = [
  {
    w: 52, h: 38, top: 12, left: 24, rot: -3, z: 20,
    labelTop: 2, labelLeft: 27, labelAlign: "left",
    arrowTargetTop: 15, arrowTargetLeft: 48, arrowCurve: 1,
  },
  {
    w: 38, h: 28, top: 70, left: 2, rot: 5, z: 15,
    labelTop: 60, labelLeft: 2, labelAlign: "left",
    arrowTargetTop: 72, arrowTargetLeft: 18, arrowCurve: -1,
  },
  {
    w: 38, h: 26, top: 72, left: 58, rot: -5, z: 25,
    labelTop: 60, labelLeft: 58, labelAlign: "left",
    arrowTargetTop: 74, arrowTargetLeft: 74, arrowCurve: 1,
  },
];

// 5 prendas — fila de 2 arriba, fila de 3 (más chicas) abajo. Columnas de la
// fila de 3 bien separadas (gaps de 18/14 puntos) y con `labelWidthPct`
// angosto — es la única fila de 3 de las 4 plantillas, la más fácil de
// apretar.
const TEMPLATE_5_FRACTIONS: FractionalSlot[] = [
  {
    w: 34, h: 28, top: 12, left: 4, rot: -4, z: 20,
    labelTop: 2, labelLeft: 4, labelAlign: "left",
    arrowTargetTop: 14, arrowTargetLeft: 18, arrowCurve: 1,
  },
  {
    w: 32, h: 26, top: 12, left: 60, rot: 5, z: 25,
    labelTop: 2, labelLeft: 60, labelAlign: "left",
    arrowTargetTop: 14, arrowTargetLeft: 74, arrowCurve: -1,
  },
  {
    w: 22, h: 24, top: 64, left: 0, rot: -6, z: 15,
    labelTop: 54, labelLeft: 0, labelAlign: "left", labelWidthPct: 18,
    arrowTargetTop: 66, arrowTargetLeft: 8, arrowCurve: 1,
  },
  {
    w: 22, h: 24, top: 64, left: 40, rot: 4, z: 30,
    labelTop: 54, labelLeft: 39, labelAlign: "left", labelWidthPct: 18,
    arrowTargetTop: 66, arrowTargetLeft: 48, arrowCurve: -1,
  },
  {
    w: 22, h: 24, top: 64, left: 76, rot: -3, z: 20,
    labelTop: 54, labelLeft: 74, labelAlign: "left", labelWidthPct: 18,
    arrowTargetTop: 66, arrowTargetLeft: 84, arrowCurve: 1,
  },
];

// 6+ prendas — tope de la app (OutfitMoodboard también corta en 6). 3 filas
// de 2, cada una más chica para que las 6 quepan sin apretarse ni perder el
// hueco de 10 puntos entre etiqueta y prenda.
const TEMPLATE_6_FRACTIONS: FractionalSlot[] = [
  {
    w: 30, h: 18, top: 12, left: 4, rot: -4, z: 20,
    labelTop: 2, labelLeft: 4, labelAlign: "left",
    arrowTargetTop: 14, arrowTargetLeft: 16, arrowCurve: 1,
  },
  {
    w: 28, h: 18, top: 12, left: 62, rot: 5, z: 28,
    labelTop: 2, labelLeft: 62, labelAlign: "left",
    arrowTargetTop: 14, arrowTargetLeft: 74, arrowCurve: -1,
  },
  {
    w: 26, h: 18, top: 44, left: 6, rot: 6, z: 18,
    labelTop: 34, labelLeft: 4, labelAlign: "left",
    arrowTargetTop: 46, arrowTargetLeft: 16, arrowCurve: -1,
  },
  {
    w: 26, h: 18, top: 44, left: 60, rot: -6, z: 24,
    labelTop: 34, labelLeft: 60, labelAlign: "left",
    arrowTargetTop: 46, arrowTargetLeft: 72, arrowCurve: 1,
  },
  {
    w: 28, h: 18, top: 76, left: 4, rot: -3, z: 16,
    labelTop: 66, labelLeft: 4, labelAlign: "left",
    arrowTargetTop: 78, arrowTargetLeft: 16, arrowCurve: 1,
  },
  {
    w: 26, h: 18, top: 76, left: 62, rot: -5, z: 22,
    labelTop: 66, labelLeft: 62, labelAlign: "left",
    arrowTargetTop: 78, arrowTargetLeft: 74, arrowCurve: -1,
  },
];

const TEMPLATE_3 = toAbsolute(TEMPLATE_3_FRACTIONS);
const TEMPLATE_4 = toAbsolute(TEMPLATE_4_FRACTIONS);
const TEMPLATE_5 = toAbsolute(TEMPLATE_5_FRACTIONS);
const TEMPLATE_6 = toAbsolute(TEMPLATE_6_FRACTIONS);

/** Plantilla según cantidad de prendas (después de `prioritizeItems`). */
export function getTemplate(count: number): JournalSlot[] {
  if (count <= 3) return TEMPLATE_3;
  if (count === 4) return TEMPLATE_4;
  if (count === 5) return TEMPLATE_5;
  return TEMPLATE_6;
}

// Cuánto baja la flechita respecto al ancla de la etiqueta antes de arrancar
// la curva — si arranca justo en labelTop/labelLeft, la curva atraviesa el
// texto (se ve tachado). ~2 líneas de la etiqueta a los tamaños de fuente
// que usa StyleJournal, así libra incluso las etiquetas que envuelven
// ("Chaqueta biker" → 2 líneas).
const ARROW_LABEL_CLEARANCE_Y = 30;

/**
 * Punto real donde arranca la flechita: por FUERA de la caja de texto de la
 * etiqueta (abajo, con aire), no en su esquina — evita que la curva cruce
 * las letras. Se desplaza también un poco en horizontal hacia la prenda,
 * para que la curva salga "del lado de afuera" del texto.
 */
export function arrowStartPoint(slot: JournalSlot): { top: number; left: number } {
  return {
    top: slot.labelTop + ARROW_LABEL_CLEARANCE_Y,
    left: slot.labelLeft + (slot.arrowTargetLeft - slot.labelLeft) * 0.15,
  };
}

/**
 * Punto de control de la curva cuadrática de una flechita — compartido por
 * `arrowPath` (dibuja con SVG, en pantalla) y `composeStyleJournalImage.ts`
 * (dibuja con `ctx.quadraticCurveTo`, en el export a Canvas). Un solo lugar
 * para la fórmula de curvatura evita que las dos versiones se desalineen.
 */
export function arrowMidpoint(
  fromTop: number,
  fromLeft: number,
  toTop: number,
  toLeft: number,
  curve: number
): { top: number; left: number } {
  return {
    top: (fromTop + toTop) / 2 + curve * 10,
    left: (fromLeft + toLeft) / 2 + curve * 6,
  };
}

/**
 * Path SVG (unidades del viewBox real, ver arriba) de una flechita curva
 * entre el punto donde termina la etiqueta y el borde de la prenda. Una
 * sola curva cuadrática — el "temblor" manuscrito lo da la curvatura, no
 * una fuente.
 */
export function arrowPath(
  fromTop: number,
  fromLeft: number,
  toTop: number,
  toLeft: number,
  curve: number
): string {
  const mid = arrowMidpoint(fromTop, fromLeft, toTop, toLeft, curve);
  return `M ${fromLeft} ${fromTop} Q ${mid.left} ${mid.top} ${toLeft} ${toTop}`;
}

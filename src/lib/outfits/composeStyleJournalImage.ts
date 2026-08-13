// Compone el Style Journal completo (Premium) a una imagen exportable —
// mismo patrón que storyCardCanvas.ts (Canvas 2D a mano, cero IA
// generativa), pero independiente de `community_shares`: el cuaderno no
// necesita una foto real del usuario, se compone solo con las prendas. Ver
// la nota de "Fase 4" en el plan sobre por qué Canvas y no rasterizar DOM.
//
// Reusa la MISMA geometría que StyleJournal.tsx (styleJournalLayout.ts:
// getTemplate, prioritizeItems, CATEGORY_SCALE, jitter, arrowStartPoint,
// arrowMidpoint) y el MISMO recorte alfa (alphaBBox.ts:
// cropImageToAlphaBBoxCanvas) — pantalla y export nunca se desincronizan.
//
// "use client": usa Image/canvas/document.fonts, solo disponibles en el
// browser — igual que storyCardCanvas.ts.
"use client";

import type { ClothingItem } from "@/types/database";
import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";
import { cropImageToAlphaBBoxCanvas } from "./alphaBBox";
import {
  CATEGORY_SCALE,
  HEADER_BOTTOM,
  HEADER_LEFT,
  HEADER_RIGHT,
  HEADER_TOP,
  arrowMidpoint,
  arrowStartPoint,
  categoryLabel,
  getTemplate,
  jitter,
  prioritizeItems,
} from "./styleJournalLayout";

const CARD_W = 1080;
const CARD_H = 1920;

// Franja inferior reservada para el ancla (línea fina + etiqueta editorial)
// — más angosta que cuando llevaba logo+wordmark, porque ese contenido pesa
// menos visualmente (ver "── Ancla inferior" al final del compositor).
const WATERMARK_AREA_H = 110;

// El cuaderno (viewBox 400x500, aspect 4:5) ocupa el 96% del ancho del
// lienzo — subido desde 84% tras prueba en iPhone real: a 84% sobraba bone
// white por todos lados (~55% del alto). El techo real es geométrico: a
// ancho completo (100%, sin margen) el cuaderno mide 1350px de alto = 70%
// del lienzo, así que no hay forma de llenar "casi todo" sin recortar el
// arte — 96% es lo más grande que se puede llenar dejando aire arriba para
// que la palabra de fondo "STRANDIA" se asome antes de que el cuaderno la
// tape.
const NOTEBOOK_W = CARD_W * 0.96;
const NOTEBOOK_H = NOTEBOOK_W * (500 / 400);
const NOTEBOOK_X = (CARD_W - NOTEBOOK_W) / 2;
const NOTEBOOK_Y = (CARD_H - WATERMARK_AREA_H - NOTEBOOK_H) / 2;

// Colores de marca (mismos tokens que globals.css) — el canvas no puede leer
// clases Tailwind, se repiten literales (mismo criterio que storyCardCanvas.ts).
const COLOR_INK = "45, 49, 46"; // --color-ink #2d312e
const COLOR_TEXT = "28, 28, 26"; // --color-text #1c1c1a
const COLOR_TEXT_FAINT = "107, 111, 105"; // --color-text-faint #6b6f69
const COLOR_PRIMARY = "81, 99, 81"; // --color-primary #516351 — fondo del lienzo
const COLOR_PRIMARY_MID = "184, 204, 182"; // --color-primary-mid #b8ccb6 — palabra de fondo
const COLOR_TEXT_INVERSE = "243, 240, 237"; // --color-text-inverse #f3f0ed — texto sobre el fondo oscuro

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

// Mismo patrón que storyCardCanvas.ts: lee el font-family real que resolvió
// next/font desde la custom property de globals.css, y espera a que esté
// listo para usarlo en ctx.font.
async function resolveFont(
  cssVar: "--font-caslon" | "--font-hanken",
  weight: number,
  px: number,
  italic = false
): Promise<string> {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const family = raw || (cssVar === "--font-caslon" ? "Georgia, serif" : "sans-serif");
  const fontSpec = `${italic ? "italic " : ""}${weight} ${px}px ${family}`;
  try {
    await document.fonts.load(fontSpec);
  } catch {
    // Si falla la carga, seguimos igual — canvas cae al fallback del sistema.
  }
  return fontSpec;
}

/** Trunca a una sola línea con elipsis si no cabe en maxWidth — mismo
 * comportamiento visual que `truncate` (CSS) en el título de StyleJournal.tsx
 * en pantalla. A diferencia de wrapLines() de abajo (que corta por palabra
 * sin avisar), acá el corte SIEMPRE es visible para el usuario. */
function truncateToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out.trimEnd()}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}…`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = attempt;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/** viewBox unit → px absoluto dentro del rectángulo del cuaderno en el canvas. */
function nx(viewBoxX: number): number {
  return NOTEBOOK_X + (viewBoxX / 400) * NOTEBOOK_W;
}
function ny(viewBoxY: number): number {
  return NOTEBOOK_Y + (viewBoxY / 500) * NOTEBOOK_H;
}

async function drawGarment(
  ctx: CanvasRenderingContext2D,
  it: ClothingItem,
  slot: ReturnType<typeof getTemplate>[number]
) {
  const scale = CATEGORY_SCALE[it.category];
  const w = slot.w * scale;
  const h = slot.h * scale;
  const top = slot.top - (h - slot.h) / 2;
  const left = slot.left - (w - slot.w) / 2;
  const rot = slot.rot + jitter(it.id);

  const px = nx(left);
  const py = ny(top);
  const pw = (w / 400) * NOTEBOOK_W;
  const ph = (h / 500) * NOTEBOOK_H;
  const cx = px + pw / 2;
  const cy = py + ph / 2;

  const rawSrc = it.image_url ?? it.thumbnail_url;
  const hasUsablePhoto = it.background_removed !== false && Boolean(rawSrc);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);

  if (hasUsablePhoto) {
    try {
      const img = await loadImage(rawSrc as string);
      const cropped = cropImageToAlphaBBoxCanvas(img) ?? img;
      const naturalW = "width" in cropped ? cropped.width : (cropped as HTMLImageElement).naturalWidth;
      const naturalH = "height" in cropped ? cropped.height : (cropped as HTMLImageElement).naturalHeight;
      // object-contain dentro de la caja pw x ph.
      const fit = Math.min(pw / naturalW, ph / naturalH);
      const dw = naturalW * fit;
      const dh = naturalH * fit;
      ctx.shadowColor = `rgba(${COLOR_INK}, 0.2)`;
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      ctx.drawImage(cropped, -dw / 2, -dh / 2, dw, dh);
    } catch (err) {
      console.error("[composeStyleJournalImage] no se pudo cargar/recortar prenda", err);
      drawSwatch(ctx, it, pw, ph);
    }
  } else {
    drawSwatch(ctx, it, pw, ph);
  }

  ctx.restore();
}

function drawSwatch(ctx: CanvasRenderingContext2D, it: ClothingItem, w: number, h: number) {
  const r = Math.min(16, w * 0.08, h * 0.08);
  ctx.fillStyle = it.primary_color ?? GARMENT_PLACEHOLDER_COLOR;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fill();
}

function itemLabel(it: ClothingItem): string {
  return it.name?.trim() || it.subcategory || categoryLabel(it.category);
}

export async function composeStyleJournalImage(
  items: ClothingItem[],
  outfitName: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no soporta canvas.");

  // Fondo dark green de marca — reemplaza el bone white (feedback de iPhone:
  // "el bone white no aporta nada"). El contraste papel-claro/fondo-oscuro es
  // lo que da la sensación editorial; el cuaderno mismo no cambia de color.
  ctx.fillStyle = `rgb(${COLOR_PRIMARY})`;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // /cuaderno-export.svg, NO /cuaderno.svg — es la copia con el grano de
  // papel a x3 de frecuencia, calibrada para el ancho al que se rasteriza
  // el cuaderno acá (~907px) en vez del ancho de pantalla (~300px). Ver el
  // comentario de cabecera de ese archivo antes de tocar cualquiera de los
  // dos.
  const [notebookImg, logoImg] = await Promise.all([
    loadImage("/cuaderno-export.svg"),
    loadImage("/logo-mark-strandia.png"),
  ]);

  // ── Palabra de fondo "STRANDIA" ──────────────────────────────────────
  // Grande, DETRÁS del cuaderno (se dibuja antes de drawImage) — la
  // oclusión parcial (el cuaderno la tapa) es lo que da profundidad. Tiene
  // que sangrar apenas por los bordes laterales (una letra, no la mitad de
  // la palabra) — a 300px fijo solo se leía "TRAND" en iPhone real. En vez
  // de un tamaño fijo a ojo, se mide a un tamaño de referencia y se escala
  // al tamaño que da el ancho objetivo (~1.15x CARD_W).
  const bgWordRefPx = 100;
  const bgWordRefFont = await resolveFont("--font-caslon", 700, bgWordRefPx);
  ctx.font = bgWordRefFont;
  const bgWordRefWidth = ctx.measureText("STRANDIA").width;
  const bgWordTargetWidth = CARD_W * 1.15;
  const bgWordPx = Math.round(bgWordRefPx * (bgWordTargetWidth / bgWordRefWidth));
  const bgWordFont = await resolveFont("--font-caslon", 700, bgWordPx);
  ctx.font = bgWordFont;
  ctx.fillStyle = `rgb(${COLOR_PRIMARY_MID})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STRANDIA", CARD_W / 2, NOTEBOOK_Y);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.drawImage(notebookImg, NOTEBOOK_X, NOTEBOOK_Y, NOTEBOOK_W, NOTEBOOK_H);

  const board = prioritizeItems(items, 6);
  const template = getTemplate(board.length);

  // ── Encabezado ────────────────────────────────────────────────────────
  // Titular fijo ("Look del día", itálica) en vez del nombre del outfit —
  // el nombre baja a una línea chica debajo, en mayúsculas. De paso resuelve
  // el bug de título desbordado: "Look del día" es corto y constante, no
  // depende de qué tan largo sea outfit.name.
  const titleFont = await resolveFont("--font-caslon", 600, 46, true);
  ctx.font = titleFont;
  ctx.fillStyle = `rgb(${COLOR_TEXT})`;
  ctx.textBaseline = "top";
  ctx.fillText("Look del día", nx(HEADER_LEFT), ny(HEADER_TOP));

  // Nombre del outfit — chico, Hanken Grotesk, tracking amplio, mayúsculas.
  // Mismo tratamiento visual que tenía el eyebrow "STYLE JOURNAL" que se
  // quita de acá (ver StyleJournal.tsx en pantalla).
  const subtitleFont = await resolveFont("--font-hanken", 700, 20);
  ctx.font = subtitleFont;
  ctx.fillStyle = `rgb(${COLOR_TEXT_FAINT})`;
  ctx.letterSpacing = "0.14em";
  // Ancho real del papel disponible (x 80→366 del viewBox), NO un porcentaje
  // arbitrario de NOTEBOOK_W — con 0.86 el título se salía del borde
  // derecho de la hoja (medido en iPhone real).
  const subtitleMaxWidth = nx(HEADER_RIGHT) - nx(HEADER_LEFT);
  const subtitleText = truncateToFit(ctx, outfitName.toUpperCase(), subtitleMaxWidth);
  ctx.fillText(subtitleText, nx(HEADER_LEFT), ny(HEADER_TOP) + 58);
  ctx.letterSpacing = "0";
  void HEADER_BOTTOM; // banda reservada, ver styleJournalLayout.ts — no se dibuja nada más ahí.

  // ── Flechitas (antes que las prendas, igual z-order que en pantalla) ───
  ctx.strokeStyle = `rgb(${COLOR_TEXT_FAINT})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  for (let i = 0; i < board.length; i++) {
    const slot = template[i];
    if (!slot) continue;
    const from = arrowStartPoint(slot);
    const mid = arrowMidpoint(from.top, from.left, slot.arrowTargetTop, slot.arrowTargetLeft, slot.arrowCurve);
    ctx.beginPath();
    ctx.moveTo(nx(from.left), ny(from.top));
    ctx.quadraticCurveTo(nx(mid.left), ny(mid.top), nx(slot.arrowTargetLeft), ny(slot.arrowTargetTop));
    ctx.stroke();
  }

  // ── Prendas ──────────────────────────────────────────────────────────
  for (let i = 0; i < board.length; i++) {
    const slot = template[i];
    if (!slot) continue;
    await drawGarment(ctx, board[i], slot);
  }

  // ── Etiquetas ────────────────────────────────────────────────────────
  const labelFont = await resolveFont("--font-caslon", 400, 26, true);
  ctx.font = labelFont;
  ctx.fillStyle = `rgb(${COLOR_TEXT})`;
  ctx.textBaseline = "top";
  for (let i = 0; i < board.length; i++) {
    const slot = template[i];
    if (!slot) continue;
    // % de NOTEBOOK_W, no de CARD_W — en pantalla (StyleJournal.tsx) ese %
    // es relativo al ancho de la propia tarjeta del cuaderno, que en el
    // export NO es el lienzo completo de 1080px sino NOTEBOOK_W (más
    // angosto). Medir contra CARD_W sobreestimaba el ancho disponible y
    // dejaba "Chaqueta biker"/"Gorra" casi tocándose en TEMPLATE_6 — mismo
    // bug de fondo que el título (ver truncateToFit arriba).
    const maxWidth = ((slot.labelWidthPct ?? 30) / 100) * NOTEBOOK_W;
    const lines = wrapLines(ctx, itemLabel(board[i]), maxWidth, 2);
    let ly = ny(slot.labelTop);
    for (const line of lines) {
      ctx.fillText(line, nx(slot.labelLeft), ly);
      ly += 30;
    }
  }

  // ── Marca de agua — franja inferior, logo real ──────────────────────
  // El logo es tinta oscura — sin chip claro detrás se pierde contra el
  // fondo verde, mismo patrón que storyCardCanvas.ts usa sobre su degradado
  // oscuro.
  const wmY = CARD_H - WATERMARK_AREA_H / 2;
  const logoSize = 40;
  const chipR = 26;
  const wordmarkFont = await resolveFont("--font-caslon", 400, 30);
  ctx.font = wordmarkFont;
  const wordmarkWidth = ctx.measureText("StrandIA").width;
  const gap = 14;
  const totalWidth = chipR * 2 + gap + wordmarkWidth;
  const startX = (CARD_W - totalWidth) / 2;

  ctx.beginPath();
  ctx.arc(startX + chipR, wmY, chipR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${COLOR_TEXT_INVERSE}, 0.95)`;
  ctx.fill();
  ctx.drawImage(logoImg, startX + chipR - logoSize / 2, wmY - logoSize / 2, logoSize, logoSize);

  ctx.fillStyle = `rgb(${COLOR_TEXT_INVERSE})`;
  ctx.textBaseline = "middle";
  ctx.fillText("StrandIA", startX + chipR * 2 + gap, wmY);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen."))),
      "image/jpeg",
      0.92
    );
  });
}

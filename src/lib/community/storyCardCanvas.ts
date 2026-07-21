// Composición client-side de la "story card" 9:16: foto real de fondo +
// stickers de prendas (PNG transparente) + marca. Cero IA — todo es dibujo
// de canvas sobre datos ya servidos por getShareStoryCardDataAction.
//
// "use client" porque usa Image/canvas/document.fonts, solo disponibles en
// el browser — igual que imageUtils.ts.
"use client";

import type { ShareStoryCardData, ShareStoryCardItem } from "./storyCard";

const CARD_W = 1080;
const CARD_H = 1920;

// Colores de marca (mismos tokens que globals.css) — el canvas no puede leer
// clases Tailwind, así que los repetimos acá literalmente.
const COLOR_INK = "45, 49, 46"; // --color-ink #2d312e, en rgb
const COLOR_BONE = "252, 249, 246"; // --color-bg #fcf9f6, en rgb

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

// Lee el font-family real que resolvió next/font (nombre generado, único por
// build) desde la custom property que ya expone globals.css, y espera a que
// esté listo para usarlo en ctx.font — si no, canvas dibuja con la fuente de
// fallback del sistema y el texto no se ve "de marca".
async function resolveFont(cssVar: "--font-caslon" | "--font-hanken", weight: number, px: number) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const family = raw || (cssVar === "--font-caslon" ? "Georgia, serif" : "sans-serif");
  const fontSpec = `${weight} ${px}px ${family}`;
  try {
    await document.fonts.load(fontSpec);
  } catch {
    // Si falla la carga, seguimos igual — canvas cae al fallback del sistema.
  }
  return fontSpec;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);

  if (lines.length === maxLines) {
    const consumed = lines.slice(0, -1).join(" ").length + lines[lines.length - 1].length;
    if (consumed < text.length) {
      let last = lines[maxLines - 1];
      while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

// Zonas laterales para los stickers — todas sobre el borde derecho, entre el
// 8% y el 66% de alto, para no tapar la franja central (cara/torso) de una
// foto de outfit típica. Rotación sutil alternada para look "editorial".
const STICKER_SLOTS = [
  { cx: 0.79, cy: 0.14, box: 240, rot: -7 },
  { cx: 0.86, cy: 0.32, box: 210, rot: 6 },
  { cx: 0.78, cy: 0.49, box: 230, rot: -5 },
  { cx: 0.85, cy: 0.66, box: 200, rot: 8 },
] as const;

async function drawSticker(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  slot: (typeof STICKER_SLOTS)[number]
) {
  const box = slot.box;
  const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const cx = slot.cx * CARD_W;
  const cy = slot.cy * CARD_H;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((slot.rot * Math.PI) / 180);

  // Sombra tintada de tinta para separar del fondo con profundidad.
  ctx.shadowColor = `rgba(${COLOR_INK}, 0.32)`;
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

  // Halo blanco sutil (el shadow sigue la silueta alfa del PNG) — legibilidad
  // sobre zonas claras de la foto de fondo.
  ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

  // Trazo final nítido, sin shadow, encima de los dos halos.
  ctx.shadowColor = "transparent";
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);

  ctx.restore();
}

async function tryLoadStickerImages(
  items: ShareStoryCardItem[]
): Promise<HTMLImageElement[]> {
  const results = await Promise.allSettled(items.map((it) => loadImage(it.imageUrl)));
  // Una prenda cuyo PNG no cargue se omite sin romper el resto de la card.
  return results
    .filter((r): r is PromiseFulfilledResult<HTMLImageElement> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function composeStoryCard(data: ShareStoryCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no soporta canvas.");

  const [bgImg, logoImg, stickerImgs] = await Promise.all([
    loadImage(data.photoUrl),
    loadImage("/logo-mark-strandia.png"),
    tryLoadStickerImages(data.items),
  ]);

  drawCover(ctx, bgImg, CARD_W, CARD_H);

  // Degradado inferior tintado de tinta (nunca negro puro, ver DESIGN.md) —
  // asegura contraste para el texto de marca sin ocultar la foto.
  const gradient = ctx.createLinearGradient(0, CARD_H * 0.52, 0, CARD_H);
  gradient.addColorStop(0, `rgba(${COLOR_INK}, 0)`);
  gradient.addColorStop(1, `rgba(${COLOR_INK}, 0.78)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  for (let i = 0; i < stickerImgs.length; i++) {
    const slot = STICKER_SLOTS[i % STICKER_SLOTS.length];
    await drawSticker(ctx, stickerImgs[i], slot);
  }

  // ── Marca: logo + nombre del outfit + caption, esquina inferior ──────────
  const padX = 76;
  let cursorY = CARD_H - 84;

  const hankenSmall = await resolveFont("--font-hanken", 600, 30);
  ctx.font = hankenSmall;
  ctx.fillStyle = `rgba(${COLOR_BONE}, 0.7)`;
  ctx.letterSpacing = "0.02em";

  // Logo mark en un chip bone-white — el mark es tinta oscura, sin backing
  // se pierde contra el degradado oscuro.
  const logoSize = 56;
  const chipR = 36;
  ctx.save();
  ctx.beginPath();
  ctx.arc(padX + chipR, cursorY - chipR + 6, chipR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${COLOR_BONE}, 0.94)`;
  ctx.fill();
  ctx.restore();
  ctx.drawImage(
    logoImg,
    padX + chipR - logoSize / 2,
    cursorY - chipR + 6 - logoSize / 2,
    logoSize,
    logoSize
  );

  const wordmarkFont = await resolveFont("--font-caslon", 400, 34);
  ctx.font = wordmarkFont;
  ctx.fillStyle = `rgba(${COLOR_BONE}, 0.95)`;
  ctx.textBaseline = "middle";
  ctx.fillText("StrandIA", padX + chipR * 2 + 18, cursorY - chipR + 6);

  cursorY -= chipR * 2 + 30;

  if (data.caption) {
    const captionFont = await resolveFont("--font-hanken", 400, 30);
    ctx.font = captionFont;
    ctx.fillStyle = `rgba(${COLOR_BONE}, 0.82)`;
    ctx.textBaseline = "alphabetic";
    const lines = wrapLines(ctx, data.caption, CARD_W - padX * 2, 2);
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], padX, cursorY);
      cursorY -= 40;
    }
    cursorY -= 12;
  }

  if (data.outfitName) {
    const nameFont = await resolveFont("--font-caslon", 400, 54);
    ctx.font = nameFont;
    ctx.fillStyle = `rgba(${COLOR_BONE}, 1)`;
    ctx.textBaseline = "alphabetic";
    const lines = wrapLines(ctx, data.outfitName, CARD_W - padX * 2, 2);
    for (let i = lines.length - 1; i >= 0; i--) {
      ctx.fillText(lines[i], padX, cursorY);
      cursorY -= 62;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen."))),
      "image/jpeg",
      0.92
    );
  });
}

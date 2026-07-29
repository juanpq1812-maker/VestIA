// Importa los íconos de prenda desde una carpeta de entrega a
// `public/icons/prendas`, normalizándolos para que sirvan como tiles de UI.
//
//   node scripts/import-garment-icons.mjs [carpeta-origen]
//
// Default de la carpeta origen: ~/ICONOS-PRENDAS. Es un script de importación,
// no parte del build — se corre a mano cuando llega una entrega nueva de
// íconos. La verificación de que cada label de SUBCATEGORIES tiene su archivo
// vive aparte, en scripts/verify-garment-icons.ts (ese sí corre en el build).
//
// Los PNG de la entrega original NO se pueden usar tal cual:
//
//   1. Pesan ~1.3 MB cada uno (1536×1024) para renderizarse en tiles de
//      ~90 px — 77 MB en total, inviable en git y en móvil.
//   2. Traen el nombre de la prenda horneado en la imagen, con tipografía
//      inconsistente entre archivos. El label lo pinta el componente (así es
//      legible, va en Hanken Grotesk y cambia de color al seleccionar), así
//      que el texto horneado se recorta.
//   3. El dibujo ocupa una fracción distinta del lienzo en cada archivo, así
//      que en un grid unos glífos se ven diminutos al lado de otros. Se
//      recorta al bounding box y se recentra en un cuadrado con margen igual.
//   4. Dos archivos (vestidos/enterizo, categorias/bottom) traen un
//      checkerboard de "transparencia" horneado como píxeles reales.
//
// El resultado es línea negra sobre transparente, centrada, 512×512. El
// componente invierte el color por CSS cuando el tile está seleccionado.

import sharp from "sharp";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const SRC = process.argv[2] ?? path.join(os.homedir(), "ICONOS-PRENDAS");
const DEST = path.join(process.cwd(), "public/icons/prendas");

// origen (mayúsculas, como se entregaron) → destino (minúsculas: en
// Vercel/Linux el case-sensitivity revienta lo que en macOS pasa)
const FOLDERS = {
  TOPS: "tops",
  BOTTOMS: "bottoms",
  VESTIDOS: "vestidos",
  OUTWEAR: "outwear",
  CALZADO: "calzado",
  ACCESORIOS: "accesorios",
  CATEGORIAS: "categorias",
};

const CANVAS = 512;
const MARGIN_PCT = 0.08;

// Umbral de luminancia por debajo del cual un píxel cuenta como trazo del
// dibujo. Queda por encima del gris del checkerboard horneado (~220) y muy por
// encima del negro de la línea, así que separa dibujo de fondo en los dos
// casos.
const INK_LUM = 170;

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Vuelve transparente todo lo que no es trazo oscuro. Solo se aplica a los
// archivos sin canal alfa útil — limpia el checkerboard horneado sin tocar los
// que ya venían bien.
async function keepInkOnly(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (luminance(data[i], data[i + 1], data[i + 2]) > INK_LUM) data[i + 3] = 0;
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

// Cuenta píxeles de trazo por fila.
async function inkPerRow(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows = new Array(info.height).fill(0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] < 32) continue;
      if (luminance(data[i], data[i + 1], data[i + 2]) < INK_LUM) rows[y]++;
    }
  }
  return { rows, width: info.width };
}

// Agrupa las filas con trazo en bandas verticales. Los archivos de la entrega
// tienen exactamente dos: el dibujo arriba y el label horneado abajo,
// separados por una franja vacía ancha. Bandas separadas por menos de 1.5% de
// la altura se fusionan — son partes del mismo dibujo (ej. el diamante del
// anillo, despegado del aro).
function inkBands(rows) {
  const raw = [];
  let start = -1;
  for (let y = 0; y <= rows.length; y++) {
    const on = y < rows.length && rows[y] >= 1;
    if (on && start < 0) start = y;
    if (!on && start >= 0) {
      raw.push([start, y - 1]);
      start = -1;
    }
  }
  if (raw.length === 0) return [];
  const gapMin = Math.round(rows.length * 0.015);
  const merged = [raw[0]];
  for (const band of raw.slice(1)) {
    const prev = merged[merged.length - 1];
    if (band[0] - prev[1] <= gapMin) prev[1] = band[1];
    else merged.push(band);
  }
  return merged;
}

async function normalizeIcon(srcPath) {
  let buf = await sharp(srcPath).toBuffer();
  if ((await sharp(buf).stats()).isOpaque) buf = await keepInkOnly(buf);

  const { rows, width } = await inkPerRow(buf);
  const bands = inkBands(rows);
  // Si un archivo nuevo no viene con la estructura dibujo+label, fallamos
  // ruidosamente en vez de recortarlo mal en silencio.
  if (bands.length !== 2) {
    throw new Error(
      `esperaba 2 bandas de tinta (dibujo + label horneado), encontré ${bands.length}`
    );
  }

  const [top, bottom] = bands[0];
  const inner = Math.round(CANVAS * (1 - MARGIN_PCT * 2));

  // Cada paso va en su propio pipeline con buffer intermedio: sharp aplica las
  // operaciones en un orden interno fijo, no en el orden del chain, así que
  // encadenar extract + trim + resize las hace pisarse entre sí.
  const cropped = await sharp(buf)
    .extract({ left: 0, top, width, height: bottom - top + 1 })
    .png()
    .toBuffer();

  // trim recorta el margen transparente que quede alrededor del dibujo, para
  // que el glífo quede al bounding box exacto antes de recentrarlo.
  const tight = await sharp(cropped).trim({ threshold: 1 }).png().toBuffer();

  const scaled = await sharp(tight)
    .resize(inner, inner, { fit: "inside" })
    .png()
    .toBuffer();

  // Centra el glífo en el lienzo cuadrado, con el mismo margen por lado.
  //
  // `colours: 8` es la diferencia entre 138 KB y 3 KB por ícono: el arte es
  // línea negra sobre transparente, así que 8 entradas de paleta alcanzan de
  // sobra (negro, transparente y unos grises de antialiasing) y el resultado es
  // visualmente indistinguible del original. Con la paleta por defecto (256)
  // el set entero pesaba 3.9 MB.
  return sharp(scaled)
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true, colours: 8 })
    .toBuffer();
}

let count = 0;
let bytesIn = 0;
let bytesOut = 0;
const failures = [];

for (const [srcDir, destDir] of Object.entries(FOLDERS)) {
  const from = path.join(SRC, srcDir);
  const to = path.join(DEST, destDir);
  await mkdir(to, { recursive: true });

  const files = (await readdir(from)).filter((f) =>
    f.toLowerCase().endsWith(".png")
  );

  for (const file of files) {
    const srcPath = path.join(from, file);
    const name = file.toLowerCase();
    if (name !== file || /[^a-z0-9.-]/.test(name)) {
      failures.push(
        `${srcDir}/${file} — nombre no normalizado (se espera minúsculas, sin ñ/tildes/espacios)`
      );
      continue;
    }
    try {
      const out = await normalizeIcon(srcPath);
      await writeFile(path.join(to, name), out);
      bytesIn += (await stat(srcPath)).size;
      bytesOut += out.length;
      count++;
    } catch (err) {
      failures.push(`${srcDir}/${file} — ${err.message}`);
    }
  }
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;
console.log(`${count} íconos normalizados → ${path.relative(process.cwd(), DEST)}`);
console.log(`origen ${mb(bytesIn)} → destino ${mb(bytesOut)}`);

if (failures.length > 0) {
  console.error(`\n${failures.length} archivo(s) sin procesar:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

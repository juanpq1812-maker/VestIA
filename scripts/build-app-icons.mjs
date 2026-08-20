// Genera todos los iconos de la app a partir de UNA sola pieza de arte.
//
// Antes convivían dos artes distintas y nadie lo notaba porque cada
// plataforma toma un archivo diferente: macOS instala la PWA con el icono
// `maskable` (solo el gancho) y iOS usa `apple-touch-icon` (gancho + la
// palabra "Strand"). Resultado: la misma app con dos iconos según el
// dispositivo. El gancho solo es el que se lee a tamaño de icono; la palabra
// se vuelve una mancha.
//
//   node scripts/build-app-icons.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RAIZ = process.cwd();
/** El arte de referencia: cream + gancho, ya con su zona segura. */
const FUENTE = path.join(RAIZ, "public", "maskable-512.png");
/** Fondo de la lámina. iOS compone la transparencia sobre NEGRO, así que
 *  todos los iconos se aplanan: un PNG con alfa saldría con marco negro. */
const CREMA = "#faf0e6";

/** Recorte centrado en el gancho para los tamaños diminutos, donde el arte
 *  con su margen completo deja el trazo en dos o tres píxeles. */
const ZOOM = { left: 80, top: 80, width: 352, height: 352 };

const lamina = (size, extraer) => {
  let p = sharp(FUENTE);
  if (extraer) p = p.extract(ZOOM);
  return p
    .resize(size, size, { fit: "cover" })
    .flatten({ background: CREMA })
    .png({ compressionLevel: 9 });
};

/**
 * Empaqueta mapas de bits en un `.ico`.
 *
 * El formato ICO admite dos codificaciones por entrada: PNG o BMP. La primera
 * versión de esto usaba PNG —más corta— y el build de Turbopack murió con
 * "Processing image failed": su decodificador solo lee entradas BMP. Así que
 * BMP, que además es lo que entiende todo el mundo.
 *
 * Particularidades del BMP dentro de un ICO:
 *   - biHeight va al DOBLE del alto real, porque la entrada guarda la imagen
 *     (XOR) y una máscara de recorte (AND) una detrás de otra.
 *   - Las filas van de abajo hacia arriba y en orden BGRA, no RGBA.
 *   - La máscara AND es de 1 bit por píxel con filas alineadas a 4 bytes.
 *     Como aplanamos sobre crema no hay transparencia, así que va toda a cero
 *     (= todo opaco), pero el bloque tiene que existir igual.
 */
function entradaBmp(rgba, w, h) {
  const cabecera = Buffer.alloc(40);
  cabecera.writeUInt32LE(40, 0);
  cabecera.writeInt32LE(w, 4);
  cabecera.writeInt32LE(h * 2, 8);
  cabecera.writeUInt16LE(1, 12);
  cabecera.writeUInt16LE(32, 14);

  const xor = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const origen = (h - 1 - y) * w * 4; // fila espejada: el BMP va boca abajo
    for (let x = 0; x < w; x++) {
      const o = origen + x * 4;
      const d = (y * w + x) * 4;
      xor[d] = rgba[o + 2];
      xor[d + 1] = rgba[o + 1];
      xor[d + 2] = rgba[o];
      xor[d + 3] = rgba[o + 3];
    }
  }
  const filaMascara = Math.ceil(w / 32) * 4;
  const and = Buffer.alloc(filaMascara * h); // ceros = opaco
  cabecera.writeUInt32LE(xor.length + and.length, 20);
  return Buffer.concat([cabecera, xor, and]);
}

function construirIco(entradas) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0);
  cabecera.writeUInt16LE(1, 2); // 1 = icono
  cabecera.writeUInt16LE(entradas.length, 4);

  let offset = 6 + entradas.length * 16;
  const dir = [];
  for (const { size, buf } of entradas) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dir.push(e);
  }
  return Buffer.concat([cabecera, ...dir, ...entradas.map((x) => x.buf)]);
}

async function run() {
  const salidas = [
    ["public/apple-touch-icon.png", 180, false],
    ["public/icon-192.png", 192, false],
    ["public/icon-512.png", 512, false],
  ];

  for (const [rel, size, zoom] of salidas) {
    const buf = await lamina(size, zoom).toBuffer();
    fs.writeFileSync(path.join(RAIZ, rel), buf);
    const m = await sharp(buf).metadata();
    console.log(
      `✓ ${rel.padEnd(30)} ${m.width}x${m.height}  alfa:${m.hasAlpha ? "sí" : "no"}  ${(buf.length / 1024).toFixed(0)} KB`
    );
  }

  // Favicon: con el arte a tamaño completo el gancho se pierde, así que
  // estos tres van recortados.
  const entradas = [];
  for (const size of [16, 32, 48]) {
    const { data } = await sharp(FUENTE)
      .extract(ZOOM)
      .resize(size, size, { fit: "cover" })
      .flatten({ background: CREMA })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    entradas.push({ size, buf: entradaBmp(data, size, size) });
  }
  const ico = construirIco(entradas);
  fs.writeFileSync(path.join(RAIZ, "src/app/favicon.ico"), ico);
  console.log(`✓ ${"src/app/favicon.ico".padEnd(30)} 16+32+48        ${(ico.length / 1024).toFixed(0)} KB`);

  console.log("\nmaskable-512.png se deja intacto: es la fuente.");
}

run();

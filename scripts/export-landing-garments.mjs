// Exporta prendas YA RECORTADAS del armario a /public/landing-outfits/.
//
// Reemplaza a un intento anterior de bajar "PNG transparentes" de Unsplash.
// No existen: Unsplash sirve JPEG con fondo, siempre. El único sitio de donde
// salen recortes de verdad es el propio pipeline de StrandIA, así que la
// landing termina mostrando literalmente el output del producto.
//
//   ... --list                      lista el armario con ids
//   ... --recientes 12              muestra cómo repartiría los 12 más nuevos
//   ... --recientes 12 --escribir   exporta ese reparto a public/landing-outfits
//   ... (sin flags)                 exporta los ids fijados a mano en SLOTS
//
// El primero lista los candidatos del armario con su id. El segundo baja los
// que estén mapeados en SLOTS y verifica que el PNG traiga alfa de verdad —
// `background_removed` es un valor medido, pero el archivo se comprueba igual.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import zlib from "node:zlib";
import sharp from "sharp";

const EMAIL = "juanpq1812@gmail.com";
const BUCKET = "clothing-images";
const OUT = path.join(process.cwd(), "public", "landing-outfits");

// Slot de la landing -> id de la prenda en clothing_items.
// Se llenan con lo que devuelva --list.
const SLOTS = {
  // El reparto NO puede ser por orden de subida: emparejar posicionalmente
  // metía tacones en "casual universitario" y tenis en "oficina". Cada prenda
  // va donde tiene sentido para la ocasión.

  // Hero · casual universitario
  "casual-top": "a3d035df-e361-415e-9164-a1753a00f453",     // Camiseta verde
  "casual-bottom": "9d239842-c112-479c-b567-130db380d9da",  // Jean azul
  "casual-calzado": "667bd8b9-7ebf-41a1-8c06-316a317ef682", // Tenis blancos

  // Hero · smart casual / oficina
  "oficina-top": "91b2f63d-3f76-4f40-999e-746929b0ffe7",    // Camisa azul
  "oficina-bottom": "9ea44f60-3fc8-4a54-b425-b26552952144", // Pantalón beige
  "oficina-calzado": "e3c5d0a1-1839-4abc-b4db-bee54cf57686",// Mocasines negros

  // Hero · cena & noche
  "noche-top": "822aab35-e7d8-49c7-bb52-ac71f6c31195",      // Tank top negro
  "noche-bottom": "194becb7-caa1-4803-862a-e98ad2d271d7",   // Falda verde
  "noche-calzado": "0cf7ac7f-eb7d-4997-bf4f-415604c6d703",  // Tacones negros

  // Cómo funciona · paso 02
  "paso2-top": "9f71e859-0011-4622-92c3-9712036df924",      // Suéter beige
  "paso2-bottom": "1993230c-f186-4e00-9ba5-ba704ea1cf59",   // Cargo beige
  "paso2-calzado": "e3567988-0d47-4d3f-90e2-6ad20cac7e19",  // Botas negras
};

/** Lado largo del PNG exportado. next/image se encarga del resto. */
const LADO_LARGO = 640;


const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Corre con: node --env-file=.env.local scripts/export-landing-garments.mjs");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function userId() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const u = data.users.find((x) => x.email === EMAIL);
  if (!u) throw new Error(`No encontré la cuenta ${EMAIL}`);
  return u.id;
}

/**
 * Fracción de píxeles realmente transparentes.
 *
 * NO basta con mirar el colorType: el pipeline produce tanto RGBA (6) como
 * paleta con chunk tRNS (3), y las dos recortan. Tampoco basta con
 * `background_removed`: durante meses ese flag mintió (ver CLAUDE.md), así
 * que cada archivo se mide antes de publicarlo en la landing.
 */
function pctTransparente(buf) {
  const meta = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bd: buf[24], ct: buf[25] };
  const trozos = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    trozos.push({ type: buf.toString("ascii", p + 4, p + 8), data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  const idat = zlib.inflateSync(
    Buffer.concat(trozos.filter((c) => c.type === "IDAT").map((c) => c.data))
  );
  const trns = trozos.find((c) => c.type === "tRNS");
  const bpp = meta.ct === 6 ? 4 : 1;
  if (meta.bd !== 8 || (meta.ct !== 6 && meta.ct !== 3)) return null;
  if (meta.ct === 3 && !trns) return 0;

  const stride = meta.w * bpp;
  const px = Buffer.alloc(meta.h * stride);
  let pos = 0;
  const paeth = (a, b, c) => {
    const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < meta.h; y++) {
    const ft = idat[pos++];
    const linea = idat.subarray(pos, pos + stride);
    pos += stride;
    const o = y * stride, prev = o - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[o + i - bpp] : 0;
      const b = y > 0 ? px[prev + i] : 0;
      const c = i >= bpp && y > 0 ? px[prev + i - bpp] : 0;
      let v = linea[i];
      if (ft === 1) v += a; else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1; else if (ft === 4) v += paeth(a, b, c);
      px[o + i] = v & 0xff;
    }
  }
  let t = 0;
  const total = meta.w * meta.h;
  for (let i = 0; i < total; i++) {
    const alfa = meta.ct === 6 ? px[i * 4 + 3] : (trns.data[px[i]] ?? 255);
    if (alfa < 10) t++;
  }
  return (100 * t) / total;
}

async function listar() {
  const uid = await userId();
  const { data, error } = await db
    .from("clothing_items")
    .select("id, name, category, subcategory, primary_color, background_removed, image_url")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const recortadas = data.filter((d) => d.background_removed);
  console.log(`\n${data.length} prendas en el armario · ${recortadas.length} con fondo recortado\n`);
  const porCategoria = {};
  for (const it of recortadas) (porCategoria[it.category] ??= []).push(it);
  for (const [cat, items] of Object.entries(porCategoria)) {
    console.log(`── ${cat} (${items.length})`);
    for (const it of items) {
      const nombre = it.name ?? it.subcategory ?? "(sin nombre)";
      console.log(`   ${it.id}  ${nombre}  · ${it.primary_color ?? "?"}`);
    }
    console.log("");
  }
  console.log("Pega los ids que quieras en SLOTS y vuelve a correr el script sin --list.");
}

async function exportar() {
  const pendientes = Object.entries(SLOTS).filter(([, id]) => id);
  if (pendientes.length === 0) {
    console.error("SLOTS está vacío. Corre con --list primero y pega los ids.");
    process.exit(1);
  }
  const uid = await userId();
  fs.mkdirSync(OUT, { recursive: true });

  for (const [slot, id] of pendientes) {
    const { data: item, error } = await db
      .from("clothing_items")
      .select("id, name, image_path, background_removed, user_id")
      .eq("id", id)
      .single();
    if (error || !item) {
      console.log(`✗ ${slot.padEnd(22)} no encontré la prenda ${id}`);
      continue;
    }
    if (item.user_id !== uid) {
      // Nunca exportar ropa de otra cuenta a una página pública.
      console.log(`✗ ${slot.padEnd(22)} la prenda ${id} NO es de ${EMAIL} — saltada`);
      continue;
    }
    await bajar(slot, item);
  }
  console.log(`\nListo en ${OUT}`);
}

/** Baja una prenda, comprueba que esté recortada de verdad, recorta el margen
 *  transparente y la normaliza a LADO_LARGO. */
async function bajar(slot, item) {
  {
    const { data: blob, error } = await db.storage.from(BUCKET).download(item.image_path);
    if (error || !blob) {
      console.log(`✗ ${slot.padEnd(18)} no pude bajar ${item.image_path}`);
      return;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const pct = pctTransparente(buf);
    if (pct === null || pct < 15) {
      console.log(`✗ ${slot.padEnd(18)} sin recorte real (${pct === null ? "?" : pct.toFixed(1) + "%"}) — no se publica`);
      return;
    }
    // `trim` quita el margen transparente: sin esto una prenda centrada y otra
    // pegada a un borde se ven de tamaños distintos en la misma fila.
    const png = await sharp(buf)
      .trim({ threshold: 1 })
      .resize({ width: LADO_LARGO, height: LADO_LARGO, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const dest = path.join(OUT, `${slot}.png`);
    fs.writeFileSync(dest, png);
    const m = await sharp(png).metadata();
    console.log(
      `✓ ${slot.padEnd(18)} ${String(png.length).padStart(7)} B  ${m.width}x${m.height}  transp ${pct.toFixed(0)}%  ${item.name ?? ""}`
    );
  }
}

/**
 * Reparte los N items más recientes del armario entre los slots de la landing.
 *
 * Agrupa por categoría y, dentro de cada grupo, respeta el orden de subida.
 * Así da igual si las fotos se suben mezcladas: los tops caen en los slots de
 * top, los bottoms en los de bottom y el calzado en los de calzado.
 */
async function recientes() {
  const n = Number(process.argv[process.argv.indexOf("--recientes") + 1]) || 12;
  const uid = await userId();
  const { data, error } = await db
    .from("clothing_items")
    .select("id, name, category, subcategory, primary_color, image_path, created_at")
    .eq("user_id", uid)
    .not("image_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) throw error;

  // De más antiguo a más nuevo dentro del lote, para que el orden de subida
  // sea el orden de los looks.
  const lote = [...data].reverse();
  console.log(`\nLos ${lote.length} items más recientes:\n`);
  for (const it of lote) {
    console.log(`  ${it.category.padEnd(10)} ${(it.name ?? it.subcategory ?? "?").padEnd(14)} ${it.primary_color ?? "?"}`);
  }

  const ORDEN = ["casual", "oficina", "noche", "paso2"];
  const porTipo = { top: [], bottom: [], footwear: [], otros: [] };
  for (const it of lote) {
    if (it.category === "top" || it.category === "outerwear" || it.category === "dress") porTipo.top.push(it);
    else if (it.category === "bottom") porTipo.bottom.push(it);
    else if (it.category === "footwear") porTipo.footwear.push(it);
    else porTipo.otros.push(it);
  }

  const mapa = {};
  ORDEN.forEach((look, i) => {
    if (porTipo.top[i]) mapa[`${look}-top`] = porTipo.top[i];
    if (porTipo.bottom[i]) mapa[`${look}-bottom`] = porTipo.bottom[i];
    if (porTipo.footwear[i]) mapa[`${look}-calzado`] = porTipo.footwear[i];
  });

  console.log(`\nReparto (${porTipo.top.length} tops · ${porTipo.bottom.length} bottoms · ${porTipo.footwear.length} calzados):\n`);
  for (const [slot, it] of Object.entries(mapa)) {
    console.log(`  ${slot.padEnd(18)} ${(it.name ?? it.subcategory ?? "?")} · ${it.primary_color ?? "?"}`);
  }
  const faltan = Object.keys(SLOTS).filter((k) => !mapa[k]);
  if (faltan.length) console.log(`\n⚠ sin cubrir: ${faltan.join(", ")}`);
  if (porTipo.otros.length) console.log(`⚠ fuera de reparto (categoría no usada): ${porTipo.otros.map((o) => o.category).join(", ")}`);

  if (!process.argv.includes("--escribir")) {
    console.log("\nRevisa el reparto y vuelve a correr con --escribir para exportar.");
    return;
  }
  // Se limpia el directorio: mezclar prendas viejas y nuevas por slot sería
  // invisible en el resultado y muy confuso de depurar.
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  console.log("");
  for (const [slot, it] of Object.entries(mapa)) await bajar(slot, it);
  console.log(`\nListo en ${OUT}`);
}

const cmd = process.argv.includes("--list")
  ? listar
  : process.argv.includes("--recientes")
    ? recientes
    : exportar;
cmd().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

// Reprocesa las prendas cuyo fondo nunca se llego a quitar.
//
//   node --env-file=.env.local scripts/reprocess-background-removal.mjs [opciones]
//
//   --dry-run     mide y dice a cuales les hace falta, sin llamar a Gemini
//   --limit N     procesa como mucho N prendas
//   --batch N     tamano de lote, default 4 (bajo a proposito: cada item es
//                 una llamada a Gemini + una pasada de @imgly de ~25s)
//
// CONTEXTO
// Medido sobre las 266 prendas confirmadas, 121 (45%) tienen el fondo
// practicamente intacto pese a `background_removed = true`. El desglose:
//
//   2026-05   116/116  100%   pipeline anterior (Remove.bg, sin creditos)
//   2026-07     5/146    3%   solo el camino de reconstruccion
//   2026-08     0/4      0%
//
// Las de mayo tienen `background_removed = true` porque la migracion 0024 lo
// puso por DEFAULT asumiendo que el codigo viejo nunca guardaba nada sin
// recortar. Los datos desmienten esa suposicion, asi que el flag no sirve para
// elegir candidatas.
//
// POR ESO NO SE FIA DEL FLAG: mide cada imagen y solo reprocesa las que de
// verdad no tienen transparencia, con el MISMO umbral que ahora usa el
// pipeline (finalizeGeminiImageOutput). Si una prenda ya esta bien, no se
// toca ni se gasta una llamada.
//
// IDEMPOTENTE: la condicion de entrada es el estado real de la imagen, no una
// marca. Volver a correrlo sobre prendas ya arregladas no hace nada.
//
// REANUDABLE: cada prenda se guarda en cuanto termina. Si se corta, se
// relanza y las ya arregladas quedan fuera solas (ver arriba).
//
// CUESTA DINERO: una llamada a Gemini por prenda. Corre --dry-run primero.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { callGeminiImageEdit } from "../src/lib/ai/geminiClient.ts";
import { finalizeGeminiImageOutput } from "../src/lib/ai/imageBackgroundRemoval.ts";
import { MINIMAL_EDIT_PROMPT } from "../src/lib/ai/imagePrompts.ts";

const BUCKET = "clothing-images";

// Mismo umbral que finalizeGeminiImageOutput. Calibrado sobre la distribucion
// real, que salio bimodal: 145 prendas por encima del 15% y 121 por debajo del
// 5%, ninguna en medio.
const MIN_TRANSPARENT_FRACTION = 0.05;

// Espejo de src/lib/wardrobe/thumbnails.ts (ver nota alli sobre por que no se
// importa).
const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_QUALITY = 70;
const THUMBNAIL_CACHE_CONTROL = "31536000";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  if (i === -1 || i === args.length - 1) return d;
  const n = Number(args[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : d;
};
const DRY_RUN = has("--dry-run");
const LIMIT = val("--limit", Infinity);
const BATCH = val("--batch", 4);

for (const v of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"]) {
  if (!process.env[v]) {
    console.error(`Falta ${v}. Corre con: node --env-file=.env.local ${process.argv[1]}`);
    process.exit(1);
  }
}
if (!process.env.IMGLY_MODEL_PUBLIC_PATH) {
  console.warn(
    "AVISO: IMGLY_MODEL_PUBLIC_PATH no esta seteada. Sin ella @imgly no corre y\n" +
      "el pipeline cae al recorte por color, que es justo lo que falla con fondos\n" +
      "que no son blancos. Es muy probable que el reprocesado no arregle nada.\n"
  );
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** Fraccion de pixeles francamente transparentes. Misma medida que el pipeline. */
async function transparentFraction(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!meta.hasAlpha) return 0;
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .resize({ width: 200 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let t = 0;
  for (let i = 3; i < data.length; i += info.channels) if (data[i] < 16) t++;
  const total = info.width * info.height;
  return total > 0 ? t / total : 0;
}

const kb = (n) => `${Math.round(n / 1024)}KB`;

async function main() {
  console.log(
    "Reprocesado de remocion de fondo" + (DRY_RUN ? "  [DRY RUN, no llama a Gemini]" : "")
  );

  const { data: items, error } = await supabase
    .from("clothing_items")
    .select("id, user_id, image_path, thumbnail_path, created_at")
    .eq("status", "confirmed")
    .not("image_path", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("No se pudo leer clothing_items:", error.message);
    process.exit(1);
  }

  // Paso 1: medir. Barato (solo descarga) y es lo que decide las candidatas.
  console.log(`\nMidiendo ${items.length} prendas...`);
  const candidatas = [];
  for (let i = 0; i < items.length; i += 12) {
    await Promise.all(
      items.slice(i, i + 12).map(async (it) => {
        try {
          const { data: blob } = await supabase.storage.from(BUCKET).download(it.image_path);
          if (!blob) return;
          const buf = Buffer.from(await blob.arrayBuffer());
          const frac = await transparentFraction(buf);
          if (frac < MIN_TRANSPARENT_FRACTION) {
            candidatas.push({ ...it, frac, bytes: buf.length });
          }
        } catch (err) {
          console.error(`  ✗ midiendo ${it.id}: ${err.message}`);
        }
      })
    );
    process.stdout.write(".");
  }
  console.log("");

  const cola = candidatas.slice(0, LIMIT);
  console.log(`\nSin fondo removido: ${candidatas.length} de ${items.length}`);
  if (cola.length !== candidatas.length) console.log(`Se procesan ${cola.length} por --limit`);

  const porMes = {};
  for (const c of candidatas) {
    const m = c.created_at.slice(0, 7);
    porMes[m] = (porMes[m] ?? 0) + 1;
  }
  console.log("por mes:", JSON.stringify(porMes));

  if (cola.length === 0) {
    console.log("\nNada que reprocesar.");
    return;
  }
  if (DRY_RUN) {
    console.log(`\n(DRY RUN) Se llamaria a Gemini ${cola.length} veces. Nada mas que hacer.`);
    return;
  }

  let ok = 0;
  let sinEfecto = 0;
  let fallos = 0;

  for (let i = 0; i < cola.length; i += BATCH) {
    const lote = cola.slice(i, i + BATCH);
    const rs = await Promise.all(lote.map(procesarUna));
    for (const r of rs) {
      if (r.estado === "ok") ok++;
      else if (r.estado === "sin_efecto") sinEfecto++;
      else {
        fallos++;
        console.error(`  ✗ ${r.id}: ${r.error}`);
      }
    }
    console.log(
      `  lote ${Math.floor(i / BATCH) + 1}/${Math.ceil(cola.length / BATCH)} — ` +
        `${ok} arregladas, ${sinEfecto} sin efecto, ${fallos} fallidas`
    );
  }

  console.log("\n── Resumen ──");
  console.log(`arregladas   : ${ok}`);
  console.log(`sin efecto   : ${sinEfecto}   (Gemini respondio pero el recorte sigue sin servir)`);
  console.log(`fallos       : ${fallos}`);
  console.log(`llamadas a Gemini gastadas: ${ok + sinEfecto + fallos}`);
  if (sinEfecto > 0) {
    console.log(
      "\nLas 'sin efecto' quedan con background_removed=false, asi que la app\n" +
        "les ofrece 'Mejora esta foto'. Si son muchas, mira el timeout de @imgly."
    );
  }
  if (fallos > 0) process.exitCode = 1;
}

async function procesarUna(item) {
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(item.image_path);
    if (dlErr || !blob) throw new Error(`descarga: ${dlErr?.message ?? "sin datos"}`);
    const original = Buffer.from(await blob.arrayBuffer());

    // Mismo prompt y mismo post-procesado que la subida normal — si divergieran,
    // el resultado del reprocesado no seria comparable con el de una foto nueva.
    const gemini = await callGeminiImageEdit({
      imageBase64: original.toString("base64"),
      imageMimeType: blob.type || "image/png",
      prompt: MINIMAL_EDIT_PROMPT,
    });
    if (!gemini.ok) throw new Error(`gemini: ${gemini.reason}`);

    const finalized = await finalizeGeminiImageOutput(gemini.image);
    if (!finalized) throw new Error("post-procesado devolvio null");

    const buf = Buffer.from(finalized.base64, "base64");

    // Path nuevo, nunca sobrescribir: el `cacheControl` de un ano hace que la
    // imagen vieja pueda seguir viva en cachés y CDNs durante meses.
    const nuevoPath = `${item.user_id}/${crypto.randomUUID()}.png`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(nuevoPath, buf, {
        contentType: "image/png",
        cacheControl: THUMBNAIL_CACHE_CONTROL,
        upsert: false,
      });
    if (upErr) throw new Error(`subida: ${upErr.message}`);

    // Miniatura de la imagen nueva, con los mismos parametros que el pipeline.
    let nuevoThumb = null;
    try {
      const thumb = await sharp(buf)
        .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMBNAIL_QUALITY })
        .toBuffer();
      const thumbPath = `${nuevoPath.replace(/\.[^./]+$/, "")}_thumb.webp`;
      const { error: tErr } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumb, {
          contentType: "image/webp",
          cacheControl: THUMBNAIL_CACHE_CONTROL,
          upsert: true,
        });
      if (!tErr) nuevoThumb = thumbPath;
    } catch {
      /* la miniatura es adicional: sin ella la app cae al PNG */
    }

    const { error: updErr } = await supabase
      .from("clothing_items")
      .update({
        image_path: nuevoPath,
        thumbnail_path: nuevoThumb,
        background_removed: finalized.backgroundRemoved,
      })
      .eq("id", item.id);
    if (updErr) throw new Error(`update: ${updErr.message}`);

    // Las viejas, best-effort. Un huerfano en Storage no rompe nada; borrarlas
    // antes del update si podria dejar la fila apuntando a la nada.
    const viejas = [item.image_path, item.thumbnail_path].filter(Boolean);
    await supabase.storage.from(BUCKET).remove(viejas).catch(() => {});

    return {
      id: item.id,
      estado: finalized.backgroundRemoved ? "ok" : "sin_efecto",
      antes: kb(original.length),
      despues: kb(buf.length),
    };
  } catch (err) {
    return { id: item.id, estado: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});

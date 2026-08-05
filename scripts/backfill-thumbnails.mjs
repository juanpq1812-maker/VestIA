// Backfill de las miniaturas del armario (migración 0033).
//
// Genera la miniatura WebP 512px de las prendas que ya existían antes de que el
// pipeline las creara solo. Las nuevas ya salen con miniatura desde la subida
// (ver lib/wardrobe/uploadThumbnail.ts).
//
//   node --env-file=.env.local scripts/backfill-thumbnails.mjs [opciones]
//
//   --dry-run     no escribe nada, solo dice qué haría
//   --limit N     procesa como mucho N prendas (para probar con pocas)
//   --batch N     tamaño de lote, default 20
//
// IDEMPOTENTE: solo toca filas con `thumbnail_path is null`. Volver a correrlo
// no rehace trabajo ni duplica objetos en Storage.
//
// REANUDABLE: cada fila se marca en cuanto su miniatura está arriba, así que si
// se corta (Ctrl-C, red, timeout) basta relanzarlo y sigue donde iba. No hay
// estado en disco ni cursor que mantener: el propio `thumbnail_path` es el
// progreso.
//
// Un fallo individual no aborta la corrida — se registra y sigue. Al final
// imprime el resumen y sale con código 1 si hubo fallos, para que se note.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "clothing-images";

// Espejo de src/lib/wardrobe/thumbnails.ts. No se importa porque ese módulo es
// TypeScript con alias `@/` y este script corre con node pelado; si cambias uno,
// cambia el otro.
const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_QUALITY = 70; // sharp usa 0-100; el cliente usa 0.7 en canvas
const THUMBNAIL_CONTENT_TYPE = "image/webp";
const THUMBNAIL_CACHE_CONTROL = "31536000";

function buildThumbnailPath(imagePath) {
  return `${imagePath.replace(/\.[^./]+$/, "")}_thumb.webp`;
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  if (i === -1 || i === args.length - 1) return fallback;
  const n = Number(args[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const DRY_RUN = has("--dry-run");
const LIMIT = valueOf("--limit", Infinity);
const BATCH = valueOf("--batch", 20);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Corre con: node --env-file=.env.local scripts/backfill-thumbnails.mjs"
  );
  process.exit(1);
}

// service_role: el script corre fuera de una sesión de usuario y tiene que ver
// las prendas de TODOS. Salta RLS a propósito.
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kb = (n) => `${Math.round(n / 1024)}KB`;

async function main() {
  console.log(
    `Backfill de miniaturas — ${THUMBNAIL_WIDTH}px WebP q${THUMBNAIL_QUALITY}` +
      (DRY_RUN ? "  [DRY RUN, no escribe nada]" : "")
  );

  const { data: pendientes, error } = await supabase
    .from("clothing_items")
    .select("id, image_path")
    .is("thumbnail_path", null)
    .not("image_path", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("No se pudo leer clothing_items:", error.message);
    process.exit(1);
  }

  const cola = (pendientes ?? []).slice(0, LIMIT);
  console.log(
    `Pendientes: ${pendientes?.length ?? 0}` +
      (cola.length !== (pendientes?.length ?? 0) ? ` (se procesan ${cola.length} por --limit)` : "")
  );
  if (cola.length === 0) {
    console.log("Nada que hacer. Todas las prendas tienen miniatura.");
    return;
  }

  let ok = 0;
  let fallos = 0;
  let bytesOrig = 0;
  let bytesThumb = 0;

  for (let i = 0; i < cola.length; i += BATCH) {
    const lote = cola.slice(i, i + BATCH);
    const resultados = await Promise.all(lote.map(procesarUna));

    for (const r of resultados) {
      if (r.ok) {
        ok++;
        bytesOrig += r.orig;
        bytesThumb += r.thumb;
      } else {
        fallos++;
        console.error(`  ✗ ${r.id}: ${r.error}`);
      }
    }
    console.log(
      `  lote ${Math.floor(i / BATCH) + 1}/${Math.ceil(cola.length / BATCH)} — ` +
        `${ok} listas, ${fallos} fallidas`
    );
  }

  console.log("\n── Resumen ──");
  console.log(`prendas procesadas : ${ok}`);
  console.log(`fallos             : ${fallos}`);
  if (ok > 0) {
    console.log(`peso original      : ${kb(bytesOrig)}  (${(bytesOrig / 1048576).toFixed(1)} MB)`);
    console.log(`peso miniaturas    : ${kb(bytesThumb)}  (${(bytesThumb / 1048576).toFixed(1)} MB)`);
    console.log(
      `reducción          : ${(100 - (100 * bytesThumb) / bytesOrig).toFixed(1)}%  ` +
        `(media ${kb(bytesThumb / ok)} por prenda)`
    );
  }
  if (DRY_RUN) console.log("\n(DRY RUN — no se escribió nada)");
  if (fallos > 0) process.exitCode = 1;
}

async function procesarUna(item) {
  const thumbPath = buildThumbnailPath(item.image_path);
  try {
    const { data: blob, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(item.image_path);
    if (dlErr || !blob) throw new Error(`descarga: ${dlErr?.message ?? "sin datos"}`);

    const original = Buffer.from(await blob.arrayBuffer());
    const thumb = await sharp(original)
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();

    if (DRY_RUN) {
      return { ok: true, id: item.id, orig: original.length, thumb: thumb.length };
    }

    // `upsert: true` para que un reintento tras un corte a medio camino (objeto
    // subido pero fila sin marcar) no falle con "ya existe".
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, thumb, {
        contentType: THUMBNAIL_CONTENT_TYPE,
        cacheControl: THUMBNAIL_CACHE_CONTROL,
        upsert: true,
      });
    if (upErr) throw new Error(`subida: ${upErr.message}`);

    // Marcar la fila va AL FINAL: si el proceso muere entre la subida y esto,
    // la fila sigue en null y el siguiente run la reprocesa (el upsert de
    // arriba lo hace inocuo). Al revés dejaría filas apuntando a un objeto que
    // no existe — imagen rota, que es justo lo que la columna evita.
    const { error: updErr } = await supabase
      .from("clothing_items")
      .update({ thumbnail_path: thumbPath })
      .eq("id", item.id);
    if (updErr) throw new Error(`update de la fila: ${updErr.message}`);

    return { ok: true, id: item.id, orig: original.length, thumb: thumb.length };
  } catch (err) {
    return { ok: false, id: item.id, error: err instanceof Error ? err.message : String(err) };
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});

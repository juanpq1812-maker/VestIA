// Borra los datos de armario/outfits de todos los usuarios del piloto
// abierto EXCEPTO las cuentas que se pasan en --keep.
//
//   node --env-file=.env.local scripts/cleanup-pilot-data.mjs [opciones]
//
//   --dry-run        cuenta lo que se borraría (filas + objetos de Storage),
//                     sin tocar nada. Default si no se pasa --yes.
//   --yes            ejecuta el borrado real. Sin esto, el script solo
//                     hace dry-run aunque no se pida explícitamente.
//   --keep <ids>     ids de auth separados por coma que NO se tocan
//                     (obligatorio — el script no corre sin al menos uno).
//
// CONTEXTO
// Las prendas del piloto abierto se subieron antes de que existieran Gemini
// y @imgly, así que no tienen fondo removido y ya no sirven — ver
// strandia-fondos-mayo-sin-recortar (116 prendas de 12 cuentas). Los
// usuarios del piloto reciben 7 días de premium de cortesía y sus CUENTAS
// siguen vivas; solo se les vacía el contenido para que empiecen de cero.
//
// ALCANCE: solo armario y outfits (decisión explícita, no calendario,
// quests, push ni community_follows — esos datos no están rotos).
//
//   outfit_feedback              -- leaf, borrado directo
//   event_outfit_suggestions     -- leaf, borrado directo
//   outfits                      -- CASCADE -> outfit_uses, community_shares
//                                    CASCADE -> community_likes,
//                                    community_share_reports
//   outfit_uses                  -- residual (por si quedó alguno suelto)
//   community_shares             -- residual (idem)
//   clothing_items                -- borrado directo (recolecta paths antes)
//
// `ai_image_calls.clothing_item_id` es `on delete set null` — esas filas se
// CONSERVAN con el costo histórico, es lo correcto y no se tocan acá.
// `outfits.clothing_item_ids` es un array de uuid, no una FK real: borrar
// clothing_items no rompe nada ahí (ver comentario en DeleteItemButton.tsx).
//
// Storage: se recolectan los paths de `clothing-images` y `community-shares`
// ANTES de borrar filas (el cascade de outfits se los lleva de la DB antes
// de que se puedan leer si no se adelanta la lectura).
//
// IDEMPOTENTE Y REANUDABLE: la condición de entrada es lo que queda en la
// DB, no una marca. Si se corta a mitad de camino, un usuario ya limpio
// simplemente devuelve 0 filas en la siguiente corrida.

import { createClient } from "@supabase/supabase-js";

const CLOTHING_BUCKET = "clothing-images";
const COMMUNITY_BUCKET = "community-shares";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i === -1 || i === args.length - 1 ? null : args[i + 1];
};

const YES = has("--yes");
const DRY_RUN = has("--dry-run") || !YES;
// Sin default hardcodeado a propósito: los ids salen de Supabase cada vez
// que se corre, no viven en el repo.
const keepIds = new Set(
  (val("--keep") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
);

for (const v of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[v]) {
    console.error(`Falta ${v}. Corre con: node --env-file=.env.local ${process.argv[1]}`);
    process.exit(1);
  }
}

if (keepIds.size === 0) {
  console.error(
    "Falta --keep id1,id2. Por seguridad, el script no corre sin al menos una " +
      "cuenta explícita a conservar. Saca los ids de Supabase (Auth → Users) y " +
      "pásalos así: --keep <id-juan>,<id-juliana>"
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log(
    "Limpieza de datos del piloto (armario + outfits)" +
      (DRY_RUN ? "  [DRY RUN, no borra nada]" : "  [BORRADO REAL]")
  );
  console.log(`Cuentas a conservar: ${[...keepIds].join(", ") || "(ninguna)"}`);

  const { data: profiles, error: profErr } = await supabase.from("profiles").select("id");
  if (profErr) {
    console.error("No se pudo leer profiles:", profErr.message);
    process.exit(1);
  }

  const targets = profiles.map((p) => p.id).filter((id) => !keepIds.has(id));
  console.log(`\nUsuarios objetivo: ${targets.length} de ${profiles.length}\n`);

  const totales = {
    outfit_feedback: 0,
    event_outfit_suggestions: 0,
    outfits: 0,
    outfit_uses: 0,
    community_shares: 0,
    community_likes: 0,
    community_share_reports: 0,
    clothing_items: 0,
    clothingStorageObjects: 0,
    communityStorageObjects: 0,
  };

  for (const userId of targets) {
    const result = await procesarUsuario(userId);
    for (const k of Object.keys(totales)) totales[k] += result[k];
  }

  console.log("\n── Resumen ──");
  console.log(`outfit_feedback              : ${totales.outfit_feedback}`);
  console.log(`event_outfit_suggestions     : ${totales.event_outfit_suggestions}`);
  console.log(`outfits                      : ${totales.outfits}`);
  console.log(`outfit_uses                  : ${totales.outfit_uses}`);
  console.log(`community_shares             : ${totales.community_shares}`);
  console.log(`community_likes              : ${totales.community_likes}`);
  console.log(`community_share_reports      : ${totales.community_share_reports}`);
  console.log(`clothing_items               : ${totales.clothing_items}`);
  console.log(`objetos en clothing-images   : ${totales.clothingStorageObjects}`);
  console.log(`objetos en community-shares  : ${totales.communityStorageObjects}`);

  if (DRY_RUN) {
    console.log(
      "\n(DRY RUN) Nada se borró. Corre con --yes para ejecutar el borrado real."
    );
  }
}

/** Procesa un usuario: cuenta/recolecta, y si no es dry-run, borra. */
async function procesarUsuario(userId) {
  const counts = {
    outfit_feedback: 0,
    event_outfit_suggestions: 0,
    outfits: 0,
    outfit_uses: 0,
    community_shares: 0,
    community_likes: 0,
    community_share_reports: 0,
    clothing_items: 0,
    clothingStorageObjects: 0,
    communityStorageObjects: 0,
  };

  // ── Recolectar (siempre, dry-run o no): paths de Storage y conteos, antes
  // de que un cascade se lleve las filas que los tienen. ──────────────────

  const { data: shares } = await supabase
    .from("community_shares")
    .select("id, photo_path")
    .eq("user_id", userId);
  const shareIds = (shares ?? []).map((s) => s.id);
  counts.community_shares = shareIds.length;
  counts.communityStorageObjects = (shares ?? []).filter((s) => s.photo_path).length;

  if (shareIds.length > 0) {
    const { count: likesCount } = await supabase
      .from("community_likes")
      .select("id", { count: "exact", head: true })
      .in("share_id", shareIds);
    counts.community_likes = likesCount ?? 0;

    const { count: reportsCount } = await supabase
      .from("community_share_reports")
      .select("id", { count: "exact", head: true })
      .in("share_id", shareIds);
    counts.community_share_reports = reportsCount ?? 0;
  }

  const { data: items } = await supabase
    .from("clothing_items")
    .select("id, image_path, thumbnail_path")
    .eq("user_id", userId);
  counts.clothing_items = (items ?? []).length;
  counts.clothingStorageObjects = (items ?? []).reduce(
    (n, it) => n + (it.image_path ? 1 : 0) + (it.thumbnail_path ? 1 : 0),
    0
  );

  const { count: feedbackCount } = await supabase
    .from("outfit_feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  counts.outfit_feedback = feedbackCount ?? 0;

  const { count: eventSuggCount } = await supabase
    .from("event_outfit_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  counts.event_outfit_suggestions = eventSuggCount ?? 0;

  const { count: outfitsCount } = await supabase
    .from("outfits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  counts.outfits = outfitsCount ?? 0;

  const { count: usesCount } = await supabase
    .from("outfit_uses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  counts.outfit_uses = usesCount ?? 0;

  const totalRows =
    counts.outfit_feedback +
    counts.event_outfit_suggestions +
    counts.outfits +
    counts.outfit_uses +
    counts.community_shares +
    counts.clothing_items;

  if (totalRows === 0) return counts; // ya limpio — reanudable sin ruido

  console.log(
    `  ${userId}: ${counts.clothing_items} prendas, ${counts.outfits} outfits, ` +
      `${counts.community_shares} shares, ${counts.outfit_feedback} feedback, ` +
      `${counts.event_outfit_suggestions} sugerencias de evento`
  );

  if (DRY_RUN) return counts;

  // ── Borrado real ──────────────────────────────────────────────────────

  await supabase.from("outfit_feedback").delete().eq("user_id", userId);
  await supabase.from("event_outfit_suggestions").delete().eq("user_id", userId);

  // Cascade: se lleva outfit_uses, community_shares, community_likes y
  // community_share_reports de este usuario.
  await supabase.from("outfits").delete().eq("user_id", userId);

  // Residuales por si quedó algo que el cascade de arriba no cubrió.
  await supabase.from("outfit_uses").delete().eq("user_id", userId);
  await supabase.from("community_shares").delete().eq("user_id", userId);

  await supabase.from("clothing_items").delete().eq("user_id", userId);

  // Storage al final: si algo falla antes, mejor huérfanos que filas
  // apuntando a nada.
  const clothingPaths = (items ?? [])
    .flatMap((it) => [it.image_path, it.thumbnail_path])
    .filter(Boolean);
  if (clothingPaths.length > 0) {
    await supabase.storage.from(CLOTHING_BUCKET).remove(clothingPaths).catch(() => {});
  }

  const communityPaths = (shares ?? []).map((s) => s.photo_path).filter(Boolean);
  if (communityPaths.length > 0) {
    await supabase.storage.from(COMMUNITY_BUCKET).remove(communityPaths).catch(() => {});
  }

  return counts;
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});

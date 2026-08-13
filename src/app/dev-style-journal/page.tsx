// PÁGINA TEMPORAL DE PREVIEW — no forma parte del feature, se borra antes
// de abrir el PR. Sirve solo para capturar pantallazos de Style Journal con
// datos reales y decidir la variante de etiqueta antes de construir el
// resto (Fases 2-5).
//
// Usa service_role directo para no depender de una sesión de login en
// local — lee las prendas confirmadas de un usuario real y arma outfits de
// prueba de 3/4/5/6 prendas.

import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { createThumbnailSignedUrlMap } from "@/lib/storage/thumbnailUrls";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import StyleJournal from "@/components/outfits/StyleJournal";
import ExportTestButton from "./ExportTestButton";
import type { ClothingItem, ClothingCategory } from "@/types/database";

const USER_ID = "65253337-7396-4f4c-8bf6-0d259619e4f7"; // Juan

export default async function DevStyleJournalPage() {
  const admin = createSupabaseAdminClient();
  const { data: itemsRaw } = await admin
    .from("clothing_items")
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, thumbnail_path, background_removed, source, created_at, updated_at"
    )
    .eq("user_id", USER_ID)
    .eq("status", CONFIRMED_STATUS);

  const items = (itemsRaw ?? []) as ClothingItem[];
  const paths = items.map((i) => i.image_path).filter((p): p is string => Boolean(p));
  const [signed, thumbs] = await Promise.all([
    createSignedUrlMap(admin, paths),
    createThumbnailSignedUrlMap(items.map((i) => i.thumbnail_path)),
  ]);
  const hydrated: ClothingItem[] = items.map((it) => ({
    ...it,
    image_url: it.image_path ? signed.get(it.image_path) ?? null : null,
    thumbnail_url: it.thumbnail_path ? thumbs.get(it.thumbnail_path) ?? null : null,
  }));

  // Un ítem por categoría cuando se puede, para maximizar variedad visual.
  const byCategory = new Map<ClothingCategory, ClothingItem[]>();
  for (const it of hydrated) {
    const list = byCategory.get(it.category) ?? [];
    list.push(it);
    byCategory.set(it.category, list);
  }
  const order: ClothingCategory[] = ["top", "bottom", "outerwear", "footwear", "accessory", "accessory", "dress"];
  const pool: ClothingItem[] = [];
  const used = new Set<string>();
  for (const cat of order) {
    const candidates = (byCategory.get(cat) ?? []).filter((c) => !used.has(c.id));
    if (candidates.length > 0) {
      pool.push(candidates[0]);
      used.add(candidates[0].id);
    }
  }
  // Rellena con lo que sobre si faltó variedad.
  for (const it of hydrated) {
    if (pool.length >= 7) break;
    if (!used.has(it.id)) {
      pool.push(it);
      used.add(it.id);
    }
  }

  const counts = [3, 4, 5, 6];

  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="font-display text-3xl text-text">Style Journal — preview</h1>
      <p className="mt-2 text-sm text-text-muted">
        {hydrated.length} prendas confirmadas encontradas. Página temporal, no
        forma parte del feature.
      </p>

      <h2 className="mt-10 font-display text-2xl text-text">Comparación de etiqueta (4 prendas)</h2>
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-muted">
            Variante A — solo nombre/subcategoría
          </p>
          <div className="max-w-[320px]">
            <StyleJournal items={pool.slice(0, 4)} outfitName="Outfit de oficina" labelVariant="name" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-muted">
            Variante B — subcategoría + color
          </p>
          <div className="max-w-[320px]">
            <StyleJournal items={pool.slice(0, 4)} outfitName="Outfit de oficina" labelVariant="name-color" />
          </div>
        </div>
      </div>

      <h2 className="mt-12 font-display text-2xl text-text">Plantillas por cantidad de prendas</h2>
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((n) => (
          <div key={n}>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-muted">
              {n} prendas
            </p>
            <div className="max-w-[320px]">
              <StyleJournal items={pool.slice(0, n)} outfitName="Look del día" index={n} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-2xl text-text">
        Export real (Fase 4, composeStyleJournalImage)
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        1080×1920, compuesto en Canvas — no hay mockup DOM aparte: este botón
        llama al mismo compositor que usará el botón de compartir.
      </p>
      <ExportTestButton items={pool.slice(0, 4)} outfitName="Outfit de oficina" />

      <h2 className="mt-12 font-display text-2xl text-text">
        Export real — 6 prendas + título largo (fix de iPhone)
      </h2>
      <ExportTestButton items={pool.slice(0, 6)} outfitName="Casual deportivo con presencia" />
    </div>
  );
}

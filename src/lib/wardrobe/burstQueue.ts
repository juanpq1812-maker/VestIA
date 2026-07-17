// Cola de procesamiento en background para el modo ráfaga de subida de
// prendas. Vive enteramente en el cliente (usa el Supabase browser client
// con RLS) y orquesta: descarga de la foto cruda -> Claude Vision + Remove.bg
// (server actions existentes) -> subida de la imagen final -> update de la
// fila a 'ready' o 'error'.
//
// Cada prenda pasa por `clothing_items.status`:
//   draft -> processing -> ready (éxito) | error (falló tras 1 reintento)
// Recién en la pantalla de revisión, al confirmar, pasa a 'confirmed' y
// se vuelve visible en el resto de la app.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLOTHING_IMAGES_BUCKET,
  buildClothingImagePath,
} from "@/lib/storage/clothingImages";
import {
  analyzeClothingImageAction,
  removeBackgroundAction,
} from "@/app/wardrobe/upload/actions";
import { checkBurstBudgetAction } from "@/app/wardrobe/upload/burstActions";
import {
  mapAiOccasions,
  matchColorToPalette,
  matchSubcategory,
} from "@/lib/wardrobe/aiMapping";
import { base64ToBlob } from "@/lib/wardrobe/imageUtils";
import type { BurstClothingItem, ClothingCategory } from "@/types/database";

const MAX_RETRIES = 1;
const DEFAULT_CONCURRENCY = 2;
const STALE_DRAFT_DAYS = 7;

const VALID_CATEGORIES: ClothingCategory[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
  "body",
];

export type BurstQueueCallbacks = {
  /** Se llama cada vez que una fila cambia de estado (processing/ready/error). */
  onItemChange?: (item: BurstClothingItem) => void;
  /** Se llama si se acaba el cupo de análisis de esta hora antes de terminar la cola. */
  onBudgetExceeded?: (resetInMinutes: number) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = SupabaseClient<any>;

/**
 * Sube la foto cruda (ya redimensionada) a Storage e inserta la fila en
 * `clothing_items` con status='draft'. No analiza nada — el análisis lo hace
 * `processPendingForUser` en background.
 */
export async function enqueueDraftPhoto(
  supabase: Supa,
  userId: string,
  file: File
): Promise<BurstClothingItem | null> {
  const uuid = crypto.randomUUID();
  const path = buildClothingImagePath({ userId, fileName: file.name, uuid });

  const { error: uploadError } = await supabase.storage
    .from(CLOTHING_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[burstQueue] error subiendo foto cruda:", uploadError);
    return null;
  }

  const { data, error: insertError } = await supabase
    .from("clothing_items")
    .insert({
      user_id: userId,
      status: "draft",
      raw_image_path: path,
    })
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, status, raw_image_path, retry_count, error_message, created_at, updated_at"
    )
    .single();

  if (insertError || !data) {
    console.error("[burstQueue] error insertando draft:", insertError);
    await supabase.storage.from(CLOTHING_IMAGES_BUCKET).remove([path]).catch(() => {});
    return null;
  }

  return data as BurstClothingItem;
}

/** Trae los items del usuario que todavía no están confirmados. */
export async function fetchPendingItems(
  supabase: Supa,
  userId: string
): Promise<BurstClothingItem[]> {
  const { data } = await supabase
    .from("clothing_items")
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, status, raw_image_path, retry_count, error_message, created_at, updated_at"
    )
    .eq("user_id", userId)
    .in("status", ["draft", "processing", "ready", "error"])
    .order("created_at", { ascending: true });

  return (data ?? []) as BurstClothingItem[];
}

/**
 * Si el usuario cerró la app con fotos en 'processing', al volver ese estado
 * quedó huérfano (nadie las va a terminar). Las regresamos a 'draft' para que
 * `processPendingForUser` las vuelva a tomar.
 */
export async function resumeStuckProcessing(
  supabase: Supa,
  userId: string
): Promise<void> {
  await supabase
    .from("clothing_items")
    .update({ status: "draft" })
    .eq("user_id", userId)
    .eq("status", "processing");
}

async function updateItem(
  supabase: Supa,
  id: string,
  patch: Record<string, unknown>
): Promise<BurstClothingItem | null> {
  const { data } = await supabase
    .from("clothing_items")
    .update(patch)
    .eq("id", id)
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, status, raw_image_path, retry_count, error_message, created_at, updated_at"
    )
    .single();
  return (data as BurstClothingItem) ?? null;
}

async function processOne(
  supabase: Supa,
  item: BurstClothingItem,
  callbacks: BurstQueueCallbacks
): Promise<"ok" | "budget_exceeded"> {
  if (!item.raw_image_path) {
    const failed = await updateItem(supabase, item.id, {
      status: "error",
      error_message: "Falta la foto cruda.",
    });
    if (failed) callbacks.onItemChange?.(failed);
    return "ok";
  }

  const processing = await updateItem(supabase, item.id, { status: "processing" });
  if (processing) callbacks.onItemChange?.(processing);

  const budget = await checkBurstBudgetAction();
  if (!budget.allowed) {
    const reverted = await updateItem(supabase, item.id, { status: "draft" });
    if (reverted) callbacks.onItemChange?.(reverted);
    callbacks.onBudgetExceeded?.(budget.resetInMinutes);
    return "budget_exceeded";
  }

  try {
    const { data: rawBlob, error: downloadError } = await supabase.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .download(item.raw_image_path);

    if (downloadError || !rawBlob) {
      throw new Error(downloadError?.message ?? "No se pudo descargar la foto cruda.");
    }

    const analyzeForm = new FormData();
    analyzeForm.append("image", rawBlob, "photo.jpg");
    const analysis = await analyzeClothingImageAction(analyzeForm);

    const bgForm = new FormData();
    bgForm.append("image", rawBlob, "photo.jpg");
    const bgResult = await removeBackgroundAction(bgForm);

    if (!analysis.ok || !bgResult.ok) {
      throw new Error("Análisis o eliminación de fondo falló.");
    }

    const { categoria, subcategoria, color_principal, color_hex, ocasiones } = analysis.data;
    const category = VALID_CATEGORIES.includes(categoria as ClothingCategory)
      ? (categoria as ClothingCategory)
      : null;
    const subcategory = category ? matchSubcategory(category, subcategoria ?? "") : "";
    const color = matchColorToPalette(color_principal ?? "", color_hex ?? "");
    const occasions = mapAiOccasions(ocasiones ?? []);

    const pngBlob = base64ToBlob(bgResult.base64, bgResult.contentType);
    const finalPath = buildClothingImagePath({
      userId: item.user_id,
      fileName: "photo.png",
      uuid: crypto.randomUUID(),
    });

    const { error: uploadError } = await supabase.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .upload(finalPath, pngBlob, { contentType: "image/png", upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const ready = await updateItem(supabase, item.id, {
      status: "ready",
      category,
      subcategory: subcategory || null,
      primary_color: color || null,
      occasions,
      image_path: finalPath,
    });
    if (ready) callbacks.onItemChange?.(ready);
    return "ok";
  } catch (err) {
    console.error("[burstQueue] error procesando item", item.id, err);
    const retryCount = item.retry_count + 1;
    if (retryCount <= MAX_RETRIES) {
      const requeued = await updateItem(supabase, item.id, {
        status: "draft",
        retry_count: retryCount,
      });
      if (requeued) callbacks.onItemChange?.(requeued);
    } else {
      const failed = await updateItem(supabase, item.id, {
        status: "error",
        retry_count: retryCount,
        error_message: err instanceof Error ? err.message : "Error desconocido",
      });
      if (failed) callbacks.onItemChange?.(failed);
    }
    return "ok";
  }
}

/**
 * Procesa todas las fotos 'draft' pendientes del usuario con concurrencia
 * acotada. Se puede llamar mientras el usuario sigue capturando (fire and
 * forget) y de nuevo al entrar a la pantalla de revisión (retoma lo que haya
 * quedado a medias).
 */
export async function processPendingForUser(
  supabase: Supa,
  userId: string,
  callbacks: BurstQueueCallbacks = {},
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<void> {
  const pending = (await fetchPendingItems(supabase, userId)).filter(
    (i) => i.status === "draft"
  );
  if (pending.length === 0) return;

  let cursor = 0;
  let budgetExceeded = false;

  async function worker() {
    while (!budgetExceeded) {
      const item = pending[cursor];
      cursor += 1;
      if (!item) return;
      const result = await processOne(supabase, item, callbacks);
      if (result === "budget_exceeded") {
        budgetExceeded = true;
        return;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, () => worker())
  );
}

/** Reencola un item en 'error' (ej. desde el botón "Reintentar" de la revisión). */
export async function retryErrorItem(
  supabase: Supa,
  userId: string,
  itemId: string,
  callbacks: BurstQueueCallbacks = {}
): Promise<void> {
  const { data } = await supabase
    .from("clothing_items")
    .update({ status: "draft", error_message: null })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, status, raw_image_path, retry_count, error_message, created_at, updated_at"
    )
    .single();

  if (!data) return;
  await processOne(supabase, data as BurstClothingItem, callbacks);
}

/** Borra una prenda del pipeline de rafaga (foto cruda + final si existe) y su fila. */
export async function deletePendingItem(
  supabase: Supa,
  userId: string,
  item: Pick<BurstClothingItem, "id" | "user_id" | "raw_image_path" | "image_path">
): Promise<void> {
  const paths = [item.raw_image_path, item.image_path].filter(
    (p): p is string => Boolean(p)
  );
  if (paths.length > 0) {
    await supabase.storage.from(CLOTHING_IMAGES_BUCKET).remove(paths).catch(() => {});
  }
  await supabase.from("clothing_items").delete().eq("id", item.id).eq("user_id", userId);
}

/**
 * Cleanup lazy de drafts abandonados: prendas que llevan más de
 * STALE_DRAFT_DAYS días sin confirmarse. Se llama al montar la pantalla de
 * captura/revisión — no hay pg_cron en este proyecto, así que este es el
 * único punto donde se limpian.
 */
export async function cleanupStaleDrafts(supabase: Supa, userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_DRAFT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from("clothing_items")
    .select("id, user_id, raw_image_path, image_path")
    .eq("user_id", userId)
    .in("status", ["draft", "processing", "error"])
    .lt("created_at", cutoff);

  if (!stale || stale.length === 0) return;

  const paths = stale.flatMap((i: { raw_image_path: string | null; image_path: string | null }) =>
    [i.raw_image_path, i.image_path].filter((p): p is string => Boolean(p))
  );
  if (paths.length > 0) {
    await supabase.storage.from(CLOTHING_IMAGES_BUCKET).remove(paths).catch(() => {});
  }

  await supabase
    .from("clothing_items")
    .delete()
    .eq("user_id", userId)
    .in(
      "id",
      stale.map((i: { id: string }) => i.id)
    );
}

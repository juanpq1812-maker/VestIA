// Cola de procesamiento en background para el modo ráfaga de subida de
// prendas. Vive enteramente en el cliente (usa el Supabase browser client
// con RLS) y orquesta: descarga de la foto cruda -> Claude Vision (análisis)
// -> Gemini (reconstrucción o remoción de fondo, según haga falta) -> subida
// de la imagen final -> update de la fila a 'ready' o 'error'.
//
// Cada prenda pasa por `clothing_items.status`:
//   draft -> processing -> ready (éxito, con o sin fondo removido) | error
//   (falló la descarga/subida tras 1 reintento — un fallo de Gemini NO cae
//   acá, ver el fallback de última línea dentro de processOne)
// Recién en la pantalla de revisión, al confirmar, pasa a 'confirmed' y
// se vuelve visible en el resto de la app.
//
// `processPendingForUser` se puede invocar varias veces en paralelo (una foto
// nueva en BurstCapture, el mount de ReviewGrid, sesiones en otra pestaña) —
// cada invocación toma su propio snapshot de 'draft' vía `fetchPendingItems`,
// así que dos invocaciones pueden ver el mismo item. El único punto que evita
// procesarlo dos veces (con su doble costo de Gemini/burst_ai_uses) es el
// claim atómico en `claimItem` dentro de `processOne` — ver su comentario.
// `resumeStuckProcessing` es la otra mitad de ese contrato: si libera
// 'processing' sin mirar cuánto lleva ahí, deshace el claim atómico.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLOTHING_IMAGES_BUCKET,
  buildClothingImagePath,
} from "@/lib/storage/clothingImages";
import { analyzeClothingImageAction } from "@/app/wardrobe/upload/actions";
import { peekBurstBudgetAction } from "@/app/wardrobe/upload/burstActions";
import { reconstructGarmentImageAction } from "@/app/wardrobe/upload/garmentReconstructionActions";
import { removeBackgroundWithGemini } from "@/app/wardrobe/upload/backgroundRemovalActions";
import {
  mapAiOccasions,
  matchColorToPalette,
  matchSubcategory,
} from "@/lib/wardrobe/aiMapping";
import { base64ToBlob } from "@/lib/wardrobe/imageUtils";
import { subirMiniatura } from "@/lib/wardrobe/uploadThumbnail";
import { THUMBNAIL_CACHE_CONTROL } from "@/lib/wardrobe/thumbnails";
import type { BurstClothingItem, ClothingCategory } from "@/types/database";

const MAX_RETRIES = 1;
// Los errores de red (conexión cortada a mitad de una llamada — típico en
// captura en ráfaga desde el celular, moviéndose o cambiando de wifi a
// datos) son transitorios por naturaleza: vale la pena darles una chance más
// que a un error real del pipeline (ej. Vision/Gemini rechazando la imagen).
const MAX_RETRIES_NETWORK = 2;
const DEFAULT_CONCURRENCY = 2;
const STALE_DRAFT_DAYS = 7;

// Mensajes crudos que distintos navegadores tiran cuando un `fetch` se corta
// a mitad de camino por la red (WebKit: "Load failed", Chrome: "Failed to
// fetch", Firefox: "NetworkError..."). Sin esto, el usuario ve el string
// interno del browser tal cual en la UI.
const NETWORK_ERROR_PATTERNS = [
  /load failed/i,
  /failed to fetch/i,
  /networkerror/i,
  /network error/i,
  /network request failed/i,
  /the network connection was lost/i,
];

function isNetworkError(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some((re) => re.test(message));
}

const NETWORK_ERROR_MESSAGE =
  "No pudimos completar la subida por un problema de conexión. Revisá tu señal y volvé a intentar.";

const VALID_CATEGORIES: ClothingCategory[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "footwear",
  "accessory",
];

export type BurstQueueCallbacks = {
  /** Se llama cada vez que una fila cambia de estado (processing/ready/error). */
  onItemChange?: (item: BurstClothingItem) => void;
  /** Se llama si se acaba el cupo de análisis de esta hora antes de terminar la cola. */
  onBudgetExceeded?: (resetInMinutes: number) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supa = SupabaseClient<any>;

const CLOTHING_ITEM_SELECT =
  "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_url, image_path, status, raw_image_path, retry_count, error_message, source, reconstructed, reconstruction_reason, background_removed, subcategory_ai_raw, created_at, updated_at";

/**
 * Sube una foto cruda (ya redimensionada) a Storage e inserta la fila en
 * `clothing_items` con status='draft'. `extra` permite prellenar atributos ya
 * conocidos (ej. la detección grupal de una foto de outfit completo ya trae
 * categoría/color por prenda — ver outfitExtraction.ts) — si no se pasa,
 * queda todo null y `processPendingForUser` lo completa vía Claude Vision.
 */
export async function enqueueDraftPhoto(
  supabase: Supa,
  userId: string,
  file: File,
  extra?: {
    source?: "individual" | "outfit_extraction";
    category?: ClothingCategory | null;
    subcategory?: string | null;
    primary_color?: string | null;
    occasions?: string[];
    reconstruction_reason?: string | null;
    subcategory_ai_raw?: string | null;
  }
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
      ...extra,
    })
    .select(CLOTHING_ITEM_SELECT)
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
    .select(CLOTHING_ITEM_SELECT)
    .eq("user_id", userId)
    .in("status", ["draft", "processing", "ready", "error"])
    .order("created_at", { ascending: true });

  return (data ?? []) as BurstClothingItem[];
}

// Techo de reclamo huérfano: si un 'processing' lleva más que esto sin
// actualizarse, asumimos que el proceso que lo reclamó murió (crash, tab
// cerrada, función serverless matada) y lo liberamos. Con margen holgado
// sobre maxDuration=60 de las rutas de Gemini — un proceso genuinamente en
// vuelo no puede seguir vivo pasado ese límite, Vercel ya lo mató.
const STUCK_PROCESSING_MINUTES = 3;

/**
 * Libera SOLO los 'processing' que llevan más de STUCK_PROCESSING_MINUTES sin
 * actualizarse (huérfanos reales — el proceso que los reclamó murió a mitad).
 * `updated_at` se auto-actualiza en cada UPDATE (trigger de la migración
 * 0003), así que sirve como "hora del último claim/avance" sin columna nueva.
 *
 * CRÍTICO: no liberar TODO lo que esté en 'processing' sin mirar el tiempo —
 * eso deshace el claim atómico de `processOne` (ver abajo). Si esta función
 * resetea a 'draft' un item que otra pestaña/invocación tiene genuinamente en
 * vuelo (ej. el usuario navega de capturar a revisar mientras Gemini sigue
 * respondiendo), ese item vuelve a quedar disponible y se reclama y procesa
 * DE NUEVO — mismo bug de doble proceso/doble cobro, por esta vía en vez de
 * la carrera original.
 */
export async function resumeStuckProcessing(
  supabase: Supa,
  userId: string
): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000).toISOString();
  await supabase
    .from("clothing_items")
    .update({ status: "draft" })
    .eq("user_id", userId)
    .eq("status", "processing")
    .lt("updated_at", cutoff);
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
    .select(CLOTHING_ITEM_SELECT)
    .single();
  return (data as BurstClothingItem) ?? null;
}

/**
 * Reclama un item 'draft' de forma ATÓMICA: UPDATE condicionado a
 * `status = 'draft'`, con SELECT de vuelta. Si dos invocaciones de la cola se
 * solapan (ej. una foto nueva dispara `processPendingForUser` mientras la
 * pasada anterior sigue en curso, o la pantalla de revisión reanuda
 * pendientes al mismo tiempo), ambas pueden tener el mismo item en su
 * snapshot de `fetchPendingItems` — pero solo UNA gana este UPDATE (la
 * condición `eq('status','draft')` hace que la segunda afecte 0 filas). La
 * que pierde recibe `null` y debe salir limpio, sin consumir budget ni llamar
 * a Gemini — ver `processOne`.
 */
async function claimItem(
  supabase: Supa,
  id: string
): Promise<BurstClothingItem | null> {
  const { data } = await supabase
    .from("clothing_items")
    .update({ status: "processing" })
    .eq("id", id)
    .eq("status", "draft")
    .select(CLOTHING_ITEM_SELECT)
    .maybeSingle();
  return (data as BurstClothingItem | null) ?? null;
}

async function processOne(
  supabase: Supa,
  item: BurstClothingItem,
  callbacks: BurstQueueCallbacks
): Promise<"ok" | "budget_exceeded" | "skipped"> {
  const rawImagePath = item.raw_image_path;
  if (!rawImagePath) {
    const failed = await updateItem(supabase, item.id, {
      status: "error",
      error_message: "Falta la foto cruda.",
    });
    if (failed) callbacks.onItemChange?.(failed);
    return "ok";
  }

  // Claim atómico ANTES de gastar nada: si perdemos la carrera, salimos acá
  // mismo — sin peek de budget, sin Vision, sin Gemini. Este es el candado
  // real (a nivel DB); cualquier guard en el cliente es solo defensa en
  // profundidad, no reemplaza esto.
  const claimed = await claimItem(supabase, item.id);
  if (!claimed) {
    console.log("[burstQueue] item ya reclamado por otra invocación, salteando:", item.id);
    return "skipped";
  }
  item = claimed;
  console.log("[burstQueue] item reclamado, procesando:", item.id);
  callbacks.onItemChange?.(claimed);

  // Las prendas recortadas de una foto de outfit completo ya pasaron por
  // Claude Vision en la detección grupal (1 sola llamada para todas) — acá
  // no vuelven a gatear/consumir el pool para el análisis (eso sería cobrar
  // N créditos por 1 sola detección). Sí van a gastar 1 crédito más abajo,
  // el de su llamada a Gemini (reconstrucción o remoción de fondo).
  const isOutfitExtraction = item.source === "outfit_extraction";

  // Peek, no consume: cada prenda gasta exactamente 1 crédito, el de su
  // llamada a Gemini (ver más abajo) — este chequeo solo evita gastar una
  // llamada a Claude Vision cuando ya sabemos que no habrá cupo para Gemini.
  if (!isOutfitExtraction) {
    const budget = await peekBurstBudgetAction();
    if (budget.remaining <= 0) {
      const reverted = await updateItem(supabase, item.id, { status: "draft" });
      if (reverted) callbacks.onItemChange?.(reverted);
      callbacks.onBudgetExceeded?.(budget.resetInMinutes ?? 60);
      return "budget_exceeded";
    }
  }

  try {
    const { data: rawBlob, error: downloadError } = await supabase.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .download(rawImagePath);

    if (downloadError || !rawBlob) {
      throw new Error(downloadError?.message ?? "No se pudo descargar la foto cruda.");
    }

    let category = item.category;
    let subcategory = item.subcategory;
    let color = item.primary_color;
    let occasions = item.occasions;
    // Outfit_extraction ya trae la decisión desde la detección grupal (ver
    // outfitExtraction.ts) — acá solo se lee, nunca se vuelve a analizar por
    // prenda (eso sería cobrar N créditos por 1 sola detección).
    let reconstructionReason = item.reconstruction_reason;
    // Para items de outfit_extraction la decisión ya viene tomada y lo único
    // persistido es el motivo (no hay columna `needs_reconstruction`), así que
    // ahí el booleano se deriva del motivo. Para el análisis fresco de más
    // abajo se usa el booleano real que devuelve Vision.
    //
    // OJO: eso significa que si en outfitExtraction.ts Vision dijo
    // needs_reconstruction=true con reconstruction_reason vacío, la
    // información se pierde al persistir y acá se lee como false. Arreglarlo de
    // raíz necesita una columna nueva; queda anotado, no lo cambio de callado.
    let needsReconstruction = Boolean(item.reconstruction_reason);
    // Auditoría: si matchSubcategory no encuentra match, guardamos el string
    // crudo de Vision acá — se persiste en subcategory_ai_raw más abajo. Para
    // outfit_extraction ya viene resuelto desde outfitExtraction.ts (item.subcategory_ai_raw).
    let subcategoryAiRaw = item.subcategory_ai_raw;

    if (!isOutfitExtraction) {
      const analyzeForm = new FormData();
      analyzeForm.append("image", rawBlob, "photo.jpg");
      const analysis = await analyzeClothingImageAction(analyzeForm);

      if (!analysis.ok) {
        throw new Error("El análisis de la foto falló.");
      }

      const {
        categoria,
        subcategoria,
        color_principal,
        color_hex,
        ocasiones,
        needs_reconstruction,
        reconstruction_reason,
      } = analysis.data;
      category = VALID_CATEGORIES.includes(categoria as ClothingCategory)
        ? (categoria as ClothingCategory)
        : null;
      const matchedSubcategory = category ? matchSubcategory(category, subcategoria ?? "") : "";
      subcategory = matchedSubcategory || null;
      subcategoryAiRaw = !matchedSubcategory && subcategoria?.trim() ? subcategoria.trim() : null;
      color = matchColorToPalette(color_principal ?? "", color_hex ?? "") || null;
      occasions = mapAiOccasions(ocasiones ?? []);
      needsReconstruction = Boolean(needs_reconstruction);
      reconstructionReason = needs_reconstruction ? reconstruction_reason : null;
    }

    // Pipeline de imagen en cascada, igual que en UploadForm.tsx (mismo bug
    // arreglado en los dos lados):
    //
    //   1. Si necesita reconstrucción, reconstruye — ese resultado YA viene
    //      con el fondo removido, no hace falta una segunda llamada.
    //   2. Si la reconstrucción falla, se intenta la remoción de fondo simple
    //      antes de rendirse. Antes las dos ramas eran EXCLUYENTES, así que
    //      una prenda marcada para reconstrucción cuya reconstrucción fallaba
    //      se guardaba con el fondo completo sin haber intentado la remoción
    //      simple. Cuesta un segundo crédito, pero solo en el camino de fallo.
    //   3. Si todo falla, se guarda la foto original tal cual — la prenda
    //      nunca se pierde, queda reprocesable con "Mejora esta foto".
    let reconstructed = false;
    let finalBlob: Blob = rawBlob;
    let finalContentType = rawBlob.type || "image/jpeg";
    // `pipelineResuelto` es control de flujo (ya hay imagen final);
    // `backgroundRemoved` es el dato que se guarda y sale de medir el
    // resultado (ver finalizeGeminiImageOutput). Compartían variable, y eso
    // hacía que un recorte fallido en la reconstrucción disparara una segunda
    // llamada a Gemini sobre la foto ORIGINAL, tirando la reconstrucción.
    let pipelineResuelto = false;
    let backgroundRemoved = false;
    let imageFailure: string | null = null;

    // OJO: `needsReconstruction` es el booleano, NO el string del motivo.
    // Antes la condición era `if (reconstructionReason)`, y si Vision devolvía
    // needs_reconstruction=true con el motivo vacío, la reconstrucción se
    // salteaba en silencio.
    if (needsReconstruction) {
      const description = [subcategory, color]
        .filter((v): v is string => Boolean(v))
        .join(" ") || category || "prenda de ropa";

      const reconForm = new FormData();
      reconForm.append("image", rawBlob, "photo.jpg");
      reconForm.append("description", description);
      if (category) reconForm.append("category", category);
      reconForm.append("source", isOutfitExtraction ? "outfit_extraction" : "burst");
      reconForm.append("clothingItemId", item.id);
      const reconResult = await reconstructGarmentImageAction(reconForm);

      if (reconResult.ok) {
        finalBlob = base64ToBlob(reconResult.base64, reconResult.contentType);
        finalContentType = reconResult.contentType;
        reconstructed = true;
        pipelineResuelto = true;
        backgroundRemoved = reconResult.backgroundRemoved;
      } else {
        imageFailure = `reconstrucción falló (${reconResult.reason})`;
      }
    }

    if (!pipelineResuelto) {
      const bgForm = new FormData();
      bgForm.append("image", rawBlob, "photo.jpg");
      bgForm.append("source", isOutfitExtraction ? "outfit_extraction" : "burst");
      bgForm.append("clothingItemId", item.id);
      const bgResult = await removeBackgroundWithGemini(bgForm);

      if (bgResult.ok) {
        finalBlob = base64ToBlob(bgResult.base64, bgResult.contentType);
        finalContentType = bgResult.contentType;
        pipelineResuelto = true;
        backgroundRemoved = bgResult.backgroundRemoved;
        imageFailure = null; // el fondo se pudo quitar: resultado usable
      } else {
        imageFailure = `remoción de fondo falló (${bgResult.reason})`;
      }
    }

    // El fallo no puede ser silencioso. La prenda se guarda igual (con
    // background_removed=false, reprocesable), pero queda registrado con el
    // id del item para poder rastrearlo en los logs.
    if (imageFailure) {
      console.error(`[burstQueue] item ${item.id}: ${imageFailure}`);
    }
    // La IA respondió bien pero el recorte no surtió efecto (fondo no blanco
    // que @imgly no resolvió). Queda con background_removed=false, así que la
    // card ofrece "Mejora esta foto" en vez de dar el problema por inexistente.
    if (pipelineResuelto && !backgroundRemoved) {
      console.warn(`[burstQueue] item ${item.id}: el recorte no surtió efecto, reprocesable`);
    }

    const finalPath = buildClothingImagePath({
      userId: item.user_id,
      fileName: backgroundRemoved ? "photo.png" : "photo.jpg",
      uuid: crypto.randomUUID(),
    });

    const { error: uploadError } = await supabase.storage
      .from(CLOTHING_IMAGES_BUCKET)
      .upload(finalPath, finalBlob, {
        contentType: finalContentType,
        upsert: false,
        cacheControl: THUMBNAIL_CACHE_CONTROL,
      });

    if (uploadError) throw new Error(uploadError.message);

    // Miniatura para la grilla. Adicional: si falla, la prenda igual queda
    // 'ready' y la card cae a la imagen completa.
    const thumbnailPath = await subirMiniatura(
      supabase,
      new File([finalBlob], `photo.${finalContentType === "image/png" ? "png" : "jpg"}`, {
        type: finalContentType,
      }),
      finalPath
    );

    const ready = await updateItem(supabase, item.id, {
      status: "ready",
      category,
      subcategory,
      primary_color: color,
      occasions,
      image_path: finalPath,
      thumbnail_path: thumbnailPath,
      reconstructed,
      reconstruction_reason: reconstructionReason,
      background_removed: backgroundRemoved,
      subcategory_ai_raw: subcategoryAiRaw,
    });
    if (ready) callbacks.onItemChange?.(ready);
    return "ok";
  } catch (err) {
    console.error("[burstQueue] error procesando item", item.id, err);
    const rawMessage = err instanceof Error ? err.message : "Error desconocido";
    const network = isNetworkError(rawMessage);
    const retryCount = item.retry_count + 1;
    const maxRetries = network ? MAX_RETRIES_NETWORK : MAX_RETRIES;
    if (retryCount <= maxRetries) {
      const requeued = await updateItem(supabase, item.id, {
        status: "draft",
        retry_count: retryCount,
      });
      if (requeued) callbacks.onItemChange?.(requeued);
    } else {
      const failed = await updateItem(supabase, item.id, {
        status: "error",
        retry_count: retryCount,
        error_message: network ? NETWORK_ERROR_MESSAGE : rawMessage,
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
    .select(CLOTHING_ITEM_SELECT)
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

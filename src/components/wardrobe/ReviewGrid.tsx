// Grilla de revisión del modo ráfaga. Client Component: sondea el estado de
// las prendas en el pipeline (draft/processing/ready/error) cada 2.5s
// mientras haya alguna sin terminar, permite edición inline y confirma el
// lote completo al final.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/onboarding/Chip";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { CONFIRMED_STATUS, COLOR_PALETTE, ITEM_OCCASIONS, SUBCATEGORIES } from "@/lib/wardrobe/constants";
import { recordPetAction } from "@/lib/pet/actions";
import {
  cleanupStaleDrafts,
  deletePendingItem,
  fetchPendingItems,
  processPendingForUser,
  resumeStuckProcessing,
  retryErrorItem,
} from "@/lib/wardrobe/burstQueue";
import { CLOTHING_CATEGORIES, type BurstClothingItem, type ClothingCategory } from "@/types/database";

type Props = { userId: string };

type Edits = {
  category: ClothingCategory | "";
  subcategory: string;
  color: string;
  occasions: string[];
};

type ExistingItem = {
  id: string;
  category: ClothingCategory;
  primary_color: string | null;
  image_path: string | null;
};

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function editsFromItem(item: BurstClothingItem): Edits {
  return {
    category: item.category ?? "",
    subcategory: item.subcategory ?? "",
    color: item.primary_color ?? "",
    occasions: item.occasions ?? [],
  };
}

function isComplete(e: Edits): boolean {
  return Boolean(e.category && e.subcategory && e.color && e.occasions.length > 0);
}

const PENDING_STATUSES = new Set(["draft", "processing"]);

export default function ReviewGrid({ userId }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [items, setItems] = useState<BurstClothingItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [edits, setEdits] = useState<Record<string, Edits>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(new Set());
  const [showingOriginal, setShowingOriginal] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const fetched = await fetchPendingItems(supabase, userId);
    setItems(fetched);
    setEdits((prev) => {
      const next = { ...prev };
      for (const item of fetched) {
        if (!next[item.id]) next[item.id] = editsFromItem(item);
      }
      return next;
    });

    // Ambos paths por item: `image_path` para el resultado final e
    // `raw_image_path` para el toggle "Ver original" (outfit_extraction).
    const paths = fetched
      .flatMap((i) => [i.image_path, i.raw_image_path])
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      const signed = await createSignedUrlMap(supabase, paths);
      setImageUrls((prev) => new Map([...prev, ...signed]));
    }
  }, [supabase, userId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await resumeStuckProcessing(supabase, userId);
      await cleanupStaleDrafts(supabase, userId);
      await refresh();
      if (!active) return;
      setLoading(false);
      // Retoma cualquier draft pendiente (fotos que llegaron mientras el
      // usuario no estaba en esta pantalla, o que quedaron a medias).
      processPendingForUser(supabase, userId, { onItemChange: () => refresh() }).catch(() => {});

      // Armario ya confirmado del usuario, para el chequeo de duplicados de
      // las prendas extraídas de una foto de outfit completo — una sola vez,
      // no hace falta refrescar mientras se revisa el lote.
      const { data: confirmed } = await supabase
        .from("clothing_items")
        .select("id, category, primary_color, image_path")
        .eq("user_id", userId)
        .eq("status", "confirmed");
      if (!active) return;
      const existing = (confirmed ?? []) as ExistingItem[];
      setExistingItems(existing);
      const existingPaths = existing
        .map((i) => i.image_path)
        .filter((p): p is string => Boolean(p));
      if (existingPaths.length > 0) {
        const signed = await createSignedUrlMap(supabase, existingPaths);
        setImageUrls((prev) => new Map([...prev, ...signed]));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId]);

  // Sondeo mientras haya algo en draft/processing (no hay realtime en el proyecto).
  const hasPending = items.some((i) => PENDING_STATUSES.has(i.status));
  useEffect(() => {
    if (!hasPending) return;
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [hasPending, refresh]);

  const readyItems = useMemo(() => items.filter((i) => i.status === "ready"), [items]);
  const errorItems = useMemo(() => items.filter((i) => i.status === "error"), [items]);
  const pendingItems = useMemo(
    () => items.filter((i) => PENDING_STATUSES.has(i.status)),
    [items]
  );

  function setItemEdit(id: string, patch: Partial<Edits>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function findDuplicate(e: Edits): ExistingItem | null {
    if (!e.category || !e.color) return null;
    return (
      existingItems.find((i) => i.category === e.category && i.primary_color === e.color) ?? null
    );
  }

  async function handleDelete(item: BurstClothingItem) {
    await deletePendingItem(supabase, userId, item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function handleRetry(item: BurstClothingItem) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: "processing" } : i))
    );
    await retryErrorItem(supabase, userId, item.id, { onItemChange: () => refresh() });
  }

  async function handleGuardarTodo() {
    setGeneralError(null);
    const validos = readyItems.filter((i) => isComplete(edits[i.id] ?? editsFromItem(i)));
    if (validos.length === 0) {
      setGeneralError("Completa categoría, subcategoría, color y ocasión de al menos una prenda lista.");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        validos.map(async (item) => {
          const e = edits[item.id] ?? editsFromItem(item);
          const { error } = await supabase
            .from("clothing_items")
            .update({
              status: CONFIRMED_STATUS,
              category: e.category,
              subcategory: e.subcategory,
              primary_color: e.color,
              occasions: e.occasions,
            })
            .eq("id", item.id)
            .eq("user_id", userId);
          return { id: item.id, ok: !error };
        })
      );

      const confirmedCount = results.filter((r) => r.ok).length;
      if (confirmedCount === 0) {
        setGeneralError("No pudimos guardar las prendas. Intenta de nuevo.");
        return;
      }

      for (let i = 0; i < confirmedCount; i++) {
        recordPetAction("garment_uploaded").catch(() => {});
      }

      router.push(`/wardrobe?uploaded=${confirmedCount}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-center text-sm text-text-muted">
          Todavía no capturaste ninguna foto en esta sesión.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pendingItems.length > 0 ? (
        <div
          role="status"
          className="rounded-md bg-primary-light px-4 py-3 text-sm font-medium text-primary"
        >
          <span
            className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent align-[-3px]"
            aria-hidden="true"
          />
          Procesando {pendingItems.length}{" "}
          {pendingItems.length === 1 ? "foto" : "fotos"}…
        </div>
      ) : null}

      {generalError ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {generalError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingItems.map((item) => (
          <Card key={item.id} padding="sm">
            <div className="aspect-[3/4] animate-pulse rounded-lg bg-surface-2" />
            <p className="mt-3 text-center text-xs text-text-muted">Analizando…</p>
          </Card>
        ))}

        {errorItems.map((item) => {
          const url = item.image_path ?? item.raw_image_path
            ? imageUrls.get(item.image_path ?? item.raw_image_path!)
            : undefined;
          return (
            <Card key={item.id} padding="sm">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover opacity-60" />
                ) : null}
              </div>
              <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-xs font-medium text-danger">
                {item.error_message ?? "No pudimos procesar esta foto."}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="md" fullWidth onClick={() => handleRetry(item)}>
                  Reintentar
                </Button>
                <Button variant="ghost" size="md" onClick={() => handleDelete(item)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          );
        })}

        {readyItems.map((item) => {
          const e = edits[item.id] ?? editsFromItem(item);
          const isOutfitExtraction = item.source === "outfit_extraction";
          const showingOrig = showingOriginal.has(item.id);
          const finalUrl = item.image_path ? imageUrls.get(item.image_path) : undefined;
          const originalUrl = item.raw_image_path ? imageUrls.get(item.raw_image_path) : undefined;
          const url = showingOrig && originalUrl ? originalUrl : finalUrl;
          const subcategoryOptions = e.category ? SUBCATEGORIES[e.category] : [];
          const duplicate =
            item.source === "outfit_extraction" && !dismissedDuplicates.has(item.id)
              ? findDuplicate(e)
              : null;
          const duplicateUrl = duplicate?.image_path ? imageUrls.get(duplicate.image_path) : undefined;

          return (
            <Card key={item.id} padding="sm">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="Prenda capturada" className="h-full w-full object-cover" />
                ) : null}
              </div>

              {isOutfitExtraction && originalUrl && finalUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowingOriginal((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  {showingOrig ? "Ver reconstruida" : "Ver original"}
                </button>
              ) : null}

              {isOutfitExtraction && !item.reconstructed ? (
                <p className="mt-1 text-[11px] text-text-faint">
                  No pudimos mejorar esta foto automáticamente — mostrando el recorte original.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {CLOTHING_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat.value}
                    active={e.category === cat.value}
                    onClick={() =>
                      setItemEdit(item.id, { category: cat.value, subcategory: "" })
                    }
                  >
                    {cat.label}
                  </Chip>
                ))}
              </div>

              {subcategoryOptions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {subcategoryOptions.map((opt) => (
                    <Chip
                      key={opt}
                      active={e.subcategory === opt}
                      onClick={() => setItemEdit(item.id, { subcategory: opt })}
                    >
                      {opt}
                    </Chip>
                  ))}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={e.color === c.name}
                    onClick={() => setItemEdit(item.id, { color: c.name })}
                    className={[
                      "h-7 w-7 rounded-full transition-shadow",
                      e.color === c.name
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                        : "ring-1 ring-border",
                    ].join(" ")}
                    style={{ background: c.swatch }}
                  />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {ITEM_OCCASIONS.map((o) => (
                  <Chip
                    key={o}
                    active={e.occasions.includes(o)}
                    onClick={() => setItemEdit(item.id, { occasions: toggle(e.occasions, o) })}
                  >
                    {o}
                  </Chip>
                ))}
              </div>

              {!isComplete(e) ? (
                <p className="mt-2 text-xs text-text-faint">
                  Completa categoría, subcategoría, color y ocasión.
                </p>
              ) : null}

              {duplicate ? (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-warning-light px-3 py-2">
                  {duplicateUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={duplicateUrl}
                      alt=""
                      className="h-10 w-8 shrink-0 rounded object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-warning">¿Ya tienes esta?</p>
                    <p className="text-[11px] text-warning">
                      Tienes una prenda parecida en tu armario.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-full border border-warning px-2.5 py-1 text-[11px] font-semibold text-warning hover:bg-warning hover:text-white"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedDuplicates((prev) => new Set(prev).add(item.id))
                      }
                      className="rounded-full px-2.5 py-1 text-[11px] font-medium text-warning underline"
                    >
                      Guardar igual
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="md" onClick={() => handleDelete(item)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="ghost"
          onClick={() => router.push("/wardrobe/upload")}
          disabled={saving}
        >
          Seguir capturando
        </Button>
        <Button
          onClick={handleGuardarTodo}
          isLoading={saving}
          loadingText="Guardando…"
          disabled={readyItems.length === 0}
        >
          Guardar todo ({readyItems.length})
        </Button>
      </div>
    </div>
  );
}

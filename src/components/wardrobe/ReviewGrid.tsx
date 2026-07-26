// Grilla de revisión del modo ráfaga. Client Component: sondea el estado de
// las prendas en el pipeline (draft/processing/ready/error) cada 2.5s
// mientras haya alguna sin terminar, permite edición inline y confirma el
// lote completo al final.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/onboarding/Chip";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
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

// Subcategoría obligatoria — mismo criterio que UploadForm.tsx (individual)
// y EditItemForm.tsx (editar prenda). Antes era opcional acá porque Vision
// puede fallar en autocompletarla (ver matchSubcategory en aiMapping.ts) y
// eso dejaba prendas guardadas con subcategory=null ("Sin cat." en el
// armario) — decisión consciente: gana la regla estricta, consistente en los
// tres flujos de subida. Para que esto sea usable en ráfaga (muchas prendas,
// no una a la vez), aiMapping.ts tiene sinónimos/reglas por palabra clave
// que reducen cuántas veces Vision falla el auto-match en primer lugar.
function isComplete(e: Edits): boolean {
  return Boolean(e.category && e.subcategory && e.color && e.occasions.length > 0);
}

const PENDING_STATUSES = new Set(["draft", "processing"]);
// Umbral solo informativo (no técnico): a partir de acá el "Analizando…" se
// siente largo aunque sea normal (cold-start del modelo de @imgly, ~10-16s,
// más la llamada a Gemini). Bien por debajo de STUCK_PROCESSING_MINUTES (3
// min) en burstQueue.ts — ese es el que de verdad libera el item.
const SLOW_PROCESSING_MS = 25_000;

function msSince(iso: string): number {
  return Date.now() - new Date(iso).getTime();
}

/** Etiqueta legible para nombrar una prenda en el error de "Guardar todo" — nunca se persiste, solo para el mensaje. */
function labelForItem(item: BurstClothingItem, e: Edits): string {
  if (item.name?.trim()) return item.name.trim();
  const catLabel = CLOTHING_CATEGORIES.find((c) => c.value === e.category)?.label;
  return [catLabel, e.color].filter(Boolean).join(" ") || "Prenda sin categoría";
}

function missingFields(e: Edits): string[] {
  const missing: string[] = [];
  if (!e.category) missing.push("categoría");
  if (!e.subcategory) missing.push("subcategoría");
  if (!e.color) missing.push("color");
  if (e.occasions.length === 0) missing.push("ocasión");
  return missing;
}

export default function ReviewGrid({ userId }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const online = useOnlineStatus();

  const [items, setItems] = useState<BurstClothingItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [edits, setEdits] = useState<Record<string, Edits>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(new Set());
  const [showingOriginal, setShowingOriginal] = useState<Set<string>>(new Set());
  // Tarjetas marcadas como incompletas en el último intento de "Guardar
  // todo" — se resaltan con borde de error hasta que el usuario las
  // complete (el chequeo es reactivo: en cuanto isComplete vuelve a dar
  // true para ese item, el resaltado desaparece solo, sin tocar este set).
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  // Guard de re-entrancia para "Guardar todo" — mismo patrón que UploadForm:
  // se lee/escribe de forma síncrona para descartar un doble clic/tap antes
  // de que arranque un segundo batch de updates.
  const savingRef = useRef(false);
  // Defensa en profundidad, NO el fix: el candado real es el claim atómico
  // en burstQueue.ts. Esto solo evita lanzar `processPendingForUser` de
  // nuevo si ya hay una pasada en vuelo desde esta misma pantalla — ver la
  // nota equivalente en BurstCapture.tsx.
  const processingRef = useRef(false);

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
      if (!processingRef.current) {
        processingRef.current = true;
        processPendingForUser(supabase, userId, { onItemChange: () => refresh() })
          .catch(() => {})
          .finally(() => {
            processingRef.current = false;
          });
      }

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
  // Cada tick también corre resumeStuckProcessing: si no, un item que se
  // traba en 'processing' DESPUÉS del mount (ej. la pestaña que lo reclamó
  // muere a mitad de Gemini) queda huérfano para siempre — nadie vuelve a
  // liberarlo hasta que el usuario recarga la página. Reintentar el rescate
  // en cada tick es barato (UPDATE condicionado, normalmente afecta 0 filas).
  const hasPending = items.some((i) => PENDING_STATUSES.has(i.status));
  useEffect(() => {
    if (!hasPending) return;
    const tick = async () => {
      // Offline: no tiene sentido pegarle a Supabase/Vision/Gemini, solo
      // quemaríamos reintentos contra una conexión que sabemos caída. Se
      // retoma solo en el próximo tick (2.5s) una vez que vuelva la señal.
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      await resumeStuckProcessing(supabase, userId);
      await refresh();
      if (!processingRef.current) {
        processingRef.current = true;
        processPendingForUser(supabase, userId, { onItemChange: () => refresh() })
          .catch(() => {})
          .finally(() => {
            processingRef.current = false;
          });
      }
    };
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [hasPending, refresh, supabase, userId]);

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
    if (savingRef.current) return;

    setGeneralError(null);
    setInvalidIds(new Set());

    // No guardar parcial: si algo en 'ready' está incompleto, se bloquea el
    // guardado ENTERO (ni siquiera las completas se guardan) — antes acá se
    // filtraban las incompletas en silencio y el usuario perdía una prenda
    // que ya costó una llamada real a Gemini sin enterarse. Señalamos
    // exactamente cuáles faltan y qué les falta, resaltamos las tarjetas y
    // hacemos scroll a la primera.
    const incompletos = readyItems.filter((i) => !isComplete(edits[i.id] ?? editsFromItem(i)));
    if (incompletos.length > 0) {
      const detalle = incompletos
        .map((i) => {
          const e = edits[i.id] ?? editsFromItem(i);
          return `${labelForItem(i, e)} (falta ${missingFields(e).join(", ")})`;
        })
        .join("; ");
      setGeneralError(`Completa estos campos antes de guardar — ${detalle}.`);
      setInvalidIds(new Set(incompletos.map((i) => i.id)));
      document
        .getElementById(`review-item-${incompletos[0].id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const results = await Promise.all(
        readyItems.map(async (item) => {
          const e = edits[item.id] ?? editsFromItem(item);
          const { error } = await supabase
            .from("clothing_items")
            .update({
              status: CONFIRMED_STATUS,
              category: e.category,
              subcategory: e.subcategory || null,
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

      // Sin router.refresh(): ver el comentario equivalente en
      // UploadForm.tsx — llamarlo justo después de push() cuelga la
      // transición de Next fuera del flujo de auth.
      router.push(`/wardrobe?uploaded=${confirmedCount}`);
    } finally {
      savingRef.current = false;
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
      {!online ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md bg-warning-light px-4 py-3 text-sm font-medium text-warning motion-safe:animate-[fadeInUp_180ms_ease-out]"
        >
          <span className="material-symbols-outlined text-base leading-none" aria-hidden="true">
            wifi_off
          </span>
          Sin conexión — el análisis de tus fotos está en pausa hasta que vuelva la señal.
        </div>
      ) : null}

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
        {pendingItems.map((item) => {
          const isSlow =
            item.status === "processing" && msSince(item.updated_at) > SLOW_PROCESSING_MS;
          return (
            <Card key={item.id} padding="sm">
              <div className="aspect-[3/4] animate-pulse rounded-lg bg-surface-2" />
              <p className="mt-3 text-center text-xs text-text-muted">
                {isSlow ? "Está tardando más de lo normal, ya casi…" : "Analizando…"}
              </p>
            </Card>
          );
        })}

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
          const invalid = invalidIds.has(item.id) && !isComplete(e);

          return (
            <Card
              key={item.id}
              id={`review-item-${item.id}`}
              padding="sm"
              className={invalid ? "border-danger ring-2 ring-danger/40" : undefined}
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="Prenda capturada" className="h-full w-full object-cover" />
                ) : null}
              </div>

              {item.reconstructed && originalUrl && finalUrl ? (
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

              {item.reconstruction_reason && !item.reconstructed ? (
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
                <p
                  className={[
                    "mt-2 text-xs",
                    invalid ? "font-medium text-danger" : "text-text-faint",
                  ].join(" ")}
                >
                  Falta {missingFields(e).join(", ")}.
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

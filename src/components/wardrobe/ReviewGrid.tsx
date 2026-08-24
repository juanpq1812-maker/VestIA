// Lista de revisión del modo ráfaga y de "subir outfit completo" — es la misma
// pantalla para los dos (OutfitPhotoCapture empuja acá después de confirmar los
// recortes). Client Component: sondea el estado de las prendas en el pipeline
// (draft/processing/ready/error) cada 2.5s mientras haya alguna sin terminar,
// permite edición inline y confirma el lote completo al final.
//
// Cada prenda es una FILA COLAPSADA (ReviewItemCard), no una tarjeta con todos
// los menús abiertos — el porqué está en ese archivo. Acá vive lo que solo se
// puede decidir mirando el lote entero: cuál se abre sola, el recorrido guiado
// entre las que necesitan atención, y el guardado.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ReviewItemCard from "@/components/wardrobe/ReviewItemCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import {
  attentionIds,
  autoExpandId,
  nextAttentionId,
  reviewVerdict,
  type ReviewEdits,
} from "@/lib/wardrobe/reviewState";
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

type ExistingItem = {
  id: string;
  category: ClothingCategory;
  primary_color: string | null;
  image_path: string | null;
};

function editsFromItem(item: BurstClothingItem): ReviewEdits {
  return {
    category: item.category ?? "",
    subcategory: item.subcategory ?? "",
    color: item.primary_color ?? "",
    occasions: item.occasions ?? [],
  };
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
function labelForItem(item: BurstClothingItem, e: ReviewEdits): string {
  if (item.name?.trim()) return item.name.trim();
  const catLabel = CLOTHING_CATEGORIES.find((c) => c.value === e.category)?.label;
  return [catLabel, e.color].filter(Boolean).join(" ") || "Prenda sin categoría";
}

export default function ReviewGrid({ userId }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const online = useOnlineStatus();

  const [items, setItems] = useState<BurstClothingItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [edits, setEdits] = useState<Record<string, ReviewEdits>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [dismissedDuplicates, setDismissedDuplicates] = useState<Set<string>>(new Set());
  const [showingOriginal, setShowingOriginal] = useState<Set<string>>(new Set());
  // Una sola tarjeta abierta a la vez. Abrir varias es exactamente el scroll
  // infinito que esta pantalla existe para matar.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // La auto-expansión corre UNA vez, cuando el lote termina de procesarse. Sin
  // este guard el sondeo cada 2.5s volvería a abrir la tarjeta que el usuario
  // acaba de cerrar — y peor: la tarjeta se cerraría sola en cuanto el usuario
  // completara el campo que faltaba, porque dejaría de ser "la única que
  // necesita atención" a mitad de la edición.
  const [autoExpandDecidido, setAutoExpandDecidido] = useState(false);
  // Tarjetas marcadas como incompletas en el último intento de "Guardar
  // todo" — se resaltan con borde de error hasta que el usuario las
  // complete (el chequeo es reactivo: en cuanto la prenda vuelve a estar
  // completa el resaltado desaparece solo, sin tocar este set).
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  // Prendas que el usuario ya editó a mano: sus valores locales mandan sobre
  // lo que devuelva el sondeo (ver refresh). Es un ref y no estado porque solo
  // se lee dentro de callbacks — no hay nada que re-renderizar cuando cambia.
  const touchedRef = useRef<Set<string>>(new Set());
  // Guard de re-entrancia para "Guardar todo" — mismo patrón que UploadForm:
  // se lee/escribe de forma síncrona para descartar un doble clic/tap antes
  // de que arranque un segundo batch de updates.
  const savingRef = useRef(false);
  // Defensa en profundidad, NO el fix: el candado real es el claim atómico
  // en burstQueue.ts. Esto solo evita lanzar `processPendingForUser` de
  // nuevo si ya hay una pasada en vuelo desde esta misma pantalla — ver la
  // nota equivalente en BurstCapture.tsx.
  const processingRef = useRef(false);
  // Minutos que faltan para que vuelva el presupuesto de análisis, o null si
  // hay cuota. `processPendingForUser` ya emitía este dato vía
  // `onBudgetExceeded` y nadie lo escuchaba: sin él, una prenda bloqueada por
  // cuota se veía igual que una que simplemente tarda.
  const [budgetResetMin, setBudgetResetMin] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const fetched = await fetchPendingItems(supabase, userId);
    setItems(fetched);
    setEdits((prev) => {
      const next = { ...prev };
      for (const item of fetched) {
        // Re-sembrar desde la fila mientras el usuario no la haya tocado.
        //
        // El guard `if (!next[item.id])` solo, que es lo que había, siembra
        // los edits en el PRIMER fetch — y en ese momento la prenda todavía
        // está en draft/processing con category/color/occasions en null,
        // porque el análisis no ha corrido. Cuando el pipeline termina y la
        // fila se llena, los edits locales se quedaban con los nulos viejos:
        // la prenda aparecía "incompleta" para siempre, bloqueaba el guardado
        // del lote entero, y solo se arreglaba recargando la página.
        //
        // Visto en vivo con dos prendas reales: la que ya estaba lista al
        // entrar salió bien y la que terminó de procesarse estando la pantalla
        // abierta salió en rojo pidiendo los cuatro campos.
        //
        // `touchedRef` es lo que impide que el sondeo cada 2.5s le pise al
        // usuario lo que acaba de elegir.
        const yaEditada = touchedRef.current.has(item.id);
        if (!next[item.id] || (!yaEditada && item.status === "ready")) {
          next[item.id] = editsFromItem(item);
        }
      }
      return next;
    });

    // Tres paths por item: `thumbnail_path` para la fila colapsada (es lo que
    // se pinta ocho veces seguidas), `image_path` para el detalle abierto y
    // `raw_image_path` para el toggle "Ver original" (outfit_extraction).
    const paths = fetched
      .flatMap((i) => [i.thumbnail_path, i.image_path, i.raw_image_path])
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
        processPendingForUser(supabase, userId, {
          onItemChange: () => {
            setBudgetResetMin(null);
            refresh();
          },
          onBudgetExceeded: (min) => setBudgetResetMin(min),
        })
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
        processPendingForUser(supabase, userId, {
          onItemChange: () => {
            setBudgetResetMin(null);
            refresh();
          },
          onBudgetExceeded: (min) => setBudgetResetMin(min),
        })
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

  function findDuplicate(e: ReviewEdits): ExistingItem | null {
    if (!e.category || !e.color) return null;
    return (
      existingItems.find((i) => i.category === e.category && i.primary_color === e.color) ?? null
    );
  }

  // Un veredicto por prenda lista, en el orden en que se pintan — ese orden es
  // el del recorrido guiado.
  const verdicts = useMemo(() => {
    return readyItems.map((item) => {
      const e = edits[item.id] ?? editsFromItem(item);
      const duplicate =
        item.source === "outfit_extraction" && !dismissedDuplicates.has(item.id)
          ? findDuplicate(e)
          : null;
      const verdict = reviewVerdict(e, {
        subcategoryAiRaw: item.subcategory_ai_raw,
        duplicate: Boolean(duplicate),
        reconstructed: item.reconstructed,
        reconstructionReason: item.reconstruction_reason,
        backgroundRemoved: item.background_removed,
      });
      return { id: item.id, item, edits: e, verdict, duplicate };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyItems, edits, dismissedDuplicates, existingItems]);

  const verdictPairs = useMemo(
    () => verdicts.map(({ id, verdict }) => ({ id, verdict })),
    [verdicts]
  );
  const pendientes = useMemo(() => attentionIds(verdictPairs), [verdictPairs]);
  const incompletas = useMemo(
    () => verdicts.filter((v) => v.verdict.state === "incompleta"),
    [verdicts]
  );

  // Se abre sola SOLO si es una (ver autoExpandId). Se decide una vez, cuando
  // ya no queda nada procesándose: antes de eso el lote todavía cambia y
  // "cuántas necesitan atención" no es una pregunta contestable.
  //
  // Va acá y no en un useEffect a propósito: ajustar estado durante el render
  // en respuesta a que cambió algo es el patrón que React documenta para esto,
  // y evita el render de más (más el parpadeo de una tarjeta que se abre un
  // frame tarde) que trae hacerlo en un efecto.
  const loteEstable = !loading && !hasPending && readyItems.length > 0;
  if (!autoExpandDecidido && loteEstable) {
    setAutoExpandDecidido(true);
    setExpandedId(autoExpandId(verdictPairs));
  }

  function setItemEdit(id: string, patch: Partial<ReviewEdits>) {
    touchedRef.current.add(id);
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function abrirYCentrar(id: string) {
    setExpandedId(id);
    // El scroll va después del pintado de la tarjeta abierta, si no se centra
    // sobre la altura vieja (colapsada) y queda a media pantalla.
    requestAnimationFrame(() => {
      document
        .getElementById(`review-item-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function handleDelete(item: BurstClothingItem) {
    await deletePendingItem(supabase, userId, item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setExpandedId((prev) => (prev === item.id ? null : prev));
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
    // exactamente cuáles faltan y qué les falta, resaltamos las tarjetas, y
    // abrimos la primera además de hacerle scroll: con las tarjetas
    // colapsadas, resaltar sin abrir dejaría al usuario mirando una fila
    // marcada en rojo sin nada que tocar.
    if (incompletas.length > 0) {
      const detalle = incompletas
        .map((v) => `${labelForItem(v.item, v.edits)} (falta ${v.verdict.missing.join(", ")})`)
        .join("; ");
      setGeneralError(`Completa estos campos antes de guardar — ${detalle}.`);
      setInvalidIds(new Set(incompletas.map((v) => v.id)));
      abrirYCentrar(incompletas[0].id);
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
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-xl bg-surface-2" />
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

  // La barra de arriba solo aparece cuando hay algo pendiente que el usuario NO
  // está mirando ya. Si la tarjeta pendiente está abierta, repetir el aviso
  // arriba sería ruido sobre algo que ya tiene en pantalla.
  const mostrarBarraAtencion =
    pendientes.length > 0 && (expandedId === null || !pendientes.includes(expandedId));

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
        budgetResetMin !== null ? (
          // Sin cuota no hay nada girando: un spinner acá sería una animación
          // que promete progreso que no está ocurriendo.
          <div
            role="status"
            className="rounded-md bg-warning-light px-4 py-3 text-sm font-medium text-warning"
          >
            Llegaste al límite de análisis de esta hora. Tus{" "}
            {pendingItems.length}{" "}
            {pendingItems.length === 1 ? "foto queda" : "fotos quedan"} en cola y
            {" "}se reanudan en ~{budgetResetMin} min. Puedes cerrar la app: no
            se pierden.
          </div>
        ) : (
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
        )
      ) : null}

      {mostrarBarraAtencion ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-light px-4 py-3 motion-safe:animate-[fadeInUp_180ms_ease-out]"
        >
          <p className="text-sm font-medium text-warning">
            {pendientes.length === 1
              ? "1 prenda necesita un toque."
              : `${pendientes.length} prendas necesitan un toque.`}{" "}
            El resto quedó lista.
          </p>
          <button
            type="button"
            onClick={() => abrirYCentrar(pendientes[0])}
            className="rounded-full border border-warning px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
          >
            {pendientes.length === 1 ? "Revisarla" : "Revisar la primera"}
          </button>
        </div>
      ) : null}

      {generalError ? (
        <p role="alert" className="rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
          {generalError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {pendingItems.map((item) => {
          const isSlow =
            item.status === "processing" && msSince(item.updated_at) > SLOW_PROCESSING_MS;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm"
            >
              <div
                className={`h-16 w-12 shrink-0 rounded-lg bg-surface-2 ${
                  budgetResetMin === null ? "animate-pulse" : ""
                }`}
              />
              <p className="text-xs text-text-muted">
                {budgetResetMin !== null
                  ? `En cola · ~${budgetResetMin} min`
                  : isSlow
                    ? "Está tardando más de lo normal, ya casi…"
                    : "Analizando…"}
              </p>
            </div>
          );
        })}

        {errorItems.map((item) => {
          const url = item.image_path ?? item.raw_image_path
            ? imageUrls.get(item.image_path ?? item.raw_image_path!)
            : undefined;
          return (
            <div
              key={item.id}
              className="rounded-xl border border-danger/40 bg-surface p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover opacity-60" />
                  ) : null}
                </div>
                <p
                  role="alert"
                  className="min-w-0 flex-1 text-xs font-medium text-danger"
                >
                  {item.error_message ?? "No pudimos procesar esta foto."}
                </p>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="md" onClick={() => handleDelete(item)}>
                  Eliminar
                </Button>
                <Button size="md" onClick={() => handleRetry(item)}>
                  Reintentar
                </Button>
              </div>
            </div>
          );
        })}

        {verdicts.map(({ id, item, edits: e, verdict, duplicate }) => {
          const showingOrig = showingOriginal.has(id);
          const finalUrl = item.image_path ? imageUrls.get(item.image_path) : undefined;
          const originalUrl = item.raw_image_path
            ? imageUrls.get(item.raw_image_path)
            : undefined;
          const thumbUrl =
            (item.thumbnail_path ? imageUrls.get(item.thumbnail_path) : undefined) ?? finalUrl;

          return (
            <ReviewItemCard
              key={id}
              item={item}
              edits={e}
              verdict={verdict}
              thumbUrl={thumbUrl}
              fullUrl={showingOrig && originalUrl ? originalUrl : finalUrl}
              expanded={expandedId === id}
              onToggleExpanded={() =>
                setExpandedId((prev) => (prev === id ? null : id))
              }
              onEdit={(patch) => setItemEdit(id, patch)}
              onDelete={() => handleDelete(item)}
              invalid={invalidIds.has(id) && verdict.state === "incompleta"}
              canShowOriginal={Boolean(item.reconstructed && originalUrl && finalUrl)}
              showingOriginal={showingOrig}
              onToggleOriginal={() =>
                setShowingOriginal((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              duplicateUrl={
                duplicate?.image_path ? imageUrls.get(duplicate.image_path) : undefined
              }
              onDismissDuplicate={() =>
                setDismissedDuplicates((prev) => new Set(prev).add(id))
              }
              nextAttentionId={nextAttentionId(verdictPairs, id)}
              onGoNext={() => {
                const siguiente = nextAttentionId(verdictPairs, id);
                if (siguiente) abrirYCentrar(siguiente);
                else setExpandedId(null);
              }}
            />
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
        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          <Button
            onClick={handleGuardarTodo}
            isLoading={saving}
            loadingText="Guardando…"
            disabled={readyItems.length === 0}
          >
            Guardar todo ({readyItems.length})
          </Button>
          {/* El botón no puede mentir sobre lo que va a pasar: si hay
              incompletas, guardar NO va a guardar nada. Se dice antes de que
              lo toque, no después en un error. */}
          {incompletas.length > 0 ? (
            <p className="text-xs font-medium text-danger">
              {incompletas.length === 1
                ? "1 prenda sin completar"
                : `${incompletas.length} prendas sin completar`}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

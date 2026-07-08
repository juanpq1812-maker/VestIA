// Componente cliente que orquesta la pantalla /outfits.
//
// Maneja:
//   - Tabs entre los 3 modos (ocasion, descripcion, sorpresa).
//   - Llamada a la Server Action `generateOutfitsAction`.
//   - Estado de carga con skeletons + mensajes motivadores rotando.
//   - Render de los 2 outfits generados con sus prendas y explicacion.
//   - Boton "Guardar" que llama `saveOutfitAction` por cada outfit.
//   - Boton "Regenerar" que repite la ultima solicitud.
//
// El server component `/outfits/page.tsx` solo se ocupa de pasar las prendas
// iniciales (para validar que haya >=2) y los datos del header.

"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  generateOutfitsAction,
  saveOutfitAction,
  registerOutfitUseAction,
  saveAndUseOutfitTodayAction,
  type GenerateActionInput,
} from "@/app/outfits/actions";
import type { GeneratedOutfit } from "@/lib/ai/generateOutfits";
import type { ClothingItem } from "@/types/database";
import Toast from "@/components/ui/Toast";
import WardrobeCompletionSection from "@/components/outfits/WardrobeCompletionSection";
import InspirationSection from "@/components/outfits/InspirationSection";
import type { WardrobeSummary } from "@/lib/outfits/tiendas";

// Las ocasiones que ofrecemos en el modo "por ocasion". Coinciden con
// `ITEM_OCCASIONS` de wardrobe (asi la IA encuentra match).
const OCASIONES = [
  "Formal",
  "Casual",
  "Deportivo",
  "Fiesta",
  "Trabajo",
  "Universidad",
  "Citas",
  "Eventos formales",
] as const;

const MENSAJES_LOADING = [
  "Analizando tu armario…",
  "Combinando prendas…",
  "Buscando la combinación perfecta…",
  "Casi listo…",
  "Armando tu look…",
] as const;

type Tab = "occasion" | "description" | "surprise";

type Props = {
  /** Cantidad total de prendas en el armario. Si <2 el componente no renderiza el generador. */
  totalItems: number;
  /** Outfits guardados del usuario. Se muestra un acceso rápido si > 0. */
  savedOutfitsCount?: number;
  /** ID de la prenda que la IA debe incluir obligatoriamente en todos los outfits. */
  lockedItemId?: string | null;
  /** Nombre de la prenda bloqueada para mostrar en el badge. */
  lockedItemName?: string | null;
  /** Conteo de prendas por categoría para las sugerencias de completado. */
  wardrobeSummary?: WardrobeSummary;
};

export default function OutfitGenerator({
  totalItems,
  savedOutfitsCount = 0,
  lockedItemId,
  lockedItemName,
  wardrobeSummary = {},
}: Props) {
  const [tab, setTab] = useState<Tab>("occasion");
  const [occasion, setOccasion] = useState<string>(OCASIONES[1]); // "Casual"
  const [description, setDescription] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [outfits, setOutfits] = useState<GeneratedOutfit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<GenerateActionInput | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  const tieneLockedItem = Boolean(lockedItemId);

  if (totalItems < 2) {
    return <EmptyWardrobeCallout />;
  }

  function applyInspiration(desc: string) {
    setDescription(desc.slice(0, 200));
    setTab("description");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function dispararGeneracion(input: GenerateActionInput) {
    setError(null);
    setOutfits(null);
    setLastInput(input);
    startTransition(async () => {
      const res = await generateOutfitsAction(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOutfits(res.outfits);
    });
  }

  function onGenerar() {
    const locked = lockedItemId ?? undefined;
    if (tab === "occasion") {
      dispararGeneracion({ mode: "occasion", occasion, lockedItemId: locked });
    } else if (tab === "description") {
      const trimmed = description.trim();
      if (trimmed.length === 0) {
        setError("Escribe una descripción antes de generar.");
        return;
      }
      dispararGeneracion({ mode: "description", description: trimmed, lockedItemId: locked });
    } else {
      dispararGeneracion({ mode: "surprise", lockedItemId: locked });
    }
  }

  function onRegenerar() {
    if (!lastInput) return;
    dispararGeneracion(lastInput);
  }

  return (
    <div className="space-y-10">
      {tieneLockedItem && (
        <LockedGarmentBanner itemName={lockedItemName} onGenerar={onGenerar} isPending={isPending} />
      )}
      {!tieneLockedItem && savedOutfitsCount > 0 && (
        <SavedOutfitsBanner count={savedOutfitsCount} />
      )}
      <section className="rounded-xl bg-surface p-5 shadow-sm sm:p-8">
        <h2 className="font-display text-2xl text-text">Crea tu outfit</h2>

        <div className="mt-5">
          <ModeSelector tab={tab} setTab={setTab} />
        </div>

        <div className="mt-6">
          {tab === "occasion" && (
            <OccasionPicker value={occasion} onChange={setOccasion} />
          )}
          {tab === "description" && (
            <DescriptionInput value={description} onChange={setDescription} />
          )}
          {tab === "surprise" && <SurpriseBlurb />}
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onGenerar}
          isLoading={isPending}
          loadingText="Generando outfit..."
        >
          Generar outfit
        </Button>
        <Link
          href="/outfits/saved"
          className="self-center text-sm font-medium text-primary hover:underline"
        >
          Ver mis outfits guardados →
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger bg-danger-light px-5 py-4 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {isPending && <LoadingState />}

      {!isPending && outfits && outfits.length > 0 && (
        <ResultsGrid
          outfits={outfits}
          onRegenerate={onRegenerar}
          contextoOcasion={
            lastInput?.mode === "occasion" ? lastInput.occasion ?? null : null
          }
          onToast={(msg, kind) => setToast({ msg, kind })}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}

      <WardrobeCompletionSection summary={wardrobeSummary} />
      <InspirationSection
        onApplyInspiration={applyInspiration}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selector de modo (3 tabs como cards en mobile, fila en desktop).
// ---------------------------------------------------------------------------

function ModeSelector({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  const opciones: { id: Tab; titulo: string; icono: ReactNode }[] = [
    {
      id: "occasion",
      titulo: "Por ocasión",
      icono: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      ),
    },
    {
      id: "description",
      titulo: "Descripción libre",
      icono: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m17 3 4 4L8 20l-5 1 1-5L17 3Z" />
        </svg>
      ),
    },
    {
      id: "surprise",
      titulo: "Sorpréndeme",
      icono: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
          <path d="M19 15c0 1.66-1.34 3-3 3 1.66 0 3 1.34 3 3 0-1.66 1.34-3 3-3-1.66 0-3-1.34-3-3Z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Modo de generación de outfit"
      className="grid grid-cols-3 gap-3"
    >
      {opciones.map((op) => {
        const activo = tab === op.id;
        return (
          <button
            key={op.id}
            role="tab"
            aria-selected={activo}
            onClick={() => setTab(op.id)}
            className={[
              "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              activo
                ? "border-primary bg-primary-light text-primary shadow-sm"
                : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
            ].join(" ")}
          >
            {op.icono}
            <span
              className={[
                "text-xs font-semibold leading-tight",
                activo ? "text-primary" : "text-text",
              ].join(" ")}
            >
              {op.titulo}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OccasionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-text">
        ¿Para qué ocasión?
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Elige una y la IA priorizará prendas etiquetadas para ese contexto.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OCASIONES.map((o) => {
          const activo = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                activo
                  ? "bg-primary text-white"
                  : "bg-surface-2 text-text-muted hover:bg-primary-light hover:text-primary",
              ].join(" ")}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DescriptionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const max = 200;
  return (
    <div>
      <label
        htmlFor="outfit-description"
        className="block text-sm font-semibold text-text"
      >
        Describe el outfit que necesitas...
      </label>
      <textarea
        id="outfit-description"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder="Algo cómodo para ir a la universidad y verme bien"
        rows={4}
        className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-mid"
      />
      <div className="mt-1.5 flex justify-end text-xs text-text-muted">
        {value.length}/{max}
      </div>
    </div>
  );
}

function SurpriseBlurb() {
  return (
    <div className="text-center">
      <p className="font-display text-xl text-text sm:text-2xl">
        Confía en la IA.
      </p>
      <p className="mt-2 text-sm text-text-muted">
        Te proponemos 2 combinaciones inesperadas con prendas de tu armario.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estado de carga: mensaje grande rotando + barra de progreso animada.
// ---------------------------------------------------------------------------

function LoadingState() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  // Rotación de mensajes con fade out → cambio → fade in cada 3 segundos.
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIdx((i) => (i + 1) % MENSAJES_LOADING.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(swap);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Barra de progreso: 0 → 90 % en ~15 s (lineal).
  useEffect(() => {
    const t = setTimeout(() => setProgress(90), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-14">
      {/* Mensaje animado */}
      <p
        className="font-display text-2xl font-semibold text-text transition-opacity duration-300 sm:text-3xl"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {MENSAJES_LOADING[idx]}
      </p>

      {/* Barra de progreso (scaleX en vez de width para no forzar layout) */}
      <div className="w-full max-w-sm">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full w-full origin-left rounded-full bg-primary"
            style={{
              transform: `scaleX(${progress / 100})`,
              transition: "transform 15s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resultados.
// ---------------------------------------------------------------------------

function ResultsGrid({
  outfits,
  onRegenerate,
  contextoOcasion,
  onToast,
}: {
  outfits: GeneratedOutfit[];
  onRegenerate: () => void;
  contextoOcasion: string | null;
  onToast: (msg: string, kind: "success" | "error") => void;
}) {
  return (
    <section aria-label="Outfits propuestos" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-text">
          Tus outfits
        </h2>
        <Button
          variant="ghost"
          onClick={onRegenerate}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          }
        >
          Regenerar
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {outfits.map((o, idx) => (
          <OutfitCard
            key={`${o.name}-${idx}`}
            outfit={o}
            contextoOcasion={contextoOcasion}
            onToast={onToast}
          />
        ))}
      </div>
    </section>
  );
}

// Estado del flujo guardar/usar de un outfit recien generado.
//   - idle:        ni guardado ni usado.
//   - saving:      llamando saveOutfitAction.
//   - saved:       ya guardado (sin uso registrado todavia).
//   - usingToday:  llamando registerOutfitUseAction o saveAndUse...
//   - usedToday:   guardado + uso de hoy registrado. Estado terminal.
//   - error:       el ultimo intento fallo (mostramos mensaje).
type CardEstado =
  | "idle"
  | "saving"
  | "saved"
  | "usingToday"
  | "usedToday"
  | "error";

function OutfitCard({
  outfit,
  contextoOcasion,
  onToast,
}: {
  outfit: GeneratedOutfit;
  contextoOcasion: string | null;
  onToast: (msg: string, kind: "success" | "error") => void;
}) {
  const [estado, setEstado] = useState<CardEstado>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  // Una vez guardado, recordamos el id para que "Lo usare hoy" no vuelva a
  // crear un outfit duplicado.
  const [outfitId, setOutfitId] = useState<string | null>(null);

  const visibles = useMemo(() => outfit.items.slice(0, 5), [outfit.items]);

  async function onGuardar() {
    setEstado("saving");
    setErrMsg(null);
    const res = await saveOutfitAction({
      name: outfit.name,
      occasion: contextoOcasion,
      notes: outfit.explanation || null,
      clothing_item_ids: outfit.items.map((i) => i.id),
    });
    if (res.ok) {
      setOutfitId(res.outfitId);
      setEstado("saved");
      onToast("Outfit guardado", "success");
    } else {
      setEstado("error");
      setErrMsg(res.error);
      onToast(res.error, "error");
    }
  }

  async function onUsarHoy() {
    setEstado("usingToday");
    setErrMsg(null);

    // Caso B: ya esta guardado, solo registramos uso.
    if (outfitId) {
      const res = await registerOutfitUseAction({ outfitId, daysAgo: 0 });
      if (res.ok) {
        setEstado("usedToday");
        onToast("¡Registrado! Lo usaste hoy", "success");
      } else if (res.code === "ALREADY_REGISTERED") {
        setEstado("usedToday");
        onToast("Ya habias registrado este outfit hoy", "success");
      } else {
        setEstado("saved");
        setErrMsg(res.error);
        onToast(res.error, "error");
      }
      return;
    }

    // Caso A: no guardado todavia. Guardamos y registramos uso de hoy.
    const res = await saveAndUseOutfitTodayAction({
      name: outfit.name,
      occasion: contextoOcasion,
      notes: outfit.explanation || null,
      clothing_item_ids: outfit.items.map((i) => i.id),
    });

    if (res.ok === true) {
      setOutfitId(res.outfitId);
      setEstado("usedToday");
      onToast("¡Registrado! Lo usaste hoy", "success");
    } else if (res.ok === "partial") {
      setOutfitId(res.outfitId);
      setEstado("saved");
      setErrMsg(res.error);
      onToast(res.error, "error");
    } else {
      setEstado("error");
      setErrMsg(res.error);
      onToast(res.error, "error");
    }
  }

  const yaGuardado = estado === "saved" || estado === "usedToday";
  const usadoHoy = estado === "usedToday";

  return (
    <article className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl text-text">
          {outfit.name}
        </h3>
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          IA
        </span>
      </header>

      {/* Prendas como cards horizontales (strandia_resultado_outfit_generado) */}
      <ul className="flex flex-col gap-3">
        {visibles.map((it) => {
          const nombre = it.name ?? it.subcategory ?? it.category;
          return (
            <li
              key={it.id}
              className="flex overflow-hidden rounded-xl bg-surface shadow-sm"
            >
              <ItemThumb item={it} />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                  {CATEGORIA_LABELS[it.category] ?? it.category}
                </p>
                <p className="truncate font-display text-base text-text" title={nombre}>
                  {nombre}
                </p>
                {it.subcategory && it.name ? (
                  <span className="w-fit rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {it.subcategory}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {outfit.explanation && (
        <p className="text-xs leading-relaxed text-text-muted">
          {outfit.explanation}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <Button
          variant={yaGuardado ? "secondary" : "primary"}
          size="lg"
          fullWidth
          onClick={onGuardar}
          isLoading={estado === "saving"}
          loadingText="Guardando..."
          disabled={yaGuardado || estado === "saving" || estado === "usingToday"}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill={yaGuardado ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
            </svg>
          }
        >
          {yaGuardado ? "Guardado" : "Guardar outfit"}
        </Button>

        <Button
          variant={usadoHoy ? "secondary" : "ghost"}
          size="lg"
          fullWidth
          onClick={onUsarHoy}
          isLoading={estado === "usingToday"}
          loadingText="Registrando..."
          disabled={usadoHoy || estado === "saving" || estado === "usingToday"}
        >
          {usadoHoy ? "Ya usado hoy" : "Lo usaré hoy"}
        </Button>

        {estado === "error" && errMsg && (
          <span className="text-xs text-danger">{errMsg}</span>
        )}
      </div>
    </article>
  );
}

const CATEGORIA_LABELS: Record<string, string> = {
  top: "Top",
  bottom: "Pantalón",
  dress: "Vestido",
  outerwear: "Abrigo",
  footwear: "Calzado",
  accessory: "Accesorio",
  body: "Body",
};

function ItemThumb({ item }: { item: ClothingItem }) {
  const fallback = item.primary_color ?? "#f0edea";
  return (
    <div
      className="h-28 w-24 shrink-0 overflow-hidden"
      style={{ backgroundColor: fallback }}
      title={item.name ?? item.subcategory ?? item.category}
    >
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.name ?? item.subcategory ?? item.category}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner cuando viene una prenda pre-seleccionada desde el armario.
// ---------------------------------------------------------------------------

function LockedGarmentBanner({
  itemName,
  onGenerar,
  isPending,
}: {
  itemName?: string | null;
  onGenerar: () => void;
  isPending: boolean;
}) {
  const nombre = itemName?.trim() || "esta prenda";

  // Auto-dispara la generacion la primera vez que se monta el banner.
  useEffect(() => {
    onGenerar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-primary-light px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-primary">
          <path d="M12 2c0 4.42-3.58 8-8 8 4.42 0 8 3.58 8 8 0-4.42 3.58-8 8-8-4.42 0-8-3.58-8-8Z" />
        </svg>
        <div>
          <p className="font-semibold text-text">
            Basado en:{" "}
            <span className="text-primary">{nombre}</span>
          </p>
          <p className="text-xs text-text-muted">
            La IA incluirá esta prenda en todos los outfits generados.
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={onGenerar}
        isLoading={isPending}
        loadingText="Generando..."
      >
        Regenerar
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Banner de acceso rápido a outfits guardados.
// ---------------------------------------------------------------------------

function SavedOutfitsBanner({ count }: { count: number }) {
  return (
    <Link
      href="/outfits/saved"
      className="flex items-center justify-between gap-4 rounded-xl border border-primary bg-primary-light px-5 py-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-center gap-3">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary">
          <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
        </svg>
        <div>
          <p className="font-semibold text-text">Ver mis outfits guardados</p>
          <p className="text-xs text-text-muted">
            {count === 1 ? "Tienes 1 outfit guardado" : `Tienes ${count} outfits guardados`}
          </p>
        </div>
      </div>
      <span aria-hidden="true" className="text-text-muted text-lg">→</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Empty state cuando el armario tiene <2 prendas.
// ---------------------------------------------------------------------------

function EmptyWardrobeCallout() {
  return (
    <div className="rounded-xl bg-surface-offset p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.4 6.4 16 4l-1.5 2h-5L8 4 3.6 6.4a1 1 0 0 0-.4 1.3l1.6 3a1 1 0 0 0 1.3.4L7 10.4V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8.6l.9.7a1 1 0 0 0 1.3-.4l1.6-3a1 1 0 0 0-.4-1.3Z" />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-xl text-text">
        Necesitas al menos 2 prendas en tu armario
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
        Para que la IA pueda combinar, sube primero algunas prendas. Te
        recomendamos al menos 1 top, 1 bottom y 1 calzado.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/wardrobe/upload">
          <Button variant="primary">Subir mi primera prenda</Button>
        </Link>
      </div>
    </div>
  );
}

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

import { useEffect, useMemo, useState, useTransition } from "react";
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
  "✨ Analizando tu armario...",
  "👗 Combinando prendas...",
  "🎨 Buscando la combinación perfecta...",
  "🌟 Casi listo...",
  "💫 Armando tu look...",
] as const;

type Tab = "occasion" | "description" | "surprise";

type Props = {
  /** Cantidad total de prendas en el armario. Si <2 el componente no renderiza el generador. */
  totalItems: number;
  /** Outfits guardados del usuario. Se muestra un acceso rápido si > 0. */
  savedOutfitsCount?: number;
};

export default function OutfitGenerator({ totalItems, savedOutfitsCount = 0 }: Props) {
  const [tab, setTab] = useState<Tab>("occasion");
  const [occasion, setOccasion] = useState<string>(OCASIONES[1]); // "Casual"
  const [description, setDescription] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [outfits, setOutfits] = useState<GeneratedOutfit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<GenerateActionInput | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  if (totalItems < 2) {
    return <EmptyWardrobeCallout />;
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
    if (tab === "occasion") {
      dispararGeneracion({ mode: "occasion", occasion });
    } else if (tab === "description") {
      const trimmed = description.trim();
      if (trimmed.length === 0) {
        setError("Escribí una descripción antes de generar.");
        return;
      }
      dispararGeneracion({ mode: "description", description: trimmed });
    } else {
      dispararGeneracion({ mode: "surprise" });
    }
  }

  function onRegenerar() {
    if (!lastInput) return;
    dispararGeneracion(lastInput);
  }

  return (
    <div className="space-y-10">
      {savedOutfitsCount > 0 && (
        <SavedOutfitsBanner count={savedOutfitsCount} />
      )}
      <ModeSelector tab={tab} setTab={setTab} />

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {tab === "occasion" && (
          <OccasionPicker value={occasion} onChange={setOccasion} />
        )}
        {tab === "description" && (
          <DescriptionInput value={description} onChange={setDescription} />
        )}
        {tab === "surprise" && <SurpriseBlurb />}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            size="lg"
            onClick={onGenerar}
            isLoading={isPending}
            loadingText="Generando outfit..."
          >
            {tab === "surprise"
              ? "✨ Sorprendeme con un outfit"
              : "Generar outfit"}
          </Button>
          <Link
            href="/outfits/saved"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver mis outfits guardados →
          </Link>
        </div>
      </section>

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
  const opciones: { id: Tab; titulo: string; sub: string; icono: string }[] = [
    {
      id: "occasion",
      titulo: "Por ocasión",
      sub: "Elegí una ocasión y dejá que la IA arme algo apropiado.",
      icono: "📅",
    },
    {
      id: "description",
      titulo: "Descripción libre",
      sub: "Contá en tus palabras lo que necesitás.",
      icono: "✍️",
    },
    {
      id: "surprise",
      titulo: "Sorprendeme",
      sub: "Sin reglas: que la IA improvise.",
      icono: "✨",
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Modo de generación de outfit"
      className="grid gap-3 sm:grid-cols-3"
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
              "rounded-xl border p-4 text-left transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              activo
                ? "border-primary bg-primary-light shadow-sm"
                : "border-border bg-surface hover:border-primary-mid hover:bg-surface-2",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-xl">
                {op.icono}
              </span>
              <span
                className={[
                  "font-semibold",
                  activo ? "text-primary" : "text-text",
                ].join(" ")}
              >
                {op.titulo}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-text-muted">{op.sub}</p>
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
        Elegí una y la IA priorizará prendas etiquetadas para ese contexto.
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
        Describí el outfit que necesitás...
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
        Confiá en la IA.
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

      {/* Barra de progreso */}
      <div className="w-full max-w-sm">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${progress}%`,
              transition: "width 15s linear",
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
        <h2 className="font-display text-2xl font-bold text-text">
          Tus outfits
        </h2>
        <Button variant="ghost" onClick={onRegenerate}>
          🔄 Regenerar
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
    <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold text-text">
          {outfit.name}
        </h3>
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          IA
        </span>
      </header>

      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {visibles.map((it) => (
          <li key={it.id} className="text-center">
            <ItemThumb item={it} />
            <p className="mt-1.5 truncate text-[11px] text-text-muted">
              {it.subcategory ?? it.category}
            </p>
          </li>
        ))}
      </ul>

      {outfit.explanation && (
        <p className="mt-4 text-xs leading-relaxed text-text-muted">
          {outfit.explanation}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant={yaGuardado ? "secondary" : "primary"}
          onClick={onGuardar}
          isLoading={estado === "saving"}
          loadingText="Guardando..."
          disabled={yaGuardado || estado === "saving" || estado === "usingToday"}
        >
          {yaGuardado ? "✓ Guardado" : "💾 Guardar outfit"}
        </Button>

        <Button
          variant={usadoHoy ? "secondary" : "primary"}
          onClick={onUsarHoy}
          isLoading={estado === "usingToday"}
          loadingText="Registrando..."
          disabled={usadoHoy || estado === "saving" || estado === "usingToday"}
        >
          {usadoHoy ? "✓ Ya usado hoy" : "👕 Lo usaré hoy"}
        </Button>

        {estado === "error" && errMsg && (
          <span className="text-xs text-danger">{errMsg}</span>
        )}
      </div>
    </article>
  );
}

function ItemThumb({ item }: { item: ClothingItem }) {
  const fallback = item.primary_color ?? "#E8EFE7";
  return (
    <div
      className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-border"
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
// Banner de acceso rápido a outfits guardados.
// ---------------------------------------------------------------------------

function SavedOutfitsBanner({ count }: { count: number }) {
  return (
    <Link
      href="/outfits/saved"
      className="flex items-center justify-between gap-4 rounded-xl border border-primary bg-primary-light px-5 py-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-2xl">👗</span>
        <div>
          <p className="font-semibold text-text">Ver mis outfits guardados</p>
          <p className="text-xs text-text-muted">
            {count === 1 ? "Tenés 1 outfit guardado" : `Tenés ${count} outfits guardados`}
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
    <div className="rounded-xl border-2 border-dashed border-border bg-surface-2 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
        <span aria-hidden="true" className="text-2xl">
          👕
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold text-text">
        Necesitas al menos 2 prendas en tu armario
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
        Para que la IA pueda combinar, subí primero algunas prendas. Te
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

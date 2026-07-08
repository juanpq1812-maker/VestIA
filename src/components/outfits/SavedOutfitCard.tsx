// Tarjeta de un outfit guardado en /outfits/saved.
//
// Muestra:
//   - Botones para registrar uso: "Lo use hoy" y "Lo use otro dia".
//   - Estado: nunca usado / usado hoy / usado otro dia (con animacion entre estados).
//   - Total de usos y "Ultima vez: hace X dias".
//   - Boton de eliminar.
//
// La pagina padre (`/outfits/saved`) hace todas las queries y nos pasa
// `usedDates` y `lastUsedIso` ya calculados — asi mantenemos la card "tonta".
// Despues de cualquier cambio (nuevo uso, eliminar) actualizamos el estado
// local de forma optimista y dejamos que `revalidatePath` refresque al
// proximo render del servidor.

"use client";

import { useState, useTransition } from "react";
import {
  deleteOutfitAction,
  registerOutfitUseAction,
} from "@/app/outfits/actions";
import Toast from "@/components/ui/Toast";
import OutfitUseDateModal from "@/components/outfits/OutfitUseDateModal";
import {
  formatHumanDate,
  lastUsedLabel,
  todayIso,
} from "@/lib/outfits/dateUtils";
import type { ClothingItem } from "@/types/database";

import { GARMENT_PLACEHOLDER_COLOR } from "@/lib/ui/colors";
type Props = {
  outfitId: string;
  name: string | null;
  occasion: string | null;
  notes: string | null;
  createdAt: string;
  items: ClothingItem[];
  /** Lista de fechas YYYY-MM-DD en las que ya hay uso registrado para este outfit. */
  usedDates: string[];
};

export default function SavedOutfitCard({
  outfitId,
  name,
  occasion,
  notes,
  createdAt,
  items,
  usedDates,
}: Props) {
  const [isDeleting, startDelete] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado optimista: arrancamos del array que llega del server y lo
  // mutamos al registrar/atrapar duplicados.
  const [dates, setDates] = useState<string[]>(usedDates);
  const [marcandoHoy, setMarcandoHoy] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);

  if (removed) return null;

  const today = todayIso();
  const usadoHoy = dates.includes(today);
  const totalUsos = dates.length;
  // La fecha mas reciente (orden lexicografico funciona porque YYYY-MM-DD).
  const lastUsedIso = dates.length > 0 ? [...dates].sort().at(-1) ?? null : null;

  function onEliminar() {
    if (!confirm("¿Eliminar este outfit guardado?")) return;
    setError(null);
    startDelete(async () => {
      const res = await deleteOutfitAction(outfitId);
      if (!res.ok) setError(res.error);
      else setRemoved(true);
    });
  }

  async function onUsarHoy() {
    if (usadoHoy || marcandoHoy) return;
    setMarcandoHoy(true);
    setError(null);
    const res = await registerOutfitUseAction({ outfitId, daysAgo: 0 });
    setMarcandoHoy(false);
    if (res.ok) {
      setDates((prev) => [...prev, today]);
      setToast({ msg: "¡Registrado! Lo usaste hoy", kind: "success" });
    } else if (res.code === "ALREADY_REGISTERED") {
      // Por si la card estaba desincronizada con server.
      setDates((prev) => (prev.includes(today) ? prev : [...prev, today]));
      setToast({ msg: "Ya habías registrado este outfit hoy", kind: "success" });
    } else {
      setError(res.error);
      setToast({ msg: res.error, kind: "error" });
    }
  }

  function onModalConfirmed(info: { usedDate: string; daysAgo: number }) {
    setDates((prev) =>
      prev.includes(info.usedDate) ? prev : [...prev, info.usedDate]
    );
    setModalAbierto(false);
    setToast({
      msg: `¡Registrado! Lo usaste el ${formatHumanDate(info.usedDate)}`,
      kind: "success",
    });
  }

  const titulo = name?.trim() || "Outfit sin nombre";
  const fechaCreacion = new Date(createdAt).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <article className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-all">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-text">
              {titulo}
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              {fechaCreacion}
              {occasion ? ` · ${occasion}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onEliminar}
            disabled={isDeleting}
            aria-label="Eliminar outfit"
            className="rounded-full p-2 text-text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:opacity-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </header>

        <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {items.slice(0, 5).map((it) => (
            <li key={it.id} className="text-center">
              <div
                className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-border"
                style={{ backgroundColor: it.primary_color ?? GARMENT_PLACEHOLDER_COLOR }}
                title={it.name ?? it.subcategory ?? it.category}
              >
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image_url}
                    alt={it.name ?? it.subcategory ?? it.category}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <p className="mt-1.5 truncate text-[11px] text-text-muted">
                {it.subcategory ?? it.category}
              </p>
            </li>
          ))}
        </ul>

        {notes && (
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            {notes}
          </p>
        )}

        {/* Botones de uso */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onUsarHoy}
            disabled={usadoHoy || marcandoHoy}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              usadoHoy
                ? "bg-success-light text-success"
                : marcandoHoy
                ? "bg-primary-light text-primary opacity-70"
                : "bg-primary text-white hover:bg-primary-hover hover:-translate-y-px",
              "disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {marcandoHoy
              ? "Registrando..."
              : usadoHoy
              ? "✓ Usado hoy"
              : "👕 Lo usé hoy"}
          </button>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-muted transition-all hover:border-primary-mid hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            📅 Lo usé otro día
          </button>
        </div>

        {/* Estadisticas */}
        {totalUsos > 0 && (
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <dt className="font-semibold text-text">Total usos:</dt>
              <dd>{totalUsos}</dd>
            </div>
            {lastUsedIso && (
              <div className="flex items-center gap-1">
                <dt className="font-semibold text-text">Última vez:</dt>
                <dd>{lastUsedLabel(lastUsedIso)}</dd>
              </div>
            )}
          </dl>
        )}

        {error && (
          <p className="mt-3 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </article>

      {modalAbierto && (
        <OutfitUseDateModal
          outfitId={outfitId}
          usedDates={new Set(dates)}
          onConfirmed={onModalConfirmed}
          onClose={() => setModalAbierto(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.msg}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

// Tarjeta de un outfit guardado en /outfits/saved.
//
// Muestra:
//   - Botones para registrar uso: "Lo use hoy" y "Lo use otro dia".
//   - Boton independiente "Comparte este outfit": abre directo la camara/
//     selector de foto (ShareOutfitModal). Si el outfit no tiene uso
//     registrado hoy, lo registra en silencio antes de abrir el modal — el
//     usuario nunca tiene que pasar primero por "Lo use hoy" para compartir.
//   - Estado: nunca usado / usado hoy / usado otro dia (con animacion entre estados).
//   - Total de usos y "Ultima vez: hace X dias".
//   - Boton de eliminar.
//
// La pagina padre (`/outfits/saved`) hace todas las queries y nos pasa
// `uses` (id + fecha de cada outfit_use) ya calculado — asi mantenemos la
// card "tonta". Despues de cualquier cambio (nuevo uso, eliminar)
// actualizamos el estado local de forma optimista y dejamos que
// `revalidatePath` refresque al proximo render del servidor.

"use client";

import { useState, useTransition } from "react";
import {
  deleteOutfitAction,
  registerOutfitUseAction,
} from "@/app/outfits/actions";
import Toast from "@/components/ui/Toast";
import OutfitUseDateModal from "@/components/outfits/OutfitUseDateModal";
import ShareOutfitModal from "@/components/outfits/ShareOutfitModal";
import {
  formatHumanDate,
  lastUsedLabel,
  todayIso,
} from "@/lib/outfits/dateUtils";
import type { ClothingItem } from "@/types/database";

import { garmentSwatch } from "@/lib/ui/colors";
import StyleJournal from "@/components/outfits/StyleJournal";
import ShareStyleJournalButton from "@/components/outfits/ShareStyleJournalButton";

type UseRecord = { id: string; usedDate: string };

type Props = {
  outfitId: string;
  name: string | null;
  occasion: string | null;
  notes: string | null;
  createdAt: string;
  items: ClothingItem[];
  /** Usos registrados (id + fecha YYYY-MM-DD) de este outfit. */
  uses: UseRecord[];
  /** IDs de outfit_uses de ESTE outfit que ya se compartieron con la comunidad. */
  sharedOutfitUseIds?: string[];
  /** Premium ve el cuaderno editorial en vez de la grilla simple. */
  isPremium?: boolean;
};

export default function SavedOutfitCard({
  outfitId,
  name,
  occasion,
  notes,
  createdAt,
  items,
  uses,
  sharedOutfitUseIds = [],
  isPremium = false,
}: Props) {
  const [isDeleting, startDelete] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado optimista: arrancamos de lo que llega del server y lo mutamos al
  // registrar/atrapar duplicados.
  const [useRecords, setUseRecords] = useState<UseRecord[]>(uses);
  const [marcandoHoy, setMarcandoHoy] = useState(false);
  const [preparandoShare, setPreparandoShare] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: "success" | "error" } | null>(null);
  const [sharedUseIds, setSharedUseIds] = useState<Set<string>>(new Set(sharedOutfitUseIds));
  const [pendingShareUseId, setPendingShareUseId] = useState<string | null>(null);

  if (removed) return null;

  const today = todayIso();
  const dates = useRecords.map((u) => u.usedDate);
  const usadoHoy = dates.includes(today);
  const totalUsos = dates.length;
  // La fecha mas reciente (orden lexicografico funciona porque YYYY-MM-DD).
  const lastUsedIso = dates.length > 0 ? [...dates].sort().at(-1) ?? null : null;
  const todayUseId = useRecords.find((u) => u.usedDate === today)?.id ?? null;
  const yaCompartidoHoy = todayUseId != null && sharedUseIds.has(todayUseId);

  function onEliminar() {
    if (
      !confirm(
        "¿Eliminar este outfit guardado? Si compartiste una foto de este look con la comunidad, también se eliminará."
      )
    )
      return;
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
      setUseRecords((prev) => [...prev, { id: res.useId, usedDate: today }]);
      setToast({ msg: "¡Registrado! Lo usaste hoy", kind: "success" });
    } else if (res.code === "ALREADY_REGISTERED") {
      // Por si la card estaba desincronizada con server.
      setToast({ msg: "Ya habías registrado este outfit hoy", kind: "success" });
    } else {
      setError(res.error);
      setToast({ msg: res.error, kind: "error" });
    }
  }

  function onModalConfirmed(info: { usedDate: string; daysAgo: number; useId: string }) {
    setUseRecords((prev) =>
      prev.some((u) => u.id === info.useId) ? prev : [...prev, { id: info.useId, usedDate: info.usedDate }]
    );
    setModalAbierto(false);
    setToast({
      msg: `¡Registrado! Lo usaste el ${formatHumanDate(info.usedDate)}`,
      kind: "success",
    });
  }

  async function onCompartir() {
    if (preparandoShare || yaCompartidoHoy) return;

    if (todayUseId) {
      setPendingShareUseId(todayUseId);
      return;
    }

    // Todavia no hay uso registrado hoy: lo registramos en silencio para
    // poder asociar el share, sin pedirle al usuario que pase primero por
    // "Lo use hoy".
    setPreparandoShare(true);
    setError(null);
    const res = await registerOutfitUseAction({ outfitId, daysAgo: 0 });
    setPreparandoShare(false);
    if (res.ok) {
      setUseRecords((prev) => [...prev, { id: res.useId, usedDate: today }]);
      setPendingShareUseId(res.useId);
    } else {
      setError(res.error);
      setToast({ msg: res.error, kind: "error" });
    }
  }

  function onShared() {
    if (pendingShareUseId) {
      setSharedUseIds((prev) => new Set(prev).add(pendingShareUseId));
    }
    setPendingShareUseId(null);
    setToast({ msg: "¡Compartido con la comunidad!", kind: "success" });
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

        {isPremium ? (
          <div className="mt-4 max-w-[280px]">
            <StyleJournal items={items} outfitName={titulo} />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {items.slice(0, 5).map((it) => (
              <li key={it.id} className="text-center">
                <div
                  className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-border"
                  style={{ backgroundColor: garmentSwatch(it.primary_color) }}
                  title={it.name ?? it.subcategory ?? it.category}
                >
                  {it.thumbnail_url ?? it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(it.thumbnail_url ?? it.image_url) as string}
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
        )}

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
            {marcandoHoy ? (
              "Registrando..."
            ) : usadoHoy ? (
              <>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4 10-10" />
                </svg>
                Usado hoy
              </>
            ) : (
              <>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8.5 12.2 2.4 2.4 4.6-5" />
                </svg>
                Lo usé hoy
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-muted transition-all hover:border-primary-mid hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            Lo usé otro día
          </button>

          <button
            type="button"
            onClick={onCompartir}
            disabled={preparandoShare || yaCompartidoHoy}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              yaCompartidoHoy
                ? "border-success/30 bg-success-light text-success"
                : "border-primary-mid bg-primary-light text-primary hover:bg-primary hover:text-white",
              "disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {preparandoShare ? (
              "Preparando..."
            ) : yaCompartidoHoy ? (
              <>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4 10-10" />
                </svg>
                Compartido hoy
              </>
            ) : (
              <>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
                Comparte este outfit
              </>
            )}
          </button>

          {isPremium && (
            <ShareStyleJournalButton outfitId={outfitId} outfitName={titulo} items={items} />
          )}
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

      {pendingShareUseId && (
        <ShareOutfitModal
          outfitId={outfitId}
          outfitUseId={pendingShareUseId}
          onShared={onShared}
          onClose={() => setPendingShareUseId(null)}
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

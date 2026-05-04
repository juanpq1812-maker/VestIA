// Modal "Lo use otro dia" — el usuario elige una fecha entre ayer y hace 7
// dias para registrar uso del outfit.
//
// Recibe:
//   - `outfitId` para llamar a la Server Action.
//   - `usedDates` (set de "YYYY-MM-DD"): los dias ya registrados; los
//     deshabilitamos con texto "Ya registrado".
//   - `onConfirmed(useDate)` callback al cerrar con exito (la pantalla padre
//     refresca su estado optimistamente).
//   - `onClose` callback al cancelar.
//
// La fecha real la calcula el SERVIDOR a partir de `daysAgo` — el cliente
// solo manda 1..7. Asi nadie puede inyectar fechas raras.

"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { registerOutfitUseAction } from "@/app/outfits/actions";
import {
  dateNDaysAgoIso,
  formatHumanDate,
  relativeDayLabel,
} from "@/lib/outfits/dateUtils";

type Props = {
  outfitId: string;
  usedDates: ReadonlySet<string>;
  onConfirmed: (info: { usedDate: string; daysAgo: number }) => void;
  onClose: () => void;
};

const OPCIONES_DAYS_AGO = [1, 2, 3, 4, 5, 6, 7] as const;

export default function OutfitUseDateModal({
  outfitId,
  usedDates,
  onConfirmed,
  onClose,
}: Props) {
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cierre con tecla ESC.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !enviando) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enviando, onClose]);

  const opciones = useMemo(
    () =>
      OPCIONES_DAYS_AGO.map((daysAgo) => {
        const iso = dateNDaysAgoIso(daysAgo);
        return {
          daysAgo,
          iso,
          rel: relativeDayLabel(daysAgo),
          abs: formatHumanDate(iso),
          yaRegistrado: usedDates.has(iso),
        };
      }),
    [usedDates]
  );

  async function onConfirmar() {
    if (seleccion == null) return;
    setEnviando(true);
    setError(null);
    const res = await registerOutfitUseAction({
      outfitId,
      daysAgo: seleccion,
    });
    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onConfirmed({ usedDate: res.usedDate, daysAgo: seleccion });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outfit-use-modal-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => {
        // Click en el backdrop cierra (pero NO si vienes desde dentro).
        if (e.target === e.currentTarget && !enviando) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="border-b border-border px-5 py-4">
          <h2
            id="outfit-use-modal-title"
            className="font-display text-xl font-semibold text-text"
          >
            ¿Cuando lo usaste?
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Elige el dia. Solo se permite hasta 7 dias atras.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
          {opciones.map((op) => {
            const activo = seleccion === op.daysAgo;
            const disabled = op.yaRegistrado || enviando;
            return (
              <button
                key={op.daysAgo}
                type="button"
                disabled={disabled}
                onClick={() => setSeleccion(op.daysAgo)}
                aria-pressed={activo}
                className={[
                  "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  activo
                    ? "border-primary bg-primary-light text-primary shadow-sm"
                    : op.yaRegistrado
                    ? "border-border bg-surface-2 text-text-faint"
                    : "border-border bg-surface text-text hover:border-primary-mid hover:bg-surface-2",
                  disabled ? "cursor-not-allowed" : "",
                ].join(" ")}
              >
                <span className="text-sm font-semibold">{op.rel}</span>
                <span className="text-[11px] text-text-muted">
                  {op.yaRegistrado ? "✓ Ya registrado" : op.abs}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mx-5 mb-3 rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-xs text-danger"
          >
            {error}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={enviando}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirmar}
            disabled={seleccion == null || enviando}
            isLoading={enviando}
            loadingText="Registrando..."
            type="button"
          >
            Confirmar
          </Button>
        </footer>
      </div>
    </div>
  );
}

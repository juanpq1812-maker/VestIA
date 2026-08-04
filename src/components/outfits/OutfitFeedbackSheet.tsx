// Sheet de "no me gusta": una razón, un tap, listo.
//
// Deliberadamente discreto en su punto de entrada (ver el botón en
// OutfitGenerator): un botón grande invitaría a la crítica, y el objetivo no es
// recolectar quejas sino entender un patrón. Sin texto libre en v1 — escribir
// es fricción, y seis razones cerradas ya dan señal suficiente para el prompt.
//
// Patrón visual: bottom sheet en mobile, modal centrado en desktop — el mismo
// de OutfitUseDateModal.

"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { submitOutfitFeedbackAction } from "@/app/outfits/actions";
import {
  FEEDBACK_REASONS,
  FEEDBACK_REASON_LABELS,
  type FeedbackReason,
} from "@/lib/outfits/feedback";
import type { GenerateMode } from "@/lib/ai/generateOutfits";

type Props = {
  clothingItemIds: string[];
  occasion: string | null;
  mode: GenerateMode;
  /** Se llama tras registrar el feedback con éxito. */
  onSubmitted: () => void;
  onClose: () => void;
};

export default function OutfitFeedbackSheet({
  clothingItemIds,
  occasion,
  mode,
  onSubmitted,
  onClose,
}: Props) {
  const [enviando, setEnviando] = useState<FeedbackReason | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !enviando) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enviando, onClose]);

  // Un tap y listo: la razón elegida ES la confirmación. Meter un botón
  // "Enviar" aparte solo agrega un paso a algo que el usuario ya decidió.
  async function elegir(reason: FeedbackReason) {
    if (enviando) return;
    setEnviando(reason);
    setError(null);
    const res = await submitOutfitFeedbackAction({
      reason,
      clothing_item_ids: clothingItemIds,
      occasion,
      mode,
    });
    if (!res.ok) {
      setEnviando(null);
      setError(res.error);
      return;
    }
    onSubmitted();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outfit-feedback-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="border-b border-border px-5 py-4">
          <h2
            id="outfit-feedback-title"
            className="font-display text-xl font-semibold text-text"
          >
            ¿Qué no te convenció?
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Con esto afinamos las próximas propuestas.
          </p>
        </header>

        <div className="flex flex-col gap-2 p-5">
          {FEEDBACK_REASONS.map((reason) => {
            const esta = enviando === reason;
            return (
              <button
                key={reason}
                type="button"
                disabled={enviando !== null}
                onClick={() => elegir(reason)}
                className={[
                  "flex min-h-[44px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  esta
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-surface text-text hover:border-primary-mid hover:bg-surface-2",
                  enviando !== null && !esta ? "opacity-50" : "",
                ].join(" ")}
              >
                {FEEDBACK_REASON_LABELS[reason]}
                {esta && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
                  />
                )}
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

        <footer className="flex items-center justify-end border-t border-border bg-surface-2 px-5 py-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={enviando !== null}
            type="button"
          >
            Cancelar
          </Button>
        </footer>
      </div>
    </div>
  );
}

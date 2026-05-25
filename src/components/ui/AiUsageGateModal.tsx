"use client";

// Modal del AI Usage Gate para StrandIA.
//
// Se muestra cuando el usuario intenta usar una función IA por segunda vez.
//
// Estados:
//   "survey"   → invita a completar la encuesta (por defecto)
//   "thankyou" → agradecimiento + mensaje de piloto cerrado
//
// El modal NO desbloquea la IA en ningún caso.

import { useState, useEffect, useCallback } from "react";

const SURVEY_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfHGDgqTuG8o8_XkE-ejn9Rss-fQw6a5l9IIr6VrTblKrh0bA/viewform?usp=header";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ModalState = "survey" | "thankyou";

export default function AiUsageGateModal({ open, onClose }: Props) {
  const [state, setState] = useState<ModalState>("survey");

  // Resetear al estado inicial cada vez que el modal se abre.
  useEffect(() => {
    if (open) setState("survey");
  }, [open]);

  // Cerrar con Escape.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    /* Overlay */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Fondo oscuro */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
        {state === "survey" ? (
          <SurveyView
            onOpenSurvey={() => window.open(SURVEY_URL, "_blank", "noopener,noreferrer")}
            onAlreadyDone={() => setState("thankyou")}
          />
        ) : (
          <ThankyouView onClose={onClose} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista 1: invitación a la encuesta
// ---------------------------------------------------------------------------

function SurveyView({
  onOpenSurvey,
  onAlreadyDone,
}: {
  onOpenSurvey: () => void;
  onAlreadyDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-3xl">
        ✨
      </div>

      <div className="space-y-2">
        <h2
          id="gate-modal-title"
          className="font-display text-xl font-bold text-text"
        >
          Para continuar usando StrandIA
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Completa nuestra encuesta de 2 minutos y ayúdanos a mejorar la app
          para ti.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onOpenSurvey}
          className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          📝 Completar encuesta (2 min)
        </button>
        <button
          type="button"
          onClick={onAlreadyDone}
          className="w-full rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ya la completé
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista 2: agradecimiento — piloto cerrado
// ---------------------------------------------------------------------------

function ThankyouView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-3xl">
        🎉
      </div>

      <div className="space-y-2">
        <h2
          id="gate-modal-title"
          className="font-display text-xl font-bold text-text"
        >
          ¡Gracias por tu opinión!
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Estamos en piloto cerrado, pronto tendrás acceso completo.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Entendido
      </button>
    </div>
  );
}

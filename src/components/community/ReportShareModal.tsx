// Modal "Reportar contenido" — se abre desde el botón de bandera en
// CommunityShareCard. Motivo opcional vía chips + texto libre opcional.
// El share sigue visible para todos hasta que un admin lo revise en
// /admin/reports — no se oculta client-side.

"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Chip from "@/components/onboarding/Chip";
import { reportShareAction } from "@/lib/community/actions";

const MOTIVOS = ["Contenido inapropiado", "Spam", "Otro"] as const;

type Props = {
  shareId: string;
  onClose: () => void;
};

export default function ReportShareModal({ shareId, onClose }: Props) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function onEnviar() {
    setError(null);
    const reason = [motivo, detalle.trim()].filter(Boolean).join(": ") || undefined;
    startTransition(async () => {
      const res = await reportShareAction(shareId, reason);
      if (res.ok) {
        setEnviado(true);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-share-modal-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
      style={{ animation: "fadeIn 160ms ease-out" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        <header className="border-b border-border px-5 py-4">
          <h2 id="report-share-modal-title" className="font-display text-xl font-semibold text-text">
            Reportar contenido
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Un admin va a revisar este contenido y decidir qué hacer.
          </p>
        </header>

        {enviado ? (
          <div className="p-5">
            <p className="rounded-md bg-success-light px-3 py-2 text-sm font-medium text-success">
              Gracias, lo vamos a revisar.
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map((m) => (
                <Chip key={m} active={motivo === m} onClick={() => setMotivo(m)}>
                  {m}
                </Chip>
              ))}
            </div>

            <label className="mt-4 block text-sm font-semibold text-text" htmlFor="report-detalle">
              Detalle (opcional)
            </label>
            <textarea
              id="report-detalle"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value.slice(0, 300))}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending} type="button">
            {enviado ? "Cerrar" : "Cancelar"}
          </Button>
          {!enviado && (
            <Button
              variant="primary"
              onClick={onEnviar}
              disabled={isPending}
              isLoading={isPending}
              loadingText="Enviando..."
              type="button"
            >
              Reportar
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

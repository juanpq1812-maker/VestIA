// Autorización para el modo "outfit completo", que sube una foto del usuario
// de cuerpo entero y la manda a Claude Vision para detectar cada prenda.
//
// POR QUÉ NO BASTA EL CONSENTIMIENTO DEL REGISTRO. Ahí el usuario autorizó el
// tratamiento de "las fotografías de prendas que cargue". Una selfie de espejo
// de cuerpo entero no es eso: es la persona. Tratarla bajo el permiso genérico
// es justo lo que el diseño de consentimientos separados existe para evitar.
//
// Se pide una vez por versión del texto (ver BODY_PHOTO_CONSENT_VERSION), no
// en cada foto: es un modo de uso repetido, y una casilla en cada subida se
// convierte en ruido que se marca sin leer.

"use client";

import { useId, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import { registrarConsentimientoFotoCuerpoAction } from "@/lib/legal/actions";

type Props = {
  /** Corre tras registrar la autorización — reanuda la acción que la disparó. */
  onAutorizado: () => void;
  onClose: () => void;
};

export default function BodyPhotoConsentModal({ onAutorizado, onClose }: Props) {
  const titleId = useId();
  const [autoriza, setAutoriza] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onContinuar() {
    setError(null);
    startTransition(async () => {
      const res = await registrarConsentimientoFotoCuerpoAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onAutorizado();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
          <h2 id={titleId} className="font-display text-xl font-semibold text-text">
            Antes de subir tu foto
          </h2>
        </header>

        <div className="p-5">
          <p className="text-sm text-text-muted">
            En este modo la foto puede incluirte a ti de cuerpo entero. Es un
            dato más sensible que la foto de una prenda sola, así que te lo
            pedimos aparte y una sola vez.
          </p>

          <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-4 text-sm text-text">
            <input
              type="checkbox"
              checked={autoriza}
              onChange={(e) => {
                setAutoriza(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/15"
            />
            <span className="leading-relaxed">
              Autorizo a Strand Inc. a tratar mis fotografías de outfit completo
              (cuerpo entero) —reconocidas como dato sensible— y a transferirlas
              temporalmente a Anthropic y Google en EE. UU. para detectar las
              prendas y darme recomendaciones de estilismo. Puedo eliminar las
              fotos y revocar esta autorización cuando quiera desde la app.
            </span>
          </label>

          <p className="mt-3 text-xs text-text-faint">
            Si prefieres no autorizarlo, puedes seguir subiendo tus prendas una
            por una desde la pestaña de siempre.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending} type="button">
            Ahora no
          </Button>
          <Button
            variant="primary"
            onClick={onContinuar}
            disabled={isPending || !autoriza}
            isLoading={isPending}
            loadingText="Guardando…"
            type="button"
          >
            Autorizar y continuar
          </Button>
        </footer>
      </div>
    </div>
  );
}

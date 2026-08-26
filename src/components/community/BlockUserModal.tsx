// Confirmación de "Bloquear a esta persona" — se abre desde ShareCardMenu.
//
// Va en un modal y no directo desde el menú porque el bloqueo borra los
// follows de las dos direcciones y eso no se deshace al desbloquear: no puede
// pasar de un toque accidental. El copy dice exactamente qué se pierde.

"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import { blockUserAction } from "@/lib/community/actions";

type Props = {
  authorId: string;
  authorName: string;
  onClose: () => void;
};

export default function BlockUserModal({ authorId, authorName, onClose }: Props) {
  const router = useRouter();
  const titleId = useId();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onBloquear() {
    setError(null);
    startTransition(async () => {
      const res = await blockUserAction(authorId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // La card desaparece del feed por la RLS de community_shares, así que
      // basta con volver a pedir el árbol del servidor. No mostramos toast de
      // confirmación acá: la desaparición ES la confirmación.
      onClose();
      router.refresh();
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
            ¿Bloquear a {authorName}?
          </h2>
        </header>

        <div className="p-5">
          <p className="text-sm text-text-muted">
            No vas a ver sus looks en la comunidad y esta persona tampoco va a
            ver los tuyos. Si se seguían, dejarán de hacerlo.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            No le avisamos que la bloqueaste. Puedes desbloquearla cuando
            quieras desde{" "}
            <span className="font-medium text-text">
              Perfil → Configuración → Cuentas bloqueadas
            </span>
            .
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending} type="button">
            Cancelar
          </Button>
          <button
            type="button"
            onClick={onBloquear}
            disabled={isPending}
            aria-busy={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-danger px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            {isPending ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                Bloqueando…
              </>
            ) : (
              "Bloquear"
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

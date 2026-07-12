// Zona de peligro de /profile/privacy: borrar la cuenta definitivamente.
// Modal de confirmación (bottom sheet en mobile, centrado en desktop) que
// exige escribir "ELIMINAR" antes de habilitar el botón.

"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { deleteAccountAction } from "@/app/profile/privacy/actions";

const CONFIRM_WORD = "ELIMINAR";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) cerrar();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, deleting]);

  function cerrar() {
    setOpen(false);
    setConfirm("");
    setError(null);
  }

  async function onDelete() {
    setDeleting(true);
    setError(null);
    const res = await deleteAccountAction(confirm);
    if (!res.ok) {
      setDeleting(false);
      setError(res.error);
      return;
    }
    // Cuenta borrada y sesión cerrada: al landing.
    router.push("/");
    router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-text">Zona de peligro</h2>
      <div className="mt-4 rounded-xl border border-danger/30 bg-danger-light/40 p-5">
        <p className="text-sm font-semibold text-text">Borrar mi cuenta</p>
        <p className="mt-1 text-sm text-text-muted">
          Elimina definitivamente tu cuenta, tus prendas y sus fotos, tus
          outfits, tus preferencias y tus calendarios conectados. Esta acción
          no se puede deshacer.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-danger/40 bg-surface px-6 py-3 text-sm font-semibold text-danger transition-all duration-200 ease-out hover:bg-danger-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          Borrar mi cuenta
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-text/40 p-4 sm:items-center"
          style={{ animation: "fadeIn 160ms ease-out" }}
          onClick={() => {
            if (!deleting) cerrar();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
            style={{ animation: "scaleIn 180ms cubic-bezier(0.16,1,0.3,1)" }}
          >
            <div className="border-b border-border px-5 py-4">
              <h3 id={titleId} className="font-display text-xl font-semibold text-text">
                ¿Borrar tu cuenta para siempre?
              </h3>
            </div>

            <div className="p-5">
              <p className="text-sm text-text-muted">
                Se eliminarán <strong className="text-text">todos</strong> tus
                datos: prendas y fotos, outfits, historial de uso, preferencias
                y calendarios. No hay vuelta atrás.
              </p>
              <div className="mt-4">
                <Input
                  label={`Escribe ${CONFIRM_WORD} para confirmar`}
                  type="text"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={CONFIRM_WORD}
                  error={error ?? undefined}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
              <Button variant="ghost" onClick={cerrar} disabled={deleting}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting || confirm.trim().toUpperCase() !== CONFIRM_WORD}
                aria-busy={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-danger px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                {deleting ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    />
                    Borrando…
                  </>
                ) : (
                  "Borrar definitivamente"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

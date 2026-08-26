// Lista de /profile/blocked con el desbloqueo inline.
//
// El desbloqueo pide confirmación en la misma fila en vez de abrir un modal:
// a diferencia de bloquear, no destruye nada (los follows ya se borraron al
// bloquear y no vuelven), así que un modal a pantalla completa sería
// desproporcionado. Sí pide un segundo toque para que no se dispare solo.

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { unblockUserAction } from "@/lib/community/actions";
import type { BlockedUser } from "@/lib/community/query";

type Props = {
  bloqueados: BlockedUser[];
};

export default function BlockedUsersList({ bloqueados }: Props) {
  const router = useRouter();
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [pendienteId, setPendienteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDesbloquear(blockedId: string) {
    setError(null);
    setPendienteId(blockedId);
    startTransition(async () => {
      const res = await unblockUserAction(blockedId);
      setPendienteId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmandoId(null);
      router.refresh();
    });
  }

  if (bloqueados.length === 0) {
    return (
      <div className="mt-8 rounded-xl bg-surface p-5 shadow-sm">
        <p className="text-sm text-text-muted">
          No has bloqueado a nadie. Puedes bloquear a alguien desde el menú
          (···) de sus looks en la comunidad.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-danger-light px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <ul className="mt-8 divide-y divide-divider overflow-hidden rounded-xl bg-surface shadow-sm">
        {bloqueados.map(({ blockedId, displayName, createdAt }) => {
          const confirmando = confirmandoId === blockedId;
          const pendiente = pendienteId === blockedId;

          return (
            <li
              key={blockedId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{displayName}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Bloqueaste esta cuenta el{" "}
                  {new Date(createdAt).toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "America/Bogota",
                  })}
                </p>
              </div>

              {confirmando ? (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmandoId(null)}
                    disabled={pendiente}
                    className="rounded-full px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDesbloquear(blockedId)}
                    disabled={pendiente}
                    aria-busy={pendiente}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:translate-y-0 active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {pendiente && (
                      <span
                        aria-hidden="true"
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                      />
                    )}
                    {pendiente ? "Desbloqueando…" : "Sí, desbloquear"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setConfirmandoId(blockedId);
                  }}
                  className="shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-muted transition-all duration-150 hover:border-primary-mid hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Desbloquear
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

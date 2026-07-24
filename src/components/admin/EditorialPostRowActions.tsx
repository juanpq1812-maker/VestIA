// Acciones de una fila en /admin/hilo: editar, publicar/despublicar,
// eliminar, notificar. Client Component: necesita useTransition + confirm()
// para el borrado, y estado propio (isNotifying) para el broadcast push.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  toggleEditorialPostStatusAction,
  deleteEditorialPostAction,
} from "@/app/admin/hilo/actions";
import { formatHumanDate } from "@/lib/outfits/dateUtils";

export default function EditorialPostRowActions({
  postId,
  status,
  notificadoAt,
}: {
  postId: string;
  status: "draft" | "published";
  notificadoAt: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Estado propio (no useTransition): el broadcast es un fetch a un route
  // handler, no una Server Action — y necesita quedar deshabilitado desde
  // el primer click hasta que vuelva la respuesta, para que un doble click
  // no dispare dos broadcasts antes de que notificado_at quede escrito.
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifiedAt, setNotifiedAt] = useState(notificadoAt);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleEditorialPostStatusAction(
        postId,
        status === "published" ? "draft" : "published"
      );
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("¿Eliminar este post? Esta acción no se puede deshacer.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteEditorialPostAction(postId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  async function handleNotify() {
    if (
      !window.confirm(
        "Vas a notificar a todos los usuarios suscritos. Esto no se puede deshacer."
      )
    ) {
      return;
    }
    setError(null);
    setIsNotifying(true);
    try {
      const res = await fetch("/api/push/hilo/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "No se pudo notificar el post.");
        return;
      }
      if (data.skipped) {
        setError(
          data.reason === "quiet_hours"
            ? "Son horas de silencio en Colombia (9pm–6am) — intenta de nuevo dentro de ese horario."
            : "No se notificó."
        );
        return;
      }
      setNotifiedAt(data.notificadoAt ?? new Date().toISOString());
      router.refresh();
    } finally {
      setIsNotifying(false);
    }
  }

  const yaNotificado = Boolean(notifiedAt);
  const puedeNotificar = status === "published" && !yaNotificado && !isNotifying;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {status === "published" ? "Despublicar" : "Publicar"}
        </button>
        <Link
          href={`/admin/hilo/${postId}`}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Editar
        </Link>
        <span
          title={status !== "published" ? "Publica el post primero" : undefined}
        >
          <button
            type="button"
            onClick={handleNotify}
            disabled={!puedeNotificar}
            className="rounded-full border border-primary-mid px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {yaNotificado
              ? `Notificado ✓ ${formatHumanDate(notifiedAt!.slice(0, 10))}`
              : isNotifying
                ? "Notificando..."
                : "Notificar"}
          </button>
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-full border border-danger/30 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger-light disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Eliminar
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

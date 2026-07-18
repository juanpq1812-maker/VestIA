// Acciones de una fila en /admin/hilo: editar, publicar/despublicar, eliminar.
// Client Component: necesita useTransition + confirm() para el borrado.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  toggleEditorialPostStatusAction,
  deleteEditorialPostAction,
} from "@/app/admin/hilo/actions";

export default function EditorialPostRowActions({
  postId,
  status,
}: {
  postId: string;
  status: "draft" | "published";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex shrink-0 items-center gap-2">
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

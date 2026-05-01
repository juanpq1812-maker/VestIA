// Tarjeta de un outfit guardado en /outfits/saved.
//
// Es Client Component porque expone el boton "Eliminar", que llama a la
// Server Action `deleteOutfitAction` y luego desaparece optimisticamente.

"use client";

import { useState, useTransition } from "react";
import { deleteOutfitAction } from "@/app/outfits/actions";
import type { ClothingItem } from "@/types/database";

type Props = {
  outfitId: string;
  name: string | null;
  occasion: string | null;
  notes: string | null;
  createdAt: string;
  items: ClothingItem[];
};

export default function SavedOutfitCard({
  outfitId,
  name,
  occasion,
  notes,
  createdAt,
  items,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (removed) return null;

  function onEliminar() {
    if (!confirm("Eliminar este outfit guardado?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOutfitAction(outfitId);
      if (!res.ok) setError(res.error);
      else setRemoved(true);
    });
  }

  const titulo = name?.trim() || "Outfit sin nombre";
  const fecha = new Date(createdAt).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-text">
            {titulo}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {fecha}
            {occasion ? ` · ${occasion}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onEliminar}
          disabled={isPending}
          aria-label="Eliminar outfit"
          className="rounded-full p-2 text-text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </header>

      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
        {items.slice(0, 5).map((it) => (
          <li key={it.id} className="text-center">
            <div
              className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-border"
              style={{ backgroundColor: it.primary_color ?? "#c4b5fd" }}
              title={it.name ?? it.subcategory ?? it.category}
            >
              {it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image_url}
                  alt={it.name ?? it.subcategory ?? it.category}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-[11px] text-text-muted">
              {it.subcategory ?? it.category}
            </p>
          </li>
        ))}
      </ul>

      {notes && (
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          {notes}
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

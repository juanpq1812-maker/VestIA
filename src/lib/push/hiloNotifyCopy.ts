// Copy del broadcast de un post de El Hilo. `title` = el titulo real del
// post (truncado, iOS corta titulos largos), `body` segun la categoria.

import type { EditorialCategory } from "@/lib/editorial/types";
import type { PushPayload } from "./types";

const BODY_POR_CATEGORIA: Record<EditorialCategory, string> = {
  columna: "Nueva columna en El Hilo 🧶",
  drop: "Nuevo drop en El Hilo 🧶",
  tendencia: "Nueva tendencia en El Hilo 🧶",
};

const BODY_FALLBACK = "Nuevo en El Hilo 🧶";

// Corta en el espacio mas cercano antes de maxLen, para no partir una
// palabra a la mitad, y agrega "…".
export function truncateTitle(title: string, maxLen = 40): string {
  if (title.length <= maxLen) return title;
  const slice = title.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

export function buildHiloNotifyPayload(post: {
  title: string;
  category: EditorialCategory | string;
  slug: string;
}): PushPayload {
  const body =
    BODY_POR_CATEGORIA[post.category as EditorialCategory] ?? BODY_FALLBACK;
  return {
    title: truncateTitle(post.title),
    body,
    url: `/hilo/${post.slug}`,
    icon: "/icon-192.png",
  };
}

// Último post de "El Hilo" en el home.
//
// No reusa EditorialPostCard: esa lleva borde, sombra y fondo propio, que es
// la gramática de /comunidad y /hilo. Acá el home solo tiene una superficie
// con relleno (el hero), así que la portada se apoya sobre el crema y el texto
// va debajo, sin caja.

import Link from "next/link";
import LazyImage from "@/components/ui/LazyImage";
import { EDITORIAL_CATEGORY_LABEL } from "@/lib/editorial/types";
import type { EditorialPostListItem } from "@/lib/editorial/query";
import { publicEditorialImageUrl } from "@/lib/storage/editorialImages";

export default function HiloEntry({ post }: { post: EditorialPostListItem }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl leading-tight tracking-tight text-text sm:text-2xl">
          El Hilo
        </h2>
        <Link
          href="/hilo"
          className="inline-flex items-center py-3 -my-3 shrink-0 text-sm text-text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver todo
        </Link>
      </div>

      <Link
        href={`/hilo/${post.slug}`}
        className="group flex flex-col gap-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-8"
      >
        <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-surface-2 sm:aspect-[4/3] sm:w-64 sm:shrink-0">
          <LazyImage
            src={publicEditorialImageUrl(post.cover_image_path)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {EDITORIAL_CATEGORY_LABEL[post.category]}
          </p>
          <h3 className="font-display text-lg leading-tight text-text transition-colors group-hover:text-primary sm:text-xl">
            {post.title}
          </h3>
          {post.subtitle && (
            <p className="max-w-[46ch] text-sm leading-relaxed text-text-muted">
              {post.subtitle}
            </p>
          )}
          {post.brand_name && (
            <p className="text-xs text-text-faint">
              En alianza con {post.brand_name}
            </p>
          )}
        </div>
      </Link>
    </section>
  );
}

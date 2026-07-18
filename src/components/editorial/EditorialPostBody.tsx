// Render editorial de un post de "El Hilo" — portada, título, meta y cuerpo
// por bloques. Un solo componente para dos consumidores: la vista previa del
// editor admin y la página pública /hilo/[slug] — cero duplicación de
// markup entre "lo que ve el admin" y "lo que ve el usuario".

import LazyImage from "@/components/ui/LazyImage";
import type { EditorialBlock } from "@/lib/editorial/blocks";
import type { EditorialCategory } from "@/lib/editorial/types";
import { EDITORIAL_CATEGORY_LABEL } from "@/lib/editorial/types";
import { publicEditorialImageUrl } from "@/lib/storage/editorialImages";
import { formatHumanDate } from "@/lib/outfits/dateUtils";

export type EditorialPostBodyProps = {
  title: string;
  subtitle?: string | null;
  authorName: string;
  category: EditorialCategory;
  brandName?: string | null;
  brandUrl?: string | null;
  coverImagePath: string;
  /** ISO string de published_at. null/undefined = borrador (muestra "Vista previa"). */
  publishedAt?: string | null;
  blocks: EditorialBlock[];
};

export default function EditorialPostBody({
  title,
  subtitle,
  authorName,
  category,
  brandName,
  brandUrl,
  coverImagePath,
  publishedAt,
  blocks,
}: EditorialPostBodyProps) {
  const coverUrl = coverImagePath ? publicEditorialImageUrl(coverImagePath) : null;

  return (
    <article>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-2 sm:aspect-[16/9]">
        {coverUrl ? (
          <LazyImage src={coverUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {EDITORIAL_CATEGORY_LABEL[category]}
          </span>
          {!publishedAt ? (
            <span className="rounded-full bg-surface-offset px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Vista previa
            </span>
          ) : null}
        </div>

        <h1 className="mt-3 font-display text-3xl tracking-tight text-text sm:text-4xl">
          {title || "Sin título"}
        </h1>

        {subtitle ? <p className="mt-2 text-lg text-text-muted">{subtitle}</p> : null}

        <p className="mt-4 text-sm text-text-muted">
          {authorName}
          {publishedAt ? ` · ${formatHumanDate(publishedAt.slice(0, 10))}` : ""}
        </p>

        {brandName ? (
          <p className="mt-1 text-sm text-text-muted">En alianza con {brandName}</p>
        ) : null}

        <div className="mt-8 flex flex-col gap-6">
          {blocks.map((block, i) => (
            <EditorialBlockRender key={i} block={block} />
          ))}
        </div>

        {category === "drop" && brandUrl ? (
          <div className="mt-10 border-t border-divider pt-6 text-center">
            <a
              href={brandUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary-light px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
            >
              Conoce más de {brandName}
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EditorialBlockRender({ block }: { block: EditorialBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-base leading-relaxed text-text">{block.text}</p>;
    case "heading":
      return (
        <h2 className="font-display text-2xl text-text">{block.text}</h2>
      );
    case "image": {
      const url = block.path ? publicEditorialImageUrl(block.path) : null;
      if (!url) return null;
      return (
        <figure>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-2">
            <LazyImage
              src={url}
              alt={block.caption ?? ""}
              className="h-full w-full object-cover"
            />
          </div>
          {block.caption ? (
            <figcaption className="mt-2 text-center text-xs text-text-muted">
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "quote":
      return (
        <blockquote className="border-l-2 border-primary py-1 pl-5">
          <p className="font-display text-xl text-text">&ldquo;{block.text}&rdquo;</p>
          {block.attribution ? (
            <footer className="mt-2 text-sm text-text-muted">— {block.attribution}</footer>
          ) : null}
        </blockquote>
      );
    default:
      return null;
  }
}

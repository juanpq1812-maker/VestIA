// Card editorial de un post de "El Hilo" — usada en /comunidad (últimos 3) y
// en el grid de /hilo.

import Link from "next/link";
import LazyImage from "@/components/ui/LazyImage";
import { EDITORIAL_CATEGORY_LABEL } from "@/lib/editorial/types";
import type { EditorialPostListItem } from "@/lib/editorial/query";
import { publicEditorialImageUrl } from "@/lib/storage/editorialImages";
import { formatHumanDate } from "@/lib/outfits/dateUtils";

export default function EditorialPostCard({ post }: { post: EditorialPostListItem }) {
  return (
    <Link
      href={`/hilo/${post.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-2">
        <LazyImage
          src={publicEditorialImageUrl(post.cover_image_path)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-4">
        <span className="rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          {EDITORIAL_CATEGORY_LABEL[post.category]}
        </span>
        <h3 className="mt-2 font-display text-lg leading-snug text-text">{post.title}</h3>
        <p className="mt-1 text-xs text-text-muted">
          {post.published_at ? formatHumanDate(post.published_at.slice(0, 10)) : ""}
        </p>
        {post.brand_name ? (
          <p className="mt-1 text-xs text-text-muted">En alianza con {post.brand_name}</p>
        ) : null}
      </div>
    </Link>
  );
}

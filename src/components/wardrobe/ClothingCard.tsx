// Tarjeta de una prenda dentro del grid del armario.
// Muestra la imagen (o un placeholder con el color principal si aun no hay
// foto cargada en Storage), el nombre y la categoria.
//
// Es un componente "tonto": recibe los datos por props y los renderiza. La
// pagina del armario es la que decide si usarlo (mobile: 2 cols, desktop: 3-4).

import type { ClothingCategory, ClothingItem } from "@/types/database";

const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Vestido",
  outerwear: "Outerwear",
  footwear: "Calzado",
  accessory: "Accesorio",
};

type Props = {
  item: ClothingItem;
};

export default function ClothingCard({ item }: Props) {
  const titulo =
    item.name?.trim() ||
    item.subcategory?.trim() ||
    CATEGORY_LABELS[item.category];
  const colorBase = item.primary_color ?? "#c4b5fd"; // primary-mid como fallback

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        style={{ backgroundColor: colorBase }}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={titulo}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-white/80"
            aria-hidden="true"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M20 6 12 2 4 6v6c0 5 8 10 8 10s8-5 8-10V6z" />
            </svg>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-text shadow-sm backdrop-blur">
          {CATEGORY_LABELS[item.category]}
        </span>
      </div>

      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-text" title={titulo}>
          {titulo}
        </h3>
        {item.subcategory && item.name ? (
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {item.subcategory}
          </p>
        ) : null}
      </div>
    </article>
  );
}

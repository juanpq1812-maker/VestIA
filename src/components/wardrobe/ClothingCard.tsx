// Tarjeta de una prenda dentro del grid del armario.
// Muestra la imagen (o un placeholder con el color principal si aun no hay
// foto cargada en Storage), el nombre y la categoria.
//
// Es un componente "tonto": recibe los datos por props y los renderiza. La
// pagina del armario es la que decide si usarlo (mobile: 2 cols, desktop: 3-4).

import Link from "next/link";
import type { ClothingCategory, ClothingItem } from "@/types/database";
import LazyImage from "@/components/ui/LazyImage";
import DeleteItemButton from "@/components/wardrobe/DeleteItemButton";

import { GARMENT_PLATE_COLOR } from "@/lib/ui/colors";
const CATEGORY_LABELS: Record<ClothingCategory, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Vestido",
  outerwear: "Abrigo",
  footwear: "Calzado",
  accessory: "Accesorio",
};

type Props = {
  item: ClothingItem;
  /** Se pasa a las primeras cards de la grilla (las de sobre el pliegue). */
  priority?: boolean;
};

export default function ClothingCard({ item, priority = false }: Props) {
  const titulo =
    item.name?.trim() ||
    item.subcategory?.trim() ||
    CATEGORY_LABELS[item.category];
  const colorBase = GARMENT_PLATE_COLOR;

  return (
    <article className="group">
      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface-2"
        style={{ backgroundColor: colorBase }}
      >
        {/* La miniatura si existe; si no (prenda anterior al backfill, o la
            generación falló), la imagen completa. La miniatura es adicional,
            nunca un requisito. */}
        {item.thumbnail_url ?? item.image_url ? (
          <LazyImage
            src={(item.thumbnail_url ?? item.image_url) as string}
            alt={titulo}
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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

        {/* Badge de item sin categorizar (subido en bulk) */}
        {item.subcategory === null ? (
          <span className="absolute right-3 top-3 rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
            Sin cat.
          </span>
        ) : null}

        {/* Invita a re-fotografiarla cuando la foto no quedó como debía:
            recortada de un outfit completo, sin fondo removido (Gemini falló
            del todo), o marcada para reconstrucción que nunca se logró — en
            ese último caso el fondo sí se quitó, pero la mano/el gancho que
            motivaron la reconstrucción siguen en la foto, así que el reintento
            tiene que estar disponible igual. */}
        {item.source === "outfit_extraction" ||
        item.background_removed === false ||
        (item.reconstruction_reason !== null && item.reconstructed === false) ? (
          <Link
            href={`/wardrobe/${item.id}/edit`}
            className="absolute bottom-2 left-2 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-text-muted shadow-sm backdrop-blur transition-colors hover:text-primary"
          >
            Mejora esta foto
          </Link>
        ) : null}

        <DeleteItemButton
          itemId={item.id}
          imagePath={item.image_path}
          thumbnailPath={item.thumbnail_path}
          itemName={titulo}
        />
      </div>

      <div className="pt-2.5">
        <h3 className="truncate text-sm font-medium text-text" title={titulo}>
          {titulo}
        </h3>
        {item.subcategory && item.name ? (
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {item.subcategory}
          </p>
        ) : null}

        <Link
          href={`/outfits?prenda=${item.id}&nombre=${encodeURIComponent(titulo)}`}
          className="mt-2.5 block w-full rounded-lg bg-primary-light px-3 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Crear outfit con esta prenda
        </Link>
      </div>
    </article>
  );
}

// Paso 1 del flujo visual: elegir la categoría amplia de la prenda.

"use client";

import GarmentIconGrid from "@/components/wardrobe/GarmentIconGrid";
import { CATEGORY_ICONS } from "@/lib/wardrobe/icons";
import { CLOTHING_CATEGORIES, type ClothingCategory } from "@/types/database";

const ITEMS = CLOTHING_CATEGORIES.map((cat) => ({
  value: cat.value,
  label: cat.label,
  icon: CATEGORY_ICONS[cat.value],
}));

type Props = {
  selected?: ClothingCategory | "";
  /** Categoría que detectó la IA sin suficiente confianza para darla por buena. */
  hinted?: ClothingCategory | "";
  onSelect: (category: ClothingCategory) => void;
};

export default function CategoryGrid({ selected, hinted, onSelect }: Props) {
  return (
    <GarmentIconGrid
      title="¿Qué prenda quieres categorizar?"
      subtitle={
        hinted
          ? "Marcamos la que detectamos. Si no es, elige la correcta."
          : undefined
      }
      items={ITEMS}
      selected={selected || undefined}
      hinted={hinted || undefined}
      onSelect={(value) => onSelect(value as ClothingCategory)}
      // 3×2 fijo en cualquier ancho: son solo 6 y así el grid entra completo
      // junto al header y la miniatura de la foto, sin scroll en un iPhone.
      columnsClassName="grid-cols-3"
      tileSize="md"
    />
  );
}

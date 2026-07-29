// Paso 2 del flujo visual: elegir la subcategoría dentro de la categoría ya
// elegida.

"use client";

import GarmentIconGrid from "@/components/wardrobe/GarmentIconGrid";
import { SUBCATEGORIES } from "@/lib/wardrobe/constants";
import { getSubcategoryIcon } from "@/lib/wardrobe/icons";
import { CLOTHING_CATEGORIES, type ClothingCategory } from "@/types/database";

type Props = {
  category: ClothingCategory;
  selected?: string;
  /** Subcategoría que detectó la IA sin suficiente confianza. */
  hinted?: string;
  onSelect: (subcategory: string) => void;
  onBack: () => void;
};

export default function SubcategoryGrid({
  category,
  selected,
  hinted,
  onSelect,
  onBack,
}: Props) {
  const categoryLabel =
    CLOTHING_CATEGORIES.find((c) => c.value === category)?.label ?? "";

  // El orden es el de SUBCATEGORIES, que ya está pensado de lo más común a lo
  // menos común — no reordenar acá.
  const items = SUBCATEGORIES[category].map((label) => ({
    value: label,
    label,
    icon: getSubcategoryIcon(label, category),
  }));

  return (
    <GarmentIconGrid
      title={`¿Qué tipo de ${categoryLabel.toLowerCase()}?`}
      subtitle={
        hinted && !selected
          ? "Marcamos la que detectamos. Si no es, elige la correcta."
          : undefined
      }
      items={items}
      selected={selected}
      hinted={hinted}
      onSelect={onSelect}
      onBack={onBack}
      backLabel="Volver a categorías"
      columnsClassName="grid-cols-3 sm:grid-cols-4"
    />
  );
}

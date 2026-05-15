// Filtro por categoria del armario. Lista de chips que controla un estado
// "categoria activa". Vive como Client Component porque maneja estado de UI.

"use client";

import { useMemo, useState } from "react";
import Chip from "@/components/onboarding/Chip";
import ClothingCard from "./ClothingCard";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
  type ClothingItem,
} from "@/types/database";

type Filter = "all" | ClothingCategory;

type Props = {
  items: ClothingItem[];
};

export default function CategoryFilter({ items }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const visibles = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  // Conteos por categoria para mostrarlos al lado del nombre del filtro.
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const item of items) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filtrar por categoria"
        className="-mx-1 flex flex-wrap gap-2 px-1"
      >
        <Chip
          role="tab"
          aria-selected={filter === "all"}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          Todas
          <span className="text-xs opacity-70">{counts.all}</span>
        </Chip>
        {CLOTHING_CATEGORIES.map((cat) => (
          <Chip
            key={cat.value}
            role="tab"
            aria-selected={filter === cat.value}
            active={filter === cat.value}
            onClick={() => setFilter(cat.value)}
          >
            {cat.label}
            <span className="text-xs opacity-70">
              {counts[cat.value] ?? 0}
            </span>
          </Chip>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-text-muted">
          No tienes prendas en esta categoría todavía.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((item) => (
            <ClothingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

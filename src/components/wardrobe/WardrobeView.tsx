// Vista principal del armario (Design STRANDIA — strandia_armario):
// búsqueda, destacadas (más/menos usada), chips de categoría y grid.
// Client Component porque maneja el estado de búsqueda + filtro.

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Chip from "@/components/onboarding/Chip";
import ClothingCard from "./ClothingCard";
import LazyImage from "@/components/ui/LazyImage";
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
  type ClothingItem,
} from "@/types/database";

type Filter = "all" | ClothingCategory;

export type FeaturedItem = {
  item: ClothingItem;
  label: string; // "Prenda más usada" | "Prenda menos usada"
};

type Props = {
  items: ClothingItem[];
  destacadas: FeaturedItem[];
};

export default function WardrobeView({ items, destacadas }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.category !== filter) return false;
      if (!q) return true;
      return (
        (i.name ?? "").toLowerCase().includes(q) ||
        (i.subcategory ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, filter, busqueda]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const item of items) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Búsqueda ────────────────────────────────────────────────────── */}
      <div className="relative">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar en mi armario…"
          aria-label="Buscar en mi armario"
          className="w-full rounded-xl bg-surface-2 py-3.5 pl-12 pr-4 text-base text-text placeholder:text-text-faint transition-colors duration-150 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </div>

      {/* ── Destacadas ──────────────────────────────────────────────────── */}
      {destacadas.length > 0 && busqueda.trim() === "" && filter === "all" ? (
        <div className="grid grid-cols-2 gap-4">
          {destacadas.map(({ item, label }) => {
            const titulo = tituloDe(item);
            return (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl bg-surface-2 p-3 text-center"
              >
                <div
                  className="aspect-square w-full overflow-hidden rounded-lg"
                  style={{ backgroundColor: item.primary_color ?? "#e5e2df" }}
                >
                  {item.image_url ? (
                    <LazyImage
                      src={item.image_url}
                      alt={titulo}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {label}
                </p>
                <h3 className="mt-1 truncate font-display text-base text-text" title={titulo}>
                  {titulo}
                </h3>
                <Link
                  href={`/outfits?prenda=${item.id}&nombre=${encodeURIComponent(titulo)}`}
                  className="mt-3 block w-full rounded-lg bg-primary-mid/40 px-3 py-2.5 text-xs font-semibold text-text transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Usar en un nuevo outfit
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ── Categorías ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-sm uppercase tracking-widest text-text">
          Categoría
        </h2>
        <div
          role="tablist"
          aria-label="Filtrar por categoría"
          className="-mx-1 mt-3 flex flex-wrap gap-2 px-1"
        >
          <Chip
            role="tab"
            aria-selected={filter === "all"}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Todo
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
              <span className="text-xs opacity-70">{counts[cat.value] ?? 0}</span>
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm uppercase tracking-widest text-text">
            Mis prendas
          </h2>
          <span className="text-xs text-text-muted">
            {visibles.length} de {items.length}
          </span>
        </div>

        {visibles.length === 0 ? (
          <p className="mt-6 rounded-xl bg-surface-2 p-6 text-center text-sm text-text-muted">
            {busqueda.trim()
              ? `Sin resultados para “${busqueda.trim()}”.`
              : "No tienes prendas en esta categoría todavía."}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibles.map((item) => (
              <ClothingCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function tituloDe(item: ClothingItem): string {
  const labels: Record<ClothingCategory, string> = {
    top: "Top",
    bottom: "Bottom",
    dress: "Vestido",
    outerwear: "Abrigo",
    footwear: "Calzado",
    accessory: "Accesorio",
    body: "Body",
  };
  return item.name?.trim() || item.subcategory?.trim() || labels[item.category];
}

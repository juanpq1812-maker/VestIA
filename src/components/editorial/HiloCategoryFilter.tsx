// Filtro de categoría en /hilo — chips de navegación (Link, no botón) que
// llevan el filtro en la URL (?categoria=drop) para que sea compartible y no
// dependa de estado de cliente.

import Link from "next/link";
import { EDITORIAL_CATEGORY_LABEL, type EditorialCategory } from "@/lib/editorial/types";

export default function HiloCategoryFilter({
  categories,
  active,
}: {
  categories: readonly EditorialCategory[];
  active: EditorialCategory | null;
}) {
  return (
    <div role="tablist" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
      <Link
        href="/hilo"
        role="tab"
        aria-selected={active === null}
        className={[
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
          "border transition-all duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          active === null
            ? "border-primary bg-primary text-white shadow-sm"
            : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
        ].join(" ")}
      >
        Todo
      </Link>
      {categories.map((c) => (
        <Link
          key={c}
          href={`/hilo?categoria=${c}`}
          role="tab"
          aria-selected={active === c}
          className={[
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
            "border transition-all duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            active === c
              ? "border-primary bg-primary text-white shadow-sm"
              : "border-border bg-surface text-text-muted hover:border-primary-mid hover:bg-surface-2 hover:text-text",
          ].join(" ")}
        >
          {EDITORIAL_CATEGORY_LABEL[c]}
        </Link>
      ))}
    </div>
  );
}

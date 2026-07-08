// Tabs Prendas / Outfits del Armario (Design STRANDIA — strandia_armario).
// Son links, no estado local: cada tab es una ruta real y deep-linkeable
// (/wardrobe y /outfits/saved). El subrayado marca la activa.

import Link from "next/link";

type Props = {
  active: "prendas" | "outfits";
};

const TABS = [
  { key: "prendas", label: "Prendas", href: "/wardrobe" },
  { key: "outfits", label: "Outfits", href: "/outfits/saved" },
] as const;

export default function WardrobeTabs({ active }: Props) {
  return (
    <nav aria-label="Secciones del armario" className="border-b border-divider">
      <ul className="flex">
        {TABS.map((tab) => {
          const activo = tab.key === active;
          return (
            <li key={tab.key} className="flex-1">
              <Link
                href={tab.href}
                aria-current={activo ? "page" : undefined}
                className={[
                  "-mb-px flex items-center justify-center border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-150",
                  activo
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:border-border hover:text-text",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

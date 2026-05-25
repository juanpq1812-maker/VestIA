// Barra de navegación inferior para mobile — client component.
// Necesita usePathname() para marcar la pestaña activa.
// Se muestra solo en mobile; en md+ el Header maneja la navegación.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shirt, Sparkles, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",         label: "Inicio",    Icon: Home     },
  { href: "/wardrobe", label: "Armario",   Icon: Shirt    },
  { href: "/outfits",  label: "AI Studio", Icon: Sparkles },
  { href: "/outfits",  label: "Comunidad", Icon: Users    }, // /community en el futuro
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-around items-center bg-surface px-4 py-3 rounded-t-2xl border-t border-divider shadow-[0px_-2px_10px_rgba(45,49,46,0.06)]"
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const activo =
          href === "/" ? pathname === "/" : pathname?.startsWith(href);

        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={activo ? "page" : undefined}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={[
                "rounded-full px-5 py-1.5 transition-colors duration-150",
                activo
                  ? "bg-primary-light text-primary"
                  : "text-text-muted",
              ].join(" ")}
            >
              <Icon size={22} aria-hidden="true" />
            </div>
            <span
              className={[
                "text-xs",
                activo ? "font-medium text-primary" : "text-text-muted",
              ].join(" ")}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

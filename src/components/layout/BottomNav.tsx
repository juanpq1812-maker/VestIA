// Bottom navigation bar — patrón de navegación primario en mobile.
// El Header sigue existiendo (logo + perfil), pero la navegación entre
// secciones vive acá abajo, fija, siempre accesible con el pulgar.
// En desktop (md+) se oculta: ahí la navegación vive en el nav horizontal del Header.

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
};

const ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: (a) => <IconHome active={a} /> },
  { href: "/wardrobe", label: "Armario", icon: (a) => <IconWardrobe active={a} /> },
  { href: "/outfits", label: "AI Studio", icon: (a) => <IconSparkle active={a} /> },
  { href: "/comunidad", label: "Comunidad", icon: (a) => <IconCommunity active={a} /> },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-divider bg-surface/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-surface/85 md:hidden"
    >
      {ITEMS.map((item) => {
        const activo =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className={[
                "flex h-9 w-14 items-center justify-center rounded-full transition-colors duration-150",
                activo ? "bg-primary-light text-primary" : "text-text-muted",
              ].join(" ")}
              aria-hidden="true"
            >
              {item.icon(activo)}
            </span>
            <span
              className={[
                "text-[11px] font-medium transition-colors duration-150",
                activo ? "text-primary" : "text-text-muted",
              ].join(" ")}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Íconos ───────────────────────────────────────────────────────────────────

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

function IconWardrobe({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 7 6.5" />
      <path d="M12 3l5 3.5" />
      <circle cx="12" cy="3" r="0.9" fill={active ? "currentColor" : "none"} />
      <path d="M4 8.5 12 4l8 4.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" />
      <path d="M12 11v9" />
    </svg>
  );
}

function IconSparkle({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      <path d="M12 7c0 2.76-2.24 5-5 5 2.76 0 5 2.24 5 5 0-2.76 2.24-5 5-5-2.76 0-5-2.24-5-5Z" />
    </svg>
  );
}

function IconCommunity({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" fill={active ? "currentColor" : "none"} />
      <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 15.2c2.6.3 4.5 2.1 4.5 4.8" />
    </svg>
  );
}

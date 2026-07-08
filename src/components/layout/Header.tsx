// Header de la app para usuarios autenticados.
// Mobile: logo centrado + ícono de perfil — la navegación entre secciones
// vive en <BottomNav />. Desktop (md+): logo + nav horizontal + perfil.
// El logout vive en /profile (patrón del diseño de referencia).

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

type LinkNav = {
  href: string;
  label: string;
};

const NAV: LinkNav[] = [
  { href: "/", label: "Inicio" },
  { href: "/wardrobe", label: "Armario" },
  { href: "/outfits", label: "AI Studio" },
  { href: "/comunidad", label: "Comunidad" },
];

type Props = {
  email?: string | null;
  displayName?: string | null;
  hideNav?: boolean;
};

export default function Header({ hideNav = false }: Props) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo — centrado en mobile (absolute), a la izquierda en desktop */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:static md:translate-x-0"
            aria-label="Ir al inicio"
          >
            <Image
              src="/logo-strandia.png"
              alt="StrandIA"
              width={160}
              height={80}
              className="h-10 w-auto md:h-12"
              priority
            />
          </Link>

          {/* Espaciador mobile para equilibrar el ícono de perfil a la derecha */}
          <span className="h-10 w-10 md:hidden" aria-hidden="true" />

          {/* Nav desktop */}
          {!hideNav && (
            <nav
              aria-label="Navegación principal"
              className="hidden md:flex items-center gap-1"
            >
              {NAV.map((item) => {
                const activo =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={activo ? "page" : undefined}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      activo
                        ? "bg-primary-light text-primary"
                        : "text-text-muted hover:bg-surface-2 hover:text-text",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Perfil */}
          <Link
            href="/profile"
            aria-label="Ir a tu perfil"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              pathname === "/profile"
                ? "bg-primary-light text-primary"
                : "text-text-muted hover:bg-surface-2 hover:text-text",
            ].join(" ")}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.5 3.1-5.8 7-5.8s7 2.3 7 5.8" />
            </svg>
          </Link>
        </div>
      </header>

      {!hideNav && <BottomNav />}
    </>
  );
}

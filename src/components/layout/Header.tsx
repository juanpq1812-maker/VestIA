// Header de la app para usuarios autenticados.
// Mobile: logo + logout — la navegación entre secciones vive en <BottomNav />.
// Desktop (md+): logo + nav horizontal + logout (sin bottom nav, no aplica en desktop).

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import BottomNav from "@/components/layout/BottomNav";

type LinkNav = {
  href: string;
  label: string;
};

const NAV: LinkNav[] = [
  { href: "/", label: "Inicio" },
  { href: "/wardrobe", label: "Armario" },
  { href: "/outfits", label: "Outfits" },
];

type Props = {
  email?: string | null;
  displayName?: string | null;
  hideNav?: boolean;
};

export default function Header({ email, displayName, hideNav = false }: Props) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label="Ir al inicio"
          >
            {/* Mobile */}
            <Image
              src="/logo-mark-strandia.png"
              alt="StrandIA"
              width={40}
              height={40}
              className="block md:hidden h-10 w-auto"
              priority
            />
            {/* Desktop */}
            <Image
              src="/logo-strandia.png"
              alt="StrandIA"
              width={160}
              height={48}
              className="hidden md:block h-12 w-auto"
              priority
            />
          </Link>

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

          {/* Lado derecho */}
          <div className="flex items-center gap-3">
            {/* Nombre/email en desktop */}
            {(displayName || email) && (
              <span
                className="hidden text-xs text-text-muted md:inline-block max-w-[180px] truncate"
                title={email ?? undefined}
              >
                {displayName ?? email}
              </span>
            )}

            <LogoutButton />
          </div>
        </div>
      </header>

      {!hideNav && <BottomNav />}
    </>
  );
}

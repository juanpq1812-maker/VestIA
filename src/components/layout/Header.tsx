// Header de la app para usuarios autenticados.
// Mobile: logo + hamburguesa → menú vertical desplegable.
// Desktop (md+): logo + nav horizontal + logout.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";
import LogoutButton from "@/components/auth/LogoutButton";

type LinkNav = {
  href: string;
  label: string;
  emoji?: string;
};

const NAV: LinkNav[] = [
  { href: "/", label: "Inicio" },
  { href: "/wardrobe", label: "Armario" },
  { href: "/outfits", label: "Outfits" },
  { href: "/impact", label: "Impacto" },
];

const MOBILE_NAV: LinkNav[] = [
  { href: "/", label: "Inicio", emoji: "🏠" },
  { href: "/wardrobe", label: "Armario", emoji: "👗" },
  { href: "/outfits", label: "Outfits", emoji: "✨" },
  { href: "/impact", label: "Impacto", emoji: "🌱" },
];

type Props = {
  email?: string | null;
  displayName?: string | null;
  hideNav?: boolean;
};

export default function Header({ email, displayName, hideNav = false }: Props) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al clickear fuera del menú
  useEffect(() => {
    if (!menuAbierto) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuAbierto]);

  // Cerrar si la ruta cambia (link clickeado)
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuAbierto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuAbierto]);

  return (
    <header className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="Ir al inicio"
        >
          <Logo size={32} />
          <Wordmark className="text-lg sm:text-xl" />
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

          {/* Logout desktop */}
          <div className="hidden md:block">
            <LogoutButton />
          </div>

          {/* Hamburguesa (solo mobile, solo cuando hay nav) */}
          {!hideNav && (
            <div ref={menuRef} className="md:hidden">
              <button
                type="button"
                aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={menuAbierto}
                aria-controls="mobile-menu"
                onClick={() => setMenuAbierto((v) => !v)}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  menuAbierto
                    ? "bg-primary-light text-primary"
                    : "text-text-muted hover:bg-surface-2 hover:text-text",
                ].join(" ")}
              >
                {menuAbierto ? <IconX /> : <IconMenu />}
              </button>

              {/* Menú desplegable */}
              <div
                id="mobile-menu"
                role="dialog"
                aria-label="Menú de navegación"
                aria-modal="true"
                className={[
                  "absolute left-0 right-0 top-full z-40 border-b border-divider bg-surface shadow-lg",
                  "transition-all duration-200 ease-out origin-top",
                  menuAbierto
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 -translate-y-2 pointer-events-none",
                ].join(" ")}
              >
                <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
                  {/* Links de navegación */}
                  <nav aria-label="Navegación mobile" className="flex flex-col gap-1">
                    {MOBILE_NAV.map((item) => {
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
                            "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                            activo
                              ? "bg-primary-light text-primary"
                              : "text-text hover:bg-surface-2",
                          ].join(" ")}
                        >
                          {item.emoji && (
                            <span aria-hidden="true" className="text-xl w-7 text-center">
                              {item.emoji}
                            </span>
                          )}
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Separador + usuario + logout */}
                  <div className="mt-3 border-t border-divider pt-3 pb-1 flex items-center justify-between gap-3">
                    {(displayName || email) && (
                      <span className="truncate text-xs text-text-muted max-w-[200px]" title={email ?? undefined}>
                        {displayName ?? email}
                      </span>
                    )}
                    <LogoutButton />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Si hideNav (onboarding), solo logout mobile */}
          {hideNav && (
            <div className="md:hidden">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>

      {/* Overlay semitransparente detrás del menú */}
      {!hideNav && (
        <div
          aria-hidden="true"
          className={[
            "fixed inset-0 top-[57px] z-30 bg-black/20 transition-opacity duration-200 md:hidden",
            menuAbierto ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          ].join(" ")}
          onClick={() => setMenuAbierto(false)}
        />
      )}
    </header>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

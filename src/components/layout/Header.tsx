// Header de la app para usuarios autenticados.
// En mobile: logo + wordmark + boton de logout.
// En desktop (md+): ademas muestra una navegacion entre secciones.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";
import Wordmark from "@/components/ui/Wordmark";
import LogoutButton from "@/components/auth/LogoutButton";

type LinkNav = {
  href: string;
  label: string;
};

const NAV: LinkNav[] = [
  { href: "/wardrobe", label: "Armario" },
  { href: "/wardrobe/upload", label: "Subir prenda" },
  { href: "/outfits", label: "Outfits IA" },
  { href: "/outfits/saved", label: "Mis outfits" },
];

type Props = {
  email?: string | null;
  /** Nombre preferido del usuario (profiles.display_name). Si existe se muestra en vez del email. */
  displayName?: string | null;
  /** Si quieres ocultar la navegacion (por ejemplo en onboarding). */
  hideNav?: boolean;
};

export default function Header({ email, displayName, hideNav = false }: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/wardrobe"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          aria-label="Ir al armario"
        >
          <Logo size={32} />
          <Wordmark className="text-lg sm:text-xl" />
        </Link>

        {!hideNav && (
          <nav
            aria-label="Navegacion principal"
            className="hidden md:flex items-center gap-1"
          >
            {NAV.map((item) => {
              const activo =
                pathname === item.href ||
                pathname?.startsWith(`${item.href}/`);
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

        <div className="flex items-center gap-3">
          {displayName || email ? (
            <span
              className="hidden text-xs text-text-muted sm:inline-block max-w-[180px] truncate"
              title={email ?? undefined}
            >
              {displayName ?? email}
            </span>
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

// Invitación a conectar el calendario (usuarios sin feed). Descartable: el
// cierre se persiste en localStorage y no vuelve a aparecer.
//
// Era una tarjeta con relleno propio, y quedó como la única superficie con
// fondo fuera del hero — que es justo lo que hace que el hero se lea como
// hero. Ahora es una línea sobre el crema, como el resto del home.
//
// Arranca oculta y aparece tras verificar localStorage en el cliente — así no
// hay flash para quien ya la descartó (el pop-in de ~1 frame es preferible).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "strandia-calendar-hint-dismissed";

export default function ConnectCalendarCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sin storage, solo se oculta esta sesión */
    }
  }

  return (
    <section
      aria-label="Conecta tu calendario"
      className="flex items-start justify-between gap-4 border-t border-divider pt-6"
    >
      <div className="flex flex-col items-start gap-2">
        <p className="max-w-[52ch] text-sm leading-relaxed text-text-muted">
          Conecta tu calendario y la IA te preparará el look antes de que
          pienses en qué ponerte. Funciona con Google y Apple.
        </p>
        <Link
          href="/profile"
          className="-my-3 inline-flex items-center py-3 text-sm font-medium text-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Conectar en mi perfil
        </Link>
      </div>

      {/* 44px de área táctil aunque el aspa mida 16: el botón de descarte era
          de 32×32, por debajo del mínimo. */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Descartar"
        className="-m-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-faint transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </section>
  );
}

// Invitación a conectar el calendario (usuarios sin feed). Descartable: el
// cierre se persiste en localStorage y no vuelve a aparecer.
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
      className="relative flex flex-col gap-3 rounded-xl bg-primary-light p-5 sm:p-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Descartar"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-mid/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div className="flex items-center gap-2 pr-10">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <h2 className="font-display text-xl text-text">
          Conecta tu calendario
        </h2>
      </div>
      <p className="max-w-prose text-sm leading-relaxed text-text-muted">
        Si tienes una reunión, una cita o un plan, la IA te preparará el look
        antes de que pienses en qué ponerte. Funciona con Google y Apple
        Calendar.
      </p>
      <Link
        href="/profile"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Conectar en mi perfil
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

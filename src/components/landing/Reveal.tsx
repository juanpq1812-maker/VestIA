// Reveal-on-scroll accesible. El contenido es visible por defecto (SSR y sin
// JS), así que nunca se envía una sección en blanco a un crawler o a un
// navegador sin JS. Solo cuando hay JS y el usuario permite movimiento
// aplicamos el estado inicial oculto (data-reveal="pending") y lo revelamos
// al entrar al viewport. Con reduced-motion no hacemos nada: queda visible.

"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Retraso del reveal en ms, para escalonar ítems de una lista. */
  delay?: number;
  /** Etiqueta a renderizar (div por defecto). */
  as?: ElementType;
  className?: string;
};

export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // En una pestaña oculta el IntersectionObserver puede no dispararse; no
    // ocultamos el contenido en ese caso para no dejar la sección en blanco.
    if (document.visibilityState !== "visible") return;

    el.dataset.reveal = "pending";
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.dataset.reveal = "in";
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={className}
    >
      {children}
    </Tag>
  );
}

// Dropdown de categorías del armario (mobile). En desktop (md+) el filtro
// sigue siendo la fila de chips — este control solo existe donde el espacio
// horizontal escasea. Patrón listbox accesible: flechas, Enter, Esc, click
// afuera, foco devuelto al trigger.

"use client";

import { useEffect, useId, useRef, useState } from "react";

export type CategoryOption = {
  value: string;
  label: string;
  count: number;
};

type Props = {
  opciones: CategoryOption[];
  valor: string;
  onChange: (valor: string) => void;
};

export default function CategoryDropdown({ opciones, valor, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const seleccionada = opciones.find((o) => o.value === valor) ?? opciones[0];

  function abrir() {
    setIndiceActivo(Math.max(0, opciones.findIndex((o) => o.value === valor)));
    setAbierto(true);
  }

  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) triggerRef.current?.focus();
  }

  function seleccionar(opcion: CategoryOption) {
    onChange(opcion.value);
    cerrar();
  }

  // Click fuera del componente → cerrar (sin robar el foco).
  useEffect(() => {
    if (!abierto) return;
    function onPointerDown(e: PointerEvent) {
      if (!raizRef.current?.contains(e.target as Node)) cerrar(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [abierto]);

  // Con el listbox abierto, el foco vive en la lista.
  useEffect(() => {
    if (abierto) listaRef.current?.focus();
  }, [abierto]);

  function onKeyDownLista(e: React.KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        cerrar();
        break;
      case "ArrowDown":
        e.preventDefault();
        setIndiceActivo((i) => Math.min(i + 1, opciones.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setIndiceActivo((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setIndiceActivo(0);
        break;
      case "End":
        e.preventDefault();
        setIndiceActivo(opciones.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        seleccionar(opciones[indiceActivo]);
        break;
      case "Tab":
        cerrar(false);
        break;
    }
  }

  return (
    <div ref={raizRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listboxId}
        onClick={() => (abierto ? cerrar() : abrir())}
        className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm font-medium text-text transition-colors duration-150 hover:bg-surface-offset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="truncate">
          {seleccionada.label}
          <span className="ml-2 text-xs text-text-muted">
            {seleccionada.count}{" "}
            {seleccionada.count === 1 ? "prenda" : "prendas"}
          </span>
        </span>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={[
            "shrink-0 text-text-muted transition-transform duration-200 ease-out",
            abierto ? "rotate-180" : "",
          ].join(" ")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <ul
          ref={listaRef}
          id={listboxId}
          role="listbox"
          aria-label="Filtrar por categoría"
          aria-activedescendant={`${listboxId}-${indiceActivo}`}
          tabIndex={-1}
          onKeyDown={onKeyDownLista}
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 origin-top overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg focus-visible:outline-none motion-safe:animate-[scaleIn_180ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          {opciones.map((opcion, i) => {
            const activa = i === indiceActivo;
            const elegida = opcion.value === valor;
            return (
              <li
                key={opcion.value}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={elegida}
                onPointerMove={() => setIndiceActivo(i)}
                onClick={() => seleccionar(opcion)}
                className={[
                  "flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                  activa ? "bg-surface-2" : "",
                  elegida ? "font-semibold text-primary" : "text-text",
                ].join(" ")}
              >
                <span className="truncate">{opcion.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{opcion.count}</span>
                  {elegida && (
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

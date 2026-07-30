// Banner que aparece arriba del armario justo despues de subir una prenda.
// Lee `?uploaded=1` desde el server (el padre lo pasa implicito al
// renderizarnos).
//
// Tres variantes, segun `?fotoAviso`:
//   - sin el param: exito. Verde, se auto-oculta despues de 4s.
//   - `parcial`: hacia falta reconstruir la foto (habia una persona o un
//     gancho) pero solo se pudo quitar el fondo, asi que la mano/el gancho
//     siguen ahi. La prenda es usable.
//   - `falla`: no se pudo limpiar nada, quedo la foto original.
//
// Las dos variantes de aviso NO se auto-ocultan: hay que cerrarlas a mano.
// Es informacion accionable (el usuario puede reintentar con "Mejora esta
// foto" desde la prenda), y un aviso que se va solo en 4s es lo mismo que no
// avisar.
//
// Vive como Client Component porque maneja un timer y mutamos la URL para
// quitar los query params (router.replace) y que no se queden pegados al
// refrescar.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type PhotoWarning = "parcial" | "falla";

export default function UploadSuccessBanner({
  photoWarning,
}: {
  photoWarning?: PhotoWarning;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (photoWarning) return; // los avisos se cierran a mano
    const timeout = setTimeout(() => {
      setVisible(false);
      // Quita el ?uploaded=1 sin recargar para que un refresh manual no
      // vuelva a disparar el banner.
      router.replace("/wardrobe");
    }, 4000);
    return () => clearTimeout(timeout);
  }, [router, photoWarning]);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    router.replace("/wardrobe");
  }

  if (photoWarning) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-light px-4 py-3 text-sm font-medium text-warning"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <span className="flex-1">
          {photoWarning === "parcial" ? (
            <>
              Guardamos tu prenda y le quitamos el fondo, pero no pudimos
              aislarla del todo — si en la foto había una mano o un gancho,
              siguen ahí.
            </>
          ) : (
            <>
              Guardamos tu prenda, pero no pudimos limpiarle el fondo — quedó
              con la foto original.
            </>
          )}{" "}
          Puedes reintentarlo con{" "}
          <strong className="font-semibold">Mejora esta foto</strong> en la
          prenda.
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded px-1 text-warning transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-center gap-3 rounded-lg border border-success/30 bg-success-light px-4 py-3 text-sm font-medium text-success"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
      <span>¡Prenda agregada a tu armario!</span>
    </div>
  );
}

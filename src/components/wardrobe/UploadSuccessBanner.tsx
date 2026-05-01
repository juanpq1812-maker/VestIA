// Banner verde de exito que aparece arriba del armario justo despues de
// subir una prenda. Lee `?uploaded=1` desde el server (el padre lo pasa
// implicito al renderizarnos) y se auto-oculta despues de 4s.
//
// Vive como Client Component porque maneja un timer y mutamos la URL para
// quitar el query param (router.replace) y que no se quede pegado al refrescar.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadSuccessBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisible(false);
      // Quita el ?uploaded=1 sin recargar para que un refresh manual no
      // vuelva a disparar el banner.
      router.replace("/wardrobe");
    }, 4000);
    return () => clearTimeout(timeout);
  }, [router]);

  if (!visible) return null;

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

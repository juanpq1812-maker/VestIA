// Boton para cerrar sesion. Es un Client Component porque necesita ejecutar codigo
// en el navegador (llamar a `signOut` y luego navegar).

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function LogoutButton() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function handleLogout() {
    setCargando(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    // Tras cerrar sesion, mandamos al usuario a /login y refrescamos para que el Proxy
    // y los Server Components vean el cambio de estado.
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={cargando}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
    >
      {cargando ? "Saliendo…" : "Cerrar sesion"}
    </button>
  );
}

// Boton para cerrar sesion. Es un Client Component porque necesita ejecutar codigo
// en el navegador (llamar a `signOut` y luego navegar).

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import Button from "@/components/ui/Button";

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
    <Button
      variant="ghost"
      size="md"
      onClick={handleLogout}
      isLoading={cargando}
      loadingText="Saliendo…"
      className="!px-4 !py-3.5 text-xs sm:!py-2 sm:text-sm"
    >
      Cerrar sesion
    </Button>
  );
}

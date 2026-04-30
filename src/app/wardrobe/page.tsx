// Pagina del armario (/wardrobe). Es un Server Component, asi que podemos leer al
// usuario actual directamente del servidor de Supabase y pasarle su email a la vista.
//
// La proteccion principal de la ruta la hace el Proxy (`src/proxy.ts`): si no hay
// sesion, redirige a /login antes de llegar aqui. Aun asi, validamos el usuario aqui
// como buena practica (defensa en profundidad).

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function WardrobePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              En construccion
            </span>
            <h1 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Mi armario
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Aqui veras la galeria de prendas que has subido.
            </p>
            {user?.email && (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
                Sesion activa como{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {user.email}
                </span>
              </p>
            )}
          </div>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}

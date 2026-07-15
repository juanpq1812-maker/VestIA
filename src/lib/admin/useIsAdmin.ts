// Hook de cliente para saber si el usuario logueado es admin (profiles.is_admin).
// Se usa en Header/BottomNav para mostrar el acceso a /admin/quests solo a
// quien corresponda — is_admin es legible por el propio dueño de la fila
// (profiles_select_own, 0001_profiles.sql), así que no hace falta un
// endpoint aparte.

"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) setIsAdmin(data?.is_admin ?? false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}

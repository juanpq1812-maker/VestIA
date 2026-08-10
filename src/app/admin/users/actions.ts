// Server Actions de /admin/users — asignar/quitar premium a mano.
//
// Sin Wompi todavía, esta es la única forma de subir a alguien a premium:
// el trial de 7 días del piloto y cualquier cortesía pasan por acá.
//
// `plan`/`premium_until` NO tienen GRANT UPDATE a `authenticated` (ver
// 0034_user_plans.sql) — ni siquiera un admin puede tocarlas con su sesión
// normal, porque el GRANT es por rol de Postgres, no por fila. Por eso estas
// acciones usan `createSupabaseAdminClient()` (service_role) para el UPDATE,
// después de validar `is_admin` con el client normal — mismo criterio que
// el borrado de cuenta en /profile/privacy.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";

export type SetPlanResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false };

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { isAdmin: data?.is_admin ?? false };
}

export async function grantPremiumAction(
  userId: string,
  days: number
): Promise<SetPlanResult> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tienes acceso de administrador." };

  if (!Number.isFinite(days) || days <= 0) {
    return { ok: false, error: "El número de días debe ser mayor a 0." };
  }

  const premiumUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ plan: "premium", premium_until: premiumUntil })
    .eq("id", userId);

  if (error) return { ok: false, error: "No pudimos actualizar el plan." };

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokePremiumAction(userId: string): Promise<SetPlanResult> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tienes acceso de administrador." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ plan: "free", premium_until: null })
    .eq("id", userId);

  if (error) return { ok: false, error: "No pudimos actualizar el plan." };

  revalidatePath("/admin/users");
  return { ok: true };
}

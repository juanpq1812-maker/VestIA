// Server Actions de /admin/reports — resolver reportes de contenido
// inapropiado del feed de comunidad.
//
// La RLS de `community_share_reports` (0015_community_shares.sql) ya exige
// `is_admin` para select/update, pero validamos también acá (mismo criterio
// que /admin/quests/actions.ts): un error de RLS es un 403 feo a mitad de un
// form, mejor cortarlo antes con un mensaje claro.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export type ResolveReportResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, userId: null, isAdmin: false };

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, userId: user.id, isAdmin: data?.is_admin ?? false };
}

export async function resolveReportAction(
  reportId: string,
  decision: "dismiss" | "remove"
): Promise<ResolveReportResult> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin || !userId) return { ok: false, error: "No tenés acceso de administrador." };

  const { data: report, error: reportErr } = await supabase
    .from("community_share_reports")
    .select("id, share_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportErr || !report) {
    return { ok: false, error: "No encontramos ese reporte." };
  }

  if (decision === "remove") {
    // Borrar el share se lleva en cascada sus likes y demás reportes
    // pendientes sobre el mismo share.
    const { error: deleteErr } = await supabase
      .from("community_shares")
      .delete()
      .eq("id", report.share_id);
    if (deleteErr) return { ok: false, error: "No pudimos eliminar el outfit compartido." };
  } else {
    const { error: updateErr } = await supabase
      .from("community_share_reports")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
      })
      .eq("id", reportId);
    if (updateErr) return { ok: false, error: "No pudimos descartar el reporte." };
  }

  revalidatePath("/admin/reports");
  revalidatePath("/comunidad");
  return { ok: true };
}

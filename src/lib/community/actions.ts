// Server Actions de /comunidad: reclamar Fashion Quests + compartir outfits.
// Reclamar delega toda la verificacion (progreso real, anti-doble-cobro,
// puntos, Hebri) a complete_quest() — ver
// supabase/migrations/0014_complete_quest.sql.

"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { recordPetAction } from "@/lib/pet/actions";
import { hasSharedOutfitUse } from "./query";

export type CompleteQuestResult =
  | { ok: true; pointsAwarded: number; newTotalPoints: number; benefitUnlocked: boolean }
  | { ok: false; error: string };

export async function completeQuestAction(questId: string): Promise<CompleteQuestResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Sesión expirada." };
  }

  const { data, error } = await supabase
    .rpc("complete_quest", { p_quest_id: questId })
    .single<{ points_awarded: number; new_total_points: number; benefit_unlocked: boolean }>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo reclamar el quest." };
  }

  revalidatePath("/comunidad");

  return {
    ok: true,
    pointsAwarded: data.points_awarded,
    newTotalPoints: data.new_total_points,
    benefitUnlocked: data.benefit_unlocked,
  };
}

// =============================================================================
// COMPARTIR OUTFITS CON LA COMUNIDAD
// =============================================================================
//
// El flujo real de subida de la FOTO ocurre en el cliente (mismo patrón que
// `UploadForm.tsx` para prendas: `createSupabaseBrowserClient()` sube
// directo a Storage). Esta acción solo recibe el `photo_path` ya subido y
// hace la inserción + validaciones — así el servidor nunca maneja el
// binario de la imagen.

export type ShareOutfitInput = {
  outfitId: string;
  outfitUseId: string;
  photoPath: string;
  caption?: string | null;
};

export type ShareOutfitResult =
  | { ok: true; shareId: string }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_OWNER" | "ALREADY_SHARED" | "UNKNOWN"; error: string };

export async function shareOutfitAction(
  input: ShareOutfitInput
): Promise<ShareOutfitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "UNAUTHENTICATED", error: "Inicia sesión para compartir." };
  }

  // Verificación explícita de propiedad — la RLS de community_shares ya lo
  // exige en el INSERT, pero así damos un mensaje claro antes.
  const { data: use, error: useErr } = await supabase
    .from("outfit_uses")
    .select("id, user_id, outfit_id")
    .eq("id", input.outfitUseId)
    .maybeSingle();

  if (useErr) {
    console.error("[shareOutfitAction] error verificando outfit_use", useErr);
    return { ok: false, code: "UNKNOWN", error: "No pudimos verificar el uso del outfit." };
  }
  if (!use || use.user_id !== user.id || use.outfit_id !== input.outfitId) {
    return { ok: false, code: "NOT_OWNER", error: "Ese uso de outfit no te pertenece." };
  }

  if (await hasSharedOutfitUse(supabase, input.outfitUseId)) {
    return { ok: false, code: "ALREADY_SHARED", error: "Ya compartiste este look con la comunidad." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("community_shares")
    .insert({
      user_id: user.id,
      outfit_id: input.outfitId,
      outfit_use_id: input.outfitUseId,
      author_display_name: profile?.display_name ?? null,
      photo_path: input.photoPath,
      caption: input.caption?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    const code = (error as { code?: string })?.code;
    if (code === "23505") {
      return { ok: false, code: "ALREADY_SHARED", error: "Ya compartiste este look con la comunidad." };
    }
    console.error("[shareOutfitAction] insert falló", error);
    return { ok: false, code: "UNKNOWN", error: "No pudimos compartir el look. Intenta de nuevo." };
  }

  after(() => recordPetAction("outfit_shared").catch(() => {}));
  revalidatePath("/comunidad");

  return { ok: true, shareId: data.id };
}

export type ToggleLikeResult =
  | { ok: true; liked: boolean; newLikeCount: number }
  | { ok: false; error: string };

export async function toggleCommunityLikeAction(shareId: string): Promise<ToggleLikeResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sesión expirada." };

  const { data, error } = await supabase
    .rpc("toggle_community_like", { p_share_id: shareId })
    .single<{ liked: boolean; new_like_count: number }>();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No pudimos registrar el like." };
  }

  revalidatePath("/comunidad");

  return { ok: true, liked: data.liked, newLikeCount: data.new_like_count };
}

export type ToggleFollowResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

export async function toggleFollowAction(authorId: string): Promise<ToggleFollowResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sesión expirada." };
  if (authorId === user.id) return { ok: false, error: "No podés seguirte a vos mismo." };

  const { data: existing } = await supabase
    .from("community_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("followed_id", authorId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("community_follows").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "No pudimos dejar de seguir a esta persona." };
    revalidatePath("/comunidad");
    return { ok: true, following: false };
  }

  const { error } = await supabase
    .from("community_follows")
    .insert({ follower_id: user.id, followed_id: authorId });

  if (error) return { ok: false, error: "No pudimos seguir a esta persona." };

  after(() => recordPetAction("user_followed").catch(() => {}));
  revalidatePath("/comunidad");
  return { ok: true, following: true };
}

export type ReportShareResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reportShareAction(
  shareId: string,
  reason?: string
): Promise<ReportShareResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Sesión expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("community_share_reports").insert({
    share_id: shareId,
    reporter_id: user.id,
    reporter_display_name: profile?.display_name ?? null,
    reason: reason?.trim() || null,
  });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { ok: false, error: "Ya reportaste este contenido." };
    }
    console.error("[reportShareAction] insert falló", error);
    return { ok: false, error: "No pudimos enviar el reporte. Intenta de nuevo." };
  }

  return { ok: true };
}

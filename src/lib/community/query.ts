// Lecturas de Fashion Quests para /comunidad — Server Components. El
// progreso mostrado acá es solo para pintar la barra; la verificación real
// (la que de verdad importa) vive en complete_quest() (SECURITY DEFINER,
// supabase/migrations/0014_complete_quest.sql) y se repite ahí a propósito.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestType } from "./constants";
import { createCommunityShareSignedUrlMap } from "@/lib/storage/communityShares";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import type { CommunityShare } from "@/types/database";

export type Quest = {
  id: string;
  quest_type: QuestType;
  title: string;
  description: string;
  target_count: number;
  window_days: number;
  points_reward: number;
  brand_name: string | null;
  benefit_description: string | null;
  starts_at: string;
  ends_at: string;
  is_published: boolean;
  created_at: string;
};

export type QuestWithProgress = Quest & {
  progress: number;
  completed: boolean;
  benefitUnlocked: boolean;
};

export async function getActiveQuests(supabase: SupabaseClient): Promise<Quest[]> {
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("quests")
    .select(
      "id, quest_type, title, description, target_count, window_days, points_reward, brand_name, benefit_description, starts_at, ends_at, is_published, created_at"
    )
    .eq("is_published", true)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("created_at", { ascending: false });

  return (data ?? []) as Quest[];
}

async function computeProgress(
  supabase: SupabaseClient,
  userId: string,
  quest: Quest
): Promise<number> {
  const sinceIso = new Date(Date.now() - quest.window_days * 86400000).toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  switch (quest.quest_type) {
    case "generate_outfits": {
      const { count } = await supabase
        .from("outfits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", sinceIso);
      return count ?? 0;
    }
    case "use_outfits": {
      const { count } = await supabase
        .from("outfit_uses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("used_date", sinceDate);
      return count ?? 0;
    }
    case "upload_items": {
      const { count } = await supabase
        .from("clothing_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", CONFIRMED_STATUS)
        .gte("created_at", sinceIso);
      return count ?? 0;
    }
    case "active_days": {
      const { data } = await supabase
        .from("outfit_uses")
        .select("used_date")
        .eq("user_id", userId)
        .gte("used_date", sinceDate);
      const dias = new Set((data ?? []).map((u: { used_date: string }) => u.used_date));
      return dias.size;
    }
    case "rescue_forgotten_item": {
      // Mismo criterio que la funcion SQL: aproximamos client-side solo para
      // mostrar 0/1 en la barra. La verificacion real ocurre en el RPC.
      return 0;
    }
    default:
      return 0;
  }
}

export async function getQuestsWithProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<QuestWithProgress[]> {
  const quests = await getActiveQuests(supabase);
  if (quests.length === 0) return [];

  const { data: completions } = await supabase
    .from("user_quest_completions")
    .select("quest_id, benefit_unlocked")
    .eq("user_id", userId);

  const completedMap = new Map(
    (completions ?? []).map((c: { quest_id: string; benefit_unlocked: boolean }) => [
      c.quest_id,
      c.benefit_unlocked,
    ])
  );

  return Promise.all(
    quests.map(async (quest) => {
      const completed = completedMap.has(quest.id);
      const progress = completed
        ? quest.target_count
        : await computeProgress(supabase, userId, quest);
      return {
        ...quest,
        progress,
        completed,
        benefitUnlocked: completedMap.get(quest.id) ?? false,
      };
    })
  );
}

export async function getCommunityPoints(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("community_points")
    .eq("id", userId)
    .maybeSingle();
  return data?.community_points ?? 0;
}

export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return data?.is_admin ?? false;
}

// =============================================================================
// COMPARTIR OUTFITS CON LA COMUNIDAD (community_shares, migración 0015)
// =============================================================================

const FEED_PAGE_SIZE = 24; // sin paginación en v1 — feed simple, más reciente primero.

export type CommunityShareFeedItem = CommunityShare & {
  photoUrl: string | null; // null si la firma falló -> la card muestra placeholder
  likedByMe: boolean;
  isFollowingAuthor: boolean;
  isOwnShare: boolean;
};

/**
 * ¿Ya existe un share para este uso de outfit? Se usa para no ofrecer
 * compartir dos veces el mismo `outfit_use` (hay un unique en la tabla, esto
 * solo evita mostrar el prompt de nuevo en la UI).
 */
export async function hasSharedOutfitUse(
  supabase: SupabaseClient,
  outfitUseId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("community_shares")
    .select("id")
    .eq("outfit_use_id", outfitUseId)
    .maybeSingle();
  return Boolean(data);
}

export async function getCommunityFeed(
  supabase: SupabaseClient,
  currentUserId: string
): Promise<CommunityShareFeedItem[]> {
  const { data: sharesData } = await supabase
    .from("community_shares")
    .select(
      "id, user_id, outfit_id, outfit_use_id, author_display_name, photo_path, caption, like_count, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  const shares = (sharesData ?? []) as CommunityShare[];
  if (shares.length === 0) return [];

  const shareIds = shares.map((s) => s.id);
  const authorIds = Array.from(new Set(shares.map((s) => s.user_id)));

  const [{ data: likesData }, { data: followsData }, photoUrlMap] = await Promise.all([
    supabase
      .from("community_likes")
      .select("share_id")
      .eq("user_id", currentUserId)
      .in("share_id", shareIds),
    supabase
      .from("community_follows")
      .select("followed_id")
      .eq("follower_id", currentUserId)
      .in("followed_id", authorIds),
    createCommunityShareSignedUrlMap(
      supabase,
      shares.map((s) => s.photo_path)
    ),
  ]);

  const likedShareIds = new Set((likesData ?? []).map((l: { share_id: string }) => l.share_id));
  const followedAuthorIds = new Set(
    (followsData ?? []).map((f: { followed_id: string }) => f.followed_id)
  );

  return shares.map((share) => ({
    ...share,
    photoUrl: photoUrlMap.get(share.photo_path) ?? null,
    likedByMe: likedShareIds.has(share.id),
    isFollowingAuthor: followedAuthorIds.has(share.user_id),
    isOwnShare: share.user_id === currentUserId,
  }));
}

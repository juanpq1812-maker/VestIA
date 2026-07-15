// Server Actions de /admin/quests — CRUD del catálogo de Fashion Quests.
//
// La RLS de `quests` (0013_community_quests.sql) ya exige `is_admin` para
// insert/update/delete, pero validamos también acá (cinturón y tirantes,
// mismo criterio que el resto del proyecto): un error de RLS es un 403 feo
// a mitad de un form, mejor cortarlo antes con un mensaje claro.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import type { QuestType } from "@/lib/community/constants";

const QUEST_TYPES: QuestType[] = [
  "generate_outfits",
  "use_outfits",
  "upload_items",
  "active_days",
  "rescue_forgotten_item",
];

export type QuestFormResult = { ok: true } | { ok: false; error: string };

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

export type QuestInput = {
  questType: string;
  title: string;
  description: string;
  targetCount: number;
  windowDays: number;
  pointsReward: number;
  brandName: string;
  benefitDescription: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
};

function validate(input: QuestInput): string | null {
  if (!QUEST_TYPES.includes(input.questType as QuestType)) return "Tipo de quest inválido.";
  if (!input.title.trim()) return "El título es obligatorio.";
  if (!input.description.trim()) return "La descripción es obligatoria.";
  if (!Number.isFinite(input.targetCount) || input.targetCount <= 0) {
    return "La meta debe ser un número mayor a 0.";
  }
  if (!Number.isFinite(input.windowDays) || input.windowDays <= 0) {
    return "La ventana de días debe ser mayor a 0.";
  }
  if (!Number.isFinite(input.pointsReward) || input.pointsReward <= 0) {
    return "Los puntos deben ser mayores a 0.";
  }
  if (!input.startsAt || !input.endsAt) return "Definí fecha de inicio y fin.";
  if (new Date(input.endsAt) <= new Date(input.startsAt)) {
    return "La fecha de fin debe ser posterior a la de inicio.";
  }
  return null;
}

export async function createQuestAction(input: QuestInput): Promise<QuestFormResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tenés acceso de administrador." };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const { error } = await supabase.from("quests").insert({
    quest_type: input.questType,
    title: input.title.trim(),
    description: input.description.trim(),
    target_count: input.targetCount,
    window_days: input.windowDays,
    points_reward: input.pointsReward,
    brand_name: input.brandName.trim() || null,
    benefit_description: input.benefitDescription.trim() || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    is_published: input.isPublished,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/quests");
  revalidatePath("/comunidad");
  redirect("/admin/quests");
}

export async function updateQuestAction(
  questId: string,
  input: QuestInput
): Promise<QuestFormResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tenés acceso de administrador." };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const { error } = await supabase
    .from("quests")
    .update({
      quest_type: input.questType,
      title: input.title.trim(),
      description: input.description.trim(),
      target_count: input.targetCount,
      window_days: input.windowDays,
      points_reward: input.pointsReward,
      brand_name: input.brandName.trim() || null,
      benefit_description: input.benefitDescription.trim() || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      is_published: input.isPublished,
    })
    .eq("id", questId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/quests");
  revalidatePath("/comunidad");
  redirect("/admin/quests");
}

export async function toggleQuestPublishedAction(
  questId: string,
  nextPublished: boolean
): Promise<QuestFormResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tenés acceso de administrador." };

  const { error } = await supabase
    .from("quests")
    .update({ is_published: nextPublished })
    .eq("id", questId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/quests");
  revalidatePath("/comunidad");
  return { ok: true };
}

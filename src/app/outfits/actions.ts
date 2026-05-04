// Server Actions de /outfits.
//
// Exponemos dos acciones a los Client Components:
//   - generateOutfitsAction: corre la IA (OpenRouter) y devuelve los outfits hidratados.
//   - saveOutfitAction: inserta el outfit elegido en la tabla `outfits`.
//
// Ambas validan la sesion y traducen los errores conocidos a mensajes en
// espanol que la UI puede mostrar tal cual.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  generateOutfits,
  GenerateOutfitsError,
  type GeneratedOutfit,
  type GenerateMode,
} from "@/lib/ai/generateOutfits";

export type GenerateActionInput = {
  mode: GenerateMode;
  occasion?: string;
  description?: string;
};

export type GenerateActionResult =
  | { ok: true; outfits: GeneratedOutfit[] }
  | { ok: false; error: string; code: string };

export async function generateOutfitsAction(
  input: GenerateActionInput
): Promise<GenerateActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      error: "Inicia sesion para generar outfits.",
    };
  }

  try {
    const outfits = await generateOutfits({
      userId: user.id,
      mode: input.mode,
      occasion: input.occasion,
      description: input.description,
    });
    return { ok: true, outfits };
  } catch (err) {
    if (err instanceof GenerateOutfitsError) {
      return { ok: false, code: err.code, error: err.message };
    }
    console.error("[generateOutfitsAction] error inesperado", err);
    return {
      ok: false,
      code: "UNKNOWN",
      error:
        "Algo salio mal generando el outfit. Intenta de nuevo en unos segundos.",
    };
  }
}

export type SaveOutfitInput = {
  name: string;
  occasion: string | null;
  notes: string | null;
  clothing_item_ids: string[];
};

export type SaveOutfitResult =
  | { ok: true; outfitId: string }
  | { ok: false; error: string };

export async function saveOutfitAction(
  input: SaveOutfitInput
): Promise<SaveOutfitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Inicia sesion para guardar outfits." };
  }

  if (!Array.isArray(input.clothing_item_ids) || input.clothing_item_ids.length < 2) {
    return {
      ok: false,
      error: "El outfit debe tener al menos 2 prendas.",
    };
  }

  // Verificamos que todos los IDs pertenecen al usuario (RLS lo hace tambien,
  // pero un check explicito da un error mas claro).
  const { data: ownedItems, error: ownedErr } = await supabase
    .from("clothing_items")
    .select("id")
    .eq("user_id", user.id)
    .in("id", input.clothing_item_ids);

  if (ownedErr) {
    console.error("[saveOutfitAction] error verificando prendas", ownedErr);
    return { ok: false, error: "No pudimos verificar tus prendas. Intenta de nuevo." };
  }
  if (!ownedItems || ownedItems.length !== input.clothing_item_ids.length) {
    return {
      ok: false,
      error: "Alguna de las prendas ya no existe en tu armario.",
    };
  }

  const { data, error } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      name: input.name.slice(0, 80),
      occasion: input.occasion,
      clothing_item_ids: input.clothing_item_ids,
      ai_generated: true,
      notes: input.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[saveOutfitAction] insert fallo", error);
    return {
      ok: false,
      error: "No pudimos guardar el outfit. Intenta de nuevo.",
    };
  }

  // /outfits/saved depende de esta tabla, asi que invalidamos su cache.
  revalidatePath("/outfits/saved");

  return { ok: true, outfitId: data.id };
}

export type DeleteOutfitResult = { ok: true } | { ok: false; error: string };

export async function deleteOutfitAction(
  outfitId: string
): Promise<DeleteOutfitResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "No autenticado." };

  const { error } = await supabase
    .from("outfits")
    .delete()
    .eq("id", outfitId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[deleteOutfitAction] error", error);
    return { ok: false, error: "No pudimos eliminar el outfit." };
  }

  revalidatePath("/outfits/saved");
  return { ok: true };
}

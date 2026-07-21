// Server Action: datos para armar la "story card" 9:16 de un share de
// comunidad (foto real del dueño + PNGs de las prendas del outfit + marca),
// exportada client-side con canvas (ver ShareStoryCardButton.tsx).
//
// GATE DE PROPIEDAD: la story card contiene la foto real (cara) del dueño
// del share. Esta acción SOLO sirve datos si el solicitante es el dueño del
// share — no confiamos en que la UI oculte el botón (un usuario podría
// llamar la acción directo con el id de otro). La UI aplica el mismo gate
// como primera capa (ver CommunityShareCard.tsx), pero la barrera real es
// esta verificación de servidor.

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createCommunityShareSignedUrlMap } from "@/lib/storage/communityShares";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import type { ClothingItem, ClothingCategory } from "@/types/database";

// Máximo de prendas mostradas como "stickers" — más de esto satura la card.
const MAX_STICKERS = 4;

export type ShareStoryCardItem = {
  id: string;
  category: ClothingCategory;
  name: string | null;
  imageUrl: string;
};

export type ShareStoryCardData = {
  photoUrl: string;
  outfitName: string | null;
  caption: string | null;
  items: ShareStoryCardItem[];
};

export type GetShareStoryCardDataResult =
  | { ok: true; data: ShareStoryCardData }
  | { ok: false; code: "UNAUTHENTICATED" | "NOT_FOUND" | "NOT_OWNER" | "PHOTO_UNAVAILABLE" | "UNKNOWN"; error: string };

export async function getShareStoryCardDataAction(
  shareId: string
): Promise<GetShareStoryCardDataResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "UNAUTHENTICATED", error: "Inicia sesión para compartir." };
  }

  const { data: share, error: shareErr } = await supabase
    .from("community_shares")
    .select("id, user_id, outfit_id, photo_path, caption")
    .eq("id", shareId)
    .maybeSingle();

  if (shareErr || !share) {
    return { ok: false, code: "NOT_FOUND", error: "No encontramos ese look." };
  }

  // Barrera real: nadie puede generar la story card de un share ajeno, ni
  // siquiera llamando la acción directamente con el id de otro usuario.
  if (share.user_id !== user.id) {
    return { ok: false, code: "NOT_OWNER", error: "Solo puedes exportar tus propios looks." };
  }

  const { data: outfit } = await supabase
    .from("outfits")
    .select("id, name, clothing_item_ids")
    .eq("id", share.outfit_id)
    .maybeSingle();

  const photoUrlMap = await createCommunityShareSignedUrlMap(supabase, [share.photo_path]);
  const photoUrl = photoUrlMap.get(share.photo_path) ?? null;

  if (!photoUrl) {
    return { ok: false, code: "PHOTO_UNAVAILABLE", error: "No pudimos cargar la foto de este look." };
  }

  let items: ShareStoryCardItem[] = [];
  const itemIds = outfit?.clothing_item_ids ?? [];
  if (itemIds.length > 0) {
    const { data: itemsRaw } = await supabase
      .from("clothing_items")
      .select("id, user_id, category, name, image_path, status, background_removed")
      .eq("status", CONFIRMED_STATUS)
      .eq("background_removed", true)
      .in("id", itemIds);

    const clothingItems = (itemsRaw ?? []) as Pick<
      ClothingItem,
      "id" | "user_id" | "category" | "name" | "image_path" | "status" | "background_removed"
    >[];

    // Solo con PNG transparente disponible — un sticker con fondo original
    // se vería mal flotando sobre la foto. Las que no califiquen se omiten
    // en vez de romper la card (fallback pedido en el spec).
    const withPath = clothingItems.filter((it): it is typeof it & { image_path: string } =>
      Boolean(it.image_path)
    );
    const signed = await createSignedUrlMap(
      supabase,
      withPath.map((it) => it.image_path)
    );

    items = withPath
      .map((it) => {
        const imageUrl = signed.get(it.image_path);
        if (!imageUrl) return null;
        return { id: it.id, category: it.category, name: it.name, imageUrl };
      })
      .filter((it): it is ShareStoryCardItem => it !== null)
      .slice(0, MAX_STICKERS);
  }

  return {
    ok: true,
    data: {
      photoUrl,
      outfitName: outfit?.name ?? null,
      caption: share.caption,
      items,
    },
  };
}

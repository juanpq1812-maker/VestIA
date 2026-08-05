// Página de edición de prenda (/wardrobe/[id]/edit).
//
// Server Component: resuelve la prenda y pasa los datos al formulario cliente.
// Se usa principalmente desde el banner de "prendas sin categorizar" (bulk upload).

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import EditItemForm from "@/components/wardrobe/EditItemForm";
import { createSignedUrlMap } from "@/lib/storage/clothingImages";
import { CONFIRMED_STATUS } from "@/lib/wardrobe/constants";
import type { ClothingItem } from "@/types/database";

// Ver nota de maxDuration en /wardrobe/upload/page.tsx — EditItemForm llama
// al mismo pipeline de remoción de fondo vía "Mejora esta foto".
// Los tres sitios tienen que moverse juntos: comparten el mismo pipeline.
export const maxDuration = 120;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditItemPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: itemData } = await supabase
    .from("clothing_items")
    .select(
      "id, user_id, category, subcategory, name, primary_color, secondary_colors, occasions, image_path, source, background_removed, created_at, updated_at"
    )
    .eq("id", id)
    .eq("user_id", user.id) // Seguridad extra: solo el dueño puede editar
    .eq("status", CONFIRMED_STATUS) // esta pantalla es solo para prendas ya confirmadas
    .maybeSingle();

  if (!itemData) notFound();

  const item = itemData as ClothingItem;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  // Firmar URL para el preview
  const signedUrls = item.image_path
    ? await createSignedUrlMap(supabase, [item.image_path])
    : new Map<string, string>();
  const imageUrl = item.image_path
    ? signedUrls.get(item.image_path) ?? null
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} displayName={profile?.display_name} />

      <main className="flex-1 pb-24 pt-10 sm:pb-14 sm:pt-14">
        <Container size="md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-text-muted">Armario digital</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-text sm:text-4xl">
                Editar prenda
              </h1>
              <p className="mt-2 max-w-xl text-base text-text-muted">
                Completa los datos para que la IA pueda combinarla mejor en
                tus outfits.
              </p>
            </div>
            <Link href="/wardrobe">
              <Button variant="ghost">Volver al armario</Button>
            </Link>
          </div>

          <div className="mt-8">
            <EditItemForm item={item} imageUrl={imageUrl} />
          </div>
        </Container>
      </main>
    </div>
  );
}

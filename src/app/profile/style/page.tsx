// /profile/style — editar el estilo preferido (Configuración del perfil).
//
// Server Component: lee `user_preferences` del usuario y se lo pasa al
// formulario cliente. Si el usuario nunca completó el onboarding (no debería
// pasar por el gate, pero por si acaso) el formulario arranca vacío.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import StylePreferencesForm from "@/components/profile/StylePreferencesForm";

export const metadata = {
  title: "Estilo preferido — StrandIA",
};

export default async function StylePreferencesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select(
        "style_tags, favorite_occasions, top_size, bottom_size, shoe_size, chest_cm, waist_cm, hip_cm"
      )
      .eq("user_id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("gender")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user?.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver al perfil
          </Link>

          <h1 className="mt-4 font-display text-3xl font-bold text-text sm:text-4xl">
            Estilo preferido
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Edita lo que nos contaste en el onboarding. Estos datos guían los
            outfits que la IA genera para ti.
          </p>

          <StylePreferencesForm
            initial={{
              gender: profile?.gender ?? null,
              styleTags: prefs?.style_tags ?? [],
              favoriteOccasions: prefs?.favorite_occasions ?? [],
              topSize: prefs?.top_size ?? null,
              bottomSize: prefs?.bottom_size ?? null,
              shoeSize: prefs?.shoe_size ?? null,
              chestCm: prefs?.chest_cm ?? null,
              waistCm: prefs?.waist_cm ?? null,
              hipCm: prefs?.hip_cm ?? null,
            }}
          />
        </Container>
      </main>
    </div>
  );
}

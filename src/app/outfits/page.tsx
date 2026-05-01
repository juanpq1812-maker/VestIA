import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import PaginaStub from "@/components/ui/PaginaStub";

export default async function OutfitsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <PaginaStub
      titulo="Outfits con IA"
      descripcion="Aqui se generaran outfits combinando tu armario con la API de Anthropic, ajustados al clima, la ocasion y tu estilo."
      userEmail={user?.email}
      displayName={profile?.display_name}
    />
  );
}

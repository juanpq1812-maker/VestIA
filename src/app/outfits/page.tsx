import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import PaginaStub from "@/components/ui/PaginaStub";

export default async function OutfitsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PaginaStub
      titulo="Outfits con IA"
      descripcion="Aqui se generaran outfits combinando tu armario con la API de Anthropic, ajustados al clima, la ocasion y tu estilo."
      userEmail={user?.email}
    />
  );
}

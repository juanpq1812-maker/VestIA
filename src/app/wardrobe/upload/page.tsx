import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import PaginaStub from "@/components/ui/PaginaStub";

export default async function UploadPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PaginaStub
      titulo="Subir prenda"
      descripcion="Aqui podras subir una foto de una prenda y catalogarla en tu armario digital con Supabase Storage."
      userEmail={user?.email}
    />
  );
}

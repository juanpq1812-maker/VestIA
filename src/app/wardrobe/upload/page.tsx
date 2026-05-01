// Placeholder de "Subir prenda" (/wardrobe/upload).
//
// La implementacion real (foto + Storage + insert en clothing_items) llega en
// la Capa 3. Por ahora dejamos la pantalla con el shell de la app y un mensaje
// "en construccion".

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import PaginaStub from "@/components/ui/PaginaStub";
import Button from "@/components/ui/Button";

export default async function UploadPage() {
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
      titulo="Subir prenda"
      descripcion="Proximamente: vas a poder tomar o cargar una foto, elegir categoria, color y ocasion, y la prenda quedara en tu armario digital. La conexion con Supabase Storage llega en la siguiente capa."
      userEmail={user?.email}
      displayName={profile?.display_name}
      acciones={
        <Link href="/wardrobe">
          <Button variant="secondary">Volver al armario</Button>
        </Link>
      }
    />
  );
}

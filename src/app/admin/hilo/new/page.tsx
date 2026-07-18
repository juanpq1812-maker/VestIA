import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import EditorialPostForm from "@/components/admin/EditorialPostForm";

export const metadata = {
  title: "Crear post — El Hilo — Admin — StrandIA",
};

export default async function NewEditorialPostPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />
      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Crear post
          </h1>
          <EditorialPostForm
            initial={{
              title: "",
              subtitle: "",
              category: "columna",
              brandName: "",
              brandUrl: "",
              authorName: "Equipo StrandIA",
              coverImagePath: "",
              content: [],
              status: "draft",
            }}
          />
        </Container>
      </main>
    </div>
  );
}

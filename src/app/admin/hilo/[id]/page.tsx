import { redirect, notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import EditorialPostForm from "@/components/admin/EditorialPostForm";
import { parseEditorialBlocks } from "@/lib/editorial/blocks";
import type { EditorialCategory, EditorialStatus } from "@/lib/editorial/types";

export const metadata = {
  title: "Editar post — El Hilo — Admin — StrandIA",
};

export default async function EditEditorialPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: post } = await supabase
    .from("editorial_posts")
    .select(
      "id, title, subtitle, category, brand_name, brand_url, author_name, cover_image_path, content, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />
      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <h1 className="font-display text-3xl font-bold text-text sm:text-4xl">
            Editar post
          </h1>
          <EditorialPostForm
            initial={{
              id: post.id,
              title: post.title,
              subtitle: post.subtitle ?? "",
              category: post.category as EditorialCategory,
              brandName: post.brand_name ?? "",
              brandUrl: post.brand_url ?? "",
              authorName: post.author_name,
              coverImagePath: post.cover_image_path,
              content: parseEditorialBlocks(post.content),
              status: post.status as EditorialStatus,
            }}
          />
        </Container>
      </main>
    </div>
  );
}

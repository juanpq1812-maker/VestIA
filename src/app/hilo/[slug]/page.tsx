// /hilo/[slug] — artículo completo de "El Hilo". SEO básico con metadata
// dinámica (og:image apunta a la portada pública en Storage, sin firma).

import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/ui/Container";
import EditorialPostBody from "@/components/editorial/EditorialPostBody";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { getPublishedPostBySlug } from "@/lib/editorial/query";
import { publicEditorialImageUrl } from "@/lib/storage/editorialImages";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const post = await getPublishedPostBySlug(supabase, slug);

  if (!post) return { title: "El Hilo — StrandIA" };

  const description = post.subtitle ?? `${post.title} — El Hilo, StrandIA.`;
  const imageUrl = publicEditorialImageUrl(post.cover_image_path);

  return {
    title: `${post.title} — El Hilo — StrandIA`,
    description,
    openGraph: {
      title: post.title,
      description,
      images: [{ url: imageUrl }],
    },
  };
}

export default async function EditorialPostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const post = await getPublishedPostBySlug(supabase, slug);
  if (!post) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <Header email={user.email} />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <Link
            href="/comunidad"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <span aria-hidden="true">←</span> Volver a Comunidad
          </Link>

          <EditorialPostBody
            title={post.title}
            subtitle={post.subtitle}
            authorName={post.author_name}
            category={post.category}
            brandName={post.brand_name}
            brandUrl={post.brand_url}
            coverImagePath={post.cover_image_path}
            publishedAt={post.published_at}
            blocks={post.content}
          />
        </Container>
      </main>
    </div>
  );
}

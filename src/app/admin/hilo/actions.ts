// Server Actions de /admin/hilo — CRUD de editorial_posts ("El Hilo").
//
// Mismo criterio que /admin/quests/actions.ts: la RLS (0022_editorial_posts.sql)
// ya exige `is_admin` para insert/update/delete, pero validamos también acá
// para cortar con un mensaje claro antes de que RLS devuelva un 403 feo a
// mitad de un form.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { validateEditorialBlocksStrict, type EditorialBlock } from "@/lib/editorial/blocks";
import { slugify, slugWithSuffix } from "@/lib/editorial/slug";
import type { EditorialCategory, EditorialStatus } from "@/lib/editorial/types";
import { EDITORIAL_IMAGES_BUCKET } from "@/lib/storage/editorialImages";

const CATEGORIES: EditorialCategory[] = ["columna", "drop", "tendencia"];

export type EditorialPostFormResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, userId: null, isAdmin: false };

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, userId: user.id, isAdmin: data?.is_admin ?? false };
}

export type EditorialPostInput = {
  title: string;
  subtitle: string;
  category: string;
  brandName: string;
  brandUrl: string;
  authorName: string;
  coverImagePath: string;
  content: EditorialBlock[];
  status: EditorialStatus;
};

function validate(input: EditorialPostInput): string | null {
  if (!input.title.trim()) return "El título es obligatorio.";
  if (!CATEGORIES.includes(input.category as EditorialCategory)) return "Categoría inválida.";
  if (!input.coverImagePath.trim()) return "La portada es obligatoria.";
  if (validateEditorialBlocksStrict(input.content) === null) {
    return "Hay un bloque de contenido inválido — revisa que ningún campo obligatorio esté vacío.";
  }
  return null;
}

export async function createEditorialPostAction(
  input: EditorialPostInput
): Promise<EditorialPostFormResult> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tienes acceso de administrador." };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const baseSlug = slugify(input.title) || "post";
  let slug = baseSlug;
  const { data: existing } = await supabase
    .from("editorial_posts")
    .select("id")
    .eq("slug", baseSlug)
    .maybeSingle();
  if (existing) {
    slug = slugWithSuffix(input.title, crypto.randomUUID().slice(0, 6));
  }

  const { error } = await supabase.from("editorial_posts").insert({
    title: input.title.trim(),
    subtitle: input.subtitle.trim() || null,
    slug,
    cover_image_path: input.coverImagePath.trim(),
    category: input.category,
    brand_name: input.brandName.trim() || null,
    brand_url: input.brandUrl.trim() || null,
    author_name: input.authorName.trim() || "Equipo StrandIA",
    content: input.content,
    status: input.status,
    published_at: input.status === "published" ? new Date().toISOString() : null,
    created_by: userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/hilo");
  revalidatePath("/comunidad");
  revalidatePath("/hilo");
  redirect("/admin/hilo");
}

export async function updateEditorialPostAction(
  postId: string,
  input: EditorialPostInput
): Promise<EditorialPostFormResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tienes acceso de administrador." };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const { data: current } = await supabase
    .from("editorial_posts")
    .select("status, published_at, slug")
    .eq("id", postId)
    .maybeSingle();

  if (!current) return { ok: false, error: "El post ya no existe." };

  // published_at es informativo: se setea la PRIMERA vez que pasa a
  // 'published' y se conserva en cualquier otro caso (incluida una
  // despublicación) — nunca participa en un filtro de visibilidad.
  const publishedAt =
    input.status === "published" && !current.published_at
      ? new Date().toISOString()
      : current.published_at;

  const { error } = await supabase
    .from("editorial_posts")
    .update({
      title: input.title.trim(),
      subtitle: input.subtitle.trim() || null,
      cover_image_path: input.coverImagePath.trim(),
      category: input.category,
      brand_name: input.brandName.trim() || null,
      brand_url: input.brandUrl.trim() || null,
      author_name: input.authorName.trim() || "Equipo StrandIA",
      content: input.content,
      status: input.status,
      published_at: publishedAt,
    })
    .eq("id", postId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/hilo");
  revalidatePath("/comunidad");
  revalidatePath("/hilo");
  revalidatePath(`/hilo/${current.slug}`);
  redirect("/admin/hilo");
}

export async function toggleEditorialPostStatusAction(
  postId: string,
  nextStatus: EditorialStatus
): Promise<EditorialPostFormResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tienes acceso de administrador." };

  const { data: current } = await supabase
    .from("editorial_posts")
    .select("published_at, slug")
    .eq("id", postId)
    .maybeSingle();

  if (!current) return { ok: false, error: "El post ya no existe." };

  const publishedAt =
    nextStatus === "published" && !current.published_at
      ? new Date().toISOString()
      : current.published_at;

  const { error } = await supabase
    .from("editorial_posts")
    .update({ status: nextStatus, published_at: publishedAt })
    .eq("id", postId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/hilo");
  revalidatePath("/comunidad");
  revalidatePath("/hilo");
  revalidatePath(`/hilo/${current.slug}`);
  return { ok: true };
}

export async function deleteEditorialPostAction(postId: string): Promise<EditorialPostFormResult> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { ok: false, error: "No tienes acceso de administrador." };

  const { data: post } = await supabase
    .from("editorial_posts")
    .select("cover_image_path, content, slug")
    .eq("id", postId)
    .maybeSingle();

  const { error } = await supabase.from("editorial_posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };

  // Best-effort: limpiar las imágenes del post en Storage. Si falla, no
  // bloqueamos el borrado de la fila — quedaría un archivo huérfano, que es
  // preferible a una fila fantasma que el admin no puede borrar.
  if (post) {
    const paths = [
      post.cover_image_path,
      ...validateBlocksImages(post.content),
    ].filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabase.storage.from(EDITORIAL_IMAGES_BUCKET).remove(paths);
    }
  }

  revalidatePath("/admin/hilo");
  revalidatePath("/comunidad");
  revalidatePath("/hilo");
  if (post?.slug) revalidatePath(`/hilo/${post.slug}`);
  return { ok: true };
}

function validateBlocksImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is { type: string; path?: string } => !!b && typeof b === "object")
    .filter((b) => b.type === "image" && typeof b.path === "string")
    .map((b) => b.path as string);
}

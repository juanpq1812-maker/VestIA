// Lecturas de editorial_posts ("El Hilo") para /comunidad, /hilo y
// /hilo/[slug]. RLS ya filtra a status='published' para cualquier usuario
// autenticado (0022_editorial_posts.sql) — acá solo ordenamos y tipamos.

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseEditorialBlocks } from "./blocks";
import type { EditorialCategory, EditorialPost } from "./types";

const LIST_COLUMNS =
  "id, title, subtitle, slug, cover_image_path, category, brand_name, brand_url, author_name, published_at";

export type EditorialPostListItem = Pick<
  EditorialPost,
  | "id"
  | "title"
  | "subtitle"
  | "slug"
  | "cover_image_path"
  | "category"
  | "brand_name"
  | "brand_url"
  | "author_name"
  | "published_at"
>;

export async function getLatestPublishedPosts(
  supabase: SupabaseClient,
  limit: number
): Promise<EditorialPostListItem[]> {
  const { data } = await supabase
    .from("editorial_posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as EditorialPostListItem[];
}

export async function getAllPublishedPosts(
  supabase: SupabaseClient,
  category?: EditorialCategory
): Promise<EditorialPostListItem[]> {
  let query = supabase
    .from("editorial_posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data } = await query;
  return (data ?? []) as EditorialPostListItem[];
}

export async function getPublishedPostBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<EditorialPost | null> {
  const { data } = await supabase
    .from("editorial_posts")
    .select(
      "id, created_at, updated_at, published_at, title, subtitle, slug, cover_image_path, category, brand_name, brand_url, author_name, content, status, created_by"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    content: parseEditorialBlocks(data.content),
  } as EditorialPost;
}

// Tipos de dominio de "El Hilo" (editorial_posts, migracion 0022).
//
// Igual que quests, esta tabla no esta registrada en el generic Database de
// src/types/database.ts — el cliente de Supabase del proyecto no usa ese
// generic (ver src/lib/supabase/serverClient.ts), asi que las queries se
// tipan a mano con `.select("...")` + cast, mismo patron que /admin/quests.

import type { EditorialBlock } from "./blocks";

export type EditorialCategory = "columna" | "drop" | "tendencia";

export const EDITORIAL_CATEGORY_LABEL: Record<EditorialCategory, string> = {
  columna: "Columna",
  drop: "Drop",
  tendencia: "Tendencia",
};

export type EditorialStatus = "draft" | "published";

export type EditorialPost = {
  id: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  title: string;
  subtitle: string | null;
  slug: string;
  cover_image_path: string;
  category: EditorialCategory;
  brand_name: string | null;
  brand_url: string | null;
  author_name: string;
  content: EditorialBlock[];
  status: EditorialStatus;
  created_by: string | null;
};

// Tipos de la base de datos de StrandIA.
//
// Estos tipos imitan el formato que genera `supabase gen types typescript`.
// Si en el futuro instalas la CLI de Supabase, puedes regenerarlos con:
//
//   npx supabase gen types typescript --project-id <PROJECT_REF> --schema public \
//     > src/types/database.ts
//
// Mientras tanto, los mantenemos a mano para evitar instalar la CLI en Codespaces.
// Si modificas el esquema (migrations/*.sql) actualiza tambien este archivo.

export type ClothingCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "footwear"
  | "accessory"
  | "body";

// Etiquetas que ofrecemos en el onboarding (tarjetas visuales multi-select).
// Orden = orden de aparicion en la UI (de mas a menos mainstream para el
// publico objetivo, 20-45 anos, segun investigacion de mercado 2026).
export type StyleTag =
  | "casual"
  | "streetwear"
  | "old money"
  | "elegante"
  | "formal"
  | "deportivo"
  | "minimalista"
  | "urbano"
  | "bohemio";

// Genero declarado en el onboarding — ver migracion 0017_profile_gender.sql.
export type Gender = "hombre" | "mujer" | "prefiero_no_decir";

export type OccasionTag =
  | "trabajo"
  | "universidad"
  | "gym"
  | "fiestas"
  | "casa"
  | "citas"
  | "eventos formales";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Tipos por tabla. Cada tabla tiene tres formas:
//   - Row:    lo que devuelve un SELECT.
//   - Insert: lo que envias en un INSERT (campos opcionales con default).
//   - Update: lo que envias en un UPDATE (todo opcional).
// ---------------------------------------------------------------------------

export type Profile = {
  id: string;
  display_name: string | null;
  /** Genero declarado en el onboarding. NULL = no declarado (cuentas viejas). */
  gender: Gender | null;
  onboarding_completed: boolean;
  /** Lista de espera: false = ve /waitlist. Se aprueba manualmente en Supabase. */
  approved: boolean;
  /** Llamadas a la IA realizadas en la ventana de rate limiting actual. */
  ai_uses: number;
  /** Inicio de la ventana de 1 hora. NULL = sin ventana activa. */
  ai_uses_window_start: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  display_name?: string | null;
  gender?: Gender | null;
  onboarding_completed?: boolean;
  approved?: boolean;
  ai_uses?: number;
  ai_uses_window_start?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<ProfileInsert>;

export type UserPreferences = {
  id: string;
  user_id: string;
  style_tags: string[];
  favorite_occasions: string[];
  top_size: string | null;
  bottom_size: string | null;
  shoe_size: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  created_at: string;
  updated_at: string;
};

export type UserPreferencesInsert = {
  id?: string;
  user_id: string;
  style_tags?: string[];
  favorite_occasions?: string[];
  top_size?: string | null;
  bottom_size?: string | null;
  shoe_size?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type UserPreferencesUpdate = Partial<UserPreferencesInsert>;

// Ciclo de vida del modo ráfaga (migración 0018). Solo 'confirmed' es parte
// real del armario del usuario — ver CONFIRMED_STATUS en lib/wardrobe/constants.
export type ClothingItemStatus =
  | "draft"
  | "processing"
  | "ready"
  | "error"
  | "confirmed";

// Origen de la foto (migración 0020). 'outfit_extraction' = recortada
// automáticamente de una foto de outfit completo — candidata a "mejorar foto".
export type ClothingItemSource = "individual" | "outfit_extraction";

// `ClothingItem` sigue representando una prenda confirmada — todo query que la
// use debe filtrar `status = 'confirmed'` (CONFIRMED_STATUS), donde `category`
// siempre está resuelta. Las filas en draft/processing/error/ready (con
// `category` todavía null) usan `BurstClothingItem` — ver lib/wardrobe/burstQueue.ts.
export type ClothingItem = {
  id: string;
  user_id: string;
  category: ClothingCategory;
  subcategory: string | null;
  name: string | null;
  primary_color: string | null;
  secondary_colors: string[];
  occasions: string[];
  image_url: string | null;
  image_path: string | null;
  status: ClothingItemStatus;
  raw_image_path: string | null;
  retry_count: number;
  error_message: string | null;
  source: ClothingItemSource;
  reconstructed: boolean;
  /** Motivo (auditoría) por el que Vision marcó la foto para reconstrucción con Gemini; null si no aplicaba. */
  reconstruction_reason: string | null;
  /** false = Gemini falló del todo y se guardó la foto original sin remover el fondo (reprocesable con "Mejora esta foto"). */
  background_removed: boolean;
  /** Valor crudo de `subcategoria` que devolvió Vision cuando NO matcheó contra SUBCATEGORIES. Auditoría — null si matcheó bien o no hubo análisis. */
  subcategory_ai_raw: string | null;
  created_at: string;
  updated_at: string;
};

// Fila cruda de `clothing_items` tal como puede existir mientras está en el
// pipeline del modo ráfaga (antes de confirmarse) — `category` puede ser null.
export type BurstClothingItem = Omit<ClothingItem, "category"> & {
  category: ClothingCategory | null;
};

export type ClothingItemInsert = {
  id?: string;
  user_id: string;
  category?: ClothingCategory | null;
  subcategory?: string | null;
  name?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[];
  occasions?: string[];
  image_url?: string | null;
  image_path?: string | null;
  status?: ClothingItemStatus;
  raw_image_path?: string | null;
  retry_count?: number;
  error_message?: string | null;
  source?: ClothingItemSource;
  reconstructed?: boolean;
  reconstruction_reason?: string | null;
  background_removed?: boolean;
  subcategory_ai_raw?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClothingItemUpdate = Partial<ClothingItemInsert>;

export type Outfit = {
  id: string;
  user_id: string;
  name: string | null;
  occasion: string | null;
  clothing_item_ids: string[];
  ai_generated: boolean;
  notes: string | null;
  created_at: string;
};

export type OutfitInsert = {
  id?: string;
  user_id: string;
  name?: string | null;
  occasion?: string | null;
  clothing_item_ids?: string[];
  ai_generated?: boolean;
  notes?: string | null;
  created_at?: string;
};

export type OutfitUpdate = Partial<OutfitInsert>;

export type OutfitUse = {
  id: string;
  user_id: string;
  outfit_id: string;
  used_date: string; // YYYY-MM-DD (date)
  created_at: string;
};

export type OutfitUseInsert = {
  id?: string;
  user_id: string;
  outfit_id: string;
  used_date: string;
  created_at?: string;
};

export type OutfitUseUpdate = Partial<OutfitUseInsert>;

// ── Comunidad: compartir outfits (migración 0015) ───────────────────────────

export type CommunityShare = {
  id: string;
  user_id: string;
  outfit_id: string;
  outfit_use_id: string;
  author_display_name: string | null;
  photo_path: string;
  caption: string | null;
  like_count: number;
  created_at: string;
};

export type CommunityShareInsert = {
  id?: string;
  user_id: string;
  outfit_id: string;
  outfit_use_id: string;
  author_display_name?: string | null;
  photo_path: string;
  caption?: string | null;
  like_count?: number;
  created_at?: string;
};

export type CommunityShareUpdate = Partial<CommunityShareInsert>;

export type CommunityLike = {
  id: string;
  user_id: string;
  share_id: string;
  created_at: string;
};

export type CommunityLikeInsert = {
  id?: string;
  user_id: string;
  share_id: string;
  created_at?: string;
};

export type CommunityFollow = {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
};

export type CommunityFollowInsert = {
  id?: string;
  follower_id: string;
  followed_id: string;
  created_at?: string;
};

export type CommunityShareReportStatus = "pending" | "dismissed" | "removed";

export type CommunityShareReport = {
  id: string;
  share_id: string;
  reporter_id: string;
  reporter_display_name: string | null;
  reason: string | null;
  status: CommunityShareReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export type CommunityShareReportInsert = {
  id?: string;
  share_id: string;
  reporter_id: string;
  reporter_display_name?: string | null;
  reason?: string | null;
  status?: CommunityShareReportStatus;
  created_at?: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

export type CommunityShareReportUpdate = Partial<CommunityShareReportInsert>;

// ── Calendario sincronizado por ICS (migración 0009) ────────────────────────

export type CalendarFeed = {
  id: string;
  user_id: string;
  url: string;
  provider: string | null; // 'google' | 'apple' | 'otro' (cosmético)
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
};

export type CalendarFeedInsert = {
  id?: string;
  user_id: string;
  url: string;
  provider?: string | null;
  last_synced_at?: string | null;
  sync_error?: string | null;
  created_at?: string;
};

export type CalendarEvent = {
  id: string;
  user_id: string;
  feed_id: string;
  external_uid: string;
  title: string;
  starts_at: string; // timestamptz ISO
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  created_at: string;
};

export type CalendarEventInsert = {
  id?: string;
  user_id: string;
  feed_id: string;
  external_uid: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  location?: string | null;
  created_at?: string;
};

export type EventOutfitSuggestion = {
  id: string;
  user_id: string;
  event_id: string;
  occasion_inferred: string;
  name: string;
  explanation: string;
  match_percentage: number | null;
  clothing_item_ids: string[];
  created_at: string;
};

export type EventOutfitSuggestionInsert = {
  id?: string;
  user_id: string;
  event_id: string;
  occasion_inferred: string;
  name: string;
  explanation: string;
  match_percentage?: number | null;
  clothing_item_ids: string[];
  created_at?: string;
};

// ---------------------------------------------------------------------------
// Tipo "Database" estilo Supabase, util si en algun momento creamos el cliente
// tipado con `createClient<Database>(...)`.
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: UserPreferencesInsert;
        Update: UserPreferencesUpdate;
      };
      clothing_items: {
        Row: ClothingItem;
        Insert: ClothingItemInsert;
        Update: ClothingItemUpdate;
      };
      outfits: {
        Row: Outfit;
        Insert: OutfitInsert;
        Update: OutfitUpdate;
      };
      outfit_uses: {
        Row: OutfitUse;
        Insert: OutfitUseInsert;
        Update: OutfitUseUpdate;
      };
      community_shares: {
        Row: CommunityShare;
        Insert: CommunityShareInsert;
        Update: CommunityShareUpdate;
      };
      community_likes: {
        Row: CommunityLike;
        Insert: CommunityLikeInsert;
        Update: Partial<CommunityLikeInsert>;
      };
      community_follows: {
        Row: CommunityFollow;
        Insert: CommunityFollowInsert;
        Update: Partial<CommunityFollowInsert>;
      };
      community_share_reports: {
        Row: CommunityShareReport;
        Insert: CommunityShareReportInsert;
        Update: CommunityShareReportUpdate;
      };
      calendar_feeds: {
        Row: CalendarFeed;
        Insert: CalendarFeedInsert;
        Update: Partial<CalendarFeedInsert>;
      };
      calendar_events: {
        Row: CalendarEvent;
        Insert: CalendarEventInsert;
        Update: Partial<CalendarEventInsert>;
      };
      event_outfit_suggestions: {
        Row: EventOutfitSuggestion;
        Insert: EventOutfitSuggestionInsert;
        Update: Partial<EventOutfitSuggestionInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ---------------------------------------------------------------------------
// Constantes que usamos en la UI (chips del onboarding y filtros del armario).
// Las exponemos aqui para que onboarding y wardrobe lean de la misma fuente.
// ---------------------------------------------------------------------------

export const STYLE_TAGS: readonly StyleTag[] = [
  "casual",
  "streetwear",
  "old money",
  "elegante",
  "formal",
  "deportivo",
  "minimalista",
  "urbano",
  "bohemio",
] as const;

// Slug de archivo por estilo (sin espacios/tildes), usado para armar el path
// de imagen de referencia.
const STYLE_TAG_SLUG: Record<StyleTag, string> = {
  casual: "casual",
  streetwear: "streetwear",
  "old money": "old-money",
  elegante: "elegante",
  formal: "formal",
  deportivo: "deportivo",
  minimalista: "minimalista",
  urbano: "urbano",
  bohemio: "bohemio",
};

/**
 * Path de la imagen de referencia de un estilo, segun el genero declarado por
 * el usuario — no tiene sentido mostrarle a una mujer una foto de un modelo
 * hombre (o viceversa). "prefiero_no_decir" (o sin declarar todavia, ej. en
 * el paso de Estilo del onboarding antes de que el usuario confirme) cae en
 * el set neutro.
 *
 * El usuario sube 27 archivos a `public/onboarding/estilos/`
 * (`{slug}-hombre.jpg`, `{slug}-mujer.jpg`, `{slug}-neutro.jpg`) — mientras
 * no existan, StyleCard cae a un placeholder de color (ver componente).
 */
export function getStyleTagImage(
  tag: StyleTag,
  gender: Gender | null | undefined
): string {
  const variant = gender === "hombre" || gender === "mujer" ? gender : "neutro";
  return `/onboarding/estilos/${STYLE_TAG_SLUG[tag]}-${variant}.jpg`;
}

export const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: "hombre", label: "Hombre" },
  { value: "mujer", label: "Mujer" },
  { value: "prefiero_no_decir", label: "Prefiero no decir" },
];

export const OCCASION_TAGS: readonly OccasionTag[] = [
  "trabajo",
  "universidad",
  "gym",
  "fiestas",
  "casa",
  "citas",
  "eventos formales",
] as const;

export const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const BOTTOM_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const CLOTHING_CATEGORIES: readonly {
  value: ClothingCategory;
  label: string;
}[] = [
  { value: "top", label: "Tops" },
  { value: "bottom", label: "Bottoms" },
  { value: "dress", label: "Vestidos" },
  { value: "outerwear", label: "Abrigos" },
  { value: "footwear", label: "Calzado" },
  { value: "accessory", label: "Accesorios" },
  { value: "body", label: "Body" },
] as const;

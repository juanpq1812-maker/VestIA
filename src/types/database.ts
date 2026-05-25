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

// Etiquetas que ofrecemos en el onboarding (chips multi-select).
export type StyleTag =
  | "casual"
  | "formal"
  | "deportivo"
  | "urbano"
  | "bohemio"
  | "elegante"
  | "minimalista"
  | "streetwear";

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
  onboarding_completed: boolean;
  /** Cuántas veces ha usado funciones IA. 0 = no ha usado; >= 1 = agotó el uso gratuito. */
  ai_uses: number;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  display_name?: string | null;
  onboarding_completed?: boolean;
  ai_uses?: number;
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
  created_at: string;
  updated_at: string;
};

export type ClothingItemInsert = {
  id?: string;
  user_id: string;
  category: ClothingCategory;
  subcategory?: string | null;
  name?: string | null;
  primary_color?: string | null;
  secondary_colors?: string[];
  occasions?: string[];
  image_url?: string | null;
  image_path?: string | null;
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
  "formal",
  "deportivo",
  "urbano",
  "bohemio",
  "elegante",
  "minimalista",
  "streetwear",
] as const;

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

-- =============================================================================
-- StrandIA — Migracion 0003: Tabla `clothing_items`
--
-- Cada prenda del armario. Las imagenes (`image_url`, `image_path`) quedan
-- preparadas para Capa 3 (Storage); por ahora se aceptan NULL.
-- =============================================================================

create table if not exists public.clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Categoria principal (mas adelante podemos convertirlo a un enum real).
  -- Valores esperados: top, bottom, dress, outerwear, footwear, accessory.
  category text not null,
  subcategory text,
  name text,

  -- Color principal en hex (#RRGGBB) o nombre legible.
  primary_color text,
  secondary_colors text[] not null default '{}',

  -- Ocasiones para las que sirve esta prenda (formal, casual, deportivo, etc.).
  occasions text[] not null default '{}',

  -- Storage: lo llenamos en Capa 3.
  image_url  text,
  image_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clothing_items_category_check check (
    category in ('top','bottom','dress','outerwear','footwear','accessory')
  )
);

create index if not exists clothing_items_user_id_idx
  on public.clothing_items (user_id);
create index if not exists clothing_items_user_category_idx
  on public.clothing_items (user_id, category);

drop trigger if exists clothing_items_set_updated_at on public.clothing_items;
create trigger clothing_items_set_updated_at
  before update on public.clothing_items
  for each row execute function public.set_updated_at();

-- ===== RLS =====
alter table public.clothing_items enable row level security;

drop policy if exists "clothing_items_select_own" on public.clothing_items;
create policy "clothing_items_select_own"
  on public.clothing_items for select
  using (auth.uid() = user_id);

drop policy if exists "clothing_items_insert_own" on public.clothing_items;
create policy "clothing_items_insert_own"
  on public.clothing_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "clothing_items_update_own" on public.clothing_items;
create policy "clothing_items_update_own"
  on public.clothing_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "clothing_items_delete_own" on public.clothing_items;
create policy "clothing_items_delete_own"
  on public.clothing_items for delete
  using (auth.uid() = user_id);

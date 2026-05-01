-- =============================================================================
-- VestIA — Migracion 0004: Tabla `outfits` (preparada para Capa 4)
--
-- Aun no se usa en la app, pero la creamos para que cuando lleguemos a la
-- generacion con IA solo tengamos que insertar filas.
-- =============================================================================

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  name text,
  occasion text,

  -- Lista de IDs de prendas. Lo dejamos como uuid[] (denormalizado) por
  -- simplicidad del MVP. Validamos en la app que las prendas sean del usuario.
  clothing_item_ids uuid[] not null default '{}',

  ai_generated boolean not null default true,
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists outfits_user_id_idx on public.outfits (user_id);

-- ===== RLS =====
alter table public.outfits enable row level security;

drop policy if exists "outfits_select_own" on public.outfits;
create policy "outfits_select_own"
  on public.outfits for select
  using (auth.uid() = user_id);

drop policy if exists "outfits_insert_own" on public.outfits;
create policy "outfits_insert_own"
  on public.outfits for insert
  with check (auth.uid() = user_id);

drop policy if exists "outfits_update_own" on public.outfits;
create policy "outfits_update_own"
  on public.outfits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "outfits_delete_own" on public.outfits;
create policy "outfits_delete_own"
  on public.outfits for delete
  using (auth.uid() = user_id);

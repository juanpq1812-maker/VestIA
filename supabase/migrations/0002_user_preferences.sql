-- =============================================================================
-- StrandIA — Migracion 0002: Tabla `user_preferences`
--
-- Guarda lo que el usuario llena en el onboarding: estilo, ocasiones favoritas,
-- tallas y medidas opcionales. Es 1:1 con `profiles` (un usuario tiene una sola
-- fila de preferencias).
-- =============================================================================

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,

  -- Multi-select desde el onboarding (chips).
  style_tags text[] not null default '{}',
  favorite_occasions text[] not null default '{}',

  -- Tallas (texto porque XS/S/M/L/XL/XXL).
  top_size text,
  bottom_size text,

  -- Talla de calzado en numero (EU/US, segun lo que pongamos en el front).
  shoe_size numeric(4,1),

  -- Medidas opcionales en cm. El usuario puede saltar este paso.
  chest_cm numeric(5,1),
  waist_cm numeric(5,1),
  hip_cm   numeric(5,1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_preferences_user_id_idx
  on public.user_preferences (user_id);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ===== RLS =====
alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- StrandIA — Migracion 0001: Tabla `profiles`
--
-- Crea la tabla `profiles` (1:1 con auth.users), un trigger que la mantiene en
-- sync cuando se crea un nuevo usuario en auth, y otro trigger que actualiza
-- `updated_at` automaticamente en cada UPDATE.
--
-- Tambien activamos Row Level Security (RLS) para que cada usuario solo pueda
-- ver/editar su propio profile.
-- =============================================================================

-- Funcion utilitaria para mantener `updated_at` al dia. La reutilizan todas las
-- tablas que tengan ese campo. Definida una sola vez aqui.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tabla de perfiles. El `id` apunta a auth.users(id), de modo que cada usuario
-- registrado en Supabase Auth tiene exactamente una fila aqui.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mantiene `updated_at` siempre actualizado.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Trigger que crea automaticamente el profile cuando nace un auth.users.
-- Se ejecuta con SECURITY DEFINER porque corre en el contexto del servidor,
-- no del usuario que se acaba de registrar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== RLS =====
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

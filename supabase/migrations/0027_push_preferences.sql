-- =============================================================================
-- StrandIA — Migracion 0027: push_preferences (Fase 2 — preferencias de push)
--
-- Tabla separada de `profiles` A PROPOSITO: `profiles` ya tiene un patron de
-- grants por columna (revoke update on table + grant update por columna
-- especifica, ver 0008/0012) que ya demostro ser una fuente de bugs
-- silenciosos en este proyecto — toda columna nueva ahi necesita su propio
-- GRANT UPDATE o falla sin avisar. Una tabla propia con RLS owner-CRUD
-- estandar (mismo patron que user_preferences, migracion 0002) evita ese
-- riesgo por completo.
--
-- Sin fila = todo activado: los tres audience-builders de Fase 2
-- (daily-outfit, hebri-emocional, hilo-notify) tratan la ausencia de fila
-- como "el usuario no cambio nada, todo prendido" — asi no hace falta
-- backfill para los usuarios existentes.
-- =============================================================================

create table if not exists public.push_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,

  recordatorio_diario boolean not null default true,
  avisos_hebri boolean not null default true,
  novedades_hilo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_preferences_user_id_idx
  on public.push_preferences (user_id);

drop trigger if exists push_preferences_set_updated_at on public.push_preferences;
create trigger push_preferences_set_updated_at
  before update on public.push_preferences
  for each row execute function public.set_updated_at();

-- ===== RLS =====
-- Owner-CRUD directo: a diferencia de push_subscriptions (que solo escribe
-- el servidor via API route), esto es una preferencia de usuario legitima
-- para editar desde el cliente con su propia sesion.
alter table public.push_preferences enable row level security;

drop policy if exists "push_preferences_select_own" on public.push_preferences;
create policy "push_preferences_select_own"
  on public.push_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "push_preferences_insert_own" on public.push_preferences;
create policy "push_preferences_insert_own"
  on public.push_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_preferences_update_own" on public.push_preferences;
create policy "push_preferences_update_own"
  on public.push_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_preferences_delete_own" on public.push_preferences;
create policy "push_preferences_delete_own"
  on public.push_preferences for delete
  using (auth.uid() = user_id);

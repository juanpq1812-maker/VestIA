-- =============================================================================
-- StrandIA — Migracion 0005: Tabla `outfit_uses` (registro de uso real)
--
-- Esta tabla registra cuando un usuario USO efectivamente un outfit. Es la
-- base de las metricas reales (ropa mas usada, "olvidadas", impacto), porque
-- la tabla `outfits` solo refleja intencion (que el usuario lo guardo).
--
-- Reglas de negocio:
--   - Un mismo outfit no puede registrarse dos veces el mismo dia
--     (UNIQUE en (outfit_id, used_date)).
--   - Si se borra el outfit, sus usos desaparecen tambien (ON DELETE CASCADE).
--   - Solo el dueno del outfit puede leer/escribir sus usos (RLS).
--
-- La validacion del rango de fechas (hoy o hasta 7 dias atras) la hace la
-- aplicacion en la Server Action — RLS a nivel SQL no es el lugar adecuado
-- para esa regla de UX.
-- =============================================================================

create table if not exists public.outfit_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,

  -- Fecha del USO real del outfit (no la del registro). Tipo `date` para
  -- que un mismo outfit pueda usarse 1 vez por dia natural.
  used_date date not null,

  -- Cuando se inserto la fila (auditoria).
  created_at timestamptz not null default now(),

  -- 1 uso por outfit por dia. La app debe atrapar la violacion y mostrar
  -- un mensaje user-friendly.
  constraint outfit_uses_outfit_date_unique unique (outfit_id, used_date)
);

create index if not exists outfit_uses_user_id_idx on public.outfit_uses (user_id);
create index if not exists outfit_uses_outfit_id_idx on public.outfit_uses (outfit_id);
create index if not exists outfit_uses_used_date_idx on public.outfit_uses (used_date desc);

-- ===== RLS =====
alter table public.outfit_uses enable row level security;

drop policy if exists "outfit_uses_select_own" on public.outfit_uses;
create policy "outfit_uses_select_own"
  on public.outfit_uses for select
  using (auth.uid() = user_id);

drop policy if exists "outfit_uses_insert_own" on public.outfit_uses;
create policy "outfit_uses_insert_own"
  on public.outfit_uses for insert
  with check (auth.uid() = user_id);

drop policy if exists "outfit_uses_update_own" on public.outfit_uses;
create policy "outfit_uses_update_own"
  on public.outfit_uses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "outfit_uses_delete_own" on public.outfit_uses;
create policy "outfit_uses_delete_own"
  on public.outfit_uses for delete
  using (auth.uid() = user_id);

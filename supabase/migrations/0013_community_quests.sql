-- =============================================================================
-- StrandIA — Migracion 0013: Fashion Quests + puntos/nivel de Comunidad
--
-- Segundo pilar de gamificacion (el primero es Hebri, migraciones 0011/0012).
-- Los quests los administra el equipo de StrandIA desde /admin/quests — el
-- admin NO escribe logica, solo configura parametros sobre un catalogo fijo
-- de `quest_type` (la verificacion de cada tipo vive en codigo, migracion
-- 0014). Completar un quest otorga puntos permanentes de nivel (nunca
-- decaen, a diferencia del health_score de Hebri) y opcionalmente desbloquea
-- un beneficio de marca aliada (el canje real queda fuera de este alcance).
-- =============================================================================

-- ===== profiles.is_admin =====
-- Mismo patron que profiles.approved (0008): columna protegida por
-- column-level grants, nunca en el GRANT UPDATE de `authenticated`. Se activa
-- a mano desde el SQL Editor — no hay UI de "hacer admin a alguien".
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Acceso a /admin/quests. Se activa manualmente desde Supabase — sin UI de auto-servicio.';

revoke update (is_admin) on table public.profiles from authenticated;
revoke update (is_admin) on table public.profiles from anon;

-- ===== profiles.community_points =====
-- Cacheado, mismo espiritu que pet_score_base: solo lo escribe la funcion
-- SECURITY DEFINER de la migracion 0014, nunca un UPDATE directo del cliente.
alter table public.profiles
  add column if not exists community_points integer not null default 0;

comment on column public.profiles.community_points is
  'Puntos de nivel acumulados (Rookie/Curador/Estilista/Icono). No decaen. Solo se escriben via complete_quest().';

revoke update (community_points) on table public.profiles from authenticated;
revoke update (community_points) on table public.profiles from anon;

-- ===== quests =====
create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),

  quest_type text not null check (
    quest_type in (
      'generate_outfits',
      'use_outfits',
      'upload_items',
      'active_days',
      'rescue_forgotten_item'
    )
  ),

  title text not null,
  description text not null,

  -- "haz target_count de quest_type en los ultimos window_days dias".
  target_count int not null check (target_count > 0),
  window_days int not null check (window_days > 0),

  points_reward int not null check (points_reward > 0),

  -- Beneficio de marca aliada opcional — solo se guarda el dato de que se
  -- desbloqueo, el canje real es otro proyecto.
  brand_name text,
  benefit_description text,

  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,

  is_published boolean not null default false,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists quests_published_idx on public.quests (is_published, starts_at, ends_at);

alter table public.quests enable row level security;

drop policy if exists "quests_select_published" on public.quests;
create policy "quests_select_published"
  on public.quests for select
  using (is_published = true);

drop policy if exists "quests_admin_all" on public.quests;
create policy "quests_admin_all"
  on public.quests for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ===== user_quest_completions =====
-- Auditoria + anti-doble-cobro. Sin policy de insert directo: solo se
-- escribe desde complete_quest() (SECURITY DEFINER, migracion 0014).
create table if not exists public.user_quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,

  completed_at timestamptz not null default now(),
  points_awarded int not null,
  benefit_unlocked boolean not null default false,

  constraint user_quest_completions_unique unique (user_id, quest_id)
);

create index if not exists user_quest_completions_user_id_idx on public.user_quest_completions (user_id);

alter table public.user_quest_completions enable row level security;

drop policy if exists "user_quest_completions_select_own" on public.user_quest_completions;
create policy "user_quest_completions_select_own"
  on public.user_quest_completions for select
  using (auth.uid() = user_id);

-- ===== pet_activity_log: nuevo action_type =====
alter table public.pet_activity_log
  drop constraint if exists pet_activity_log_action_type_check;

alter table public.pet_activity_log
  add constraint pet_activity_log_action_type_check check (
    action_type in (
      'outfit_generated',
      'outfit_shared',
      'user_followed',
      'garment_uploaded',
      'app_opened',
      'quest_completed'
    )
  );

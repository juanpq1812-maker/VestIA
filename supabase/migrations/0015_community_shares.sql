-- =============================================================================
-- StrandIA — Migracion 0015: Compartir outfits con la comunidad
--
-- Tercer pilar social sobre /comunidad (los primeros dos son Hebri y los
-- Fashion Quests, migraciones 0011-0014). El usuario comparte una FOTO REAL
-- (nunca el moodboard/miniaturas generadas por IA) justo despues de marcar
-- "Lo use hoy"/"otro dia" sobre un outfit guardado. La comunidad puede ver el
-- feed, dar like, seguir al autor y reportar contenido inapropiado.
--
-- Deliberadamente NO tocamos las RLS de `outfits`/`outfit_uses` (siguen
-- 100% owner-only) — un share es una fila nueva y separada que solo copia lo
-- que debe ser publico. Asi nunca se expone `clothing_item_ids` (que apuntan
-- al bucket privado `clothing-images`) entre usuarios.
-- =============================================================================

-- ===== community_shares =====
create table if not exists public.community_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  outfit_id uuid not null references public.outfits(id) on delete cascade,
  outfit_use_id uuid not null references public.outfit_uses(id) on delete cascade,

  -- Snapshot cacheado del autor al momento de compartir — mismo espiritu que
  -- profiles.community_points/pet_score_base: evita abrir `profiles` a
  -- lecturas cross-user solo para pintar un nombre en el feed. Si el usuario
  -- cambia su nombre despues, los shares viejos quedan con el nombre de esa
  -- epoca (aceptable, no hay edicion de shares en v1).
  author_display_name text,

  -- Foto obligatoria: nunca se comparte el moodboard/miniaturas de prendas.
  photo_path text not null,

  caption text,

  like_count integer not null default 0,

  created_at timestamptz not null default now(),

  -- Un mismo uso de outfit solo se comparte una vez.
  constraint community_shares_outfit_use_unique unique (outfit_use_id)
);

create index if not exists community_shares_created_at_idx
  on public.community_shares (created_at desc);
create index if not exists community_shares_user_id_idx
  on public.community_shares (user_id);

alter table public.community_shares enable row level security;

-- SELECT: cualquier usuario autenticado ve todo el feed. /comunidad ya esta
-- protegida por el proxy (RUTAS_PRIVADAS), pero esta policy es la barrera
-- real — no confiamos solo en el proxy.
drop policy if exists "community_shares_select_authenticated" on public.community_shares;
create policy "community_shares_select_authenticated"
  on public.community_shares for select
  to authenticated
  using (true);

-- INSERT: el dueño crea su propio share, y el outfit_use_id/outfit_id deben
-- ser consistentes y pertenecerle (defensa adicional a la que ya hace la
-- Server Action).
drop policy if exists "community_shares_insert_own" on public.community_shares;
create policy "community_shares_insert_own"
  on public.community_shares for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.outfit_uses ou
      where ou.id = outfit_use_id
        and ou.user_id = auth.uid()
        and ou.outfit_id = community_shares.outfit_id
    )
  );

-- DELETE: sin UI en v1, pero la dejamos lista (gratis, evita una migracion
-- futura si se agrega "borrar mi share").
drop policy if exists "community_shares_delete_own" on public.community_shares;
create policy "community_shares_delete_own"
  on public.community_shares for delete
  to authenticated
  using (auth.uid() = user_id);

-- like_count solo se escribe via toggle_community_like() (migracion 0016).
revoke update (like_count) on table public.community_shares from authenticated;
revoke update (like_count) on table public.community_shares from anon;


-- ===== community_likes =====
create table if not exists public.community_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_id uuid not null references public.community_shares(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_likes_unique unique (user_id, share_id)
);

create index if not exists community_likes_share_id_idx on public.community_likes (share_id);
create index if not exists community_likes_user_id_idx on public.community_likes (user_id);

alter table public.community_likes enable row level security;

-- SELECT: cada quien ve solo sus propios likes (para pintar el corazon
-- lleno/vacio de SU sesion) — el contador total ya vive cacheado en
-- community_shares.like_count.
drop policy if exists "community_likes_select_own" on public.community_likes;
create policy "community_likes_select_own"
  on public.community_likes for select
  to authenticated
  using (auth.uid() = user_id);

-- Sin policy de insert/delete para el cliente: solo
-- toggle_community_like() (SECURITY DEFINER, migracion 0016) escribe aca —
-- mismo patron que user_quest_completions.


-- ===== community_follows =====
create table if not exists public.community_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_follows_unique unique (follower_id, followed_id),
  constraint community_follows_no_self check (follower_id <> followed_id)
);

create index if not exists community_follows_follower_idx on public.community_follows (follower_id);
create index if not exists community_follows_followed_idx on public.community_follows (followed_id);

alter table public.community_follows enable row level security;

-- SELECT: el usuario ve a quien sigue (para pintar "Siguiendo" en el feed).
-- No hay lista de "quien me sigue a mi" en v1, asi que no hace falta abrir
-- lecturas por followed_id.
drop policy if exists "community_follows_select_own" on public.community_follows;
create policy "community_follows_select_own"
  on public.community_follows for select
  to authenticated
  using (auth.uid() = follower_id);

-- INSERT/DELETE directos: a diferencia de likes, no hay contador cacheado
-- que proteger (v1 no muestra cantidad de seguidores), asi que no hace
-- falta un RPC — la RLS ya es suficiente barrera.
drop policy if exists "community_follows_insert_own" on public.community_follows;
create policy "community_follows_insert_own"
  on public.community_follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "community_follows_delete_own" on public.community_follows;
create policy "community_follows_delete_own"
  on public.community_follows for delete
  to authenticated
  using (auth.uid() = follower_id);


-- ===== community_share_reports =====
-- Reportes de contenido inapropiado. Van a /admin/reports — el admin decide
-- si descarta el reporte o elimina el share. Sin UI para que un usuario vea
-- sus propios reportes en v1.
create table if not exists public.community_share_reports (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.community_shares(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  -- Snapshot cacheado, mismo motivo que community_shares.author_display_name:
  -- `profiles` solo tiene RLS "select own", asi que el admin no podria leer
  -- el nombre de otros reporteros en vivo desde /admin/reports.
  reporter_display_name text,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'removed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),

  -- La misma persona no puede reportar el mismo share mas de una vez.
  constraint community_share_reports_unique unique (share_id, reporter_id)
);

create index if not exists community_share_reports_status_idx
  on public.community_share_reports (status, created_at desc);

alter table public.community_share_reports enable row level security;

-- INSERT: cualquier usuario autenticado puede reportar (con su propio id de
-- reportero).
drop policy if exists "community_share_reports_insert_own" on public.community_share_reports;
create policy "community_share_reports_insert_own"
  on public.community_share_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- SELECT/UPDATE: solo admins (mismo criterio que quests_admin_all en
-- 0013_community_quests.sql) — un usuario normal no puede ver reportes
-- ajenos ni los propios.
drop policy if exists "community_share_reports_admin_select" on public.community_share_reports;
create policy "community_share_reports_admin_select"
  on public.community_share_reports for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "community_share_reports_admin_update" on public.community_share_reports;
create policy "community_share_reports_admin_update"
  on public.community_share_reports for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ===== pet_activity_log: outfit_shared / user_followed =====
-- Ya estaban contempladas en el check constraint (migracion 0013) y en
-- record_pet_action() (migracion 0014) — no hace falta tocar nada mas aca.

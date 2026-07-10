-- Calendario sincronizado por ICS (Fase 1).
--
--   - calendar_feeds: la URL ICS secreta que el usuario conecta (máx 1 por
--     usuario en el MVP). La URL es un secreto: quien la tenga puede leer el
--     calendario completo — solo se expone al dueño vía RLS y la UI la
--     muestra enmascarada.
--   - calendar_events: caché de los eventos parseados (ventana de 7 días),
--     upsert idempotente por (feed_id, external_uid, starts_at) para soportar
--     recurrencias (mismo UID, distinta fecha).
--   - event_outfit_suggestions: caché del día de la sugerencia de la IA por
--     evento — así el outfit se genera una sola vez al abrir el dashboard.
--
-- Todo con RLS "solo el dueño", mismo patrón de clothing_items.

-- ── calendar_feeds ───────────────────────────────────────────────────────────

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  provider text,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.calendar_feeds enable row level security;

drop policy if exists "calendar_feeds_select_own" on public.calendar_feeds;
create policy "calendar_feeds_select_own"
  on public.calendar_feeds for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_feeds_insert_own" on public.calendar_feeds;
create policy "calendar_feeds_insert_own"
  on public.calendar_feeds for insert
  with check (auth.uid() = user_id);

drop policy if exists "calendar_feeds_update_own" on public.calendar_feeds;
create policy "calendar_feeds_update_own"
  on public.calendar_feeds for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendar_feeds_delete_own" on public.calendar_feeds;
create policy "calendar_feeds_delete_own"
  on public.calendar_feeds for delete
  using (auth.uid() = user_id);

-- ── calendar_events ──────────────────────────────────────────────────────────

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feed_id uuid not null references public.calendar_feeds(id) on delete cascade,
  external_uid text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text,
  created_at timestamptz not null default now(),
  unique (feed_id, external_uid, starts_at)
);

create index if not exists calendar_events_user_starts_idx
  on public.calendar_events (user_id, starts_at);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own"
  on public.calendar_events for select
  using (auth.uid() = user_id);

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own"
  on public.calendar_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

-- ── event_outfit_suggestions ─────────────────────────────────────────────────

create table if not exists public.event_outfit_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  occasion_inferred text not null,
  name text not null,
  explanation text not null,
  match_percentage int,
  clothing_item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (event_id)
);

alter table public.event_outfit_suggestions enable row level security;

drop policy if exists "event_outfit_suggestions_select_own" on public.event_outfit_suggestions;
create policy "event_outfit_suggestions_select_own"
  on public.event_outfit_suggestions for select
  using (auth.uid() = user_id);

drop policy if exists "event_outfit_suggestions_insert_own" on public.event_outfit_suggestions;
create policy "event_outfit_suggestions_insert_own"
  on public.event_outfit_suggestions for insert
  with check (auth.uid() = user_id);

-- El upsert (INSERT ... ON CONFLICT DO UPDATE) necesita también UPDATE.
drop policy if exists "event_outfit_suggestions_update_own" on public.event_outfit_suggestions;
create policy "event_outfit_suggestions_update_own"
  on public.event_outfit_suggestions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "event_outfit_suggestions_delete_own" on public.event_outfit_suggestions;
create policy "event_outfit_suggestions_delete_own"
  on public.event_outfit_suggestions for delete
  using (auth.uid() = user_id);

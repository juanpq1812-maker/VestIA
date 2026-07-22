-- =============================================================================
-- StrandIA — Migracion 0025: push_subscriptions (cimientos de Web Push)
--
-- Prompt 1/3 de notificaciones push. Solo la tabla que guarda las
-- suscripciones del navegador (endpoint + llaves p256dh/auth del
-- PushSubscription de la Push API). Deliberadamente NO hay captura de
-- permiso, Service Worker, ni logica de a quien/cuando notificar todavia —
-- eso vive en prompts posteriores. Al terminar esta migracion la tabla
-- existe pero esta vacia: nadie recibe ninguna notificacion.
--
-- Un usuario puede tener varias filas (un dispositivo/navegador por fila).
-- FK a profiles(id) en vez de auth.users, mismo patron que el resto del
-- proyecto (profiles.id es 1:1 con auth.users.id via el trigger de alta).
-- =============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- El endpoint identifica univocamente la suscripcion del navegador ante el
  -- push service (FCM, Mozilla, etc.) — unique evita duplicar la misma
  -- suscripcion si el cliente reintenta el registro.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,

  -- Para poder distinguir dispositivos/navegadores en UI futura ("2
  -- dispositivos suscritos") y para debug de entregas fallidas.
  user_agent text,

  -- La capa de entrega (prompt 1) apaga esto en 404/410 (endpoint muerto) en
  -- vez de borrar la fila — conserva el historial y evita reinsertar la
  -- misma suscripcion si el navegador la re-registra con el mismo endpoint.
  active boolean not null default true,

  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- El usuario solo ve/crea/actualiza/borra sus propias suscripciones — mismo
-- patron owner-only que community_follows/community_shares (0015).
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

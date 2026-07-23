-- =============================================================================
-- StrandIA — Migracion 0026: push_notifications_log (Prompt 3/3 — scheduler)
--
-- Registra cada intento de notificacion push automatica (hoy: solo
-- 'daily_outfit'). Sirve para tres cosas:
--   (a) tope de 1 notificacion por usuario por dia — UNIQUE (user_id, tipo,
--       dia_bogota) mas abajo.
--   (b) idempotencia si el cron corre dos veces: el route hace un INSERT de
--       "reclamo" (exito=false) ANTES de enviar; si choca con la constraint
--       UNIQUE, ese usuario ya fue reclamado por otra corrida y se salta sin
--       reenviar. Despues del envio, el route actualiza esa misma fila con
--       el resultado real (ver src/app/api/push/cron/daily-outfit/route.ts).
--   (c) medir tasa de entrega mas adelante (exito/error por fila).
--
-- dia_bogota: columna GENERADA a partir de enviado_at, para que el UNIQUE
-- agrupe por dia CALENDARIO DE BOGOTA (no UTC ni el timezone del servidor).
-- Colombia es UTC-5 fijo, sin horario de verano — por eso usamos un
-- INTERVAL fijo ('-05:00') en vez de un nombre de zona horaria: la variante
-- `timestamptz AT TIME ZONE text` depende de tzdata (catalogo de zonas, que
-- puede actualizarse) y Postgres la marca STABLE, no IMMUTABLE — una
-- columna GENERATED exige una expresion IMMUTABLE o la migracion falla con
-- "generation expression is not immutable". La variante
-- `AT TIME ZONE INTERVAL '-05:00'` es aritmetica pura (resta un offset fijo),
-- IMMUTABLE, y ademas es la representacion semanticamente correcta de "UTC-5
-- fijo sin DST".
-- =============================================================================

create table if not exists public.push_notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Tipo de notificacion. Hoy solo 'daily_outfit' (Fase 1). Fase 2 sumara
  -- mas valores (emocionales de Hebri, etc.) — texto libre a proposito, sin
  -- CHECK, para no tener que migrar de nuevo por cada tipo nuevo.
  tipo text not null,

  enviado_at timestamptz not null default now(),

  dia_bogota date generated always as (
    (enviado_at at time zone interval '-05:00')::date
  ) stored,

  exito boolean not null,
  error text
);

-- Maximo 1 notificacion de un tipo dado por usuario por dia (calendario
-- Bogota). Es la barrera real contra doble-envio si el cron se repite.
create unique index if not exists push_notifications_log_unique_per_day
  on public.push_notifications_log (user_id, tipo, dia_bogota);

create index if not exists push_notifications_log_user_id_idx
  on public.push_notifications_log (user_id, enviado_at desc);

-- ===== RLS =====
-- Mismo patron que pet_activity_log (0011): el dueno solo LEE su propio
-- historial. Sin policies de insert/update/delete para `authenticated` — el
-- unico escritor es el route del cron, que usa el service role client (esa
-- clave salta RLS por diseno, ver src/lib/supabase/adminClient.ts).
alter table public.push_notifications_log enable row level security;

drop policy if exists "push_notifications_log_select_own" on public.push_notifications_log;
create policy "push_notifications_log_select_own"
  on public.push_notifications_log for select
  to authenticated
  using (auth.uid() = user_id);

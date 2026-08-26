-- =============================================================================
-- StrandIA — Migracion 0036: registro de consentimiento legal
--
-- Hasta ahora la pantalla de registro traia un parrafo pasivo al pie ("Al
-- crear tu cuenta aceptas...") y NO quedaba registro de nada. Peor: el boton
-- de Google esta arriba del formulario y da de alta al instante, asi que esa
-- ruta se saltaba el consentimiento entero. Ahora hay dos casillas
-- obligatorias (mayoria de edad y aceptacion de documentos) que gobiernan
-- tanto el submit como el boton de Google, y cada marca deja una fila aca.
--
-- POR QUE UNA TABLA Y NO COLUMNAS EN `profiles`
--
-- 1. Historial. Los documentos van a cambiar (los precios de Premium entran
--    cuando IAP este configurado). Cuando eso pase habra que re-pedir
--    aceptacion, y con columnas se pierde la anterior. Aca cada aceptacion es
--    una fila con su version, y el historial completo queda.
--
-- 2. `profiles` tiene UPDATE revocado y concedido columna por columna desde
--    0008 (para que nadie se auto-apruebe la waitlist). Cada columna nueva
--    necesita su propio GRANT o la escritura falla EN SILENCIO con un
--    PostgrestError vacio — paso con burst_ai_uses en la 0018 y hubo que
--    arreglarlo en la 0019. Una tabla propia con INSERT por RLS no tiene ese
--    filo.
--
-- INMUTABLE A PROPOSITO: hay policy de insert y de select, pero NO de update
-- ni de delete. Un registro de consentimiento que el propio usuario puede
-- editar no prueba nada. Las filas se van solo con la cuenta (cascade).
-- =============================================================================

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- 'terms' y 'privacy' son los dos documentos; 'age' es la declaracion de
  -- mayoria de edad, que va en casilla aparte a proposito: aceptar un
  -- documento es conceder un permiso, declarar la edad es afirmar un hecho
  -- sobre uno mismo. Si alguna vez se discute la edad, el registro tiene que
  -- poder mostrar que la afirmo como acto separado y no de rebote.
  document text not null check (document in ('terms', 'privacy', 'age')),

  -- Para 'terms'/'privacy': la version del documento (ver
  -- src/lib/legal/constants.ts). Para 'age': la edad minima declarada ('18').
  version text not null,

  accepted_at timestamptz not null default now(),

  -- La misma persona no registra dos veces la misma version del mismo
  -- documento; re-aceptar una version NUEVA si crea fila nueva.
  constraint legal_consents_unique unique (user_id, document, version)
);

create index if not exists legal_consents_user_idx
  on public.legal_consents (user_id, accepted_at desc);

alter table public.legal_consents enable row level security;

-- SELECT: cada quien ve sus propias aceptaciones (entran en el export de
-- datos de /profile/privacy, son dato personal suyo).
drop policy if exists "legal_consents_select_own" on public.legal_consents;
create policy "legal_consents_select_own"
  on public.legal_consents for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT: solo a nombre propio.
drop policy if exists "legal_consents_insert_own" on public.legal_consents;
create policy "legal_consents_insert_own"
  on public.legal_consents for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Sin UPDATE ni DELETE: ver la nota de inmutabilidad arriba. El revoke
-- explicito es por si algun grant amplio los habilita mas adelante.
revoke update, delete on table public.legal_consents from authenticated;
revoke update, delete on table public.legal_consents from anon;

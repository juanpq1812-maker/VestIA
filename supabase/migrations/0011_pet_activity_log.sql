-- =============================================================================
-- StrandIA — Migracion 0011: Tabla `pet_activity_log` (mascota Hebri)
--
-- Registra cada accion que alimenta el estado de animo de Hebri. Es un log
-- inmutable (auditoria de puntos otorgados) — el `health_score` mostrado no
-- se calcula sumando esta tabla en cada lectura: se cachea en `profiles`
-- (ver migracion 0012) y esta tabla queda como historial/debug.
--
-- Reglas de negocio:
--   - Solo el dueno del registro puede leer/insertar sus propias filas.
--   - No hay UPDATE ni DELETE: un evento pasado no se edita.
--   - Los puntos otorgados por accion viven en la app (src/lib/pet/constants.ts),
--     no aqui — la columna `points` es una foto de "cuanto sumo esta fila",
--     util para auditar sin recalcular reglas historicas si algun dia cambian.
-- =============================================================================

create table if not exists public.pet_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  action_type text not null check (
    action_type in (
      'outfit_generated',
      'outfit_shared',
      'user_followed',
      'garment_uploaded',
      'app_opened'
    )
  ),

  points smallint not null,

  created_at timestamptz not null default now()
);

create index if not exists pet_activity_log_user_id_idx on public.pet_activity_log (user_id);
create index if not exists pet_activity_log_created_at_idx on public.pet_activity_log (created_at desc);

-- ===== RLS =====
alter table public.pet_activity_log enable row level security;

drop policy if exists "pet_activity_log_select_own" on public.pet_activity_log;
create policy "pet_activity_log_select_own"
  on public.pet_activity_log for select
  using (auth.uid() = user_id);

drop policy if exists "pet_activity_log_insert_own" on public.pet_activity_log;
create policy "pet_activity_log_insert_own"
  on public.pet_activity_log for insert
  with check (auth.uid() = user_id);

-- Sin policy de update/delete a proposito: nadie (ni el dueno) edita el log
-- desde el cliente. Los inserts en la practica solo los hace la funcion
-- `record_pet_action` (migracion 0012), pero dejamos el insert propio
-- disponible por si se necesita en el futuro un registro directo.

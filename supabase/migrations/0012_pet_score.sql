-- =============================================================================
-- StrandIA — Migracion 0012: health_score de Hebri
--
-- Guarda el estado de Hebri como un score "cacheado con decaimiento perezoso":
-- en vez de recalcular sumando `pet_activity_log` en cada lectura, guardamos
-- el ultimo valor conocido (`pet_score_base`) y el instante en que ese valor
-- fue correcto (`pet_score_updated_at`). El score que se MUESTRA se deriva en
-- el momento con aritmetica pura (sin query extra):
--
--   score_mostrado = clamp(pet_score_base - 8 * dias(now() - pet_score_updated_at), 0, 100)
--
-- Solo se escribe cuando ocurre una accion real (ver funcion mas abajo) — leer
-- el Home nunca dispara un UPDATE.
--
-- `pet_last_opened_at` es independiente del score: alimenta el sistema de
-- "suciedad" (sucia si pasan 3+ dias sin abrir la app), que se superpone a
-- cualquiera de los 5 estados de animo.
--
-- SEGURIDAD: igual que en 0008, estas columnas NO se agregan al GRANT UPDATE
-- de `authenticated` sobre `profiles` — si lo hicieramos, cualquiera podria
-- hacer `update({ pet_score_base: 100 })` desde el cliente y saltarse el
-- decaimiento. La unica forma de escribirlas es la funcion `record_pet_action`
-- de abajo, que corre SECURITY DEFINER (con los privilegios de su dueno, no
-- los del usuario) y valida `auth.uid()` por dentro.
-- =============================================================================

alter table public.profiles
  add column if not exists pet_score_base smallint not null default 100,
  add column if not exists pet_score_updated_at timestamptz not null default now(),
  add column if not exists pet_last_opened_at timestamptz not null default now();

comment on column public.profiles.pet_score_base is
  'Ultimo health_score de Hebri conocido, valido a la fecha de pet_score_updated_at. Solo se escribe via record_pet_action().';
comment on column public.profiles.pet_score_updated_at is
  'Instante desde el cual se aplica el decaimiento de 8pts/dia sobre pet_score_base.';
comment on column public.profiles.pet_last_opened_at is
  'Ultima vez que el usuario abrio la app. Determina la capa "sucia" (3+ dias sin abrir).';

-- Nos aseguramos de que estas columnas nuevas no queden con permiso de UPDATE
-- generico para authenticated (el `revoke update on table` de 0008 ya cubre
-- toda la tabla incluidas columnas futuras, pero lo dejamos explicito por
-- claridad y por si alguna vez se relajan los grants existentes).
revoke update (pet_score_base, pet_score_updated_at, pet_last_opened_at)
  on table public.profiles from authenticated;
revoke update (pet_score_base, pet_score_updated_at, pet_last_opened_at)
  on table public.profiles from anon;

-- ===== record_pet_action(action_type) =====
--
-- Unico punto de escritura del estado de Hebri. Aplica, en este orden:
--   1. Decae pet_score_base segun los dias transcurridos desde pet_score_updated_at.
--   2. Suma los puntos de la accion (tope 100).
--   3. Si la accion es 'app_opened', actualiza pet_last_opened_at = now().
--   4. Inserta la fila de auditoria en pet_activity_log.
--
-- SECURITY DEFINER: corre con los privilegios de quien creo la funcion (el
-- rol que aplica las migraciones), no con los del usuario que la invoca — por
-- eso puede escribir columnas que `authenticated` tiene revocadas por UPDATE
-- directo. `auth.uid()` sigue reflejando al usuario real de la sesion, y la
-- funcion nunca opera sobre otro user_id que no sea el propio.
create or replace function public.record_pet_action(p_action_type text)
returns table (new_score smallint, new_state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_points smallint;
  v_current_base smallint;
  v_current_updated_at timestamptz;
  v_current_last_opened timestamptz;
  v_decayed smallint;
  v_days_elapsed int;
  v_new_base smallint;
begin
  if v_user_id is null then
    raise exception 'record_pet_action requiere una sesion autenticada';
  end if;

  v_points := case p_action_type
    when 'outfit_generated' then 25
    when 'outfit_shared' then 25
    when 'user_followed' then 12
    when 'garment_uploaded' then 12
    when 'app_opened' then 3
    else null
  end;

  if v_points is null then
    raise exception 'action_type invalido: %', p_action_type;
  end if;

  select pet_score_base, pet_score_updated_at, pet_last_opened_at
    into v_current_base, v_current_updated_at, v_current_last_opened
    from public.profiles
    where id = v_user_id
    for update;

  -- 'app_opened' se dispara en cada carga del Home — sin este freno, cada
  -- visita insertaria una fila en pet_activity_log y recalcularia el score.
  -- Si ya se registro un "app_opened" hoy (fecha calendario), es un no-op:
  -- solo devolvemos el score actual, sin puntos ni fila nueva.
  if p_action_type = 'app_opened'
     and v_current_last_opened::date = now()::date then
    return query select
      v_current_base,
      case
        when v_current_base >= 80 then 'feliz'
        when v_current_base >= 60 then 'aburrida'
        when v_current_base >= 40 then 'sassy'
        when v_current_base >= 20 then 'triste'
        else 'hibernando'
      end;
    return;
  end if;

  v_days_elapsed := greatest(0, floor(extract(epoch from (now() - v_current_updated_at)) / 86400)::int);
  v_decayed := greatest(0, v_current_base - (8 * v_days_elapsed));
  v_new_base := least(100, v_decayed + v_points);

  update public.profiles
    set pet_score_base = v_new_base,
        pet_score_updated_at = now(),
        pet_last_opened_at = case when p_action_type = 'app_opened' then now() else pet_last_opened_at end
    where id = v_user_id;

  insert into public.pet_activity_log (user_id, action_type, points)
    values (v_user_id, p_action_type, v_points);

  return query select
    v_new_base,
    case
      when v_new_base >= 80 then 'feliz'
      when v_new_base >= 60 then 'aburrida'
      when v_new_base >= 40 then 'sassy'
      when v_new_base >= 20 then 'triste'
      else 'hibernando'
    end;
end;
$$;

grant execute on function public.record_pet_action(text) to authenticated;
revoke execute on function public.record_pet_action(text) from anon;

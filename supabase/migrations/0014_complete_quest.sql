-- =============================================================================
-- StrandIA — Migracion 0014: función complete_quest()
--
-- Único punto de escritura para completar un Fashion Quest. Igual que
-- record_pet_action() (0012), corre SECURITY DEFINER porque escribe columnas
-- que `authenticated` tiene revocadas por UPDATE directo
-- (profiles.community_points) e inserta en una tabla sin policy de insert
-- para el cliente (user_quest_completions).
--
-- Verifica el progreso real del usuario para el quest_type ANTES de otorgar
-- puntos — el cliente nunca puede "reclamar" algo que no cumplió, aunque
-- llame al RPC directo con curl.
-- =============================================================================

-- ── Extiende record_pet_action() (0012) con el nuevo action_type ──────────
-- Mismo cuerpo que en 0012, solo se agrega 'quest_completed' al mapa de
-- puntos — un único lugar de verdad para el decaimiento/score de Hebri.
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
    when 'quest_completed' then 20
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

create or replace function public.complete_quest(p_quest_id uuid)
returns table (points_awarded int, new_total_points int, benefit_unlocked boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_quest record;
  v_progress int;
  v_new_total int;
begin
  if v_user_id is null then
    raise exception 'complete_quest requiere una sesion autenticada';
  end if;

  select * into v_quest
    from public.quests
    where id = p_quest_id
      and is_published = true
      and now() between starts_at and ends_at;

  if not found then
    raise exception 'Quest no disponible';
  end if;

  if exists (
    select 1 from public.user_quest_completions
    where user_id = v_user_id and quest_id = p_quest_id
  ) then
    raise exception 'Ya completaste este quest';
  end if;

  -- ── Progreso real por quest_type ──────────────────────────────────────
  v_progress := case v_quest.quest_type
    when 'generate_outfits' then (
      select count(*)::int from public.outfits
      where user_id = v_user_id
        and created_at >= now() - make_interval(days => v_quest.window_days)
    )
    when 'use_outfits' then (
      select count(*)::int from public.outfit_uses
      where user_id = v_user_id
        and used_date >= (current_date - v_quest.window_days)
    )
    when 'upload_items' then (
      select count(*)::int from public.clothing_items
      where user_id = v_user_id
        and created_at >= now() - make_interval(days => v_quest.window_days)
    )
    when 'active_days' then (
      select count(distinct used_date)::int from public.outfit_uses
      where user_id = v_user_id
        and used_date >= (current_date - v_quest.window_days)
    )
    when 'rescue_forgotten_item' then (
      select count(*)::int from (
        select distinct ou.id
        from public.outfit_uses ou
        join public.outfits o on o.id = ou.outfit_id
        cross join lateral unnest(o.clothing_item_ids) as item_id
        where ou.user_id = v_user_id
          and ou.used_date >= (current_date - v_quest.window_days)
          and not exists (
            select 1
            from public.outfit_uses ou2
            join public.outfits o2 on o2.id = ou2.outfit_id
            where ou2.user_id = v_user_id
              and o2.clothing_item_ids @> array[item_id]
              and ou2.used_date < ou.used_date
              and ou2.used_date >= ou.used_date - 15
          )
      ) rescued
    )
    else 0
  end;

  if v_progress < v_quest.target_count then
    raise exception 'Todavia no cumples la meta de este quest (%/%)', v_progress, v_quest.target_count;
  end if;

  insert into public.user_quest_completions (user_id, quest_id, points_awarded, benefit_unlocked)
    values (v_user_id, p_quest_id, v_quest.points_reward, v_quest.brand_name is not null);

  update public.profiles
    set community_points = community_points + v_quest.points_reward
    where id = v_user_id
    returning community_points into v_new_total;

  -- Completar un quest tambien cuenta como actividad para Hebri — un solo
  -- lugar de verdad para el decaimiento/score (record_pet_action, 0012).
  perform public.record_pet_action('quest_completed');

  return query select v_quest.points_reward, v_new_total, (v_quest.brand_name is not null);
end;
$$;

grant execute on function public.complete_quest(uuid) to authenticated;
revoke execute on function public.complete_quest(uuid) from anon;

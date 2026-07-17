-- =============================================================================
-- StrandIA — Migracion 0018: Modo rafaga de subida de prendas
--
-- Agrega el ciclo de vida draft -> processing -> ready -> confirmed/error a
-- `clothing_items` para soportar captura consecutiva con procesamiento en
-- background (Remove.bg + Claude Vision). Las prendas NO aparecen en el
-- armario del usuario hasta que su status es 'confirmed'.
--
-- El DEFAULT 'confirmed' que se agrega abajo ya resuelve el valor para las
-- filas existentes (Postgres no reescribe la tabla al agregar una columna
-- con default, pero SI la rellena para lecturas). El UPDATE explicito es una
-- capa defensiva extra para blindar a los usuarios del piloto: ninguna
-- prenda existente debe quedar oculta del armario por esta migracion.
--
-- Tambien agrega el contador de rate limit propio del modo rafaga
-- (independiente de ai_uses/ai_uses_window_start, que ya usan
-- generateOutfitsAction y analyzeInspirationPhotoAction — ver usageGate.ts),
-- y actualiza complete_quest() para que el quest 'upload_items' cuente solo
-- prendas confirmadas.
-- =============================================================================

-- ── clothing_items: columnas del ciclo de vida ────────────────────────────────

alter table public.clothing_items
  alter column category drop not null;

alter table public.clothing_items
  add column if not exists status text not null default 'confirmed',
  add column if not exists raw_image_path text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists error_message text;

update public.clothing_items set status = 'confirmed' where status is null;

alter table public.clothing_items
  drop constraint if exists clothing_items_status_check;
alter table public.clothing_items
  add constraint clothing_items_status_check
  check (status in ('draft', 'processing', 'ready', 'error', 'confirmed'));

comment on column public.clothing_items.status is
  'Ciclo de vida del modo rafaga: draft (foto cruda subida) -> processing (analizando) -> ready (lista para revisar) -> confirmed (visible en el armario) | error (fallo tras reintento).';
comment on column public.clothing_items.raw_image_path is
  'Path en el bucket clothing-images de la foto cruda (antes de Remove.bg). Se usa para reanudar el procesamiento si el usuario cierra la app a mitad de la rafaga.';
comment on column public.clothing_items.retry_count is
  'Cantidad de reintentos ya consumidos al procesar esta prenda (Remove.bg / Claude Vision). Maximo 1 reintento automatico.';

create index if not exists clothing_items_user_status_idx
  on public.clothing_items (user_id, status);

-- ── profiles: rate limit propio del modo rafaga ───────────────────────────────

alter table public.profiles
  add column if not exists burst_ai_uses integer not null default 0,
  add column if not exists burst_ai_uses_window_start timestamptz;

comment on column public.profiles.burst_ai_uses is
  'Contador de analisis Claude Vision consumidos en la ventana actual del modo rafaga de subida de prendas. Independiente de ai_uses (outfits/inspiracion) — ver src/lib/ai/burstUsageGate.ts.';
comment on column public.profiles.burst_ai_uses_window_start is
  'Inicio de la ventana de rate limiting (1 hora) del modo rafaga. NULL = sin ventana activa, se resetea en el proximo analisis.';

-- ── complete_quest(): el quest 'upload_items' solo cuenta prendas confirmadas ─
-- Mismo cuerpo que 0014_complete_quest.sql, con el case 'upload_items' filtrado
-- por status = 'confirmed' para que un lote de fotos a medio procesar (o
-- descartado) no infle el progreso del quest.

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
        and status = 'confirmed'
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

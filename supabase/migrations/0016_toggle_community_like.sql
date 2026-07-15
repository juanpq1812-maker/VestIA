-- =============================================================================
-- StrandIA — Migracion 0016: función toggle_community_like()
--
-- Único punto de escritura para dar/quitar like a un share de la comunidad.
-- Igual que complete_quest() (0014), corre SECURITY DEFINER porque escribe
-- `community_shares.like_count` (revocado de UPDATE directo, migracion 0015)
-- e inserta/borra en `community_likes` (sin policy de insert/delete directa).
-- =============================================================================

create or replace function public.toggle_community_like(p_share_id uuid)
returns table (liked boolean, new_like_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_new_count int;
  v_liked boolean;
begin
  if v_user_id is null then
    raise exception 'toggle_community_like requiere una sesion autenticada';
  end if;

  if not exists (select 1 from public.community_shares where id = p_share_id) then
    raise exception 'Share no encontrado';
  end if;

  select id into v_existing
    from public.community_likes
    where user_id = v_user_id and share_id = p_share_id;

  if v_existing is null then
    insert into public.community_likes (user_id, share_id) values (v_user_id, p_share_id);
    update public.community_shares
      set like_count = like_count + 1
      where id = p_share_id
      returning like_count into v_new_count;
    v_liked := true;
  else
    delete from public.community_likes where id = v_existing;
    update public.community_shares
      set like_count = greatest(0, like_count - 1)
      where id = p_share_id
      returning like_count into v_new_count;
    v_liked := false;
  end if;

  return query select v_liked, v_new_count;
end;
$$;

grant execute on function public.toggle_community_like(uuid) to authenticated;
revoke execute on function public.toggle_community_like(uuid) from anon;

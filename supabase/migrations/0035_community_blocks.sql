-- =============================================================================
-- StrandIA — Migracion 0035: Bloquear usuarios en la comunidad
--
-- Cuarto pilar de moderacion sobre /comunidad. Reportar (0015) manda el
-- contenido a un admin; bloquear es la accion inmediata que el usuario toma
-- por su cuenta y que no depende de que nadie revise nada. App Store y Play
-- lo exigen en apps con contenido generado por usuarios.
--
-- DECISIONES QUE NO SON OBVIAS AL LEER EL SQL
--
-- 1. El bloqueo es de DOS VIAS. Apple pide el minimo (que el que bloquea deje
--    de ver), pero de una via el bloqueado sigue viendo, dando like y
--    siguiendo al otro — eso es un mute, no un bloqueo. La fila es una sola;
--    la simetria vive en strandia_bloqueo_entre(), que compara el par en los
--    dos sentidos.
--
-- 2. El bloqueado NUNCA se entera. Las tres policies de community_blocks
--    exigen `auth.uid() = blocker_id`, asi que el bloqueado no puede leer ni
--    una fila que lo mencione. El filtrado bidireccional del feed NO lee esta
--    tabla desde la sesion del usuario: pasa por strandia_bloqueo_entre(),
--    que es SECURITY DEFINER. Asi el efecto es simetrico sin que el dato lo
--    sea. Para el bloqueado, el otro simplemente dejo de publicar.
--
-- 3. Por que strandia_bloqueo_entre() es SECURITY DEFINER y no una subconsulta
--    inline en la policy: una subconsulta dentro de una policy de RLS SIGUE
--    sujeta a la RLS de la tabla que consulta. Inline, la policy del feed solo
--    veria las filas donde el lector es el blocker — y la direccion de vuelta
--    (el bloqueado no ve al que bloqueo) fallaria EN SILENCIO. Si algun dia
--    conviertes esto en subconsulta, el bloqueo se degrada a una via sin que
--    ningun test de RLS te avise.
--
-- 4. Los follows se borran en las dos direcciones, dentro de la misma
--    transaccion (bloquear_usuario()). No se "pausan": un follow que
--    sobrevive reaparece intacto al desbloquear, y nadie espera seguir siendo
--    seguido por quien bloqueo. Al desbloquear, nadie sigue a nadie.
--
-- 5. blocked_display_name es un snapshot, mismo motivo que
--    community_shares.author_display_name y
--    community_share_reports.reporter_display_name: `profiles` es select-own,
--    asi que /profile/blocked no podria leer el nombre del bloqueado en vivo.
-- =============================================================================

-- ===== community_blocks =====
create table if not exists public.community_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,

  -- Snapshot al momento de bloquear — ver nota 5 arriba.
  blocked_display_name text,

  created_at timestamptz not null default now(),

  constraint community_blocks_unique unique (blocker_id, blocked_id),
  constraint community_blocks_no_self check (blocker_id <> blocked_id)
);

create index if not exists community_blocks_blocker_idx
  on public.community_blocks (blocker_id);
create index if not exists community_blocks_blocked_idx
  on public.community_blocks (blocked_id);

alter table public.community_blocks enable row level security;

-- Las tres policies exigen blocker_id — nadie lee ni escribe bloqueos ajenos,
-- y el bloqueado no puede descubrir los suyos. Ver nota 2.
drop policy if exists "community_blocks_select_own" on public.community_blocks;
create policy "community_blocks_select_own"
  on public.community_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "community_blocks_insert_own" on public.community_blocks;
create policy "community_blocks_insert_own"
  on public.community_blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- DELETE es el desbloqueo desde /profile/blocked: no necesita RPC porque no
-- toca nada mas (los follows no se restauran, ver nota 4).
drop policy if exists "community_blocks_delete_own" on public.community_blocks;
create policy "community_blocks_delete_own"
  on public.community_blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);


-- ===== private.strandia_bloqueo_entre() =====
-- ¿Hay un bloqueo entre estas dos personas, en CUALQUIER direccion?
-- SECURITY DEFINER a proposito — ver nota 3.
--
-- Vive en el esquema `private` y no en `public` por la nota 2: una policy de
-- RLS se evalua con los permisos del usuario que consulta, asi que
-- `authenticated` NECESITA execute sobre ella. Si estuviera en `public`,
-- PostgREST la expondria como RPC y el bloqueado podria sondear
-- "¿me bloqueo fulano?" uno por uno — justo lo que la tabla evita. PostgREST
-- solo expone `public`, asi que aca es inalcanzable desde el cliente.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.strandia_bloqueo_entre(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.community_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

grant execute on function private.strandia_bloqueo_entre(uuid, uuid) to authenticated;
revoke execute on function private.strandia_bloqueo_entre(uuid, uuid) from anon;


-- ===== bloquear_usuario() =====
-- Atomica: inserta el bloqueo con el snapshot del nombre y borra los follows
-- de las dos direcciones. SECURITY DEFINER por dos razones: leer
-- profiles.display_name del bloqueado (profiles es select-own) y borrar la
-- fila de community_follows donde el bloqueado es el follower (su policy de
-- delete exige follower_id = auth.uid(), que no se cumple en esa direccion).
create or replace function public.bloquear_usuario(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_nombre text;
begin
  if v_user_id is null then
    raise exception 'bloquear_usuario requiere una sesion autenticada';
  end if;

  if p_blocked_id is null or p_blocked_id = v_user_id then
    raise exception 'No puedes bloquearte a ti mismo';
  end if;

  if not exists (select 1 from public.profiles where id = p_blocked_id) then
    raise exception 'Esa persona no existe';
  end if;

  select display_name into v_nombre from public.profiles where id = p_blocked_id;

  insert into public.community_blocks (blocker_id, blocked_id, blocked_display_name)
  values (v_user_id, p_blocked_id, v_nombre)
  on conflict (blocker_id, blocked_id) do nothing;

  -- Los dos sentidos, ver nota 4.
  delete from public.community_follows
   where (follower_id = v_user_id and followed_id = p_blocked_id)
      or (follower_id = p_blocked_id and followed_id = v_user_id);
end;
$$;

grant execute on function public.bloquear_usuario(uuid) to authenticated;
revoke execute on function public.bloquear_usuario(uuid) from anon;


-- ===== El feed deja de mostrar a los bloqueados =====
-- Reemplaza community_shares_select_authenticated (0015), que era
-- `using (true)`. Al vivir en la RLS y no en la query, el filtro aplica a
-- getCommunityFeed(), al detalle de un share y a cualquier lectura futura —
-- no hay forma de olvidarse de aplicarlo.
drop policy if exists "community_shares_select_authenticated" on public.community_shares;
create policy "community_shares_select_authenticated"
  on public.community_shares for select
  to authenticated
  using (not private.strandia_bloqueo_entre(auth.uid(), user_id));


-- ===== Tampoco se pueden seguir entre si =====
-- La UI ya no ofrece el boton (el bloqueado no ve la card), pero la Server
-- Action toggleFollowAction acepta cualquier authorId — sin esto, un follow
-- se puede forzar por API.
drop policy if exists "community_follows_insert_own" on public.community_follows;
create policy "community_follows_insert_own"
  on public.community_follows for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and not private.strandia_bloqueo_entre(auth.uid(), followed_id)
  );


-- ===== Ni darse like =====
-- community_likes no tiene policy de insert/delete: se escribe SOLO via
-- toggle_community_like() (0016), que es SECURITY DEFINER y por lo tanto
-- PASA POR ENCIMA de la policy de arriba. Sin este guard, el bloqueado
-- todavia podria dar like por API aunque no vea la card. Se recrea la
-- funcion completa (identica a 0016) con la verificacion añadida.
create or replace function public.toggle_community_like(p_share_id uuid)
returns table (liked boolean, new_like_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_author_id uuid;
  v_existing uuid;
  v_new_count int;
  v_liked boolean;
begin
  if v_user_id is null then
    raise exception 'toggle_community_like requiere una sesion autenticada';
  end if;

  select user_id into v_author_id from public.community_shares where id = p_share_id;

  if v_author_id is null then
    raise exception 'Share no encontrado';
  end if;

  -- Mismo mensaje que un share inexistente: no le confirmamos al bloqueado
  -- que el share existe pero le esta vedado (migracion 0035).
  if private.strandia_bloqueo_entre(v_user_id, v_author_id) then
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

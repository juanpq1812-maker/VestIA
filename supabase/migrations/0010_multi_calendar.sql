-- Multi-calendario: un usuario puede conectar varios feeds (Google + Apple a
-- la vez). Se reemplaza el unique(user_id) del MVP por unique(user_id, url)
-- para seguir evitando duplicados del mismo calendario.

alter table public.calendar_feeds
  drop constraint if exists calendar_feeds_user_id_key;

alter table public.calendar_feeds
  add constraint calendar_feeds_user_url_key unique (user_id, url);

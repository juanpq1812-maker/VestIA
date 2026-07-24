-- =============================================================================
-- StrandIA — Migracion 0028: editorial_posts.notificado_at (Fase 2 — El Hilo)
--
-- Marca cuando se disparo el broadcast push de un post de El Hilo. NULL =
-- todavia no se notifico (el boton "Notificar" en /admin/hilo sigue activo).
-- Se escribe SOLO cuando /api/push/hilo/notify hace un envio real — si el
-- disparo cae en horario silencioso o el post no estaba publicado, esta
-- columna se queda en NULL a proposito, para poder reintentar mas tarde el
-- mismo dia (ver src/app/api/push/hilo/notify/route.ts).
-- =============================================================================

alter table public.editorial_posts
  add column if not exists notificado_at timestamptz;

comment on column public.editorial_posts.notificado_at is
  'Cuando se disparo el broadcast push de este post. NULL = todavia no notificado (boton "Notificar" sigue activo en /admin/hilo). Solo se escribe en un envio real — quiet hours o post despublicado NO lo tocan.';

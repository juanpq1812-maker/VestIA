-- =============================================================================
-- StrandIA — Migracion 0033: clothing_items.thumbnail_path
--
-- Miniatura WebP de 512px para la grilla del armario. La foto que se sirve hoy
-- es el PNG completo del pipeline: 896x1195 y ~361KB de media, dentro de una
-- card de ~171px. Son ~25x el area necesaria, y con 82 prendas eso da 28.9MB
-- por visita (medido sobre el bucket real).
--
-- POR QUE UNA COLUMNA Y NO UNA CONVENCION DE NOMBRE:
-- Se podria derivar el path de la miniatura del de la foto (`..._thumb.webp`),
-- pero entonces no habria forma de saber si existe. Firmar un path inexistente
-- devuelve una URL perfectamente valida que da 404 al cargarla — imagen rota,
-- peor que servir el PNG. Con la columna, `null` significa "no hay miniatura" y
-- el consumidor cae al PNG original sin pedir nada que no exista.
--
-- La miniatura es ADICIONAL, no un reemplazo: el PNG completo se sigue usando
-- en el detalle de la prenda y en la edicion. Nullable a proposito — las 266
-- prendas que ya existen arrancan en null y las llena `scripts/
-- backfill-thumbnails.mjs`, que es idempotente y reanudable justamente porque
-- se apoya en esta columna.
-- =============================================================================

alter table public.clothing_items
  add column if not exists thumbnail_path text;

comment on column public.clothing_items.thumbnail_path is
  'Path en el bucket clothing-images de la miniatura WebP 512px. NULL = no hay miniatura todavia (prenda anterior al backfill, o la generacion fallo); el consumidor cae a image_path.';

-- Sin GRANT explicito de columna: a diferencia de `profiles` (ver
-- 0008_waitlist_approved.sql), `clothing_items` no tiene column-level grants —
-- las policies de fila de 0003_clothing_items.sql cubren cualquier columna
-- nueva. Mismo caso que `source` en 0020_outfit_photo_detection.sql, que lleva
-- funcionando en produccion desde entonces. El cliente escribe esta columna en
-- el mismo insert/update donde ya escribe image_path.

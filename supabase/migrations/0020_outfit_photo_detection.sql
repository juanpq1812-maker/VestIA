-- =============================================================================
-- StrandIA — Migracion 0020: Deteccion de outfit completo (multi-prenda)
--
-- Agrega `source` a `clothing_items` para distinguir prendas subidas con su
-- propia foto (individual/rafaga) de prendas recortadas automaticamente de
-- una foto de outfit completo (selfie de espejo, cuerpo entero, tendido en
-- la cama). Las prendas 'outfit_extraction' tienen calidad de foto menor
-- (oclusiones, angulo) y son candidatas a "mejorar foto" en el armario.
--
-- Sin cambios de RLS ni grants de columna: a diferencia de `profiles`
-- (ver 0008_waitlist_approved.sql), `clothing_items` no tiene column-level
-- grants — las policies de fila (0003_clothing_items.sql) ya cubren
-- cualquier columna nueva sin configuracion adicional.
-- =============================================================================

alter table public.clothing_items
  add column if not exists source text not null default 'individual';

alter table public.clothing_items
  drop constraint if exists clothing_items_source_check;
alter table public.clothing_items
  add constraint clothing_items_source_check
  check (source in ('individual', 'outfit_extraction'));

comment on column public.clothing_items.source is
  'individual = subida normal/rafaga (foto propia de la prenda). outfit_extraction = recortada de una foto de outfit completo — calidad menor, candidata a "mejorar foto".';

-- =============================================================================
-- StrandIA — Migracion 0024: Flag de remocion de fondo (baja de Remove.bg)
--
-- Remove.bg se dio de baja del proyecto (se agotaron los creditos) — todo el
-- pipeline de imagen ahora pasa por Gemini (reconstruccion o remocion de
-- fondo minima, ver src/lib/wardrobe/burstQueue.ts y
-- src/components/wardrobe/UploadForm.tsx). Si Gemini falla del todo para una
-- prenda que no necesitaba reconstruccion, la prenda no se pierde: se guarda
-- con su foto original SIN remover el fondo, marcada con esta columna, para
-- poder reprocesarla despues con "Mejora esta foto".
--
-- Default true: todas las filas existentes ya pasaron por Remove.bg con
-- exito bajo el codigo viejo (nunca se guardaba nada sin fondo removido
-- antes de este cambio), asi que el backfill es correcto.
-- =============================================================================

alter table public.clothing_items
  add column if not exists background_removed boolean not null default true;

comment on column public.clothing_items.background_removed is
  'true = la imagen final tiene el fondo removido (via Gemini, reconstruida o no). false = fallback de última línea: Gemini falló del todo y se guardó la foto original tal cual — reprocesable con "Mejora esta foto".';

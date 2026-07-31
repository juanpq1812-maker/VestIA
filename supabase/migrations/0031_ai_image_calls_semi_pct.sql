-- =============================================================================
-- StrandIA — Migracion 0031: semi_pct + operacion local_segmentation
--
-- Acompaña al cambio de pipeline "@imgly primero": cuando la prenda no
-- necesita reconstruccion se intenta recortarla localmente con @imgly (gratis)
-- y solo se cae a Gemini si el recorte no es confiable.
--
-- `semi_pct` = porcentaje de pixeles semi-transparentes que quedan en el matte
-- despues de la limpieza. Es la señal que decide: @imgly devuelve alfa blando
-- cuando no esta seguro de la segmentacion. Medido sobre 28 prendas reales,
-- los 3 casos donde el recorte local salio mal tenian 9,1% / 9,9% / 13,6%,
-- contra <3,3% en 25 de los 26 buenos.
--
-- Se registra en TODAS las filas, incluidas las que nunca llegan a Gemini —
-- esa es justamente la serie que permite tunear el umbral con datos reales sin
-- seguir pagando COP 110 por prenda mientras se decide.
-- =============================================================================

alter table public.ai_image_calls
  add column if not exists semi_pct numeric(6, 3);

comment on column public.ai_image_calls.semi_pct is
  'Porcentaje de pixeles semi-transparentes tras la limpieza del matte. Señal de confianza de @imgly: alto = segmentacion dudosa.';

-- `local_segmentation` = recorte con @imgly sin pasar por Gemini. cost_usd 0.
alter table public.ai_image_calls
  drop constraint if exists ai_image_calls_operation_check;

alter table public.ai_image_calls
  add constraint ai_image_calls_operation_check
  check (operation in ('reconstruction', 'background_removal', 'local_segmentation'));

-- Consulta esperada para tunear el umbral: distribucion de semi_pct por
-- resultado, sobre las filas locales.
create index if not exists ai_image_calls_semi_pct_idx
  on public.ai_image_calls (operation, semi_pct)
  where semi_pct is not null;

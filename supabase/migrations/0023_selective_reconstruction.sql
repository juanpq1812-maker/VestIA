-- =============================================================================
-- StrandIA — Migracion 0023: Reconstruccion selectiva con Gemini (auditoria)
--
-- Hasta ahora `reconstructed` (0021) solo aplicaba a source='outfit_extraction',
-- que reconstruia SIEMPRE. Desde este cambio, la decision de reconstruir la
-- toma Claude Vision por evidencia (persona visible, prenda colgada/deformada,
-- muy arrugada, fondo cargado) en CUALQUIER flujo de subida (individual,
-- rafaga, outfit_extraction) — ver ANALYSIS_PROMPT en
-- src/app/wardrobe/upload/actions.ts y DETECTION_PROMPT en
-- src/app/wardrobe/upload/outfitDetectionActions.ts.
--
-- `reconstruction_reason` guarda el motivo corto que dio el modelo cuando
-- decidio que la foto necesitaba reconstruccion (null si no aplicaba). Sirve
-- para auditar cuantas reconstrucciones dispara cada causa y ajustar
-- criterios/costos con datos reales — no participa en ninguna logica de
-- negocio, es solo informativo.
-- =============================================================================

alter table public.clothing_items
  add column if not exists reconstruction_reason text;

comment on column public.clothing_items.reconstruction_reason is
  'Motivo corto (ej. "persona visible", "fondo cargado") que dio Claude Vision para marcar la foto como necesitada de reconstrucción con Gemini. null = no se consideró necesaria. Es el registro de auditoría de la decisión — no gatea nada en runtime.';

comment on column public.clothing_items.reconstructed is
  'true = la imagen final vino de la reconstrucción con Gemini. false = se usó el crop + Remove.bg directo, ya sea porque no se consideró necesario (ver reconstruction_reason) o porque Gemini falló/no había cupo — fallback nunca bloquea el flujo. Aplica a cualquier source, no solo outfit_extraction.';

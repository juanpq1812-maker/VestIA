-- =============================================================================
-- StrandIA — Migracion 0021: Flag de reconstruccion con Gemini
--
-- Para prendas source='outfit_extraction' (recortadas de una foto de outfit
-- completo), el pipeline intenta reconstruir una foto de producto limpia con
-- Gemini 2.5 Flash Image antes de Remove.bg (ver src/lib/wardrobe/burstQueue.ts).
-- Esta columna registra si esa reconstruccion se uso o si se cayo al fallback
-- (crop + Remove.bg directo, igual que antes de esta migracion).
-- =============================================================================

alter table public.clothing_items
  add column if not exists reconstructed boolean not null default false;

comment on column public.clothing_items.reconstructed is
  'true = la imagen final vino de la reconstrucción con Gemini (solo aplica a source=outfit_extraction). false = se usó el crop + Remove.bg directo, ya sea porque no aplicaba o porque Gemini falló/no había cupo — fallback nunca bloquea el flujo.';

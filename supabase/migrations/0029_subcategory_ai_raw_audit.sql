-- =============================================================================
-- StrandIA — Migracion 0029: Auditoria del valor crudo de subcategoria cuando
-- Claude Vision no matchea contra el enum de SUBCATEGORIES.
--
-- matchSubcategory (aiMapping.ts) solo hace match exacto o por substring
-- contra una lista cerrada por categoria — sin diccionario de sinonimos. Si
-- Vision devuelve un colombianismo ("buzo", "saco" mal categorizado, etc.)
-- que no matchea nada, hoy ese valor se descarta sin dejar rastro: la
-- prenda queda con subcategory=null y no hay forma de saber que dijo Vision
-- realmente. Esta columna guarda ese string crudo — solo se llena cuando el
-- match fallo, queda NULL en el caso normal (match exitoso).
-- =============================================================================

alter table public.clothing_items
  add column if not exists subcategory_ai_raw text;

comment on column public.clothing_items.subcategory_ai_raw is
  'Valor crudo de "subcategoria" que devolvio Claude Vision cuando NO matcheo contra ningun valor de SUBCATEGORIES para la categoria detectada. NULL si matcheo bien o si no hubo analisis de IA. Puramente para auditoria — nunca se usa para filtrar ni mostrar en UI.';

-- Migración 0006: AI Usage Gate
--
-- Agrega la columna `ai_uses` a la tabla `profiles`.
-- Registra cuántas veces ha usado funciones de IA cada usuario.
--
-- Lógica del gate:
--   ai_uses = 0  → primer uso gratuito permitido (se incrementa antes de llamar a la IA)
--   ai_uses >= 1 → se bloquea con modal de encuesta
--
-- El análisis automático al subir prendas (analyzeClothingImageAction) NO usa
-- este contador y sigue funcionando siempre.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_uses integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.ai_uses IS
  'Contador de usos de funciones IA (outfit generation, inspiración). 0 = no ha usado. >= 1 = ya agotó el uso gratuito.';

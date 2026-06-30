-- Migración 0007: Ventana de tiempo para el rate limiting de IA
--
-- Añade ai_uses_window_start a profiles para saber cuándo empezó la ventana
-- de 1 hora actual. La lógica vive en src/lib/ai/usageGate.ts:
--
--   - Si window_start es NULL o (now - window_start) > 1h → resetear ventana
--   - Si ai_uses >= 30 y la ventana sigue activa → bloquear
--   - Si ai_uses < 30 y la ventana sigue activa → permitir e incrementar
--
-- El NULL inicial hace que todos los usuarios existentes arranquen con
-- ventana nueva en su próxima llamada (sin importar su ai_uses actual).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_uses_window_start timestamptz;

COMMENT ON COLUMN profiles.ai_uses_window_start IS
  'Inicio de la ventana de rate limiting (1 hora). NULL = sin ventana activa, se resetea en la próxima llamada.';

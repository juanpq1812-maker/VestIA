-- =============================================================================
-- StrandIA — Migracion 0019: grant de columna para el rate limit de la rafaga
--
-- 0008_waitlist_approved.sql restringe el UPDATE de `profiles` a nivel de
-- columna (solo display_name, onboarding_completed, ai_uses,
-- ai_uses_window_start pueden ser escritas por `authenticated`). Las columnas
-- burst_ai_uses/burst_ai_uses_window_start de 0018_burst_upload.sql quedaron
-- fuera de esa lista, así que checkAndConsumeBurstUse() fallaba en
-- silencio (fail-closed) al intentar actualizarlas.
-- =============================================================================

grant update (burst_ai_uses, burst_ai_uses_window_start)
  on table public.profiles to authenticated;

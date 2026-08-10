-- =============================================================================
-- StrandIA — Migracion 0034: planes de usuario (Free / Premium)
--
-- Infraestructura para dos planes. Free: armario ilimitado, 10 generaciones
-- de outfits al mes, 5 mejoras de foto de por vida. Premium: sin esas dos
-- cuotas. Los pagos (Wompi) y las features premium en si (flat lay
-- editorial, vestir a Hebri) son proyectos separados que se cuelgan de esta
-- base — esta migracion solo agrega las columnas.
--
-- `premium_until` se guarda desde ya aunque todavia no haya pagos: el trial
-- de 7 dias del piloto usa el mismo mecanismo (ver fase de administracion),
-- asi no hay que migrar nada cuando llegue Wompi. `plan = 'premium'` con
-- `premium_until` vencido se trata como free en la app SIN degradar la fila
-- — no hay cron que la toque, `getUserPlan()` deriva `isPremium` comparando
-- `premium_until` contra `now()` en cada lectura.
--
-- `monthly_generations_month` guarda el mes ('YYYY-MM', hora de Colombia)
-- junto al contador — mismo patron sin-cron que `ai_uses_window_start`
-- (0007) y `burst_ai_uses_window_start` (0018): si el mes guardado no
-- coincide con el mes actual, el contador se trata como 0 y se reinicia en
-- la misma escritura, sin trabajo de fondo.
--
-- `photo_improvements_used` es un contador de por vida (no mensual): las 5
-- mejoras de "Mejora esta foto" en el plan free no se resetean cada mes.
--
-- ===== Grants de columna =====
-- `plan` y `premium_until` los cambia SOLO un admin (mismo criterio que
-- `approved` en 0008 e `is_admin` en 0013): si se les diera GRANT UPDATE a
-- `authenticated`, cualquier usuario podria auto-otorgarse premium con
-- `update({ plan: 'premium' })` desde el cliente, porque la policy RLS
-- `profiles_update_own` permite el UPDATE de la propia fila. NO llevan
-- grant aqui — la escritura pasa por `createSupabaseAdminClient()`
-- (service_role) desde el panel /admin/users.
--
-- `monthly_generations`, `monthly_generations_month` y
-- `photo_improvements_used` SI los escribe el usuario con su propia sesion
-- (los gates `checkAndConsumeGeneration`/`checkAndConsumePhotoImprovement`
-- corren con el client server-side normal, no con service_role) — igual que
-- `ai_uses`/`ai_uses_window_start`. Si se omite su grant, repiten el bug de
-- 0019: el UPDATE pasa la policy RLS pero el GRANT lo bloquea y el gate
-- falla en silencio (fail-closed).
-- =============================================================================

alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium')),
  add column if not exists premium_until timestamptz,
  add column if not exists monthly_generations integer not null default 0,
  add column if not exists monthly_generations_month text,
  add column if not exists photo_improvements_used integer not null default 0;

comment on column public.profiles.plan is
  'Plan del usuario: free o premium. Solo lo cambia un admin (service_role) — sin GRANT UPDATE a authenticated.';
comment on column public.profiles.premium_until is
  'Hasta cuando es premium (incluye el trial de 7 dias). Null en free. Un premium con esta fecha vencida se comporta como free sin necesidad de degradar la fila.';
comment on column public.profiles.monthly_generations is
  'Generaciones de outfits consumidas en el mes de monthly_generations_month. Cada tap del boton "Generar"/"Regenerar" cuenta 1, sin importar cuantos outfits devuelva.';
comment on column public.profiles.monthly_generations_month is
  'Mes al que corresponde monthly_generations, formato YYYY-MM en hora de Colombia (America/Bogota). Si no coincide con el mes actual, el contador se trata como 0.';
comment on column public.profiles.photo_improvements_used is
  'Mejoras de foto manuales ("Mejora esta foto") consumidas. Contador de por vida, no mensual.';

-- Ver nota de arriba: monthly_generations/monthly_generations_month/
-- photo_improvements_used los escribe el usuario autenticado; plan/
-- premium_until quedan fuera del grant a proposito.
grant update (monthly_generations, monthly_generations_month, photo_improvements_used)
  on table public.profiles to authenticated;

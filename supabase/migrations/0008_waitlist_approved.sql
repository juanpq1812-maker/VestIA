-- =============================================================================
-- StrandIA — Migracion 0008: Lista de espera (`profiles.approved`)
--
-- Los usuarios nuevos nacen sin aprobar y ven /waitlist hasta que un admin
-- cambia `approved` a true desde el dashboard de Supabase. Los usuarios
-- existentes tambien pasan por la lista de espera (decision de producto),
-- excepto la cuenta admin.
--
-- SEGURIDAD: la politica RLS `profiles_update_own` permite al usuario
-- actualizar su propia fila, asi que sin restriccion de columnas cualquiera
-- podria auto-aprobarse con `update({ approved: true })` desde el cliente.
-- Restringimos el UPDATE a nivel de columna: el rol `authenticated` solo puede
-- tocar las columnas que la app realmente escribe desde el cliente/servidor
-- con sesion de usuario (onboarding y rate limiting de IA). `approved` solo se
-- cambia con `service_role` (el SQL editor / dashboard de Supabase).
-- =============================================================================

alter table public.profiles
  add column if not exists approved boolean not null default false;

comment on column public.profiles.approved is
  'Lista de espera: false = el usuario ve /waitlist; true = acceso completo. Se aprueba manualmente desde Supabase.';

-- Aprobar la cuenta admin desde el inicio.
update public.profiles p
set approved = true
from auth.users u
where u.id = p.id
  and u.email = 'juanpq1812@gmail.com';

-- ===== Column-level grants =====
-- Revocamos el UPDATE generico y damos permiso solo sobre las columnas que la
-- app escribe con el rol del usuario. Las politicas RLS existentes siguen
-- limitando cada UPDATE a la propia fila.
revoke update on table public.profiles from authenticated;
revoke update on table public.profiles from anon;

grant update (display_name, onboarding_completed, ai_uses, ai_uses_window_start)
  on table public.profiles to authenticated;

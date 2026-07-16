-- =============================================================================
-- StrandIA — Migracion 0017: profiles.gender
--
-- Se pregunta en el onboarding para poder tratar al usuario con el genero
-- gramatical correcto en el copy de la app (ej. Hebri, el mascota) y para
-- darle a la IA de generacion de outfits una senal blanda mas de contexto
-- (recomendacion, no obligacion — igual que style_tags/favorite_occasions).
--
-- Sin RLS nueva: `profiles` ya tiene "profiles_select_own"/"profiles_update_own"
-- (0001_profiles.sql) que limitan cada UPDATE a la propia fila. PERO la
-- migracion 0008 revoco el UPDATE generico de la tabla y solo otorga columnas
-- especificas via GRANT — cualquier columna nueva que el usuario deba poder
-- editar (como esta, igual que display_name) necesita su propio GRANT, si no
-- el UPDATE falla con "permission denied for table profiles" aunque la RLS lo
-- permita.
-- =============================================================================

alter table public.profiles
  add column if not exists gender text
    check (gender in ('hombre', 'mujer', 'prefiero_no_decir'));

comment on column public.profiles.gender is
  'Genero declarado en el onboarding. Se usa para el genero gramatical correcto en el copy de la app y como contexto blando para la IA de outfits. NULL = no declarado (cuentas creadas antes de esta migracion).';

grant update (gender) on table public.profiles to authenticated;

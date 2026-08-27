-- =============================================================================
-- StrandIA — Migracion 0037: consentimiento de foto de cuerpo entero
--
-- El modo "outfit completo" (OutfitPhotoCapture) sube una foto del usuario de
-- cuerpo entero — selfie de espejo o similar — y la manda a Claude Vision para
-- detectar cada prenda. Es una categoria de dato distinta a una foto de una
-- prenda sobre la cama: es la persona. Hasta ahora se subia amparada en el
-- consentimiento generico del registro, que es exactamente lo que el diseño de
-- dos consentimientos existe para evitar.
--
-- Se pide UNA VEZ por version del texto, no en cada subida: a diferencia de
-- conectar un calendario (accion puntual), este es un modo de uso repetido, y
-- una casilla en cada foto se convierte en ruido que la gente marca sin leer —
-- que es peor que no pedirla. La constancia queda en legal_consents como
-- cualquier otra aceptacion.
--
-- Solo hace falta abrir el CHECK de `document`. Se hace por DO block y no por
-- `drop constraint <nombre>` porque el de la 0036 se creo inline y su nombre lo
-- generó Postgres: si el nombre no coincidiera, el drop no encontraria nada, el
-- add crearia un SEGUNDO check, y ambos tendrian que pasar — 'body_photo'
-- seguiria rechazado, en runtime y en silencio.
-- =============================================================================

do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.legal_consents'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%document%'
  loop
    execute format('alter table public.legal_consents drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.legal_consents
  add constraint legal_consents_document_check
  check (document in ('terms', 'privacy', 'age', 'body_photo'));

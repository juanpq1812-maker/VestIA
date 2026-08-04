-- =============================================================================
-- StrandIA — Migracion 0032: outfit_feedback
--
-- Guarda por que el usuario RECHAZO un outfit recien generado. No es
-- entrenamiento de ningun modelo: es personalizacion por contexto. Al generar,
-- `generateOutfits` lee las ultimas ~10 filas de este usuario, las agrega por
-- razon y mete un bloque corto en el prompt ("ha rechazado 4 outfits por
-- 'demasiados colores'"). Funciona desde el tercer feedback, no desde el
-- tres-milesimo.
--
-- Solo se captura sobre outfits generados, NUNCA sobre los guardados: guardar
-- ya es feedback positivo implicito, y "Lo usare hoy" es una senal aun mas
-- fuerte. Esas dos ya viven en `outfits` y `outfit_uses`.
--
-- Append-only a proposito: sin update ni delete. El historial de rechazos es
-- la senal; editarlo despues no tendria sentido. Si el usuario se borra, la FK
-- a profiles se lleva las filas (on delete cascade).
--
-- `item_ids` es un snapshot de las prendas que componian el outfit rechazado.
-- NO lleva FK a clothing_items: el outfit rechazado nunca se persistio como
-- fila en `outfits`, y si el usuario borra una prenda despues no queremos
-- perder el feedback (ni bloquear el borrado).
-- =============================================================================

create table if not exists public.outfit_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Razon unica, elegida de una lista cerrada (un tap, sin texto libre en v1).
  -- El check evita que un cliente inserte razones inventadas que despues
  -- ensuciarian el bloque del prompt.
  reason text not null check (
    reason in (
      'demasiados_colores',
      'no_combinan',
      'no_es_mi_estilo',
      'no_sirve_ocasion',
      'muy_formal',
      'muy_informal'
    )
  ),

  -- Snapshot de las prendas del outfit rechazado (ver nota de arriba).
  item_ids uuid[] not null default '{}',

  -- Contexto de la generacion, para poder leer el patron con matiz mas
  -- adelante ("rechaza por 'muy formal' solo en modo sorpresa"). Null cuando
  -- no aplica (en modo sorpresa/descripcion no hay ocasion elegida).
  occasion text,
  mode text not null check (mode in ('occasion', 'description', 'surprise')),

  created_at timestamptz not null default now()
);

-- El unico patron de lectura es "las ultimas N de este usuario".
create index if not exists outfit_feedback_user_created_idx
  on public.outfit_feedback (user_id, created_at desc);

alter table public.outfit_feedback enable row level security;

-- Owner-only, mismo patron que push_subscriptions (0025). Sin policies de
-- update/delete: la tabla es append-only por diseno.
drop policy if exists "outfit_feedback_select_own" on public.outfit_feedback;
create policy "outfit_feedback_select_own"
  on public.outfit_feedback for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "outfit_feedback_insert_own" on public.outfit_feedback;
create policy "outfit_feedback_insert_own"
  on public.outfit_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Explicito aunque el rol `authenticated` suele traer los grants por default:
-- sin el GRANT, RLS pasa pero el insert falla en silencio.
grant select, insert on public.outfit_feedback to authenticated;

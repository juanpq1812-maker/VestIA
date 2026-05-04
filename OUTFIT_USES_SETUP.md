# Outfit Uses Setup — VestIA

Guía corta para activar el **registro de uso real de outfits** (tabla
`outfit_uses`) en tu proyecto de Supabase.

Esta tabla es la base de las métricas defendibles del proyecto: en lugar de
medir cuántos outfits **guardaste** (intención), medimos cuántas veces los
**usaste** (uso real). Sobre ella se construirán las pantallas de impacto
ambiental y de prendas más/menos usadas.

---

## ¿Qué hace esta migración?

Crea la tabla `public.outfit_uses` con:

- **`id`** — UUID, llave primaria.
- **`user_id`** — FK a `profiles(id)`, `ON DELETE CASCADE`.
- **`outfit_id`** — FK a `outfits(id)`, `ON DELETE CASCADE`. Si borras un
  outfit, sus usos desaparecen también.
- **`used_date`** — Fecha en la que el usuario afirma que usó el outfit
  (tipo `date`, no `timestamp`).
- **`created_at`** — Timestamp en el que se insertó la fila (auditoría).
- **`UNIQUE (outfit_id, used_date)`** — Garantiza que un mismo outfit solo
  puede aparecer una vez por día.
- **3 índices** — para `user_id`, `outfit_id` y `used_date desc`.
- **RLS activado** con 4 policies: `select`, `insert`, `update`, `delete`,
  todas restringidas a `auth.uid() = user_id`.

---

## 1. Cómo correr la migración

1. Abre tu proyecto en [supabase.com/dashboard](https://supabase.com/dashboard).
2. En el sidebar, **SQL Editor → + New query**.
3. Copia y pega el bloque completo de abajo y dale **Run**.

> Asegúrate de haber corrido antes las migraciones `0001` a `0004`
> (especialmente `0004_outfits.sql`, que crea la tabla `outfits` referenciada
> por la FK).

```sql
-- =============================================================================
-- VestIA — Migracion 0005: Tabla `outfit_uses` (registro de uso real)
-- =============================================================================

create table if not exists public.outfit_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,

  used_date date not null,
  created_at timestamptz not null default now(),

  constraint outfit_uses_outfit_date_unique unique (outfit_id, used_date)
);

create index if not exists outfit_uses_user_id_idx on public.outfit_uses (user_id);
create index if not exists outfit_uses_outfit_id_idx on public.outfit_uses (outfit_id);
create index if not exists outfit_uses_used_date_idx on public.outfit_uses (used_date desc);

-- ===== RLS =====
alter table public.outfit_uses enable row level security;

drop policy if exists "outfit_uses_select_own" on public.outfit_uses;
create policy "outfit_uses_select_own"
  on public.outfit_uses for select
  using (auth.uid() = user_id);

drop policy if exists "outfit_uses_insert_own" on public.outfit_uses;
create policy "outfit_uses_insert_own"
  on public.outfit_uses for insert
  with check (auth.uid() = user_id);

drop policy if exists "outfit_uses_update_own" on public.outfit_uses;
create policy "outfit_uses_update_own"
  on public.outfit_uses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "outfit_uses_delete_own" on public.outfit_uses;
create policy "outfit_uses_delete_own"
  on public.outfit_uses for delete
  using (auth.uid() = user_id);
```

---

## 2. Verificación rápida

En el mismo SQL Editor, corre:

```sql
-- Estructura
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'outfit_uses';

-- Constraint UNIQUE
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.outfit_uses'::regclass;

-- Policies activas
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'outfit_uses';
```

Deberías ver:
- 5 columnas (`id`, `user_id`, `outfit_id`, `used_date`, `created_at`).
- Un `UNIQUE` sobre `(outfit_id, used_date)`.
- 4 policies (select / insert / update / delete).

---

## 3. Reglas que NO viven en SQL

La validación del **rango de fechas** (solo hoy o hasta 7 días atrás) NO
está en la base de datos a propósito: es una regla de UX y se hace en la
Server Action `registerOutfitUseAction` (en `src/app/outfits/actions.ts`).

El motivo: si en el futuro queremos relajar esa regla (p. ej. permitir
"hace 14 días"), no queremos volver a tocar SQL ni RLS.

---

## 4. Listo

Cuando termines, vuelve a la app y:

1. Ve a `/outfits` y genera un outfit.
2. Toca **"👕 Lo usaré hoy"**: debería mostrarse el toast de éxito.
3. Ve a `/outfits/saved`: deberías ver "Total usos: 1" y "Última vez: hoy".

Si algo falla con un mensaje del tipo `relation "public.outfit_uses" does
not exist`, es que la migración no se corrió. Si ves
`new row violates row-level security policy`, falta alguna de las 4
policies — vuelve al paso 1.

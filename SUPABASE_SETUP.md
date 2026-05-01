# Supabase Setup — VestIA

Guía para preparar la base de datos de **VestIA** en Supabase. Esta capa
(Capa 2) crea las tablas `profiles`, `user_preferences`, `clothing_items` y
`outfits`, con RLS activo y un trigger que crea automáticamente el `profile`
cuando un usuario nuevo se registra en `auth.users`.

> Si ya tienes Supabase con Auth funcionando, solo te falta correr las
> migraciones de abajo en orden.

---

## 1. Cómo ejecutar las migraciones

1. Abre tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. En el sidebar izquierdo, ve a **SQL Editor**.
3. Crea un nuevo query (botón **+ New query**).
4. Copia y pega cada migración **en orden**, ejecutando una a la vez con el botón **Run**:

   1. `supabase/migrations/0001_profiles.sql`
   2. `supabase/migrations/0002_user_preferences.sql`
   3. `supabase/migrations/0003_clothing_items.sql`
   4. `supabase/migrations/0004_outfits.sql`

> El orden importa: `user_preferences`, `clothing_items` y `outfits` referencian
> a `profiles`, y `profiles` referencia a `auth.users`. Si ejecutas fuera de
> orden, Supabase te tirará un error de _foreign key_.

---

## 2. Verificar que las tablas existen

En el dashboard de Supabase ve a **Table Editor** (icono de tabla en el sidebar). Deberías ver:

- `profiles`
- `user_preferences`
- `clothing_items`
- `outfits`

Alternativamente, en el SQL Editor ejecuta:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Esperado: las cuatro tablas listadas arriba (más cualquier otra que ya tuvieras).

---

## 3. Verificar que RLS está activo

En **Authentication → Policies** verás un listado por tabla. Cada tabla del
proyecto debe mostrar **RLS Enabled** y tener cuatro policies:

- `<tabla>_select_own`
- `<tabla>_insert_own`
- `<tabla>_update_own`
- `<tabla>_delete_own`

También puedes verificarlo desde SQL:

```sql
-- ¿Está RLS activo en cada tabla?
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','user_preferences','clothing_items','outfits');

-- ¿Qué policies existen?
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

`rowsecurity` debe ser `true` en las cuatro tablas, y deberías ver 4 policies
por tabla (16 en total).

---

## 4. Verificar el trigger `on_auth_user_created`

Crea un usuario de prueba desde la UI (`/register` en la app). Inmediatamente
debe aparecer una fila en `public.profiles` con el mismo `id` que el usuario
de `auth.users`. Para confirmarlo desde SQL:

```sql
select u.id as auth_user_id, p.id as profile_id, p.onboarding_completed
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc
limit 5;
```

Si el trigger funciona, `profile_id` nunca será `NULL` para usuarios nuevos.

---

## 5. Cosas pendientes para Capa 3 (Storage)

- Crear el bucket `clothing-images` en **Storage** (privado, con policies por
  `user_id`).
- Implementar la subida real desde `/wardrobe/upload`, escribiendo en
  `clothing_items.image_url` y `clothing_items.image_path`.

Las columnas `image_url` y `image_path` ya existen en la tabla y aceptan
`NULL`, así que cuando llegue Capa 3 solo conectamos el upload, no hay que
volver a tocar el esquema.

---

## 6. Tipos TypeScript

Los tipos están escritos a mano en `src/types/database.ts` para no depender
de la CLI de Supabase en Codespaces. Si en algún momento la instalas
globalmente, puedes regenerarlos así:

```bash
# Necesitas el PROJECT_REF de tu proyecto (lo ves en la URL del dashboard).
npx supabase gen types typescript \
  --project-id <PROJECT_REF> \
  --schema public \
  > src/types/database.ts
```

> Si modificas alguna migración, recuerda actualizar también
> `src/types/database.ts` para que el autocompletado siga siendo fiel.

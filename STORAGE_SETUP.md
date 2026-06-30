# Storage Setup — StrandIA (Capa 3)

Guía para configurar **Supabase Storage** para que `/wardrobe/upload`
pueda subir las fotos de las prendas y `/wardrobe` pueda mostrarlas con
URLs firmadas privadas (cada usuario solo ve sus propias prendas).

> Antes de seguir esta guía debes haber corrido las migraciones de
> [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) (Capa 2). La tabla
> `clothing_items` ya tiene las columnas `image_url` e `image_path`.

---

## 1. Crear el bucket `clothing-images`

1. Abre tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. En el sidebar izquierdo entra a **Storage**.
3. Pulsa **New bucket** (arriba a la derecha).
4. Configura el bucket exactamente así:

   | Campo                              | Valor                                                |
   | ---------------------------------- | ---------------------------------------------------- |
   | **Name**                           | `clothing-images`                                    |
   | **Public bucket**                  | **OFF** (tiene que quedar privado)                   |
   | **Allowed MIME types** (opcional)  | `image/jpeg, image/png, image/webp`                  |
   | **File size limit** (opcional)     | `5 MB` (la app comprime antes, pero es un cinturón)  |

5. Pulsa **Save**.

> **Importante:** déjalo como _privado_. Las imágenes solo se acceden por
> URL firmada (con expiración) o desde el navegador del usuario logueado.
> Si lo dejas público cualquiera con la URL podría ver fotos ajenas.

---

## 2. Configurar las policies de Storage

Las policies controlan **quién puede subir, ver, modificar y borrar
archivos** dentro del bucket. Queremos que cada usuario solo pueda tocar
los archivos que viven dentro de su propia "carpeta" (`{user_id}/...`).

1. Vuelve al **SQL Editor** del dashboard.
2. Crea un **+ New query**.
3. Pega el SQL de abajo **completo** y pulsa **Run**.

```sql
-- =============================================================================
-- StrandIA — Storage policies para el bucket `clothing-images`
--
-- Convencion de rutas: cada archivo se guarda como `{user_id}/{uuid}.{ext}`.
-- Por eso la primera carpeta del path (storage.foldername(name)[1]) tiene que
-- ser igual al `auth.uid()` del usuario.
-- =============================================================================

-- Por si vuelves a correr el script, las dropeamos primero.
drop policy if exists "clothing_images_insert_own"  on storage.objects;
drop policy if exists "clothing_images_select_own"  on storage.objects;
drop policy if exists "clothing_images_update_own"  on storage.objects;
drop policy if exists "clothing_images_delete_own"  on storage.objects;

-- INSERT: solo puedes subir a tu propia carpeta.
create policy "clothing_images_insert_own"
  on storage.objects for insert
    to authenticated
      with check (
          bucket_id = 'clothing-images'
              and (storage.foldername(name))[1] = auth.uid()::text
                );
                
                -- SELECT: solo ves tus propios archivos.
                create policy "clothing_images_select_own"
                  on storage.objects for select
                    to authenticated
                      using (
                          bucket_id = 'clothing-images'
                              and (storage.foldername(name))[1] = auth.uid()::text
                                );
                                
                                -- UPDATE: solo modificas (renombras / reemplazas) tus propios archivos.
                                create policy "clothing_images_update_own"
                                  on storage.objects for update
                                    to authenticated
                                      using (
                                          bucket_id = 'clothing-images'
                                              and (storage.foldername(name))[1] = auth.uid()::text
                                                )
                                                  with check (
                                                      bucket_id = 'clothing-images'
                                                          and (storage.foldername(name))[1] = auth.uid()::text
                                                            );
                                                            
                                                            -- DELETE: solo borras tus propios archivos.
                                                            create policy "clothing_images_delete_own"
                                                              on storage.objects for delete
                                                                to authenticated
                                                                  using (
                                                                      bucket_id = 'clothing-images'
                                                                          and (storage.foldername(name))[1] = auth.uid()::text
                                                                            );
                                                                            ``````

> **¿Por qué `(storage.foldername(name))[1]`?**
> Supabase guarda el path completo en la columna `name` (ej:
> `9f7c…/abcd-1234.jpg`). `storage.foldername()` lo divide por `/`, así
> que `[1]` te da la primera carpeta — en nuestra convención, el `user_id`.

---

## 3. Verificar que quedó bien

### 3.1 Que el bucket exista y sea privado

En el SQL Editor:

```sql
select id, name, public
from storage.buckets
where id = 'clothing-images';
```

Esperado: una fila con `public = false`.

### 3.2 Que las cuatro policies estén activas

```sql
select policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'clothing_images_%'
order by policyname;
```

Esperado: 4 filas (`insert_own`, `select_own`, `update_own`, `delete_own`).

### 3.3 Probar end-to-end desde la app

1. Inicia la app: `npm run dev`.
2. Inicia sesión y completa el onboarding si no lo has hecho.
3. Entra a **Subir prenda** (`/wardrobe/upload`).
4. Sube una foto (jpg/png/webp), elige categoría, subcategoría, color y
   ocasión, y pulsa **Guardar prenda**.
5. Si todo salió bien, te lleva a `/wardrobe` con un mensaje de éxito y
   ves la prenda en el grid con su imagen.
6. En el dashboard de Supabase, **Storage → clothing-images** debe haber
   una carpeta con tu `user_id` y dentro el archivo `{uuid}.{ext}`.
7. En **Table Editor → clothing_items** debe haber una fila nueva con
   `image_path = "{user_id}/{uuid}.{ext}"`.

### 3.4 Probar el aislamiento entre usuarios (opcional pero recomendado)

1. Cierra sesión y crea otra cuenta de prueba.
2. Entra a `/wardrobe` con esa segunda cuenta — no debes ver las prendas
   del primer usuario.
3. Si intentas adivinar la URL de un archivo del otro usuario, Supabase
   debe responder con 403.

---

## 4. Cosas a saber

- **URLs firmadas**: en `/wardrobe` la app pide URLs firmadas con
  validez de 1 hora para mostrar las imágenes. Si dejas la pestaña
  abierta más de eso y refrescas, se generan nuevas. Esto ya está
  implementado en `src/app/wardrobe/page.tsx`.
- **Compresión en el cliente**: antes de subir, la app redimensiona la
  imagen a un máximo de 1200 px en el lado mayor con calidad 0.85. Esto
  baja el peso de fotos de celular de ~3-5 MB a ~200-400 KB sin perder
  calidad visible.
- **Borrado**: por ahora la app solo crea prendas. Si más adelante
  agregamos un botón "Eliminar prenda", también hay que borrar el
  archivo de Storage (la policy de DELETE ya está lista).

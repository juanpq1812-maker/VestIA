-- =============================================================================
-- StrandIA — Migracion 0030: ai_image_calls (auditoria de llamadas a Gemini)
--
-- POR QUE: hoy no hay forma de saber cuanto cuesta realmente el pipeline de
-- imagen. Lo unico que existe son los contadores `burst_ai_uses` de `profiles`,
-- que son una ventana deslizante de 1 hora que se resetea — sirven de rate
-- limit, NO de contabilidad. Al contrastar la facturacion real de Google
-- (COP 25.513 en jul 2026) contra las prendas vivas (136) aparecieron ~97
-- llamadas sin explicar: prendas borradas, reintentos de "Mejora esta foto",
-- llamadas que fallaron despues de consumir credito. Ninguna es auditable.
--
-- Esta tabla registra CADA llamada en el momento en que ocurre, con el
-- usageMetadata que Gemini ya devuelve y que hoy se descarta. Con eso:
--   - costo real por prenda y por usuario
--   - sobrevive al borrado de la prenda (clothing_item_id queda en null, la
--     fila del costo se conserva — es justamente el gasto que hoy se pierde)
--   - tasa real de fallos por operacion, para medir si los cambios funcionan
--
-- La escribe SIEMPRE el servidor (los dos server actions de imagen). El
-- cliente solo lee lo suyo.
-- =============================================================================

create table if not exists public.ai_image_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Nullable a proposito, por dos motivos distintos:
  --   1. En el flujo individual la prenda todavia NO existe cuando se llama a
  --      Gemini (el insert en clothing_items pasa despues). Ahi queda null.
  --   2. `on delete set null` — si el usuario borra la prenda, la fila del
  --      costo SOBREVIVE. Ese gasto ya se pago y es exactamente el que hoy
  --      desaparece de los libros.
  clothing_item_id uuid references public.clothing_items(id) on delete set null,

  operation text not null check (operation in ('reconstruction', 'background_removal')),
  -- De donde vino: individual | burst | outfit_extraction | photo_improvement
  source text,
  model text not null,

  ok boolean not null,
  -- Motivo del fallo cuando ok=false: rate_limited, generation_failed,
  -- no_session, no_image, o el mensaje de la excepcion.
  reason text,

  -- usageMetadata de Gemini. Null cuando la llamada ni siquiera llego a la API
  -- (ej. rate_limited por el gate propio, que corta antes).
  prompt_tokens integer,
  image_tokens integer,
  text_tokens integer,
  -- Costo calculado al momento de la llamada con los precios vigentes, para
  -- que un cambio de tarifa futuro no reescriba la historia.
  cost_usd numeric(12, 8),

  duration_ms integer,
  created_at timestamptz not null default now()
);

-- Consultas esperadas: gasto por usuario en un rango, y gasto por prenda.
create index if not exists ai_image_calls_user_created_idx
  on public.ai_image_calls (user_id, created_at desc);

create index if not exists ai_image_calls_created_idx
  on public.ai_image_calls (created_at desc);

create index if not exists ai_image_calls_item_idx
  on public.ai_image_calls (clothing_item_id)
  where clothing_item_id is not null;

-- ===== RLS =====
-- El usuario puede LEER su propio gasto (para un futuro "cuanto llevas usado").
-- Nadie inserta, actualiza ni borra desde el cliente: los INSERT los hace el
-- servidor. Sin politica de insert para `authenticated`, un cliente no puede
-- inflar ni falsear su contabilidad.
alter table public.ai_image_calls enable row level security;

drop policy if exists "ai_image_calls_select_own" on public.ai_image_calls;
create policy "ai_image_calls_select_own"
  on public.ai_image_calls for select
  using (auth.uid() = user_id);

-- Los server actions corren con la sesion del usuario (createSupabaseServerClient),
-- no con service_role, asi que necesitan poder insertar SU propia fila. El
-- check ata la fila al usuario autenticado: no puede escribir gasto ajeno.
drop policy if exists "ai_image_calls_insert_own" on public.ai_image_calls;
create policy "ai_image_calls_insert_own"
  on public.ai_image_calls for insert
  with check (auth.uid() = user_id);

-- Sin politicas de update/delete: la contabilidad es append-only.

grant select, insert on public.ai_image_calls to authenticated;

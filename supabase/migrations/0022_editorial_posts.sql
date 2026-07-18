-- =============================================================================
-- StrandIA — Migracion 0022: El Hilo (editorial_posts)
--
-- Contenido editorial curado por el equipo de StrandIA (NO user-generated):
-- columnas de opinion, drops de marcas aliadas, tendencias. Reemplaza el
-- placeholder estatico "Marcas aliadas y beneficios" de /comunidad.
--
-- Administrado desde /admin/hilo con el mismo mecanismo de proteccion que
-- /admin/quests: profiles.is_admin (0013_community_quests.sql).
--
-- ===== Fuente unica de verdad para publicacion =====
-- `status` ('draft' | 'published') es la UNICA columna que participa en
-- filtros de visibilidad (RLS, queries publicas, admin). `published_at` es
-- puramente informativo: se setea a now() la primera vez que el post pasa a
-- 'published', se usa para ordenar el feed (mas reciente primero), y NUNCA
-- se usa como condicion de un WHERE/policy. Si el post se despublica,
-- `status` vuelve a 'draft' pero `published_at` se conserva tal cual estaba
-- — asi, si se vuelve a publicar, no pierde su fecha editorial original.
-- =============================================================================

create table if not exists public.editorial_posts (
  id uuid primary key default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Informativo unicamente — ver nota de "fuente unica de verdad" arriba.
  -- NULL = nunca se publico todavia.
  published_at timestamptz,

  title text not null,
  subtitle text,
  slug text not null unique,

  cover_image_path text not null,

  category text not null check (category in ('columna', 'drop', 'tendencia')),

  -- Solo aplica a category = 'drop'. No hay constraint cruzado a proposito:
  -- una columna o tendencia podria eventualmente mencionar una marca sin ser
  -- un "drop" formal, y el admin decide que mostrar en la UI segun category.
  brand_name text,
  brand_url text,

  author_name text not null default 'Equipo StrandIA',

  -- Array de bloques tipados: [{type:'paragraph'|'heading'|'image'|'quote', ...}]
  -- Validado a mano en src/lib/editorial/blocks.ts (mismo enfoque que
  -- outfitDetectionSchema.ts — sin zod en el proyecto).
  content jsonb not null default '[]'::jsonb,

  -- Unica fuente de verdad de visibilidad. Ver nota arriba.
  status text not null default 'draft' check (status in ('draft', 'published')),

  created_by uuid references public.profiles(id)
);

create index if not exists editorial_posts_status_published_idx
  on public.editorial_posts (status, published_at desc);

create unique index if not exists editorial_posts_slug_idx
  on public.editorial_posts (slug);

alter table public.editorial_posts enable row level security;

drop policy if exists "editorial_posts_select_published" on public.editorial_posts;
create policy "editorial_posts_select_published"
  on public.editorial_posts for select
  to authenticated
  using (status = 'published');

drop policy if exists "editorial_posts_admin_all" on public.editorial_posts;
create policy "editorial_posts_admin_all"
  on public.editorial_posts for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- updated_at automatico en cada UPDATE.
create or replace function public.editorial_posts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists editorial_posts_updated_at on public.editorial_posts;
create trigger editorial_posts_updated_at
  before update on public.editorial_posts
  for each row
  execute function public.editorial_posts_set_updated_at();

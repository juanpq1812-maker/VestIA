// Skeleton de /wardrobe: título + tabs + buscador + chips de categoría + grid
// de prendas 3:4. Replica la estructura de WardrobePage/WardrobeView para
// evitar layout shift.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-32 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Título + CTA desktop */}
          <div className="flex items-end justify-between gap-4">
            <div className="h-9 w-40 animate-pulse rounded bg-surface-2 sm:h-10" />
            <div className="hidden h-11 w-40 animate-pulse rounded-full bg-surface-2 md:block" />
          </div>

          {/* Tabs Prendas / Outfits */}
          <div className="mt-6 flex gap-6 border-b border-divider pb-3">
            <div className="h-5 w-20 animate-pulse rounded bg-surface-2" />
            <div className="h-5 w-16 animate-pulse rounded bg-surface-2" />
          </div>

          <section className="mt-8">
            {/* Buscador */}
            <div className="h-[52px] w-full animate-pulse rounded-xl bg-surface-2" />

            {/* Categorías: dropdown (mobile) / chips (desktop) */}
            <div className="mt-8">
              <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-12 w-full animate-pulse rounded-xl bg-surface-2 md:hidden" />
              <div className="mt-3 hidden flex-wrap gap-2 md:flex">
                {[16, 24, 20, 24, 20, 24, 28].map((w, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-full bg-surface-2"
                    style={{ width: `${w * 4}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Grid de prendas */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-14 animate-pulse rounded bg-surface-2" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-surface-2" />
                    <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-surface-2" />
                    <div className="mt-2.5 h-8 w-full animate-pulse rounded-lg bg-surface-2" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// Skeleton de /outfits/saved: título + tabs + grid de outfits guardados.
// Replica SavedOutfitsPage.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Título */}
          <div className="h-9 w-56 animate-pulse rounded bg-surface-2 sm:h-10" />

          {/* Tabs Prendas / Outfits */}
          <div className="mt-6 flex gap-6 border-b border-divider pb-3">
            <div className="h-5 w-20 animate-pulse rounded bg-surface-2" />
            <div className="h-5 w-16 animate-pulse rounded bg-surface-2" />
          </div>

          {/* Grid de outfits guardados */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-surface shadow-sm">
                <div className="grid grid-cols-3 gap-1 p-3">
                  {[0, 1, 2].map((k) => (
                    <div
                      key={k}
                      className="aspect-[3/4] animate-pulse rounded-md bg-surface-2"
                    />
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-2" />
                  <div className="mt-3 h-10 w-full animate-pulse rounded-full bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

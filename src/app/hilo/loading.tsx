// Skeleton de /hilo: título + intro, chips de filtro, grid editorial.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="h-9 w-32 animate-pulse rounded bg-surface-2 sm:h-10" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-surface-2" />

          <div className="mt-6 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-surface-2" />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-surface shadow-sm">
                <div className="aspect-[4/3] animate-pulse bg-surface-2" />
                <div className="p-4">
                  <div className="h-4 w-16 animate-pulse rounded-full bg-surface-2" />
                  <div className="mt-2 h-5 w-3/4 animate-pulse rounded bg-surface-2" />
                  <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

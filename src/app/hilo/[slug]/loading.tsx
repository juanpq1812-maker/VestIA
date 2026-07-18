// Skeleton de /hilo/[slug]: portada grande, título, meta y párrafos.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-surface-2 sm:aspect-[16/9]" />

          <div className="mx-auto mt-6 max-w-2xl">
            <div className="h-5 w-20 animate-pulse rounded-full bg-surface-2" />
            <div className="mt-3 h-9 w-full animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-9 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 h-4 w-40 animate-pulse rounded bg-surface-2" />

            <div className="mt-8 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-surface-2" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

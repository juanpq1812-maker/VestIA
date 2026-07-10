// Skeleton de /pricing: encabezado centrado + cards de planes. Replica
// PricingPage/PricingPlans.

import HeaderSkeleton from "@/components/layout/HeaderSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Encabezado centrado */}
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="h-9 w-72 animate-pulse rounded bg-surface-2 sm:h-12 sm:w-96" />
            <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-surface-2" />
            <div className="mt-2 h-4 w-2/3 max-w-sm animate-pulse rounded bg-surface-2" />
          </div>

          {/* Cards de planes */}
          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-xl bg-surface p-6 shadow-sm">
                <div className="h-5 w-24 animate-pulse rounded bg-surface-2" />
                <div className="mt-3 h-10 w-32 animate-pulse rounded bg-surface-2" />
                <div className="mt-5 space-y-3">
                  {[0, 1, 2, 3].map((k) => (
                    <div key={k} className="h-4 w-full animate-pulse rounded bg-surface-2" />
                  ))}
                </div>
                <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-surface-2" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

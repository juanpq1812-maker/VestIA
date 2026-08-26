// Skeleton de /profile/blocked — replica título y filas de la lista.

import Container from "@/components/ui/Container";

export default function BlockedLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header placeholder */}
      <div className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-8 w-28 animate-pulse rounded bg-surface-2" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="md">
          <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 h-9 w-64 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-surface-2" />

          <div className="mt-8 overflow-hidden rounded-xl bg-surface shadow-sm">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-divider px-4 py-4 last:border-b-0"
              >
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-36 animate-pulse rounded bg-surface-2" />
                  <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
                </div>
                <div className="h-9 w-32 animate-pulse rounded-full bg-surface-2" />
              </div>
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}

// Skeleton de /profile/help — replica título, card del chat y lista de FAQ.

import Container from "@/components/ui/Container";

export default function HelpLoading() {
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

          {/* Card del chat */}
          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
              <div className="flex flex-col gap-2">
                <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-56 animate-pulse rounded bg-surface-2" />
              </div>
            </div>
            <div className="flex min-h-48 flex-col gap-3 p-5">
              <div className="h-4 w-72 animate-pulse rounded bg-surface-2" />
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-9 w-40 animate-pulse rounded-full bg-surface-2" />
                ))}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-10 h-8 w-64 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 flex flex-col gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}

// Skeleton de /pet — replica el layout de HebriFull (sprite grande + score + accesorios).

import Container from "@/components/ui/Container";

export default function PetLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-30 border-b border-divider bg-surface/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="h-8 w-28 animate-pulse rounded bg-surface-2" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>

      <main className="flex-1 pb-24 pt-8 sm:pb-14 sm:pt-12">
        <Container size="sm">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-9 w-32 animate-pulse rounded bg-surface-2" />

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-surface-2" />
            <div className="h-4 w-56 animate-pulse rounded bg-surface-2" />
            <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="mt-6 h-20 animate-pulse rounded-xl bg-surface-2" />

          <div className="mt-8 h-4 w-40 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        </Container>
      </main>
    </div>
  );
}

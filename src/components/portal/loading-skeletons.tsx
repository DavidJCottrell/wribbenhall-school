import { Skeleton } from "@/components/ui/skeleton"

// Shapes that match what is about to appear, so the page doesn't jump when it arrives.
function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-6">
      <Skeleton className="h-6 w-1/2" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={index === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"} />
      ))}
    </div>
  )
}

export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading" className="container-page grid gap-6 py-10 lg:grid-cols-2">
      {Array.from({ length: cards }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
}

// A page header and a few cards, for pages that open straight from the portal menu.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="border-b border-border">
        <div className="container-page space-y-4 pt-14 pb-12 md:pt-20 md:pb-16">
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <div className="container-page grid gap-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <CardSkeleton key={index} lines={2} />
        ))}
      </div>
    </div>
  )
}

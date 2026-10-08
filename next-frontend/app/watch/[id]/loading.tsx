function SkeletonCard() {
  return (
    <div className="flex w-full gap-2.5">
      <div className="aspect-video w-40 shrink-0 animate-pulse rounded-[var(--radius-4)] bg-muted" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-4 w-4/5 animate-pulse rounded-[var(--radius-1)] bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-[var(--radius-1)] bg-muted" />
      </div>
    </div>
  )
}

export default function WatchLoading() {
  return (
    <div className="flex w-full items-start gap-6 p-6" aria-busy="true" aria-live="polite">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="aspect-video w-full animate-pulse rounded-[var(--radius-4)] bg-muted" />
        <div className="h-7 w-3/4 animate-pulse rounded-[var(--radius-1)] bg-muted" />
        <div className="h-10 w-48 animate-pulse rounded-[var(--radius-full)] bg-muted" />
      </div>
      <div className="flex w-[411px] shrink-0 flex-col gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

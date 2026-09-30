function SkeletonCard() {
  return (
    <div className="flex w-[266px] flex-col gap-2">
      <div className="aspect-video w-full animate-pulse rounded-[var(--radius-4)] bg-muted" />
      <div className="h-4 w-4/5 animate-pulse rounded-[var(--radius-1)] bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded-[var(--radius-1)] bg-muted" />
    </div>
  )
}

export default function ChannelLoading() {
  return (
    <div className="flex w-full flex-col gap-6 pb-12" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2 px-6 pt-8">
        <div className="h-8 w-64 animate-pulse rounded-[var(--radius-1)] bg-muted" />
        <div className="h-5 w-40 animate-pulse rounded-[var(--radius-1)] bg-muted" />
      </div>
      <div className="flex flex-wrap items-start gap-6 px-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

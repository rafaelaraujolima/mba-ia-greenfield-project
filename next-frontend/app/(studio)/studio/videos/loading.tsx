import { cn } from "@/lib/utils"

function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-40 w-full max-w-[1088px] items-center gap-4 p-2", className)}>
      <div className="h-36 w-64 shrink-0 animate-pulse rounded-[var(--radius-4)] bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 animate-pulse rounded-[var(--radius-1)] bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-[var(--radius-1)] bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded-[var(--radius-1)] bg-muted" />
      </div>
    </div>
  )
}

export default function StudioVideosLoading() {
  return (
    <div className="flex w-full flex-col" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 animate-pulse rounded-[var(--radius-1)] bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-[var(--radius-1)] bg-muted" />
        </div>
      </div>
      <div className="flex flex-col gap-6 px-6 pt-6">
        <SkeletonRow className="border-b border-border pb-4" />
        <SkeletonRow className="border-b border-border pb-4" />
        <SkeletonRow className="border-b border-border pb-4" />
      </div>
    </div>
  )
}

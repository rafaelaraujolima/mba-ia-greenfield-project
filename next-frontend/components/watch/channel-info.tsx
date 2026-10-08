import { cn } from "@/lib/utils"

function ChannelInfo({
  className,
  channelName,
  channelNickname,
}: {
  className?: string
  channelName: string
  channelNickname?: string | null
}) {
  return (
    <div data-slot="channel-info" className={cn("flex items-center gap-3", className)}>
      <div
        aria-hidden="true"
        className="size-10 shrink-0 rounded-[var(--radius-full)] border border-border bg-muted"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-label-lg text-foreground">{channelName}</span>
        {channelNickname ? (
          <span className="text-caption text-muted-foreground">@{channelNickname}</span>
        ) : null}
      </div>
    </div>
  )
}

export { ChannelInfo }

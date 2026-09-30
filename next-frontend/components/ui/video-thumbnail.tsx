import * as React from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function VideoThumbnail({
  className,
  videoId,
  version,
  durationSeconds,
  alt = "",
  sizes,
  ...props
}: Omit<React.ComponentProps<typeof Image>, "src" | "fill"> & {
  videoId?: string
  version?: string
  durationSeconds?: number | null
}) {
  const src = videoId
    ? `/api/videos/${videoId}/thumbnail${version ? `?v=${encodeURIComponent(version)}` : ""}`
    : undefined

  return (
    <div
      data-slot="video-thumbnail"
      className={cn("relative overflow-hidden rounded-[var(--radius-4)] bg-muted", className)}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "256px"}
          className="object-cover"
          // The BFF route (`/api/videos/{id}/thumbnail`) 302-redirects to a
          // pre-signed STORAGE_PUBLIC_ENDPOINT URL (mirrors the upstream
          // VideosController_getThumbnail contract). next/image's internal
          // fetch path for local `src`s does not follow redirects — it reads
          // the route handler's response directly, so a 302 (empty body)
          // fails optimization. `unoptimized` makes the browser request the
          // path natively, which follows redirects transparently.
          unoptimized
          {...props}
        />
      ) : (
        <div
          data-slot="video-thumbnail-placeholder"
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-caption"
        />
      )}
      {durationSeconds != null ? (
        <span
          data-slot="video-thumbnail-duration"
          className="absolute bottom-1 right-1 rounded-[var(--radius-1)] bg-almost-black-1000/80 px-1.5 py-0.5 text-caption text-white"
        >
          {formatDuration(durationSeconds)}
        </span>
      ) : null}
    </div>
  )
}

export { VideoThumbnail }

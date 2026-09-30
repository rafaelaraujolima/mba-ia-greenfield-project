"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { VideoThumbnail } from "@/components/ui/video-thumbnail"

const MAX_SIZE_BYTES = 5 * 1024 * 1024

function ThumbUpload({
  className,
  videoId,
  version,
  durationSeconds,
  error: externalError,
  onFileChange,
  ...props
}: React.ComponentProps<"div"> & {
  videoId?: string
  version?: string
  durationSeconds?: number | null
  /** Server-reported error (e.g. `INVALID_FILE_TYPE` / `THUMBNAIL_SIZE_EXCEEDED`
   *  from the Save Changes submit), rendered alongside/instead of the
   *  client-side validation error below. Controlled by the parent form. */
  error?: string | null
  onFileChange?: (file: File | null) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const effectiveError = externalError ?? localError

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileSelected: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setLocalError("Only image files are accepted")
      onFileChange?.(null)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError("File size exceeds the 5MB limit")
      onFileChange?.(null)
      return
    }

    setLocalError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    onFileChange?.(file)
  }

  return (
    <div data-slot="thumb-upload" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="relative h-[151px] w-[266px] overflow-hidden rounded-[var(--radius-3)]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview, next/image cannot optimize blob: URLs
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <VideoThumbnail
            videoId={videoId}
            version={version}
            durationSeconds={durationSeconds}
            alt=""
            className="h-full w-full"
          />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="sr-only"
        aria-label="Choose thumbnail file"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        Change Thumbnail
      </Button>
      {effectiveError ? (
        <p role="alert" className="text-caption text-destructive">
          {effectiveError}
        </p>
      ) : null}
    </div>
  )
}

export { ThumbUpload }

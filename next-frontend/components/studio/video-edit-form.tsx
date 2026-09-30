"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SectionHeader } from "@/components/ui/section-header"
import { FieldError } from "@/components/auth/field-error"
import { ThumbUpload } from "@/components/studio/thumb-upload"
import { PrivacyOption } from "@/components/studio/privacy-option"
import { VideoConfigCard } from "@/components/studio/video-config-card"

/**
 * Error contract `onSave` may throw to steer where the message lands:
 * `field: "categoryId"` → inline under the Category select (mirrors
 * `CATEGORY_NOT_FOUND`); `field: "thumbnail"` → inline below ThumbUpload
 * (mirrors `INVALID_FILE_TYPE` / `THUMBNAIL_SIZE_EXCEEDED`); no `field` →
 * form-level message (e.g. `VIDEO_NOT_OWNED`, generic failures).
 */
class VideoEditSubmitError extends Error {
  field?: "categoryId" | "thumbnail"

  constructor(message: string, field?: "categoryId" | "thumbnail") {
    super(message)
    this.name = "VideoEditSubmitError"
    this.field = field
  }
}

const videoEditSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  visibility: z.enum(["public", "unlisted"]),
})

type VideoEditValues = z.infer<typeof videoEditSchema>

type VideoStatus = "processing" | "ready" | "failed"

type Video = {
  id: string
  title: string
  description: string | null
  categoryId: string
  visibility: "public" | "unlisted"
  status: VideoStatus
  publishedAt: string | null
  videoLink: string
  durationSeconds: number | null
  height: number | null
  thumbnailVersion?: string
}

type Category = {
  id: string
  name: string
}

function VideoEditForm({
  className,
  video,
  categories,
  onSave,
  onPublish,
  onCancel,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  video: Video
  categories: Category[]
  onSave: (
    values: VideoEditValues & { thumbnailFile: File | null }
  ) => Promise<void>
  onPublish?: () => Promise<void>
  onCancel?: () => void
}) {
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null)
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishError, setPublishError] = React.useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VideoEditValues>({
    resolver: zodResolver(videoEditSchema),
    defaultValues: {
      title: video.title,
      description: video.description ?? "",
      categoryId: video.categoryId,
      visibility: video.visibility,
    },
  })

  async function submit(values: VideoEditValues) {
    setThumbnailError(null)
    try {
      await onSave({ ...values, thumbnailFile })
    } catch (error) {
      if (error instanceof VideoEditSubmitError) {
        if (error.field === "categoryId") {
          setError("categoryId", { message: error.message })
          return
        }
        if (error.field === "thumbnail") {
          setThumbnailError(error.message)
          return
        }
        setError("root.serverError", { message: error.message })
        return
      }
      if (error instanceof Error) {
        setError("root.serverError", { message: error.message })
        return
      }
      throw error
    }
  }

  async function handlePublish() {
    if (!onPublish) return
    setIsPublishing(true)
    setPublishError(null)
    try {
      await onPublish()
    } catch (error) {
      if (error instanceof Error) {
        setPublishError(error.message)
        return
      }
      throw error
    } finally {
      setIsPublishing(false)
    }
  }

  const canPublish = video.status === "ready" && video.publishedAt == null

  return (
    <form
      data-slot="video-edit-form"
      noValidate
      onSubmit={handleSubmit(submit)}
      className={cn("flex w-full flex-col gap-6", className)}
      {...props}
    >
      {errors.root?.serverError?.message ? (
        <p role="alert" className="text-caption text-destructive">
          {errors.root.serverError.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <ThumbUpload
        videoId={video.id}
        version={video.thumbnailVersion}
        durationSeconds={video.durationSeconds}
        error={thumbnailError}
        onFileChange={setThumbnailFile}
      />

      <div className="flex flex-col gap-2">
        <SectionHeader id="category-heading" title="Category" />
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger aria-labelledby="category-heading" aria-label="Category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.categoryId?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader id="visibility-heading" title="Visibility" />
        <Controller
          control={control}
          name="visibility"
          render={({ field }) => (
            <div role="radiogroup" aria-labelledby="visibility-heading" className="flex flex-col gap-2">
              <PrivacyOption
                value="public"
                selected={field.value === "public"}
                onSelect={field.onChange}
                title="Public"
                description="Anyone can search for and view"
              />
              <PrivacyOption
                value="unlisted"
                selected={field.value === "unlisted"}
                onSelect={field.onChange}
                title="Unlisted"
                description="Anyone with the video link can view"
              />
            </div>
          )}
        />
      </div>

      <VideoConfigCard
        videoLink={video.videoLink}
        durationSeconds={video.durationSeconds}
        height={video.height}
      />

      {video.status === "ready" ? (
        <p role="status" className="text-caption text-muted-foreground">
          Checks complete. No issues found.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" size="md" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={!canPublish || isPublishing}
          onClick={handlePublish}
        >
          {isPublishing ? "Publishing…" : "Publish"}
        </Button>
      </div>

      {publishError ? (
        <p role="alert" className="text-caption text-destructive">
          {publishError}
        </p>
      ) : null}
    </form>
  )
}

export { VideoEditForm, VideoEditSubmitError }

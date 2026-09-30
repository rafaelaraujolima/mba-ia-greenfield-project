"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FieldError } from "@/components/auth/field-error"

const channelSettingsSchema = z.object({
  nickname: z
    .string()
    .min(1, "Handle is required")
    .regex(
      /^[a-z0-9_]+$/,
      "Handle can only contain lowercase letters, digits and underscores"
    ),
  name: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
})

type ChannelSettingsValues = z.infer<typeof channelSettingsSchema>

type Channel = {
  nickname: string
  name: string
  description: string | null
  updatedAt: string
}

function formatLastUpdated(updatedAt: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(updatedAt)
  )
}

function ChannelSettingsForm({
  className,
  channel,
  onSubmit,
  onCancel,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  channel: Channel
  onSubmit: (values: ChannelSettingsValues) => Promise<void>
  onCancel?: () => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChannelSettingsValues>({
    resolver: zodResolver(channelSettingsSchema),
    defaultValues: {
      nickname: channel.nickname,
      name: channel.name,
      description: channel.description ?? "",
    },
  })

  async function submit(values: ChannelSettingsValues) {
    try {
      await onSubmit(values)
    } catch (error) {
      if (error instanceof Error && error.message === "NICKNAME_ALREADY_EXISTS") {
        setError("nickname", { message: "This handle is already taken" })
        return
      }
      throw error
    }
  }

  return (
    <form
      data-slot="channel-settings-form"
      noValidate
      onSubmit={handleSubmit(submit)}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname">Handle</Label>
        <Input
          id="nickname"
          aria-invalid={!!errors.nickname}
          aria-describedby={errors.nickname ? "nickname-error" : undefined}
          {...register("nickname")}
        />
        {errors.nickname?.message ? (
          <p id="nickname-error" className="text-caption text-destructive">
            {errors.nickname.message}
          </p>
        ) : (
          <p className="text-helper text-muted-foreground">
            Your unique identifier on StreamTube
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name?.message ? (
          <FieldError message={errors.name?.message} />
        ) : (
          <p className="text-helper text-muted-foreground">
            The name that appears on your channel
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <span className="text-caption text-muted-foreground">
        Last updated {formatLastUpdated(channel.updatedAt)}
      </span>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export { ChannelSettingsForm }

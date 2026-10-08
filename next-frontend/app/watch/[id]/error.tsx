"use client"

import { Button } from "@/components/ui/button"

export default function WatchError({
  reset,
}: Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-body-md text-muted-foreground">Something went wrong loading this video.</p>
      <Button variant="secondary" size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}

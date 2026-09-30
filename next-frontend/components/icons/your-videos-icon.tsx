import * as React from "react"
import { cn } from "@/lib/utils"

function YourVideosIcon({
  className,
  filled = false,
  ...props
}: React.ComponentProps<"svg"> & { filled?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-filled={filled}
      className={cn(className)}
      {...props}
    >
      <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
      <path d="m10 9 5 3-5 3Z" />
    </svg>
  )
}

export { YourVideosIcon }

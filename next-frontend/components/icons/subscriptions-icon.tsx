import * as React from "react"
import { cn } from "@/lib/utils"

function SubscriptionsIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(className)}
      {...props}
    >
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
      <polygon points="10 11 15 13.5 10 16 10 11" />
    </svg>
  )
}

export { SubscriptionsIcon }

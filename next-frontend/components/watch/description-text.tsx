import { cn } from "@/lib/utils"

function DescriptionText({
  className,
  description,
}: {
  className?: string
  description: string
}) {
  return (
    <details
      data-slot="description-text"
      className={cn(
        "group rounded-[var(--radius-2)] border border-border bg-card p-3.5",
        className
      )}
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <p className="line-clamp-2 whitespace-pre-line text-body-md text-foreground group-open:hidden">
          {description}
        </p>
        <span className="text-label-md text-muted-foreground">
          <span className="group-open:hidden">Mostrar mais</span>
          <span className="hidden group-open:inline">Mostrar menos</span>
        </span>
      </summary>
      <p className="mt-2 whitespace-pre-line text-body-md text-foreground">{description}</p>
    </details>
  )
}

export { DescriptionText }

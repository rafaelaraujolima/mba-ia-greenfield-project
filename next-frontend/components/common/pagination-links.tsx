import Link from "next/link"

import type { PaginationWindow } from "@/lib/pagination"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

type PaginationLinksProps = {
  /** Result of `getPaginationWindow`. */
  window: PaginationWindow
  /** Builds the href for a given page number, e.g. `(page) => \`/videos?page=${page}\``. */
  buildHref: (page: number) => string
}

/**
 * Cross-route pagination UI: composes the shadcn `Pagination` primitive
 * with `next/link` for `?page=N` navigation. Used by RSC pages following
 * the TD-02 pattern (URL as state via `searchParams`).
 */
export function PaginationLinks({ window, buildHref }: PaginationLinksProps) {
  const { currentPage, totalPages, pages, hasPrevious, hasNext } = window

  if (totalPages <= 1) {
    return null
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={hasPrevious ? buildHref(currentPage - 1) : undefined}
            aria-disabled={!hasPrevious}
            tabIndex={hasPrevious ? undefined : -1}
          />
        </PaginationItem>

        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink asChild isActive={page === currentPage}>
              <Link href={buildHref(page)}>{page}</Link>
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href={hasNext ? buildHref(currentPage + 1) : undefined}
            aria-disabled={!hasNext}
            tabIndex={hasNext ? undefined : -1}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

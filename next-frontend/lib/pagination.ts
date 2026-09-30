/**
 * Pagination helper for the RSC + `searchParams` pattern (TD-02).
 *
 * Convention for screen SIs consuming this: in an async RSC page,
 * `const { page } = await searchParams` (Next.js 15+ makes `searchParams`
 * a Promise), normalize it with `normalizePage`, then call
 * `upstream.GET(...)` server-side with the normalized page before
 * rendering the list and a `PaginationLinks` component.
 */

const DEFAULT_WINDOW_SIZE = 5

/**
 * Normalizes a raw `searchParams.page` value into a positive integer page
 * number. Absent, non-numeric, or values less than 1 all fall back to 1.
 */
export function normalizePage(
  rawPage: string | string[] | undefined
): number {
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage

  if (!value) {
    return 1
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export type PaginationWindow = {
  currentPage: number
  totalPages: number
  pages: number[]
  hasPrevious: boolean
  hasNext: boolean
}

/**
 * Computes a "window" of page numbers around the current page, clamped to
 * the valid page range. Shows every page when the total fits within
 * `windowSize`; otherwise slides a `windowSize`-wide window so it stays
 * centered on the current page without running past the first/last page.
 */
export function getPaginationWindow(params: {
  page: number
  pageSize: number
  total: number
  windowSize?: number
}): PaginationWindow {
  const { page, pageSize, total, windowSize = DEFAULT_WINDOW_SIZE } = params

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)

  let start: number
  let end: number

  if (totalPages <= windowSize) {
    start = 1
    end = totalPages
  } else {
    const half = Math.floor(windowSize / 2)
    start = Math.min(
      Math.max(1, currentPage - half),
      totalPages - windowSize + 1
    )
    end = start + windowSize - 1
  }

  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return {
    currentPage,
    totalPages,
    pages,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  }
}

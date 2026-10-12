const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const groupedFormatter = new Intl.NumberFormat("en-US")

/** Compact count, e.g. `1.2K`, `2.4M` (likes, subscribers). */
export function formatCompactCount(count: number): string {
  return compactFormatter.format(count)
}

/** Count with thousands separator, e.g. `4,256` (comments total). */
export function formatGroupedCount(count: number): string {
  return groupedFormatter.format(count)
}

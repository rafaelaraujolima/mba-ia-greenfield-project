const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 30, unit: "days" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
]

const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })

/** "3 days ago"-style label for an ISO timestamp. */
export function formatRelativeTime(isoDate: string, now: number = Date.now()): string {
  let duration = (new Date(isoDate).getTime() - now) / 1000

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit)
    }
    duration /= division.amount
  }
  return formatter.format(Math.round(duration), "years")
}

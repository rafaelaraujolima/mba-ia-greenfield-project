import { describe, expect, it } from "vitest"

import { formatCompactCount, formatGroupedCount } from "../format-count"

describe("format-count", () => {
  it("formats compact counts", () => {
    expect(formatCompactCount(0)).toBe("0")
    expect(formatCompactCount(999)).toBe("999")
    expect(formatCompactCount(1200)).toBe("1.2K")
    expect(formatCompactCount(2_400_000)).toBe("2.4M")
  })

  it("formats grouped counts with a thousands separator", () => {
    expect(formatGroupedCount(245)).toBe("245")
    expect(formatGroupedCount(4256)).toBe("4,256")
  })
})

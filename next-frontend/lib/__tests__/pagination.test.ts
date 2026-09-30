import { describe, expect, it } from "vitest"

import { getPaginationWindow, normalizePage } from "@/lib/pagination"

describe("normalizePage", () => {
  it("normalizes an absent page to 1", () => {
    expect(normalizePage(undefined)).toBe(1)
  })

  it("normalizes a non-numeric page to 1", () => {
    expect(normalizePage("abc")).toBe(1)
  })

  it("normalizes a zero page to 1", () => {
    expect(normalizePage("0")).toBe(1)
  })

  it("normalizes a negative page to 1", () => {
    expect(normalizePage("-3")).toBe(1)
  })

  it("preserves a valid page number", () => {
    expect(normalizePage("3")).toBe(3)
  })

  it("takes the first value when given an array", () => {
    expect(normalizePage(["2", "5"])).toBe(2)
  })
})

describe("getPaginationWindow", () => {
  it("clamps the current page to 1 when total is empty", () => {
    const result = getPaginationWindow({ page: 1, pageSize: 10, total: 0 })
    expect(result).toEqual({
      currentPage: 1,
      totalPages: 1,
      pages: [1],
      hasPrevious: false,
      hasNext: false,
    })
  })

  it("shows every page when the total fits within the window", () => {
    const result = getPaginationWindow({ page: 1, pageSize: 10, total: 30 })
    expect(result.totalPages).toBe(3)
    expect(result.pages).toEqual([1, 2, 3])
    expect(result.hasPrevious).toBe(false)
    expect(result.hasNext).toBe(true)
  })

  it("on the first page", () => {
    const result = getPaginationWindow({
      page: 1,
      pageSize: 10,
      total: 200,
      windowSize: 5,
    })
    expect(result.currentPage).toBe(1)
    expect(result.totalPages).toBe(20)
    expect(result.pages).toEqual([1, 2, 3, 4, 5])
    expect(result.hasPrevious).toBe(false)
    expect(result.hasNext).toBe(true)
  })

  it("on the last page", () => {
    const result = getPaginationWindow({
      page: 20,
      pageSize: 10,
      total: 200,
      windowSize: 5,
    })
    expect(result.currentPage).toBe(20)
    expect(result.pages).toEqual([16, 17, 18, 19, 20])
    expect(result.hasPrevious).toBe(true)
    expect(result.hasNext).toBe(false)
  })

  it("slides the window to stay centered in the middle", () => {
    const result = getPaginationWindow({
      page: 10,
      pageSize: 10,
      total: 200,
      windowSize: 5,
    })
    expect(result.pages).toEqual([8, 9, 10, 11, 12])
    expect(result.hasPrevious).toBe(true)
    expect(result.hasNext).toBe(true)
  })

  it("clamps a page beyond totalPages to the last page", () => {
    const result = getPaginationWindow({ page: 99, pageSize: 10, total: 30 })
    expect(result.currentPage).toBe(3)
    expect(result.hasNext).toBe(false)
  })
})

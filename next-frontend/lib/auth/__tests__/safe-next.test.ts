import { describe, expect, it } from "vitest"

import { safeNext } from "@/lib/auth/safe-next"

describe("safeNext", () => {
  it("accepts a same-origin relative path", () => {
    expect(safeNext("/studio/videos")).toBe("/studio/videos")
  })

  it("rejects an absolute URL", () => {
    expect(safeNext("https://evil.com")).toBe("/")
  })

  it("rejects a protocol-relative URL", () => {
    expect(safeNext("//evil.com")).toBe("/")
  })

  it("rejects a backslash-disguised protocol-relative URL", () => {
    expect(safeNext("/\\evil.com")).toBe("/")
  })

  it("falls back to the given fallback when next is absent", () => {
    expect(safeNext(null, "/studio")).toBe("/studio")
    expect(safeNext(undefined, "/studio")).toBe("/studio")
    expect(safeNext("", "/studio")).toBe("/studio")
  })
})

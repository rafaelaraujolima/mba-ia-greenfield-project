// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

import { TabMenu } from "../tab-menu"

describe("TabMenu", () => {
  it("renders one tab per option and marks the active one via aria-selected", () => {
    render(<TabMenu options={["All", "Channel A"]} value="All" onValueChange={vi.fn()} />)

    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(2)
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Channel A" })).toHaveAttribute(
      "aria-selected",
      "false"
    )
  })

  it("calls onValueChange with the clicked option", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<TabMenu options={["All", "Channel A"]} value="All" onValueChange={onValueChange} />)

    await user.click(screen.getByRole("tab", { name: "Channel A" }))

    expect(onValueChange).toHaveBeenCalledWith("Channel A")
  })
})

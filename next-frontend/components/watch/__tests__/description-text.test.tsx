// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"

import { DescriptionText } from "../description-text"

describe("DescriptionText", () => {
  it("shows 'Mostrar mais' when collapsed", () => {
    render(<DescriptionText description="A video description." />)
    expect(screen.getByText("Mostrar mais")).toBeInTheDocument()
  })

  it("expands to show 'Mostrar menos' and the full description when the summary is clicked", async () => {
    const user = userEvent.setup()
    render(<DescriptionText description="A longer video description with details." />)

    await user.click(screen.getByText("Mostrar mais"))

    expect(screen.getByText("Mostrar menos")).toBeVisible()
    const fullTexts = screen.getAllByText("A longer video description with details.")
    expect(fullTexts.length).toBeGreaterThan(0)
  })
})

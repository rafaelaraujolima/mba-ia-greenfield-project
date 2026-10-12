// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChannelInfo } from "../channel-info"

describe("ChannelInfo", () => {
  it("renders name, nickname, compact subscriber count and the action slot", () => {
    render(
      <ChannelInfo
        channelName="Tech"
        channelNickname="tech"
        subscriberCount={1200}
        action={<button>Inscrever-se</button>}
      />
    )

    expect(screen.getByText("Tech")).toBeInTheDocument()
    expect(screen.getByText("@tech")).toBeInTheDocument()
    expect(screen.getByText("1.2K subscribers")).toHaveAttribute("aria-live", "polite")
    expect(screen.getByRole("button", { name: "Inscrever-se" })).toBeInTheDocument()
  })

  it("omits the count when subscriberCount is not provided", () => {
    render(<ChannelInfo channelName="Tech" />)

    expect(screen.queryByText(/subscribers/)).not.toBeInTheDocument()
  })
})

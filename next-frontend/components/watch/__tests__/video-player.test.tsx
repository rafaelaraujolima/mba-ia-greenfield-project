// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeAll } from "vitest"

import { VideoPlayer } from "../video-player"

beforeAll(() => {
  // jsdom does not implement real media playback.
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  window.HTMLMediaElement.prototype.pause = vi.fn()
})

describe("VideoPlayer", () => {
  it("renders a <video> sourced from the stream BFF route", () => {
    const { container } = render(<VideoPlayer videoId="video-1" />)
    const video = container.querySelector("video")
    expect(video).toHaveAttribute("src", "/api/videos/video-1/stream")
  })

  it("calls video.play() when the play button is clicked while paused", async () => {
    const user = userEvent.setup()
    const { container } = render(<VideoPlayer videoId="video-1" />)
    const video = container.querySelector("video")!

    await user.click(screen.getByRole("button", { name: "Reproduzir" }))

    expect(video.play).toHaveBeenCalledTimes(1)
  })

  it("flips the play/pause button label when the video reports play/pause events", () => {
    const { container } = render(<VideoPlayer videoId="video-1" />)
    const video = container.querySelector("video")!

    fireEvent.play(video)
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument()

    fireEvent.pause(video)
    expect(screen.getByRole("button", { name: "Reproduzir" })).toBeInTheDocument()
  })

  it("toggles mute when the volume button is clicked", async () => {
    const user = userEvent.setup()
    const { container } = render(<VideoPlayer videoId="video-1" />)
    const video = container.querySelector("video")! as HTMLVideoElement

    await user.click(screen.getByRole("button", { name: "Mudo" }))

    expect(video.muted).toBe(true)
  })
})

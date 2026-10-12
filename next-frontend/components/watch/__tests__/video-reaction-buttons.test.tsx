// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { server } from "@/mocks/server"
import { VideoReactionButtons } from "../video-reaction-buttons"

const { refreshMock, pushMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
  usePathname: () => "/watch/video-1",
}))

beforeEach(() => {
  refreshMock.mockClear()
  pushMock.mockClear()
})

function renderButtons(
  props: Partial<React.ComponentProps<typeof VideoReactionButtons>> = {},
  isLoggedIn = true
) {
  return render(
    <SessionProvider
      initialSession={{ userId: "u1", email: "a@b.c", channelSlug: "me", isLoggedIn }}
    >
      <VideoReactionButtons
        videoId="video-1"
        reaction={null}
        likeCount={1200}
        {...props}
      />
    </SessionProvider>
  )
}

describe("<VideoReactionButtons />", () => {
  it("shows the compact like count and both toggles unpressed", () => {
    renderButtons()

    expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("1.2K")
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
    expect(screen.getByRole("button", { name: "Dislike" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("PUTs the like, fills the icon, bumps the count and refreshes", async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.put("/api/videos/video-1/reaction", async ({ request }) => {
        bodies.push(await request.json())
        await gate
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButtons({ likeCount: 10 })

    await user.click(screen.getByRole("button", { name: "Like" }))

    // Optimistic state while the request is pending.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("11")
    )
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    release()
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(bodies).toEqual([{ type: "like" }])
  })

  it("DELETEs when clicking the active reaction", async () => {
    const user = userEvent.setup()
    const methods: string[] = []
    server.use(
      http.delete("/api/videos/video-1/reaction", () => {
        methods.push("DELETE")
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButtons({ reaction: "like", likeCount: 10 })

    await user.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(methods).toEqual(["DELETE"])
  })

  it("switching from like to dislike drops the like from the count", async () => {
    const user = userEvent.setup()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.put("/api/videos/video-1/reaction", async () => {
        await gate
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButtons({ reaction: "like", likeCount: 10 })

    await user.click(screen.getByRole("button", { name: "Dislike" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("9")
    )
    release()
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
  })

  it("redirects an anonymous visitor to login without calling the API", async () => {
    const user = userEvent.setup()
    renderButtons({}, false)

    await user.click(screen.getByRole("button", { name: "Like" }))

    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fwatch%2Fvideo-1")
  })

  it("redirects to login when the API answers 401", async () => {
    const user = userEvent.setup()
    server.use(
      http.put("/api/videos/video-1/reaction", () =>
        HttpResponse.json(
          { statusCode: 401, error: "UNAUTHORIZED", message: "x" },
          { status: 401 }
        )
      )
    )
    renderButtons()

    await user.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fwatch%2Fvideo-1")
    )
  })

  it("reverts the optimistic count when the API fails", async () => {
    const user = userEvent.setup()
    server.use(
      http.put("/api/videos/video-1/reaction", () =>
        HttpResponse.json(
          { statusCode: 404, error: "VIDEO_NOT_FOUND", message: "x" },
          { status: 404 }
        )
      )
    )
    renderButtons({ likeCount: 10 })

    await user.click(screen.getByRole("button", { name: "Like" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
    expect(screen.getByRole("button", { name: "Like" })).toHaveTextContent("10")
    expect(screen.getByRole("button", { name: "Like" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })
})

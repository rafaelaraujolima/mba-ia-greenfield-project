// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { server } from "@/mocks/server"
import { CommentReactionButtons } from "../comment-reaction-buttons"

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
  props: Partial<React.ComponentProps<typeof CommentReactionButtons>> = {},
  isLoggedIn = true
) {
  return render(
    <SessionProvider
      initialSession={{ userId: "u1", email: "a@b.c", channelSlug: "me", isLoggedIn }}
    >
      <CommentReactionButtons
        commentId="comment-1"
        reaction={null}
        likeCount={245}
        {...props}
      />
    </SessionProvider>
  )
}

describe("<CommentReactionButtons />", () => {
  it("shows the simple like count and no count on dislike", () => {
    renderButtons()

    expect(screen.getByRole("button", { name: "Like comment" })).toHaveTextContent("245")
    expect(screen.getByRole("button", { name: "Dislike comment" })).toHaveTextContent("")
  })

  it("PUTs the like optimistically and refreshes", async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.put("/api/comments/comment-1/reaction", async ({ request }) => {
        bodies.push(await request.json())
        await gate
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButtons()

    await user.click(screen.getByRole("button", { name: "Like comment" }))

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Like comment" })).toHaveTextContent("246")
    )
    release()
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(bodies).toEqual([{ type: "like" }])
  })

  it("DELETEs when turning off the active reaction", async () => {
    const user = userEvent.setup()
    const methods: string[] = []
    server.use(
      http.delete("/api/comments/comment-1/reaction", () => {
        methods.push("DELETE")
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButtons({ reaction: "dislike" })

    await user.click(screen.getByRole("button", { name: "Dislike comment" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(methods).toEqual(["DELETE"])
  })

  it("reverts when the API fails", async () => {
    const user = userEvent.setup()
    server.use(
      http.put("/api/comments/comment-1/reaction", () =>
        HttpResponse.json(
          { statusCode: 404, error: "COMMENT_NOT_FOUND", message: "x" },
          { status: 404 }
        )
      )
    )
    renderButtons()

    await user.click(screen.getByRole("button", { name: "Like comment" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
    expect(screen.getByRole("button", { name: "Like comment" })).toHaveTextContent("245")
  })

  it("redirects an anonymous visitor to login", async () => {
    const user = userEvent.setup()
    renderButtons({}, false)

    await user.click(screen.getByRole("button", { name: "Like comment" }))

    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fwatch%2Fvideo-1")
  })
})

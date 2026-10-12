// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { buildCommentItem } from "@/mocks/factories/social"
import { server } from "@/mocks/server"
import { CommentItem } from "../comment-item"

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/watch/video-1",
}))

beforeEach(() => pushMock.mockClear())

function renderItem(
  comment = buildCommentItem({ id: "c1", replyCount: 2 }),
  isLoggedIn = true
) {
  return render(
    <SessionProvider
      initialSession={{ userId: "u1", email: "a@b.c", channelSlug: "me", isLoggedIn }}
    >
      <CommentItem videoId="video-1" comment={comment} />
    </SessionProvider>
  )
}

describe("<CommentItem />", () => {
  it("renders author, body and the like count", () => {
    renderItem(buildCommentItem({ id: "c1", body: "Great", likeCount: 245 }))

    expect(screen.getByText("@fixture-commenter")).toBeInTheDocument()
    expect(screen.getByText("Great")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Like comment" })).toHaveTextContent("245")
  })

  it("renders HTML markup literally instead of interpreting it", () => {
    renderItem(buildCommentItem({ id: "c1", body: "<b>bold</b><script>x()</script>" }))

    expect(screen.getByText("<b>bold</b><script>x()</script>")).toBeInTheDocument()
    expect(document.querySelector("b")).toBeNull()
  })

  it("loads replies on demand when expanding 'Ver N respostas'", async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.get("/api/comments/c1/replies", () => {
        calls += 1
        return HttpResponse.json({
          items: [
            buildCommentItem({ id: "r1", parentId: "c1", body: "First reply" }),
            buildCommentItem({ id: "r2", parentId: "c1", body: "Second reply" }),
          ],
          nextCursor: null,
        })
      })
    )
    renderItem()
    expect(calls).toBe(0)

    await user.click(screen.getByRole("button", { name: "Ver 2 respostas" }))

    expect(await screen.findByText("First reply")).toBeInTheDocument()
    expect(screen.getByText("Second reply")).toBeInTheDocument()
    expect(calls).toBe(1)
  })

  it("offers Reply only on top-level comments", () => {
    renderItem(buildCommentItem({ id: "r1", parentId: "c1", replyCount: 0 }))

    expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument()
  })

  it("opens the inline reply form from Reply", async () => {
    const user = userEvent.setup()
    renderItem(buildCommentItem({ id: "c1", replyCount: 0 }))

    await user.click(screen.getByRole("button", { name: "Reply" }))

    expect(await screen.findByLabelText("Add a reply")).toBeInTheDocument()
  })

  it("sends an anonymous visitor to login on Reply", async () => {
    const user = userEvent.setup()
    renderItem(buildCommentItem({ id: "c1", replyCount: 0 }), false)

    await user.click(screen.getByRole("button", { name: "Reply" }))

    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fwatch%2Fvideo-1")
  })

  it("shows an error when the replies cannot be loaded", async () => {
    const user = userEvent.setup()
    server.use(
      http.get("/api/comments/c1/replies", () =>
        HttpResponse.json(
          { statusCode: 404, error: "COMMENT_NOT_FOUND", message: "x" },
          { status: 404 }
        )
      )
    )
    renderItem()

    await user.click(screen.getByRole("button", { name: "Ver 2 respostas" }))

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  })
})

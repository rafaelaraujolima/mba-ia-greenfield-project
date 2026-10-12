// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { server } from "@/mocks/server"
import { CommentForm } from "../comment-form"

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/watch/video-1",
}))

beforeEach(() => pushMock.mockClear())

function renderForm(
  props: Partial<React.ComponentProps<typeof CommentForm>> = {},
  isLoggedIn = true
) {
  const onCreated = vi.fn()
  render(
    <SessionProvider
      initialSession={{ userId: "u1", email: "a@b.c", channelSlug: "me", isLoggedIn }}
    >
      <CommentForm videoId="video-1" onCreated={onCreated} {...props} />
    </SessionProvider>
  )
  return { onCreated }
}

describe("<CommentForm />", () => {
  it("posts the trimmed body and hands the created comment to onCreated", async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    server.use(
      http.post("/api/videos/video-1/comments", async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json(
          { id: "c-new", body: "Nice video", parentId: null },
          { status: 201 }
        )
      })
    )
    const { onCreated } = renderForm()

    await user.type(screen.getByLabelText("Add a comment"), "  Nice video  ")
    await user.click(screen.getByRole("button", { name: "Comment" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(bodies).toEqual([{ body: "Nice video" }])
    expect(screen.getByLabelText("Add a comment")).toHaveValue("")
  })

  it("sends parentId when replying", async () => {
    const user = userEvent.setup()
    const bodies: unknown[] = []
    server.use(
      http.post("/api/videos/video-1/comments", async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ id: "r1", body: "Reply", parentId: "c1" }, { status: 201 })
      })
    )
    const { onCreated } = renderForm({ parentId: "c1" })

    await user.type(screen.getByLabelText("Add a reply"), "Reply")
    await user.click(screen.getByRole("button", { name: "Reply" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(bodies).toEqual([{ body: "Reply", parentId: "c1" }])
  })

  it("blocks an empty or whitespace-only body before sending", async () => {
    const user = userEvent.setup()
    let called = false
    server.use(
      http.post("/api/videos/video-1/comments", () => {
        called = true
        return HttpResponse.json({}, { status: 201 })
      })
    )
    const { onCreated } = renderForm()

    await user.type(screen.getByLabelText("Add a comment"), "    ")
    await user.click(screen.getByRole("button", { name: "Comment" }))

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(called).toBe(false)
    expect(onCreated).not.toHaveBeenCalled()
  })

  it("redirects an anonymous visitor to login on submit", async () => {
    const user = userEvent.setup()
    const { onCreated } = renderForm({}, false)

    await user.type(screen.getByLabelText("Add a comment"), "Hello")
    await user.click(screen.getByRole("button", { name: "Comment" }))

    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fwatch%2Fvideo-1")
    expect(onCreated).not.toHaveBeenCalled()
  })

  it("shows the mapped message when the API rejects the reply depth", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/videos/video-1/comments", () =>
        HttpResponse.json(
          { statusCode: 400, error: "COMMENT_DEPTH_EXCEEDED", message: "x" },
          { status: 400 }
        )
      )
    )
    const { onCreated } = renderForm({ parentId: "r1" })

    await user.type(screen.getByLabelText("Add a reply"), "Reply")
    await user.click(screen.getByRole("button", { name: "Reply" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Replies to replies are not supported."
    )
    expect(onCreated).not.toHaveBeenCalled()
  })
})

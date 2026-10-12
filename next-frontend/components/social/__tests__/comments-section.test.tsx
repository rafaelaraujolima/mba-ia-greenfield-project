// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { buildCommentItem } from "@/mocks/factories/social"
import { server } from "@/mocks/server"
import { CommentsSection } from "../comments-section"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/watch/video-1",
}))

function renderSection(
  props: Partial<React.ComponentProps<typeof CommentsSection>> = {}
) {
  return render(
    <SessionProvider
      initialSession={{ userId: "u1", email: "a@b.c", channelSlug: "me", isLoggedIn: true }}
    >
      <CommentsSection
        videoId="video-1"
        initialItems={[
          buildCommentItem({ id: "c1", body: "First" }),
          buildCommentItem({ id: "c2", body: "Second" }),
        ]}
        initialCursor="page-2"
        totalCount={4256}
        {...props}
      />
    </SessionProvider>
  )
}

describe("<CommentsSection />", () => {
  it("renders the grouped total as a heading and the static sort label", () => {
    renderSection()

    expect(
      screen.getByRole("heading", { level: 2, name: "4,256 Comments" })
    ).toBeInTheDocument()
    expect(screen.getByText("Mais recentes")).toBeInTheDocument()
    expect(screen.getByText("First")).toBeInTheDocument()
  })

  it("accumulates the next page by cursor without repeating items and hides the button on the last page", async () => {
    const user = userEvent.setup()
    const cursors: (string | null)[] = []
    server.use(
      http.get("/api/videos/video-1/comments", ({ request }) => {
        cursors.push(new URL(request.url).searchParams.get("cursor"))
        return HttpResponse.json({
          items: [
            buildCommentItem({ id: "c2", body: "Second" }),
            buildCommentItem({ id: "c3", body: "Third" }),
          ],
          nextCursor: null,
          totalCount: 4256,
        })
      })
    )
    renderSection()

    await user.click(screen.getByRole("button", { name: "Carregar mais" }))

    expect(await screen.findByText("Third")).toBeInTheDocument()
    expect(cursors).toEqual(["page-2"])
    expect(screen.getAllByText("Second")).toHaveLength(1)
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument()
  })

  it("disables 'carregar mais' while the request is pending", async () => {
    const user = userEvent.setup()
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get("/api/videos/video-1/comments", async () => {
        await gate
        return HttpResponse.json({ items: [], nextCursor: null, totalCount: 4256 })
      })
    )
    renderSection()

    await user.click(screen.getByRole("button", { name: "Carregar mais" }))

    expect(screen.getByRole("button", { name: "Carregar mais" })).toBeDisabled()
    release()
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument()
    )
  })

  it("shows the empty state when there are no comments", () => {
    renderSection({ initialItems: [], initialCursor: null, totalCount: 0 })

    expect(screen.getByText(/No comments yet/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Carregar mais" })).not.toBeInTheDocument()
  })

  it("prepends a newly posted comment and increments the total", async () => {
    const user = userEvent.setup()
    server.use(
      http.post("/api/videos/video-1/comments", () =>
        HttpResponse.json(
          buildCommentItem({ id: "new", body: "Brand new" }),
          { status: 201 }
        )
      )
    )
    renderSection()

    await user.type(screen.getByLabelText("Add a comment"), "Brand new")
    await user.click(screen.getByRole("button", { name: "Comment" }))

    expect(await screen.findByText("Brand new")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 2, name: "4,257 Comments" })
    ).toBeInTheDocument()
  })
})

// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SessionProvider } from "@/components/auth/session-provider"
import { server } from "@/mocks/server"
import { SubscribeButton } from "../subscribe-button"

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

function renderButton(
  props: Partial<React.ComponentProps<typeof SubscribeButton>> = {},
  isLoggedIn = true
) {
  return render(
    <SessionProvider
      initialSession={{ userId: "u1", email: "a@b.c", channelSlug: "me", isLoggedIn }}
    >
      <SubscribeButton nickname="fixture-channel" subscribed={false} {...props} />
    </SessionProvider>
  )
}

describe("<SubscribeButton />", () => {
  it("subscribes with PUT, flips to Inscrito and refreshes", async () => {
    const user = userEvent.setup()
    const methods: string[] = []
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.put("/api/channels/fixture-channel/subscription", async () => {
        methods.push("PUT")
        await gate
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButton()

    await user.click(screen.getByRole("button", { name: "Inscrever-se" }))

    // Optimistic state is visible while the request is still pending.
    expect(await screen.findByRole("button", { name: "Inscrito" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    release()
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(methods).toEqual(["PUT"])
  })

  it("unsubscribes with DELETE when already subscribed", async () => {
    const user = userEvent.setup()
    const methods: string[] = []
    server.use(
      http.delete("/api/channels/fixture-channel/subscription", () => {
        methods.push("DELETE")
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButton({ subscribed: true })

    await user.click(screen.getByRole("button", { name: "Inscrito" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1))
    expect(methods).toEqual(["DELETE"])
  })

  it("redirects an anonymous visitor to login without calling the API", async () => {
    const user = userEvent.setup()
    let called = false
    server.use(
      http.put("/api/channels/fixture-channel/subscription", () => {
        called = true
        return new HttpResponse(null, { status: 204 })
      })
    )
    renderButton({}, false)

    await user.click(screen.getByRole("button", { name: "Inscrever-se" }))

    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fwatch%2Fvideo-1")
    expect(called).toBe(false)
  })

  it("reverts the optimistic state when the API fails", async () => {
    const user = userEvent.setup()
    server.use(
      http.put("/api/channels/fixture-channel/subscription", () =>
        HttpResponse.json(
          { statusCode: 404, error: "CHANNEL_NOT_FOUND", message: "x" },
          { status: 404 }
        )
      )
    )
    renderButton()

    await user.click(screen.getByRole("button", { name: "Inscrever-se" }))

    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
    expect(screen.getByRole("button", { name: "Inscrever-se" })).toHaveAttribute(
      "aria-pressed",
      "false"
    )
  })

  it("is hidden for the channel owner", () => {
    renderButton({ isChannelOwner: true })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

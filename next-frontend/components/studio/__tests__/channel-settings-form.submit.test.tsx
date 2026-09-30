// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { ChannelSettingsFormContainer } from "../channel-settings-form-container";

const { refreshMock, pushMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock }),
}));

function makeChannel(overrides: Partial<Parameters<typeof ChannelSettingsFormContainer>[0]["channel"]> = {}) {
  return {
    id: "channel-1",
    nickname: "alice",
    name: "Alice Channel",
    description: "A description",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function envelope(statusCode: number, error: string, message: string) {
  return { statusCode, error, message, code: null };
}

beforeEach(() => {
  refreshMock.mockClear();
  pushMock.mockClear();
});

describe("<ChannelSettingsFormContainer /> submit wiring", () => {
  it("submits PATCH with the edited values and refreshes on success", async () => {
    const user = userEvent.setup();
    const patchCalls: Record<string, unknown>[] = [];

    server.use(
      http.patch("/api/channels/:id", async ({ request }) => {
        patchCalls.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          {
            id: "channel-1",
            nickname: "alice_new",
            name: "New Name",
            description: "A description",
            updatedAt: "2026-01-03T00:00:00.000Z",
          },
          { status: 200 }
        );
      })
    );

    render(<ChannelSettingsFormContainer channel={makeChannel()} />);

    await user.clear(screen.getByLabelText("Handle"));
    await user.type(screen.getByLabelText("Handle"), "alice_new");
    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "New Name");

    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0]).toMatchObject({ nickname: "alice_new", name: "New Name" });
  });

  it("maps NICKNAME_ALREADY_EXISTS to an inline error on the Channel handle field", async () => {
    const user = userEvent.setup();
    server.use(
      http.patch("/api/channels/:id", () =>
        HttpResponse.json(
          envelope(409, "NICKNAME_ALREADY_EXISTS", "Nickname is already in use"),
          { status: 409 }
        )
      )
    );

    render(<ChannelSettingsFormContainer channel={makeChannel()} />);
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(await screen.findByText("This handle is already taken")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("blocks submit with client-side validation (empty handle) and fires no request", async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    server.use(
      http.patch("/api/channels/:id", () => {
        patchCalled = true;
        return HttpResponse.json({}, { status: 200 });
      })
    );

    render(<ChannelSettingsFormContainer channel={makeChannel()} />);
    await user.clear(screen.getByLabelText("Handle"));
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(await screen.findByText("Handle is required")).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it("blocks submit with client-side validation (invalid handle format) and fires no request", async () => {
    const user = userEvent.setup();
    let patchCalled = false;
    server.use(
      http.patch("/api/channels/:id", () => {
        patchCalled = true;
        return HttpResponse.json({}, { status: 200 });
      })
    );

    render(<ChannelSettingsFormContainer channel={makeChannel()} />);
    await user.clear(screen.getByLabelText("Handle"));
    await user.type(screen.getByLabelText("Handle"), "Invalid Handle!");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(
      await screen.findByText("Handle can only contain lowercase letters, digits and underscores")
    ).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });
});

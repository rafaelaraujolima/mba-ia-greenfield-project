// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ChannelSettingsForm } from "../channel-settings-form";

const channel = {
  nickname: "techmaster",
  name: "Tech Master",
  description: "A channel about tech",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ChannelSettingsForm", () => {
  it("pre-fills fields with the channel's initial values", () => {
    render(<ChannelSettingsForm channel={channel} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Handle")).toHaveValue("techmaster");
    expect(screen.getByLabelText("Display name")).toHaveValue("Tech Master");
    expect(screen.getByLabelText("Description")).toHaveValue("A channel about tech");
  });

  it("submits edited values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ChannelSettingsForm channel={channel} onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "New Name");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: "techmaster", name: "New Name" })
    );
  });

  it("shows NICKNAME_ALREADY_EXISTS as an inline error on the handle field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("NICKNAME_ALREADY_EXISTS"));
    render(<ChannelSettingsForm channel={channel} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    const nicknameInput = await screen.findByLabelText("Handle");
    expect(nicknameInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("This handle is already taken")).toBeInTheDocument();
  });

  it("disables Save Changes while submitting", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );
    render(<ChannelSettingsForm channel={channel} onSubmit={onSubmit} />);

    const saveButton = screen.getByRole("button", { name: /Save Changes/ });
    await user.click(saveButton);

    expect(screen.getByRole("button", { name: /Saving/ })).toBeDisabled();
    resolveSubmit();
  });
});

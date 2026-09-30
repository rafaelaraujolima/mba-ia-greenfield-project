// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import { PrivacyOption } from "../privacy-option";

describe("PrivacyOption", () => {
  it("renders title and description", () => {
    render(
      <PrivacyOption value="public" title="Public" description="Anyone can watch" />
    );
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Anyone can watch")).toBeInTheDocument();
  });

  it("reflects selected state via aria-checked", () => {
    render(<PrivacyOption value="public" title="Public" selected />);
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
  });

  it("defaults to aria-checked=false when not selected", () => {
    render(<PrivacyOption value="unlisted" title="Unlisted" />);
    expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onSelect with its value when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PrivacyOption value="unlisted" title="Unlisted" onSelect={onSelect} />);
    await user.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledWith("unlisted");
  });

  it("calls onSelect when activated via keyboard (Enter/Space)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PrivacyOption value="public" title="Public" onSelect={onSelect} />);
    const el = screen.getByRole("radio");
    el.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("public");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});

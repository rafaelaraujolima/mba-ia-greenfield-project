// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

import { AccountMenuTrigger } from "../account-menu-trigger";

describe("AccountMenuTrigger", () => {
  it("exposes aria-haspopup and aria-expanded reflecting the open state", () => {
    render(<AccountMenuTrigger initials="RL" open={false} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-haspopup", "dialog");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("reflects open=true", () => {
    render(<AccountMenuTrigger initials="RL" open />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<AccountMenuTrigger initials="RL" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

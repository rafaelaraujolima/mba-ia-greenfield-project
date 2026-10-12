// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ChannelHeader } from "../channel-header";

describe("ChannelHeader", () => {
  it("renders the channel name in an h1", () => {
    render(<ChannelHeader name="My Channel" nickname="@mychannel" />);
    expect(screen.getByRole("heading", { level: 1, name: "My Channel" })).toBeInTheDocument();
    expect(screen.getByText("@mychannel")).toBeInTheDocument();
  });

  it("omits the description when null", () => {
    render(<ChannelHeader name="My Channel" nickname="@mychannel" description={null} />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});

describe("ChannelHeader social additions", () => {
  it("shows the compact subscriber count in a polite live region", () => {
    render(<ChannelHeader name="My Channel" nickname="@mychannel" subscriberCount={2_400_000} />);
    const count = screen.getByText("2.4M subscribers");
    expect(count).toHaveAttribute("aria-live", "polite");
  });

  it("renders the action slot beside the name and omits the count when not provided", () => {
    render(
      <ChannelHeader name="My Channel" nickname="@mychannel" action={<button>Subscribe</button>} />
    );
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument();
    expect(screen.queryByText(/subscribers/)).not.toBeInTheDocument();
  });
});

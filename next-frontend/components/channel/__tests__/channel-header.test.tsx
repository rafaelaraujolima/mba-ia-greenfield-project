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

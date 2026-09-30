// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { ChannelSummary } from "../channel-summary";

describe("ChannelSummary", () => {
  it("renders the channel name and handle", () => {
    render(<ChannelSummary name="My Channel" handle="@mychannel" />);
    expect(screen.getByText("My Channel")).toBeInTheDocument();
    expect(screen.getByText("@mychannel")).toBeInTheDocument();
  });
});

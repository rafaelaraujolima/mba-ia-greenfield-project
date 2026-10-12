// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { SideNavSubscriptionList } from "../side-nav-subscription-list";

const subscriptions = [
  { channelId: "c1", channelName: "Channel One", channelNickname: "channel-one" },
  { channelId: "c2", channelName: "Channel Two", channelNickname: "channel-two" },
];

describe("SideNavSubscriptionList", () => {
  it("renders one link per followed channel pointing at its channel page", () => {
    render(<SideNavSubscriptionList subscriptions={subscriptions} />);

    expect(screen.getByRole("link", { name: /Channel One/ })).toHaveAttribute(
      "href",
      "/channel/channel-one"
    );
    expect(screen.getByRole("link", { name: /Channel Two/ })).toHaveAttribute(
      "href",
      "/channel/channel-two"
    );
  });

  it("marks the item of the current channel as active", () => {
    render(
      <SideNavSubscriptionList
        subscriptions={subscriptions}
        activePath="/channel/channel-two"
      />
    );

    expect(screen.getByRole("link", { name: /Channel Two/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: /Channel One/ })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("renders nothing when there are no subscriptions", () => {
    const { container } = render(<SideNavSubscriptionList subscriptions={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

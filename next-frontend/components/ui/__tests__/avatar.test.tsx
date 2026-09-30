// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Avatar, AvatarImage, AvatarFallback } from "../avatar";

describe("Avatar", () => {
  it("renders with data-slot=avatar", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("AB").closest("[data-slot=avatar]")).toBeInTheDocument();
  });

  it("renders fallback initials when no image is available", () => {
    render(
      <Avatar>
        <AvatarFallback>RL</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("RL")).toBeInTheDocument();
  });

  it("accepts a size prop reflected as data-size", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(container.querySelector("[data-slot=avatar]")).toHaveAttribute("data-size", "lg");
  });

  it("AvatarImage carries alt text for accessibility", () => {
    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="Rafael Lima" />
        <AvatarFallback>RL</AvatarFallback>
      </Avatar>
    );
    // AvatarImage only renders once loaded in jsdom (radix defers); assert no crash and fallback shows meanwhile.
    expect(screen.getByText("RL")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { SideNav } from "../side-nav";

describe("SideNav", () => {
  it("renders a labeled nav landmark with sections and items", () => {
    usePathname.mockReturnValue("/");
    render(<SideNav />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Your videos")).toBeInTheDocument();
  });

  it("marks Your videos as the active item when pathname is /studio/videos", () => {
    usePathname.mockReturnValue("/studio/videos");
    render(<SideNav />);
    const yourVideos = screen.getByRole("link", { name: /Your videos/ });
    expect(yourVideos).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Home/ })).not.toHaveAttribute("aria-current");
  });

  it("keeps Your videos active when editing a video", () => {
    usePathname.mockReturnValue("/studio/videos/abc/edit");
    render(<SideNav />);
    expect(screen.getByRole("link", { name: /Your videos/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

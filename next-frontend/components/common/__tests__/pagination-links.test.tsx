// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PaginationLinks } from "@/components/common/pagination-links"
import { getPaginationWindow } from "@/lib/pagination"

describe("PaginationLinks", () => {
  it("renders a labeled nav", () => {
    render(
      <PaginationLinks
        window={getPaginationWindow({ page: 1, pageSize: 10, total: 30 })}
        buildHref={(page) => `/videos?page=${page}`}
      />
    )
    expect(
      screen.getByRole("navigation", { name: "pagination" })
    ).toBeInTheDocument()
  })

  it("renders links with ?page=N hrefs for each page in the window", () => {
    render(
      <PaginationLinks
        window={getPaginationWindow({ page: 1, pageSize: 10, total: 30 })}
        buildHref={(page) => `/videos?page=${page}`}
      />
    )
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/videos?page=1"
    )
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/videos?page=2"
    )
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute(
      "href",
      "/videos?page=3"
    )
  })

  it("marks the current page with aria-current=page", () => {
    render(
      <PaginationLinks
        window={getPaginationWindow({ page: 2, pageSize: 10, total: 30 })}
        buildHref={(page) => `/videos?page=${page}`}
      />
    )
    const current = screen.getByRole("link", { name: "2" })
    expect(current).toHaveAttribute("aria-current", "page")

    const other = screen.getByRole("link", { name: "1" })
    expect(other).not.toHaveAttribute("aria-current")
  })

  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <PaginationLinks
        window={getPaginationWindow({ page: 1, pageSize: 10, total: 5 })}
        buildHref={(page) => `/videos?page=${page}`}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

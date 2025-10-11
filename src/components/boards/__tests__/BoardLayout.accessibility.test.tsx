import { render, screen } from "@testing-library/react"

import { axe } from "@/testing/axe"

import { BoardLayout } from "../BoardLayout"
import type { BoardGroupSummary, BoardItemSummary } from "../types"

declare global {
  interface Window {
    ResizeObserver?: typeof ResizeObserver
  }
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const items: BoardItemSummary[] = [
  {
    id: "item-1",
    title: "Launch onboarding experiments",
    status: "In Progress",
    assignee: "Jordan Smith",
    estimate: "5 pts",
    tags: ["growth", "ux"],
    description: "Validate messaging and navigation for the onboarding survey.",
    updatedAt: "2h ago",
  },
]

const groups: BoardGroupSummary[] = [
  { id: "group-1", name: "Now", count: 8, accentColor: "#6366f1" },
]

describe("BoardLayout accessibility", () => {
  beforeAll(() => {
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
  })

  beforeEach(() => {
    window.matchMedia = createMatchMedia(false)
  })

  it("exposes a skip link and descriptive region labels", () => {
    render(
      <BoardLayout
        breadcrumbs={[{ label: "Workspace", href: "/" }, { label: "Boards" }]}
        items={items}
        viewOptions={["Board", "Table"]}
        activeView="Board"
        onViewChange={() => {}}
        leftSidebar={{ groups }}
      />
    )

    expect(screen.getByRole("link", { name: /skip to board content/i })).toBeInTheDocument()
    expect(screen.getByTestId("board-canvas")).toHaveAttribute("role", "region")
  })

  it("passes automated axe checks", async () => {
    const { container } = render(
      <BoardLayout
        breadcrumbs={[{ label: "Workspace", href: "/" }, { label: "Boards" }]}
        items={items}
        viewOptions={["Board", "Table"]}
        activeView="Board"
        onViewChange={() => {}}
        leftSidebar={{ groups }}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

function createMatchMedia(matches: boolean) {
  return (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })
}

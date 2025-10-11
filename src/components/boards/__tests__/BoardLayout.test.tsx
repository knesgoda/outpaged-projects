import { fireEvent, render, screen } from "@testing-library/react"

import { BoardLayout } from "../BoardLayout"
import type { BoardItemSummary, BoardGroupSummary } from "../types"

const defaultItems: BoardItemSummary[] = Array.from({ length: 12 }, (_, index) => ({
  id: `item-${index + 1}`,
  title: `Board Item ${index + 1}`,
  status: index % 2 === 0 ? "In Progress" : "Backlog",
  assignee: index % 2 === 0 ? "Alex Johnson" : "Jordan Smith",
  estimate: `${index + 1} pts`,
  tags: ["mobile", index % 2 === 0 ? "priority" : "tech-debt"],
  description: "Ensure board shell renders successfully for virtualized testing.",
  updatedAt: "2h ago",
}))

const defaultGroups: BoardGroupSummary[] = [
  { id: "group-1", name: "Quarterly Goals", count: 14, accentColor: "#7c3aed" },
  { id: "group-2", name: "Mission Critical", count: 6, accentColor: "#2563eb" },
]

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

describe("BoardLayout", () => {
  beforeAll(() => {
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
  })

  beforeEach(() => {
    window.matchMedia = createMatchMedia(false)
  })

  it("collapses and expands the left sidebar", () => {
    render(
      <BoardLayout
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Boards" }]}
        items={defaultItems}
        viewOptions={["Board", "Table", "Timeline"]}
        activeView="Board"
        onViewChange={() => {}}
        leftSidebar={{ groups: defaultGroups }}
      />
    )

    const sidebar = screen.getByLabelText("Board navigation")
    expect(sidebar).toHaveAttribute("data-state", "expanded")

    const toggleButton = screen.getByRole("button", { name: /collapse board sidebar/i })
    fireEvent.click(toggleButton)
    expect(sidebar).toHaveAttribute("data-state", "collapsed")

    const expandButton = screen.getByRole("button", { name: /expand board sidebar/i })
    fireEvent.click(expandButton)
    expect(sidebar).toHaveAttribute("data-state", "expanded")
  })

  it("enables virtualization when the dataset exceeds the threshold", () => {
    const items = Array.from({ length: 120 }, (_, index) => ({ ...defaultItems[0], id: `heavy-${index}` }))

    render(
      <BoardLayout
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Boards" }]}
        items={items}
        viewOptions={["Board", "Table"]}
        activeView="Board"
        onViewChange={() => {}}
        leftSidebar={{ groups: defaultGroups }}
      />
    )

    const canvas = screen.getByTestId("board-canvas")
    expect(canvas.getAttribute("data-virtualized")).toBe("true")
  })

  it("enables virtualization on compact breakpoints", () => {
    window.matchMedia = createMatchMedia(true)

    render(
      <BoardLayout
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Boards" }]}
        items={defaultItems.slice(0, 5)}
        viewOptions={["Board", "Table"]}
        activeView="Board"
        onViewChange={() => {}}
        leftSidebar={{ groups: defaultGroups }}
      />
    )

    const canvas = screen.getByTestId("board-canvas")
    expect(canvas.getAttribute("data-virtualized")).toBe("true")
  })
})

function createMatchMedia(matches: boolean) {
  return (query: string): MediaQueryList => {
    const mql: MediaQueryList = {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }

    return mql
  }
}

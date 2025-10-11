import { render } from "@testing-library/react"

import { BoardLayout } from "../BoardLayout"
import type { BoardItemSummary, BoardGroupSummary, BoardLegendItem } from "../types"

const items: BoardItemSummary[] = [
  {
    id: "alpha",
    title: "Design mobile onboarding",
    status: "In Progress",
    assignee: "Jordan Smith",
    estimate: "5 pts",
    tags: ["onboarding", "ios"],
    description: "Refine the responsive layout for the mobile onboarding screens.",
    updatedAt: "1h ago",
  },
  {
    id: "beta",
    title: "Finalize billing service",
    status: "Blocked",
    assignee: "Taylor Lee",
    estimate: "3 pts",
    tags: ["backend"],
    description: "Coordinate with the security team on token rotation.",
    updatedAt: "3h ago",
  },
]

const groups: BoardGroupSummary[] = [
  { id: "g1", name: "Now", count: 8, accentColor: "#0ea5e9" },
  { id: "g2", name: "Next", count: 12, accentColor: "#f97316" },
]

const legends: BoardLegendItem[] = [
  { id: "l1", label: "Delivery", color: "#22c55e", description: "On track" },
  { id: "l2", label: "Risk", color: "#ef4444", description: "Requires attention" },
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

describe("BoardLayout visual regression", () => {
  beforeAll(() => {
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
  })

  beforeEach(() => {
    window.matchMedia = createMatchMedia(false)
  })

  it("matches the shell snapshot", () => {
    const { asFragment } = render(
      <BoardLayout
        breadcrumbs={[
          { label: "Workspace", href: "/" },
          { label: "Boards", href: "/boards" },
          { label: "Growth Team" },
        ]}
        items={items}
        metrics={[
          { label: "Cycle Time", value: "3.2d", trend: "down", changeLabel: "-12% vs last sprint" },
          { label: "Throughput", value: "28 items", trend: "up", changeLabel: "+6" },
        ]}
        viewOptions={["Board", "Table", "Timeline"]}
        activeView="Board"
        onViewChange={() => {}}
        leftSidebar={{ groups, legends }}
      />
    )

    expect(asFragment()).toMatchSnapshot()
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

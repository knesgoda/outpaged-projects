import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { LeftSidebar } from "../LeftSidebar"
import type { BoardGroupSummary } from "../types"
import { TooltipProvider } from "@/components/ui/tooltip"

const renderWithProviders = (ui: JSX.Element) =>
  render(<TooltipProvider>{ui}</TooltipProvider>)

describe("LeftSidebar", () => {
  const baseGroups: BoardGroupSummary[] = [
    { id: "g1", name: "Design", count: 8 },
    { id: "g2", name: "Engineering", count: 5 },
  ]

  it("displays an archived badge when a group is archived", () => {
    renderWithProviders(
      <LeftSidebar
        groups={[{ ...baseGroups[0], archived: true }, baseGroups[1]]}
        onSelectGroup={jest.fn()}
      />
    )

    expect(screen.getAllByTestId("archived-group-badge")).toHaveLength(1)
    expect(screen.getByText("Archived")).toBeVisible()
  })

  it("does not show archived badges for active groups", () => {
    renderWithProviders(<LeftSidebar groups={baseGroups} onSelectGroup={jest.fn()} />)

    expect(screen.queryByTestId("archived-group-badge")).toBeNull()
  })

  it("emits selection events when a group is clicked", async () => {
    const user = userEvent.setup()
    const handleSelect = jest.fn()

    renderWithProviders(
      <LeftSidebar
        groups={[{ ...baseGroups[0], archived: true }, baseGroups[1]]}
        onSelectGroup={handleSelect}
      />
    )

    await user.click(screen.getByRole("button", { name: /engineering/i }))

    expect(handleSelect).toHaveBeenCalledWith("g2")
  })
})

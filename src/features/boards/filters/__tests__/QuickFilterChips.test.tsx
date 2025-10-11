import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"

import { QuickFilterChips } from "../QuickFilterChips"
import { QUICK_FILTERS, QUICK_FILTER_COMBINATIONS } from "../quickFilters"
import { cloneDefinition } from "../BoardFilterBuilder"
import { DEFAULT_FILTER_DEFINITION, type BoardFilterDefinition } from "../types"

describe("QuickFilterChips combinations", () => {
  const Harness = ({
    initialDefinition,
    onDefinitionChange,
  }: {
    initialDefinition: BoardFilterDefinition
    onDefinitionChange?: (definition: BoardFilterDefinition) => void
  }) => {
    const [definition, setDefinition] = useState(initialDefinition)

    return (
      <QuickFilterChips
        definition={definition}
        onChange={(next) => {
          setDefinition(next)
          onDefinitionChange?.(next)
        }}
      />
    )
  }

  const getFilter = (id: string) => {
    const filter = QUICK_FILTERS.find((entry) => entry.id === id)
    if (!filter) {
      throw new Error(`Unknown quick filter: ${id}`)
    }
    return filter
  }

  it("activates all filters in a combination when toggled on", async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    const initial = cloneDefinition(DEFAULT_FILTER_DEFINITION)

    render(<Harness initialDefinition={initial} onDefinitionChange={handleChange} />)

    const comboButton = screen.getByRole("button", { name: QUICK_FILTER_COMBINATIONS[0].label })
    expect(comboButton).toHaveAttribute("aria-pressed", "false")

    await user.click(comboButton)

    expect(handleChange).toHaveBeenCalled()
    expect(comboButton).toHaveAttribute("aria-pressed", "true")

    const latestDefinition: BoardFilterDefinition = handleChange.mock.calls.slice(-1)[0][0]
    const fields = latestDefinition.root.conditions.map((condition) => condition.field)
    expect(fields).toEqual(expect.arrayContaining(["assignee", "status"]))
  })

  it("clears all underlying filters when an active combination is toggled off", async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()

    let definition = cloneDefinition(DEFAULT_FILTER_DEFINITION)
    definition = getFilter("me").apply(definition)
    definition = getFilter("blocked").apply(definition)

    render(<Harness initialDefinition={definition} onDefinitionChange={handleChange} />)

    const comboButton = screen.getByRole("button", { name: /my blocked/i })
    expect(comboButton).toHaveAttribute("aria-pressed", "true")

    await user.click(comboButton)

    expect(handleChange).toHaveBeenCalled()
    expect(comboButton).toHaveAttribute("aria-pressed", "false")

    const updated: BoardFilterDefinition = handleChange.mock.calls.slice(-1)[0][0]
    expect(updated.root.conditions).toHaveLength(0)
  })

  it("adds any missing filters when partially active", async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()

    let definition = cloneDefinition(DEFAULT_FILTER_DEFINITION)
    definition = getFilter("me").apply(definition)

    render(<Harness initialDefinition={definition} onDefinitionChange={handleChange} />)

    const comboButton = screen.getByRole("button", { name: /my blocked/i })
    expect(comboButton).toHaveAttribute("aria-pressed", "false")

    await user.click(comboButton)

    const updated: BoardFilterDefinition = handleChange.mock.calls.slice(-1)[0][0]
    const statusFilters = updated.root.conditions.filter((condition) => condition.field === "status")
    const assigneeFilters = updated.root.conditions.filter((condition) => condition.field === "assignee")

    expect(statusFilters).toHaveLength(1)
    expect(assigneeFilters).toHaveLength(1)
  })
})

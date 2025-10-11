import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { shouldHandleStatusCycle, useStatusCycleShortcut } from "../kanban/useStatusCycleShortcut"

describe("useStatusCycleShortcut", () => {
  const Harness = ({ onCycle }: { onCycle: () => void | Promise<void> }) => {
    useStatusCycleShortcut(onCycle)
    return (
      <div>
        <input aria-label="field" />
        <button type="button">Outside</button>
      </div>
    )
  }

  it("invokes the handler when the apostrophe key is pressed globally", async () => {
    const user = userEvent.setup()
    const handler = jest.fn()

    render(<Harness onCycle={handler} />)

    await user.keyboard("'")

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("ignores keypresses originating from form fields", async () => {
    const user = userEvent.setup()
    const handler = jest.fn()

    render(<Harness onCycle={handler} />)

    await user.click(screen.getByLabelText("field"))
    await user.keyboard("'")

    expect(handler).not.toHaveBeenCalled()
  })

  it("prevents default browser behavior when the shortcut is handled", () => {
    const handler = jest.fn()

    render(<Harness onCycle={handler} />)

    const event = new KeyboardEvent("keydown", { key: "'", cancelable: true })
    const dispatchResult = window.dispatchEvent(event)

    expect(dispatchResult).toBe(false)
    expect(event.defaultPrevented).toBe(true)
  })

  it("guards against modifier keys via shouldHandleStatusCycle", () => {
    const event = new KeyboardEvent("keydown", { key: "'", ctrlKey: true })
    expect(shouldHandleStatusCycle(event)).toBe(false)
  })

  it("allows handlers that return promises without throwing", () => {
    const asyncHandler = jest.fn().mockResolvedValue(undefined)

    render(<Harness onCycle={asyncHandler} />)

    const event = new KeyboardEvent("keydown", { key: "'", cancelable: true })
    window.dispatchEvent(event)

    expect(asyncHandler).toHaveBeenCalled()
  })

  it("ignores unrelated keys", () => {
    const onCycle = jest.fn()

    render(<Harness onCycle={onCycle} />)

    const event = new KeyboardEvent("keydown", { key: "k" })
    window.dispatchEvent(event)

    expect(onCycle).not.toHaveBeenCalled()
  })
})

// Additional unit check for shouldHandleStatusCycle edge cases
it("shouldHandleStatusCycle returns false for content editable targets", () => {
  const event = {
    key: "'",
    metaKey: false,
    altKey: false,
    ctrlKey: false,
    target: { isContentEditable: true, tagName: "DIV" },
  } as unknown as KeyboardEvent

  expect(shouldHandleStatusCycle(event)).toBe(false)
})

it("shouldHandleStatusCycle returns true when no target is provided", () => {
  const event = new KeyboardEvent("keydown", { key: "'" })
  expect(shouldHandleStatusCycle(event)).toBe(true)
})

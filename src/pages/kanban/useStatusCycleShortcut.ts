import { useEffect } from "react"

type MaybePromise = void | Promise<void>

export function shouldHandleStatusCycle(event: KeyboardEvent): boolean {
  if (event.key !== "'" || event.metaKey || event.altKey || event.ctrlKey) {
    return false
  }

  const target = event.target as HTMLElement | null
  if (!target) {
    return true
  }

  if (target.isContentEditable) {
    return false
  }

  if (/^(input|textarea|select)$/i.test(target.tagName)) {
    return false
  }

  return true
}

export function useStatusCycleShortcut(handler: () => MaybePromise) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (!shouldHandleStatusCycle(event)) {
        return
      }

      event.preventDefault()
      const result = handler()
      if (result && typeof (result as Promise<void>).then === "function") {
        void (result as Promise<void>)
      }
    }

    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [handler])
}

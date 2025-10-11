import type { BoardColorRule } from "@/types/boards"
import type { BoardLegendItem } from "@/components/boards/types"

export interface ColorEvaluation {
  color?: string
  rule?: BoardColorRule | null
}

const safeEquals = (left: unknown, right: unknown) => {
  if (left == null && right == null) return true
  if (typeof left === "number" && typeof right === "number") {
    return Number.isFinite(left) && Number.isFinite(right) && left === right
  }
  if (left instanceof Date || right instanceof Date) {
    return String(left) === String(right)
  }
  return String(left).toLowerCase() === String(right).toLowerCase()
}

const matchesRule = (item: Record<string, unknown>, rule: BoardColorRule): boolean => {
  switch (rule.type) {
    case "status": {
      const field = rule.field ?? "status"
      return safeEquals(item[field], rule.value ?? rule.label)
    }
    case "priority": {
      const field = rule.field ?? "priority"
      return safeEquals(item[field], rule.value ?? rule.label)
    }
    case "formula": {
      if (!rule.expression) return false
      try {
        // eslint-disable-next-line no-new-func
        const evaluator = new Function("item", `return Boolean(${rule.expression});`)
        return Boolean(evaluator(item))
      } catch (_error) {
        return false
      }
    }
    default:
      return false
  }
}

export const evaluateColorRules = (
  item: Record<string, unknown>,
  rules: BoardColorRule[]
): ColorEvaluation => {
  for (const rule of rules) {
    if (matchesRule(item, rule)) {
      return { color: rule.color, rule }
    }
  }
  return { color: undefined, rule: null }
}

export const buildColorLegend = (rules: BoardColorRule[]): BoardLegendItem[] => {
  const unique = new Map<string, BoardLegendItem>()

  rules.forEach((rule) => {
    if (!rule.color) return
    const key = `${rule.color}|${rule.label}`
    if (unique.has(key)) return
    unique.set(key, {
      id: rule.id,
      label: rule.label,
      color: rule.color,
      description: rule.description,
    })
  })

  return Array.from(unique.values())
}

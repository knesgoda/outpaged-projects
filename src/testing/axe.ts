import { configureAxe } from "jest-axe"

export const axe = configureAxe({
  rules: {
    region: { enabled: true },
  },
})

export type AxeMatcher = Awaited<ReturnType<typeof axe>>

export interface BoardBreadcrumb {
  label: string
  href?: string
}

export interface BoardMetricChip {
  label: string
  value: string
  trend?: "up" | "down" | "neutral"
  changeLabel?: string
}

export interface BoardItemSummary {
  id: string
  title: string
  status?: string
  assignee?: string
  assigneeAvatar?: string
  estimate?: string
  tags?: string[]
  description?: string
  updatedAt?: string
}

export interface BoardGroupSummary {
  id: string
  name: string
  count: number
  accentColor?: string
}

export interface BoardQuickFilter {
  id: string
  label: string
  active?: boolean
  description?: string
}

export interface BoardLegendItem {
  id: string
  label: string
  color: string
  description?: string
}

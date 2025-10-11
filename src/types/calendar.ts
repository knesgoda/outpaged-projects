export type CalendarLayerType = "personal" | "team" | "project" | "workspace" | "external";

export interface CalendarLayer {
  id: string;
  name: string;
  type: CalendarLayerType;
  color: string;
  description?: string;
  subscribed: boolean;
  visible: boolean;
  timezone?: string;
  isReadOnly?: boolean;
}

export type CalendarDensity = "compact" | "comfortable" | "spacious";

export interface CalendarSavedView {
  id: string;
  name: string;
  calendarIds: string[];
  description?: string;
}

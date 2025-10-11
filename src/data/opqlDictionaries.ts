export const CUSTOM_FIELD_DEFINITIONS: Record<string, string[]> = {
  Status: ["Ready", "In Progress", "Blocked", "Done"],
  Priority: ["Low", "Medium", "High", "Urgent"],
  "Team Heat": ["Cool", "Warm", "Hot"],
};

export const OPQL_LABEL_DICTIONARY = [
  {
    id: "label:ux",
    kind: "label" as const,
    value: "ux",
    label: "#ux",
    description: "User experience",
    synonyms: ["design"],
    weight: 0.7,
  },
  {
    id: "label:backend",
    kind: "label" as const,
    value: "backend",
    label: "#backend",
    description: "Platform engineering",
    weight: 0.65,
  },
  {
    id: "label:regression",
    kind: "label" as const,
    value: "regression",
    label: "#regression",
    description: "Returned bug",
    weight: 0.6,
  },
] as const;

export const OPQL_TEAM_DIRECTORY = [
  {
    id: "team:sparks",
    kind: "user" as const,
    value: "sparks",
    label: "Team Sparks",
    description: "Growth experiments",
    teamId: "sparks",
    weight: 0.68,
  },
  {
    id: "team:insight",
    kind: "user" as const,
    value: "insight",
    label: "Team Insight",
    description: "Data & AI",
    teamId: "insight",
    weight: 0.64,
  },
] as const;

export const OPQL_SYNONYM_CORPUS: Record<string, string[]> = {
  asap: ["urgent", "high"],
  slow: ["low", "backlog"],
  owner: ["assignee", "responsible"],
  doc: ["document", "spec"],
};

import { DEFAULT_WORKSPACE_ID, getWorkspaceMetadata } from "./workspaceMeta";

const metadata = getWorkspaceMetadata(DEFAULT_WORKSPACE_ID);

export const CUSTOM_FIELD_DEFINITIONS: Record<string, string[]> = metadata.fields
  .filter((field) => field.type === "enum" && field.values?.length)
  .reduce<Record<string, string[]>>((accumulator, field) => {
    accumulator[field.label] = field.values?.map((value) => value.value) ?? [];
    return accumulator;
  }, {});

export const OPQL_LABEL_DICTIONARY = metadata.labels.map((label) => ({
  id: `label:${label.value}`,
  kind: "label" as const,
  value: label.value,
  label: `#${label.value}`,
  description: label.description,
  synonyms: label.synonyms,
  weight: 0.65,
}));

export const OPQL_TEAM_DIRECTORY = metadata.teams.map((team) => ({
  id: `team:${team.id}`,
  kind: "user" as const,
  value: team.slug,
  label: `Team ${team.name}`,
  description: team.description,
  teamId: team.id,
  weight: 0.62,
}));

export const OPQL_SYNONYM_CORPUS: Record<string, string[]> = { ...metadata.synonyms };

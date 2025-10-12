import { useMemo } from "react";

import {
  CUSTOM_FIELD_DEFINITIONS,
  OPQL_LABEL_DICTIONARY,
  OPQL_SYNONYM_CORPUS,
  OPQL_TEAM_DIRECTORY,
} from "@/data/opqlDictionaries";
import type { SuggestionDictionaryItem, SuggestionDictionaries } from "@/types";
import { useWorkspaceContextOptional } from "@/state/workspace";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const cloneDictionaryItem = (item: SuggestionDictionaryItem): SuggestionDictionaryItem => ({
  ...item,
  synonyms: item.synonyms ? [...item.synonyms] : undefined,
  tags: item.tags ? [...item.tags] : undefined,
  permissions: item.permissions ? [...item.permissions] : undefined,
});

export const useSuggestionDictionaries = () => {
  const workspace = useWorkspaceContextOptional();

  return useMemo(() => {
    const fieldEntries: SuggestionDictionaryItem[] = [];
    const enumerationEntries: SuggestionDictionaryItem[] = [];

    Object.entries(CUSTOM_FIELD_DEFINITIONS).forEach(([fieldLabel, values]) => {
      const slug = slugify(fieldLabel);
      fieldEntries.push({
        id: `custom-field:${slug}`,
        kind: "field",
        value: slug,
        label: fieldLabel,
        description: "Custom field",
        synonyms: [fieldLabel.toLowerCase(), slug.replace(/-/g, " ")],
        weight: 0.62,
      });

      values.forEach((option) => {
        const optionSlug = slugify(option);
        enumerationEntries.push({
          id: `custom-field:${slug}:${optionSlug}`,
          kind: "enumeration",
          value: option,
          label: `${fieldLabel}: ${option}`,
          description: `${fieldLabel} equals ${option}`,
          tags: [fieldLabel],
          synonyms: optionSlug !== option.toLowerCase() ? [optionSlug.replace(/-/g, " ")] : undefined,
          weight: 0.58,
        });
      });
    });

    const labelEntries = OPQL_LABEL_DICTIONARY.map((item: any) => ({
      ...item,
      synonyms: Array.isArray(item.synonyms) ? Array.from(item.synonyms) : [],
    })) as any;

    const spaceEntries: SuggestionDictionaryItem[] = (workspace?.spaces ?? []).map((space) => ({
      id: `space:${space.id}`,
      kind: "user" as const,
      value: space.slug ?? space.id,
      label: `space:${space.slug ?? space.id}`,
      description: space.name,
      teamId: space.id,
      synonyms: space.slug ? [space.slug] : undefined,
      weight: 0.6,
    }));

    const teamEntries: SuggestionDictionaryItem[] = [
      ...OPQL_TEAM_DIRECTORY.map((item) => ({
        ...item,
      })),
      ...spaceEntries,
    ];

    const synonymsCorpus = { ...OPQL_SYNONYM_CORPUS };

    fieldEntries.forEach((field) => {
      if (!synonymsCorpus[field.value]) {
        synonymsCorpus[field.value] = field.synonyms ? [...field.synonyms] : [];
      }
    });

    const dictionaries: SuggestionDictionaries = {
      fields: fieldEntries.map(cloneDictionaryItem),
      enumerations: enumerationEntries.map(cloneDictionaryItem),
      labels: labelEntries.map(cloneDictionaryItem),
      teams: teamEntries.map(cloneDictionaryItem),
      synonyms: synonymsCorpus,
    };

    const signature = [
      ...dictionaries.fields.map((field) => `${field.id}:${field.value}`),
      ...dictionaries.enumerations.map((item) => `${item.id}:${item.value}`),
      ...dictionaries.labels.map((label) => `${label.id}:${label.value}`),
      ...dictionaries.teams.map((team) => `${team.id}:${team.value}`),
      ...Object.entries(dictionaries.synonyms).map(([term, variants]) => `${term}:${variants.join(",")}`),
    ].join("|");

    return {
      dictionaries,
      signature,
      currentTeamId: workspace?.currentSpace?.id ?? undefined,
    };
  }, [workspace?.currentSpace?.id, workspace?.spaces]);
};

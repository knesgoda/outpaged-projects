import {
  enqueueFrom,
  resetSupabaseMocks,
} from "@/testing/supabaseHarness";
import { getOpqlSuggestions } from "@/server/search/suggest";
import {
  DEFAULT_WORKSPACE_ID,
  getWorkspaceMetadata,
} from "@/data/workspaceMeta";

const makeSelectBuilder = (rows: any[]) => {
  const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
  return {
    select: jest.fn().mockReturnValue({ eq }),
  };
};

const queueMetadataTables = (config: {
  labels?: any[];
  users?: any[];
  teams?: any[];
  fields?: any[];
  fieldValues?: any[];
  projects?: any[];
  sprints?: any[];
  synonyms?: any[];
}) => {
  enqueueFrom("workspace_metadata_fields", makeSelectBuilder(config.fields ?? []));
  enqueueFrom("workspace_metadata_field_values", makeSelectBuilder(config.fieldValues ?? []));
  enqueueFrom("workspace_metadata_projects", makeSelectBuilder(config.projects ?? []));
  enqueueFrom("workspace_metadata_sprints", makeSelectBuilder(config.sprints ?? []));
  enqueueFrom("workspace_metadata_teams", makeSelectBuilder(config.teams ?? []));
  enqueueFrom("workspace_metadata_labels", makeSelectBuilder(config.labels ?? []));
  enqueueFrom("workspace_metadata_users", makeSelectBuilder(config.users ?? []));
  enqueueFrom("workspace_metadata_synonyms", makeSelectBuilder(config.synonyms ?? []));
};

describe("OPQL suggestions adapt to metadata", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("reflects updated labels after metadata refresh", async () => {
    queueMetadataTables({
      labels: [
        { id: "analytics", value: "analytics", description: "Data", synonyms: ["insight"], permissions: null, icon: null },
      ],
    });

    const metadata = await getWorkspaceMetadata(DEFAULT_WORKSPACE_ID);
    expect(metadata.labels.map((label) => label.value)).toEqual(["analytics"]);

    const first = await getOpqlSuggestions({
      text: "#",
      cursor: 1,
      grammarState: "root",
      history: [],
    });

    const labelValues = first.items.filter((item) => item.kind === "label").map((item) => item.value);
    expect(labelValues).toContain("analytics");

    resetSupabaseMocks();

    queueMetadataTables({
      labels: [
        { id: "android", value: "android", description: "Mobile", synonyms: null, permissions: null, icon: null },
      ],
    });

    const refreshed = await getOpqlSuggestions({
      text: "#",
      cursor: 1,
      grammarState: "root",
      history: [],
    });

    const refreshedLabels = refreshed.items.filter((item) => item.kind === "label").map((item) => item.value);
    expect(refreshedLabels).toContain("android");
    expect(refreshedLabels).not.toContain("analytics");
  });
});

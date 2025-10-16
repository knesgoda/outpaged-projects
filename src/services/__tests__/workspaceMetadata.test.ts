import { DEFAULT_WORKSPACE_ID } from "@/data/workspaceMeta";
import {
  clearWorkspaceMetadataCache,
  getWorkspaceMetadata,
  loadWorkspaceMetadata,
} from "@/services/workspaceMetadata";

const mockTables: Record<string, any[]> = {};

type SupabaseMock = {
  from: jest.Mock;
};

function createSupabaseMock(): SupabaseMock {
  return {
    from: jest.fn((table: string) => {
      const eq = jest.fn().mockResolvedValue({ data: mockTables[table] ?? [], error: null });
      const select = jest.fn().mockReturnValue({ eq });
      return { select };
    }),
  };
}

var supabaseMock: SupabaseMock;

jest.mock("@/integrations/supabase/client", () => {
  supabaseMock = createSupabaseMock();
  return {
    supabase: supabaseMock,
    supabaseConfigured: true,
  };
});

const getSupabaseMock = (): SupabaseMock => {
  if (!supabaseMock) {
    throw new Error("Supabase mock not initialised");
  }
  return supabaseMock;
};

const setTable = (table: string, rows: any[]) => {
  mockTables[table] = rows;
};

describe("workspace metadata service", () => {
  beforeEach(() => {
    Object.keys(mockTables).forEach((key) => delete mockTables[key]);
    getSupabaseMock().from.mockClear();
    clearWorkspaceMetadataCache();
  });

  it("loads metadata from supabase and caches the result", async () => {
    setTable("workspace_metadata_fields", [
      {
        id: "field-priority",
        label: "Priority",
        slug: "priority",
        field_type: "enum",
        description: "Importance level",
        synonyms: ["urgency"],
        permissions: null,
        icon: "flag-triangle-right",
      },
    ]);
    setTable("workspace_metadata_field_values", [
      {
        id: "priority-high",
        field_id: "field-priority",
        value: "High",
        label: "Priority: High",
        description: null,
        synonyms: ["critical"],
        tags: ["priority"],
        permissions: null,
        icon: null,
      },
    ]);
    setTable("workspace_metadata_labels", [
      { id: "backend", value: "backend", description: "Platform", synonyms: null, permissions: null, icon: "server" },
    ]);
    setTable("workspace_metadata_synonyms", [{ term: "urgent", variants: ["high"] }]);

    const metadata = await getWorkspaceMetadata(DEFAULT_WORKSPACE_ID, { refresh: true });
    expect(metadata.fields).toHaveLength(1);
    expect(metadata.labels.map((label) => label.value)).toEqual(["backend"]);

    getSupabaseMock().from.mockClear();

    const cached = await getWorkspaceMetadata(DEFAULT_WORKSPACE_ID);
    expect(cached.fields).toHaveLength(1);
    expect(getSupabaseMock().from).not.toHaveBeenCalled();
  });

  it("refreshes metadata after clearing the cache", async () => {
    setTable("workspace_metadata_labels", [
      { id: "ux", value: "ux", description: "Design", synonyms: ["design"], permissions: null, icon: null },
    ]);
    await loadWorkspaceMetadata(DEFAULT_WORKSPACE_ID, { refresh: true });

    clearWorkspaceMetadataCache(DEFAULT_WORKSPACE_ID);
    getSupabaseMock().from.mockClear();

    setTable("workspace_metadata_labels", [
      { id: "ios", value: "ios", description: "Mobile", synonyms: null, permissions: null, icon: null },
    ]);

    const refreshed = await getWorkspaceMetadata(DEFAULT_WORKSPACE_ID, { refresh: true });
    expect(refreshed.labels.map((label) => label.value)).toEqual(["ios"]);
  });
});

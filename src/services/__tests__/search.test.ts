import { searchAll } from "../search";

jest.mock("@/integrations/supabase/client", () => {
  const mockData: Record<string, any[]> = {};
  const builders: Record<string, any> = {};

  const createBuilder = (table: string) => {
    const builder: any = {
      select: jest.fn(() => builder),
      textSearch: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(
        () => Promise.resolve({ data: mockData[table] ?? [], error: null })
      ),
      or: jest.fn(() => builder),
      filter: jest.fn(() => builder),
      eq: jest.fn(() => builder),
    };
    builders[table] = builder;
    return builder;
  };

  const supabase = {
    from: jest.fn((table: string) => builders[table] ?? createBuilder(table)),
  };

  return {
    supabaseConfigured: true,
    supabase,
    __setMockData: (data: Record<string, any[]>) => {
      Object.keys(mockData).forEach((key) => delete mockData[key]);
      Object.assign(mockData, data);
    },
    __getBuilder: (table: string) => builders[table],
  };
});

const supabaseMock = jest.requireMock("@/integrations/supabase/client") as {
  __setMockData: (data: Record<string, any[]>) => void;
  __getBuilder: (table: string) => any;
};

describe("searchAll", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabaseMock.__setMockData({
      projects: [
        {
          id: "p1",
          name: "Alpha Project",
          description: "Alpha initiative",
          updated_at: new Date().toISOString(),
        },
      ],
      tasks: [],
      doc_pages: [],
      project_files: [],
      comments: [],
      profiles: [],
    });
  });

  it("returns project results for matching query", async () => {
    const results = await searchAll({ q: "Alpha" });
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "p1", type: "project" }),
      ])
    );
  });

  it("applies project filters to scoped queries", async () => {
    supabaseMock.__setMockData({
      projects: [],
      doc_pages: [],
      project_files: [],
      comments: [],
    });

    await searchAll({
      q: "Alpha",
      projectId: "p1",
      types: ["doc", "file", "comment"],
      includeComments: true,
    });

    const docBuilder = supabaseMock.__getBuilder("doc_pages");
    const fileBuilder = supabaseMock.__getBuilder("project_files");
    const commentBuilder = supabaseMock.__getBuilder("comments");

    expect(docBuilder?.eq).toHaveBeenCalledWith("project_id", "p1");
    expect(fileBuilder?.eq).toHaveBeenCalledWith("project_id", "p1");
    expect(commentBuilder?.eq).toHaveBeenCalledWith("project_id", "p1");
  });
});

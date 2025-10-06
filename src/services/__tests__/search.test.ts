import { searchAll } from "../search";

jest.mock("@/integrations/supabase/client", () => {
  const mockData: Record<string, any[]> = {};

  const createBuilder = (table: string) => {
    const builder: any = {
      select: jest.fn(() => builder),
      textSearch: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => Promise.resolve({ data: mockData[table] ?? [], error: null })),
      or: jest.fn(() => builder),
      filter: jest.fn(() => builder),
      eq: jest.fn(() => builder),
    };
    return builder;
  };

  const supabase = {
    from: jest.fn((table: string) => createBuilder(table)),
  };

  return {
    supabaseConfigured: true,
    supabase,
    __setMockData: (data: Record<string, any[]>) => {
      Object.keys(mockData).forEach((key) => delete mockData[key]);
      Object.assign(mockData, data);
    },
  };
});

const supabaseMock = jest.requireMock("@/integrations/supabase/client") as {
  __setMockData: (data: Record<string, any[]>) => void;
};

describe("searchAll", () => {
  beforeEach(() => {
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
});

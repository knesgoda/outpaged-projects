import { searchAll, searchProjects, searchTasks } from "../search";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock("@/integrations/supabase/client") as {
  supabase: { from: jest.Mock };
};

type Builder = ReturnType<typeof createQueryBuilder>;

const createQueryBuilder = (data: any[], error: { message?: string } | null = null) => {
  const builder: any = {
    select: jest.fn(() => builder),
    order: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    ilike: jest.fn(() => builder),
    or: jest.fn(() => builder),
    textSearch: jest.fn(() => builder),
    limit: jest.fn(() => Promise.resolve({ data, error })),
  };
  return builder as Builder;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("searchTasks", () => {
  it("filters by project and maps rows", async () => {
    const builder = createQueryBuilder([
      {
        id: "task-1",
        title: "Fix issue",
        description: "Resolve production bug",
        project_id: "proj-1",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ]);

    supabase.from.mockReturnValue(builder);

    const results = await searchTasks({ query: "issue", projectId: "proj-1", limit: 5 });

    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(builder.eq).toHaveBeenCalledWith("project_id", "proj-1");
    expect(builder.textSearch).toHaveBeenCalledWith("search", "issue", { type: "websearch" });
    expect(builder.limit).toHaveBeenCalledWith(5);
    expect(results).toEqual([
      expect.objectContaining({
        id: "task-1",
        type: "task",
        url: "/tasks/task-1",
        project_id: "proj-1",
      }),
    ]);
  });

  it("propagates Supabase errors", async () => {
    const builder = createQueryBuilder([], { message: "boom" });
    supabase.from.mockReturnValue(builder);

    await expect(searchTasks({ query: "boom" })).rejects.toThrow("boom");
  });
});

describe("searchProjects", () => {
  it("maps project rows", async () => {
    const builder = createQueryBuilder([
      {
        id: "proj-7",
        name: "Alpha",
        description: "Launch plan",
        updated_at: "2024-02-03T10:00:00.000Z",
      },
    ]);

    supabase.from.mockReturnValue(builder);

    const results = await searchProjects({ query: "Alpha", limit: 3 });

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(builder.textSearch).toHaveBeenCalledWith("search", "Alpha", { type: "websearch" });
    expect(results[0]).toMatchObject({
      id: "proj-7",
      type: "project",
      title: "Alpha",
      url: "/projects/proj-7",
    });
  });
});

describe("searchAll", () => {
  it("aggregates results across entities and respects includeComments", async () => {
    const tasksBuilder = createQueryBuilder([
      {
        id: "task-9",
        title: "Draft brief",
        description: "",
        project_id: "proj-9",
        updated_at: "2024-01-05T00:00:00.000Z",
      },
    ]);
    const projectsBuilder = createQueryBuilder([
      {
        id: "proj-9",
        name: "Launch",
        description: "",
        updated_at: "2024-01-04T00:00:00.000Z",
      },
    ]);
    const docsBuilder = createQueryBuilder([
      {
        id: "doc-3",
        title: "Launch plan",
        body_markdown: "",
        project_id: "proj-9",
        updated_at: "2024-01-03T00:00:00.000Z",
      },
    ]);
    const filesBuilder = createQueryBuilder([]);
    const peopleBuilder = createQueryBuilder([
      {
        id: "profile-1",
        user_id: "user-1",
        full_name: "Ava Analyst",
        username: "ava",
        updated_at: "2024-01-02T00:00:00.000Z",
      },
    ]);

    supabase.from.mockImplementation((table: string) => {
      switch (table) {
        case "tasks":
          return tasksBuilder;
        case "projects":
          return projectsBuilder;
        case "doc_pages":
          return docsBuilder;
        case "project_files":
          return filesBuilder;
        case "profiles":
          return peopleBuilder;
        case "comments":
          throw new Error("comments should be skipped");
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    });

    const results = await searchAll({ q: "launch", includeComments: false, limit: 6 });

    const types = results.map((item) => item.type);
    expect(types).toEqual(expect.arrayContaining(["task", "project", "doc", "person"]));
    expect(types).not.toContain("comment");
  });
});

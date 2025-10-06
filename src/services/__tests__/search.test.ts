codex/implement-global-search-and-command-k-palette
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
import { searchComments, searchDocs, searchFiles } from '@/services/search';

jest.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: jest.fn(),
    },
  };
});

const { supabase } = require('@/integrations/supabase/client') as {
  supabase: {
    from: jest.Mock;
  };
};

type QueryResult<Row> = { data: Row[] | null; error: Error | null };

type QueryStub<Row> = {
  select: jest.Mock;
  textSearch: jest.Mock;
  or: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  then: jest.Mock;
  catch: jest.Mock;
  finally: jest.Mock;
};

function createQueryStub<Row>(result: QueryResult<Row>): QueryStub<Row> {
  const thenable = Promise.resolve(result);
  const stub: Partial<QueryStub<Row>> = {};

  stub.select = jest.fn(() => stub);
  stub.textSearch = jest.fn(() => stub);
  stub.or = jest.fn(() => stub);
  stub.eq = jest.fn(() => stub);
  stub.order = jest.fn(() => stub);
  stub.limit = jest.fn(() => stub);
  stub.then = jest.fn((onFulfilled: (value: QueryResult<Row>) => unknown) => thenable.then(onFulfilled));
  stub.catch = jest.fn((onRejected?: (reason: unknown) => unknown) => thenable.catch(onRejected as any));
  stub.finally = jest.fn((onFinally?: () => void) => thenable.finally(onFinally));

  return stub as QueryStub<Row>;
}

describe('search services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchDocs', () => {
    it('applies the project filter when projectId is provided', async () => {
      const stub = createQueryStub({ data: [], error: null });
      supabase.from.mockReturnValue(stub);

      await searchDocs('product strategy', { projectId: 'project-123' });

      expect(stub.eq).toHaveBeenCalledWith('project_id', 'project-123');
    });

    it('skips the project filter when projectId is absent', async () => {
      const stub = createQueryStub({ data: [], error: null });
      supabase.from.mockReturnValue(stub);

      await searchDocs('product strategy');

      expect(stub.eq).not.toHaveBeenCalled();
    });
  });

  describe('searchFiles', () => {
    it('applies the project filter when projectId is provided', async () => {
      const stub = createQueryStub({ data: [], error: null });
      supabase.from.mockReturnValue(stub);

      await searchFiles('roadmap', { projectId: 'proj-42' });

      expect(stub.eq).toHaveBeenCalledWith('project_id', 'proj-42');
    });

    it('skips the project filter when projectId is absent', async () => {
      const stub = createQueryStub({ data: [], error: null });
      supabase.from.mockReturnValue(stub);

      await searchFiles('roadmap');

      expect(stub.eq).not.toHaveBeenCalled();
    });
  });

  describe('searchComments', () => {
    it('applies the project filter when projectId is provided', async () => {
      const stub = createQueryStub({ data: [], error: null });
      supabase.from.mockReturnValue(stub);

      await searchComments('launch plan', { projectId: 'project-abc' });

      expect(stub.eq).toHaveBeenCalledWith('project_id', 'project-abc');
    });

    it('skips the project filter when projectId is absent', async () => {
      const stub = createQueryStub({ data: [], error: null });
      supabase.from.mockReturnValue(stub);

      await searchComments('launch plan');

      expect(stub.eq).not.toHaveBeenCalled();
    });
  });
});

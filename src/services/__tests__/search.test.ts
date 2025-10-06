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

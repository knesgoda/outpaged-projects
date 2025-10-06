const createQueryBuilder = () => {
  const result = { data: [], error: null };
  const builder: any = {
    select: jest.fn(() => builder),
    order: jest.fn(() => Promise.resolve(result)),
    eq: jest.fn(() => builder),
    is: jest.fn(() => builder),
    or: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    insert: jest.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "mock-id" }, error: null }),
      }),
    })),
    update: jest.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: "mock-id" }, error: null }),
      }),
    })),
    delete: jest.fn(() => Promise.resolve({ error: null })),
    then: (resolve: (value: any) => void) => Promise.resolve(result).then(resolve),
    catch: (reject: (reason: any) => void) => Promise.resolve(result).catch(reject),
    finally: (callback: () => void) => Promise.resolve(result).finally(callback),
  };
  return builder;
};

export const supabase = {
  from: jest.fn(() => createQueryBuilder()),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
  },
};

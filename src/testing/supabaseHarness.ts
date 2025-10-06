const fromQueue: Array<{ table: string; builder: any }> = [];
const storageQueue: Array<{ bucket: string; client: any }> = [];

export const supabaseMock = {
  from: jest.fn((table: string) => {
    const entry = fromQueue.shift();
    if (!entry) {
      throw new Error(`No mock queued for table ${table}`);
    }
    if (entry.table !== table) {
      throw new Error(`Expected table ${entry.table} but received ${table}`);
    }
    return entry.builder;
  }),
  storage: {
    from: jest.fn((bucket: string) => {
      const entry = storageQueue.shift();
      if (!entry) {
        throw new Error(`No storage mock queued for bucket ${bucket}`);
      }
      if (entry.bucket !== bucket) {
        throw new Error(`Expected bucket ${entry.bucket} but received ${bucket}`);
      }
      return entry.client;
    }),
  },
  functions: {
    invoke: jest.fn(),
  },
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseMock,
}));

const requireUserIdMock = jest.fn(async () => "user-123");
const handleSupabaseErrorMock = jest.fn((error: any, fallbackMessage: string) => {
  if (!error) {
    throw new Error(fallbackMessage);
  }
  if (error.code === "42501" || error.code === "PGRST301") {
    throw new Error("You do not have access");
  }
  throw new Error(error.message ?? fallbackMessage);
});

jest.mock("@/services/utils", () => ({
  requireUserId: requireUserIdMock,
  handleSupabaseError: handleSupabaseErrorMock,
}));

export const utilsMocks = {
  requireUserIdMock,
  handleSupabaseErrorMock,
};

export function enqueueFrom(table: string, builder: any) {
  fromQueue.push({ table, builder });
}

export function enqueueStorage(bucket: string, client: any) {
  storageQueue.push({ bucket, client });
}

export function resetSupabaseMocks() {
  fromQueue.length = 0;
  storageQueue.length = 0;
  supabaseMock.from.mockClear();
  supabaseMock.storage.from.mockClear();
  supabaseMock.functions.invoke.mockClear();
  supabaseMock.auth.getUser.mockReset();
  utilsMocks.requireUserIdMock.mockReset();
  utilsMocks.handleSupabaseErrorMock.mockReset();
}

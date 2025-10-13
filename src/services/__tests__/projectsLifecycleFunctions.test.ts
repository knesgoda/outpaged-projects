const SUPABASE_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
];

describe("project lifecycle functions", () => {
  const originalFetch = global.fetch;
  let envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    jest.resetModules();
    envBackup = {};
    for (const key of SUPABASE_ENV_KEYS) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
    delete (globalThis as { __import_meta_env__?: unknown }).__import_meta_env__;
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as { fetch?: unknown }).fetch;
    }
    for (const key of SUPABASE_ENV_KEYS) {
      const value = envBackup[key];
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    jest.restoreAllMocks();
  });

  it("uses the fallback Supabase URL when cloning projects without env vars", async () => {
    const responseBody = { status: "ok" };
    const fetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(responseBody),
    } as const;
    const fetchMock = jest.fn().mockResolvedValue(fetchResponse);
    global.fetch = fetchMock as unknown as typeof originalFetch;

    const supabaseModule = await import("@/integrations/supabase/client");
    const getSessionMock = jest
      .spyOn(supabaseModule.supabase.auth, "getSession")
      .mockResolvedValue({
        data: { session: { access_token: "token-123" } },
        error: null,
      });
    const { cloneProject } = await import("@/services/projects");
    const { resolvedSupabaseUrl } = supabaseModule;

    await expect(cloneProject("project-123")).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith(
      `${resolvedSupabaseUrl}/functions/v1/project-lifecycle`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchResponse.json).toHaveBeenCalledTimes(1);
  });
});

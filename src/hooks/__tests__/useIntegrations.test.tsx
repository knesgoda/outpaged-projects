import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  enqueueFrom,
  resetSupabaseMocks,
  utilsMocks,
} from "@/testing/supabaseHarness";
import { useIntegrations } from "@/hooks/useIntegrations";
import type { Integration, UserIntegration, Webhook } from "@/types";

const queueIntegrationList = (rows: Integration[]) => {
  const order = jest.fn().mockResolvedValue({ data: rows, error: null });
  const select = jest.fn().mockReturnValue({ order });
  enqueueFrom("integrations", { select });
};

const queueUserIntegrationsList = (rows: UserIntegration[]) => {
  const order = jest.fn().mockResolvedValue({ data: rows, error: null });
  const builder = {
    select: jest.fn().mockReturnValue({
      or: jest.fn().mockReturnValue({ order }),
      is: jest.fn().mockReturnValue({ order }),
      order,
    }),
  };
  enqueueFrom("user_integrations", builder);
};

const queueUserIntegrationInsert = (response: { data: any; error: any }) => {
  const single = jest.fn().mockResolvedValue(response);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  enqueueFrom("user_integrations", { insert });
};

const queueUserIntegrationDelete = (error: any = null) => {
  const eq = jest.fn().mockResolvedValue({ error });
  const remove = jest.fn().mockReturnValue({ eq });
  enqueueFrom("user_integrations", { delete: remove });
};

const queueWorkspaceWebhooksList = (rows: Webhook[]) => {
  const order = jest.fn().mockResolvedValue({ data: rows, error: null });
  const select = jest.fn().mockReturnValue({
    is: jest.fn().mockReturnValue({ order }),
    order,
  });
  enqueueFrom("webhooks", { select });
};

const queueWebhookInsert = (response: { data: any; error: any }) => {
  const single = jest.fn().mockResolvedValue(response);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });
  enqueueFrom("webhooks", { insert });
};

describe("useIntegrations", () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    resetSupabaseMocks();
    client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    utilsMocks.requireUserIdMock.mockResolvedValue("user-123");
    utilsMocks.handleSupabaseErrorMock.mockImplementation((error: any, fallback: string) => {
      if (!error) {
        throw new Error(fallback);
      }
      if (error?.code === "42501" || error?.code === "PGRST301") {
        throw new Error("You do not have access");
      }
      throw new Error(error?.message ?? fallback);
    });
  });

  afterEach(() => {
    client.clear();
  });

  it("connects and disconnects integrations while keeping caches in sync", async () => {
    const now = new Date().toISOString();
    const slackConnection: UserIntegration = {
      id: "conn-slack",
      user_id: "user-123",
      project_id: null,
      provider: "slack",
      display_name: "#general",
      access_data: { channel: "#general" },
      created_at: now,
    } as UserIntegration;

    const githubConnection: UserIntegration = {
      id: "conn-github",
      user_id: "user-123",
      project_id: null,
      provider: "github",
      display_name: null,
      access_data: { repo: "outpaged/repo" },
      created_at: now,
    } as UserIntegration;

    queueIntegrationList([
      { key: "slack", name: "Slack", enabled: true, config: {} } as Integration,
      { key: "github", name: "GitHub", enabled: true, config: {} } as Integration,
    ]);
    queueUserIntegrationsList([]);
    queueWorkspaceWebhooksList([]);

    const { result } = renderHook(() => useIntegrations(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.userIntegrations).toHaveLength(0);

    queueUserIntegrationInsert({ data: slackConnection, error: null });
    queueUserIntegrationsList([slackConnection]);

    await act(async () => {
      await result.current.connectIntegration({
        provider: "slack",
        displayName: "#general",
        accessData: { channel: "#general" },
      });
    });

    await waitFor(() => expect(result.current.userIntegrations).toHaveLength(1));
    expect(result.current.userIntegrations[0].provider).toBe("slack");

    queueUserIntegrationInsert({ data: githubConnection, error: null });
    queueUserIntegrationsList([githubConnection, slackConnection]);

    await act(async () => {
      await result.current.connectIntegration({
        provider: "github",
        accessData: { repo: "outpaged/repo" },
      });
    });

    await waitFor(() => expect(result.current.userIntegrations).toHaveLength(2));
    expect(result.current.userIntegrations.map((item) => item.provider)).toEqual(
      expect.arrayContaining(["slack", "github"]),
    );

    queueUserIntegrationDelete();
    queueUserIntegrationsList([githubConnection]);

    await act(async () => {
      await result.current.disconnectIntegration(slackConnection.id);
    });

    await waitFor(() => expect(result.current.userIntegrations).toHaveLength(1));
    expect(result.current.userIntegrations[0].provider).toBe("github");

    queueUserIntegrationInsert({ data: null, error: { message: "duplicate" } });

    await act(async () => {
      await expect(
        result.current.connectIntegration({ provider: "slack" }),
      ).rejects.toThrow("duplicate");
    });

    expect(result.current.userIntegrations).toHaveLength(1);
    expect(result.current.userIntegrations[0].provider).toBe("github");
  });

  it("creates workspace webhooks and preserves cache on errors", async () => {
    const now = new Date().toISOString();
    const webhook: Webhook = {
      id: "hook-1",
      owner: "user-123",
      project_id: null,
      target_url: "https://hooks.test/outpaged",
      secret: "secret",
      active: true,
      created_at: now,
    } as Webhook;

    queueIntegrationList([]);
    queueUserIntegrationsList([]);
    queueWorkspaceWebhooksList([]);

    const { result } = renderHook(() => useIntegrations(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspaceWebhooks).toHaveLength(0);

    queueWebhookInsert({ data: webhook, error: null });
    queueWorkspaceWebhooksList([webhook]);

    await act(async () => {
      await result.current.createWebhook({ targetUrl: webhook.target_url, secret: webhook.secret ?? undefined });
    });

    await waitFor(() => expect(result.current.workspaceWebhooks).toHaveLength(1));
    expect(result.current.workspaceWebhooks[0].target_url).toBe(webhook.target_url);

    queueWebhookInsert({ data: null, error: { message: "invalid" } });

    await act(async () => {
      await expect(
        result.current.createWebhook({ targetUrl: webhook.target_url }),
      ).rejects.toThrow("invalid");
    });

    expect(result.current.workspaceWebhooks).toHaveLength(1);
  });
});

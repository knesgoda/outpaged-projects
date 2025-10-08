import { enqueueFrom, enqueueStorage, resetSupabaseMocks, supabaseMock, utilsMocks } from "@/testing/supabaseHarness";
import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});

Object.defineProperty(globalThis, "TextEncoder", {
  value: TextEncoder,
  configurable: true,
});

Object.defineProperty(globalThis, "TextDecoder", {
  value: TextDecoder,
  configurable: true,
});

import { getMyProfile, updateMyProfile, uploadMyAvatar } from "../profile";
import { listMembers, removeMember, setMemberRole, upsertWorkspaceSettings, uploadBrandLogo } from "../settings";
import { listAuditLogs, recordAudit } from "../audit";
import { createApiToken, listApiTokens, revokeApiToken } from "../apiTokens";
import { createWebhook, deleteWebhook, listWebhooks, updateWebhook } from "../webhooks";

beforeEach(() => {
  resetSupabaseMocks();
  utilsMocks.requireUserIdMock.mockResolvedValue("user-123");
});

describe("Profile service smoke tests", () => {
  it("updates profile data and avatar", async () => {
    const updatedProfile = {
      data: {
        id: "user-123",
        full_name: "Ada Lovelace",
        title: "Engineer",
        department: "R&D",
        timezone: "UTC",
        capacity_hours_per_week: 32,
        avatar_url: "https://example.com/avatar.png",
        updated_at: new Date().toISOString(),
      },
      error: null,
    };

    enqueueFrom("profiles", {
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(updatedProfile),
        }),
      }),
    });

    enqueueFrom("profiles", {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue(updatedProfile),
        }),
      }),
    });

    const avatarUrl = "https://cdn.test/avatar.png";
    enqueueStorage("avatars", {
      upload: jest.fn().mockResolvedValue({ error: null }),
    });

    enqueueStorage("avatars", {
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: avatarUrl } }),
    });

    enqueueFrom("profiles", {
      upsert: jest.fn().mockResolvedValue({ error: null }),
    });

    const profile = await updateMyProfile({
      full_name: "Ada Lovelace",
    });

    expect(profile.full_name).toBe("Ada Lovelace");

    const fetched = await getMyProfile();
    expect(fetched?.full_name).toBe("Ada Lovelace");

    const file = { name: "avatar.png", type: "image/png", size: 1024 } as unknown as File;
    const url = await uploadMyAvatar(file);
    expect(url).toBe(avatarUrl);

    expect(supabaseMock.storage.from).toHaveBeenCalledWith("avatars");
  });
});

describe("Workspace admin service smoke tests", () => {
  it("updates workspace settings, uploads logo, manages members", async () => {
    const updatedSettings = {
      data: {
        id: "workspace-1",
        owner: "user-123",
        name: "Core Team",
        brand_logo_url: "https://cdn.test/logo.png",
        default_timezone: "America/New_York",
        default_capacity_hours_per_week: 35,
        allowed_email_domain: "example.com",
        features: { roadmap: true },
        security: {},
        billing: {},
        updated_at: new Date().toISOString(),
      },
      error: null,
    };

    enqueueFrom("workspace_settings", {
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    enqueueFrom("workspace_settings", {
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(updatedSettings),
        }),
      }),
    });

    const settings = await upsertWorkspaceSettings({
      name: "Core Team",
      default_timezone: "America/New_York",
      features: { roadmap: true },
    });

    expect(settings.features).toEqual({ roadmap: true });

    enqueueStorage("branding", {
      upload: jest.fn().mockResolvedValue({ error: null }),
    });

    enqueueStorage("branding", {
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/logo.png" } }),
    });

    enqueueFrom("workspace_settings", {
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue(updatedSettings),
        }),
      }),
    });

    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    enqueueFrom("workspace_settings", {
      upsert: upsertMock,
    });

    const logoFile = { name: "logo.png", type: "image/png", size: 1024 } as unknown as File;
    const logoUrl = await uploadBrandLogo(logoFile);
    expect(logoUrl).toContain("logo.png");

    enqueueFrom("workspace_members", {
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [{ user_id: "member-1", role: "member" }],
          error: null,
        }),
      }),
    });

    const members = await listMembers();
    expect(members).toHaveLength(1);

    const eqRoleMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqRoleMock });
    enqueueFrom("workspace_members", {
      update: updateMock,
    });

    await setMemberRole("member-1", "admin");
    expect(eqRoleMock).toHaveBeenCalledWith("user_id", "member-1");

    const eqDeleteMock = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqDeleteMock });
    enqueueFrom("workspace_members", {
      delete: deleteMock,
    });

    await removeMember("member-1");
    expect(eqDeleteMock).toHaveBeenCalledWith("user_id", "member-1");
    expect(upsertMock).toHaveBeenCalled();
  });
});

describe("Audit logs service smoke tests", () => {
  it("records and lists logs", async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    enqueueFrom("audit_logs", {
      insert: insertMock,
    });

    await recordAudit("workspace.update", { type: "workspace", id: "workspace-1" }, { field: "name" });
    expect(insertMock).toHaveBeenCalled();

    const log = {
      id: "log-1",
      actor: "user-123",
      action: "workspace.update",
      target_type: "workspace",
      target_id: "workspace-1",
      metadata: { field: "name" },
      created_at: new Date().toISOString(),
    };

    const auditQuery: any = {
      select: jest.fn(() => auditQuery),
      order: jest.fn(() => auditQuery),
      eq: jest.fn(() => auditQuery),
      gte: jest.fn(() => auditQuery),
      lte: jest.fn(() => auditQuery),
      limit: jest.fn(() => auditQuery),
      or: jest.fn(() => auditQuery),
      then: (resolve: (value: any) => void) => resolve({ data: [log], error: null }),
    };

    enqueueFrom("audit_logs", auditQuery);

    const logs = await listAuditLogs({ limit: 10 });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("workspace.update");
  });
});

describe("API token service smoke tests", () => {
  it("creates, lists, and revokes tokens", async () => {
    const tokenRow = {
      id: "token-1",
      user_id: "user-123",
      name: "CLI",
      token_prefix: "abcdef01",
      last_four: "1234",
      created_at: new Date().toISOString(),
      revoked_at: null,
    };

    enqueueFrom("api_tokens", {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: tokenRow, error: null }),
        }),
      }),
    });

    const { token, tokenRow: created } = await createApiToken("CLI");
    expect(token).toHaveLength(48);
    expect(created.name).toBe("CLI");

    enqueueFrom("api_tokens", {
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: [tokenRow], error: null }),
      }),
    });

    const tokens = await listApiTokens();
    expect(tokens[0].token_prefix).toBe("abcdef01");

    const eqRevokeMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: eqRevokeMock });
    enqueueFrom("api_tokens", {
      update: updateMock,
    });

    await revokeApiToken(created.id);
    expect(eqRevokeMock).toHaveBeenCalledWith("id", created.id);
  });
});

describe("Webhook service smoke tests", () => {
  it("creates, updates, lists, and deletes webhooks", async () => {
    const webhookRow = {
      id: "hook-1",
      owner: "user-123",
      target_url: "https://hooks.example.com/receive",
      secret: "shhh",
      active: true,
      created_at: new Date().toISOString(),
    };

    enqueueFrom("webhooks", {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: webhookRow, error: null }),
        }),
      }),
    });

    const created = await createWebhook({ target_url: webhookRow.target_url, secret: "shhh" });
    expect(created.target_url).toBe(webhookRow.target_url);

    enqueueFrom("webhooks", {
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...webhookRow, active: false },
              error: null,
            }),
          }),
        }),
      }),
    });

    const updated = await updateWebhook("hook-1", { active: false });
    expect(updated.active).toBe(false);

    enqueueFrom("webhooks", {
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [{ ...webhookRow, active: false }],
          error: null,
        }),
      }),
    });

    const webhooks = await listWebhooks();
    expect(webhooks).toHaveLength(1);

    const eqDeleteMock = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqDeleteMock });
    enqueueFrom("webhooks", {
      delete: deleteMock,
    });

    await deleteWebhook("hook-1");
    expect(eqDeleteMock).toHaveBeenCalledWith("id", "hook-1");
  });
});

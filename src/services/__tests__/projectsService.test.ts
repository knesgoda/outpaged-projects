import type { DomainClient } from "@/domain/client";
import type { TenantContext } from "@/domain/tenant";
import type { ProjectRecord, ProjectServiceOptions } from "@/services/projects";

const defaultSupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock("@/integrations/supabase/client", () => ({
  supabase: defaultSupabaseMock,
}));

let createProject: typeof import("@/services/projects")["createProject"];

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = "https://supabase.test";
  ({ createProject } = await import("@/services/projects"));
});

describe("createProject", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the provided supabase client for authentication and queries", async () => {
    const now = new Date().toISOString();
    const insertedProject: ProjectRecord = {
      id: "project-123",
      owner: "user-789",
      name: "Example Project",
      description: null,
      status: "planning",
      created_at: now,
      updated_at: now,
      code: null,
      template_key: null,
      modules: null,
      permission_scheme_id: null,
      notification_scheme_id: null,
      sla_scheme_id: null,
      import_strategy: null,
      import_sources: null,
      calendar_id: null,
      timezone: null,
      lifecycle: null,
      field_configuration: null,
      workflow_ids: null,
      screen_ids: null,
      component_catalog: null,
      version_streams: null,
      automation_rules: null,
      integration_configs: null,
      default_views: null,
      dashboard_ids: null,
      archival_policy: null,
      published_at: null,
      archived_at: null,
    };

    const singleMock = jest.fn().mockResolvedValue({ data: insertedProject, error: null });
    const selectMock = jest.fn().mockReturnValue({ single: singleMock });
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    const fromMock = jest.fn().mockReturnValue({ insert: insertMock });
    const customAuthGetUser = jest
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-789" } }, error: null });

    const customSupabase = {
      auth: { getUser: customAuthGetUser },
      from: fromMock,
    };

    const tenant: TenantContext = {
      organizationId: "org-123",
      workspaceId: "workspace-123",
      spaceId: "space-456",
      userId: "user-789",
      environment: "development",
    };

    const publish = jest.fn();

    const options: ProjectServiceOptions = {
      client: {
        raw: customSupabase,
        tenant,
        publish,
      } as unknown as DomainClient,
    };

    const project = await createProject({ name: "  Example Project  " }, options);

    expect(customAuthGetUser).toHaveBeenCalledTimes(1);
    expect(defaultSupabaseMock.auth.getUser).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("projects");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Example Project",
        owner_id: "user-789",
        workspace_id: "workspace-123",
      }),
    );
    expect(selectMock).toHaveBeenCalledWith();
    expect(singleMock).toHaveBeenCalledWith();
    expect(publish).toHaveBeenCalledWith("project.created", { projectId: insertedProject.id });
    expect(project).toEqual(insertedProject);
  });
});


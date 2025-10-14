import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkflowBuilder } from "../WorkflowBuilder";
import { supabase } from "@/integrations/supabase/client";

type QueryResult = { data: any; error: any };

const createQueryBuilder = (result: QueryResult = { data: null, error: null }) => {
  const builder: any = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult) => void) => Promise.resolve(result).then(resolve),
    catch: (reject: (reason: unknown) => void) => Promise.resolve(result).catch(reject),
    finally: (onFinally: () => void) => Promise.resolve().finally(onFinally),
  };

  return builder;
};

describe("WorkflowBuilder", () => {
  const fromMock = supabase.from as unknown as jest.Mock;
  const invokeMock = supabase.functions.invoke as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fromMock.mockReset();
    fromMock.mockImplementation(() => createQueryBuilder());
    invokeMock.mockReset();
  });

  const baseWorkflow = {
    id: "wf-1",
    name: "Sample Workflow",
    description: "Base workflow",
    status: "draft",
    canvas_data: { zoom: 1, offset: { x: 0, y: 0 } },
    workflow_states: [
      {
        id: "state-1",
        name: "Start",
        category: "todo",
        color: "#000000",
        position: { x: 100, y: 100 },
        entry_actions: [],
        exit_actions: [],
        sla_pause: false,
        sla_resume: true,
        wip_limit: null,
        wip_policy: "",
      },
      {
        id: "state-2",
        name: "Done",
        category: "done",
        color: "#10b981",
        position: { x: 320, y: 100 },
        entry_actions: [],
        exit_actions: [],
        sla_pause: false,
        sla_resume: true,
        wip_limit: null,
        wip_policy: "",
      },
    ],
    workflow_transitions: [
      {
        id: "transition-1",
        from_state_id: "state-1",
        to_state_id: "state-2",
        name: "Complete",
        guard: "",
        validators: [],
        post_functions: [],
        required_approvals: 0,
        required_screens: [],
        screens: [],
        is_reversible: false,
        resume_sla: true,
      },
    ],
  };

  const mockInitialLoad = (workflowOverride: Partial<typeof baseWorkflow> = {}, versions: any[] = []) => {
    const workflowResult = { data: { ...baseWorkflow, ...workflowOverride }, error: null };
    const workflowBuilder = createQueryBuilder(workflowResult);
    workflowBuilder.select.mockImplementation(() => workflowBuilder);
    workflowBuilder.eq.mockImplementation(() => workflowBuilder);
    workflowBuilder.single.mockImplementation(() => Promise.resolve(workflowResult));

    const versionsResult = { data: versions, error: null };
    const versionsBuilder = createQueryBuilder(versionsResult);
    versionsBuilder.select.mockImplementation(() => versionsBuilder);
    versionsBuilder.eq.mockImplementation(() => versionsBuilder);
    versionsBuilder.order.mockImplementation(() => versionsBuilder);

    fromMock.mockImplementationOnce(() => workflowBuilder);
    fromMock.mockImplementationOnce(() => versionsBuilder);
  };

  it("allows editing state actions and transition guards", async () => {
    mockInitialLoad();

    render(<WorkflowBuilder projectId="project-1" workflowId="wf-1" />);

    await screen.findByText("Workflow Elements");

    const startButton = await screen.findByRole("button", { name: "Start" });

    fireEvent.click(startButton);

    const entryActionInput = screen.getByPlaceholderText("Add entry action");
    fireEvent.change(entryActionInput, { target: { value: "Notify team" } });
    fireEvent.click(screen.getByRole("button", { name: "Add entry action" }));

    expect(screen.getByText("Notify team")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Start → Done"));

    const guardInput = screen.getByPlaceholderText("Guard expression");
    fireEvent.change(guardInput, { target: { value: "status == 'ready'" } });

    await waitFor(() => expect(screen.getByDisplayValue("status == 'ready'" )).toBeInTheDocument());
  });

  it("publishes workflows after simulation and updates board mappings", async () => {
    const versionsInsertResult = { data: { id: "version-2", version_number: 2, created_at: new Date().toISOString(), published: true }, error: null };

    mockInitialLoad({}, []);

    const versionsInsertBuilder = createQueryBuilder(versionsInsertResult);
    let insertedVersionPayload: any;
    versionsInsertBuilder.insert.mockImplementation((payload: any) => {
      insertedVersionPayload = payload;
      return versionsInsertBuilder;
    });
    versionsInsertBuilder.select.mockImplementation(() => versionsInsertBuilder);
    versionsInsertBuilder.single.mockImplementation(() => Promise.resolve({
      data: { ...versionsInsertResult.data, ...insertedVersionPayload },
      error: null,
    }));

    fromMock.mockImplementationOnce(() => versionsInsertBuilder);

    invokeMock.mockImplementationOnce(() =>
      Promise.resolve({ data: { pathCount: 1, estimatedLeadTime: 4, warnings: [], cyclicalStates: [] }, error: null })
    );
    invokeMock.mockImplementationOnce(() =>
      Promise.resolve({ data: { message: "synced" }, error: null })
    );

    render(<WorkflowBuilder projectId="project-1" workflowId="wf-1" />);

    await screen.findByText("Workflow Elements");
    await screen.findByRole("button", { name: "Start" });

    const user = userEvent.setup();
    const lifecycleTab = await screen.findByRole("tab", { name: "Lifecycle" });
    await user.click(lifecycleTab);
    await waitFor(() => expect(lifecycleTab).toHaveAttribute("data-state", "active"));

    const lifecyclePanel = screen.getByRole("tabpanel");

    const runSimulationButton = within(lifecyclePanel).getByRole("button", { name: /Run Simulation/ });
    fireEvent.click(runSimulationButton);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith(
      "workflow-simulate",
      expect.objectContaining({ body: expect.objectContaining({ projectId: "project-1" }) })
    ));

    fireEvent.click(screen.getByRole("button", { name: "Publish Workflow" }));

    await waitFor(() => expect(insertedVersionPayload).toBeDefined());

    expect(invokeMock).toHaveBeenCalledWith(
      "projects-service",
      expect.objectContaining({
        body: expect.objectContaining({
          action: "update-workflow-mappings",
          projectId: "project-1",
          metrics: ["cfd", "burn"],
        }),
      })
    );

    await waitFor(() => expect(screen.getByTestId("workflow-status").textContent).toContain("Published"));
    await waitFor(() => expect(screen.getByText("synced")).toBeInTheDocument());
  });

  it("rolls back versions with mapping prompt", async () => {
    const rollbackVersion = {
      id: "version-1",
      version_number: 1,
      created_at: new Date().toISOString(),
      notes: "Initial",
      published: true,
      definition: {
        states: [
          {
            id: "state-rollback",
            name: "Review",
            category: "in_progress",
            color: "#1f2937",
            position: { x: 100, y: 100 },
            entryActions: ["Check"],
            exitActions: [],
            slaPause: false,
            slaResume: true,
            wipLimit: null,
            wipPolicy: "",
          },
        ],
        transitions: [
          {
            id: "transition-rollback",
            fromStateId: "state-rollback",
            toStateId: "state-rollback",
            name: "Loop",
            guard: "canLoop",
            validators: [],
            postFunctions: [],
            requiredApprovals: 0,
            requiredScreens: [],
            isReversible: false,
            resumeSla: true,
          },
        ],
        metadata: { name: "Rollback Workflow", description: "Rollback version" },
      },
    };

    mockInitialLoad({}, [rollbackVersion]);

    invokeMock.mockResolvedValue({ data: { message: "Rollback applied" }, error: null });

    const originalPrompt = window.prompt;
    window.prompt = jest.fn().mockReturnValue("Map changes");

    render(<WorkflowBuilder projectId="project-1" workflowId="wf-1" />);

    await screen.findByText("Workflow Elements");
    await screen.findByRole("button", { name: "Start" });

    const user = userEvent.setup();
    const lifecycleTab = await screen.findByRole("tab", { name: "Lifecycle" });
    await user.click(lifecycleTab);
    await waitFor(() => expect(lifecycleTab).toHaveAttribute("data-state", "active"));

    const lifecyclePanel = screen.getByRole("tabpanel");

    const rollbackButton = await within(lifecyclePanel).findByRole("button", { name: "Rollback to v1" });
    fireEvent.click(rollbackButton);

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        "projects-service",
        expect.objectContaining({
          body: expect.objectContaining({ type: "rollback", mappingNotes: "Map changes" }),
        })
      )
    );

    await waitFor(() => expect(screen.getByTestId("workflow-status").textContent).toContain("Draft"));

    window.prompt = originalPrompt;
  });
});

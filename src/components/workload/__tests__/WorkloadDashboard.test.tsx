import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { WorkloadDashboard } from "../WorkloadDashboard";
import type { WorkloadRow } from "@/types";
import type { WorkloadTask } from "@/services/workload";
import { getWorkloadSummary, getWorkloadTasks } from "@/services/workload";
import { listProjects } from "@/services/projects";

jest.mock("@/integrations/supabase/client", () => {
  const chain = () => ({
    select: () => chain(),
    order: () => chain(),
    eq: () => chain(),
    gte: () => chain(),
    lte: () => chain(),
    in: () => chain(),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    delete: () => ({
      eq: async () => ({ error: null }),
    }),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  });
  return {
    supabase: {
      from: () => chain(),
    },
  };
});

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithClient(children: ReactNode) {
  const client = createQueryClient();
  const wrapper = ({ children: nested }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{nested}</QueryClientProvider>
  );
  const result = render(<>{children}</>, { wrapper });
  return { ...result, client };
}

function createSummaryRow(overrides: Partial<WorkloadRow> = {}): WorkloadRow {
  return {
    assignee: null,
    assignee_name: "Unassigned",
    open_tasks: 2,
    overdue_tasks: 1,
    estimate_minutes_total: 240,
    ...overrides,
  };
}

function createTask(overrides: Partial<WorkloadTask> = {}): WorkloadTask {
  return {
    id: `task-${Math.random().toString(16).slice(2)}`,
    title: "Sample task",
    status: "todo",
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    estimate_minutes: 120,
    assignee_id: null,
    assignee_name: "Unassigned",
    assignee_avatar_url: null,
    project_id: "project-1",
    ...overrides,
  };
}

jest.mock("@/services/projects", () => ({
  listProjects: jest.fn(),
}));

jest.mock("@/services/workload", () => {
  const actual = jest.requireActual("@/services/workload");
  return {
    ...actual,
    getWorkloadSummary: jest.fn(),
    getWorkloadTasks: jest.fn(),
  };
});

const mockedListProjects = listProjects as jest.MockedFunction<typeof listProjects>;
const mockedGetWorkloadSummary = getWorkloadSummary as jest.MockedFunction<typeof getWorkloadSummary>;
const mockedGetWorkloadTasks = getWorkloadTasks as jest.MockedFunction<typeof getWorkloadTasks>;

describe("WorkloadDashboard", () => {
  beforeEach(() => {
    mockedListProjects.mockReset();
    mockedGetWorkloadSummary.mockReset();
    mockedGetWorkloadTasks.mockReset();
    mockedListProjects.mockResolvedValue([]);
  });

  it("renders loading then shows data once queries resolve", async () => {
    const summaryDeferred = createDeferred<WorkloadRow[]>();
    const tasksDeferred = createDeferred<WorkloadTask[]>();

    mockedGetWorkloadSummary.mockReturnValue(summaryDeferred.promise);
    mockedGetWorkloadTasks.mockReturnValue(tasksDeferred.promise);

    renderWithClient(<WorkloadDashboard />);

    expect(screen.queryByText(/Open tasks/i)).not.toBeInTheDocument();

    await act(async () => {
      summaryDeferred.resolve([createSummaryRow({ open_tasks: 4 })]);
      tasksDeferred.resolve([createTask({ title: "Design specs" })]);
    });

    expect((await screen.findAllByText(/Open tasks/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Unassigned/i)).length).toBeGreaterThan(0);
  });

  it("updates query params when filtering by project and date range", async () => {
    mockedGetWorkloadSummary.mockResolvedValue([createSummaryRow()]);
    mockedGetWorkloadTasks.mockResolvedValue([createTask()]);

    const { unmount } = renderWithClient(<WorkloadDashboard />);

    await screen.findAllByText(/Open tasks/i);

    const initialCall = mockedGetWorkloadSummary.mock.calls.at(-1)?.[0];
    expect(initialCall?.projectId).toBeUndefined();

    const user = userEvent.setup();
    const previousDateFrom = initialCall?.dateFrom;
    await user.click(screen.getByRole("button", { name: /Next/i }));

    await waitFor(() => {
      const nextCall = mockedGetWorkloadSummary.mock.calls.at(-1)?.[0];
      expect(nextCall?.dateFrom).toBeDefined();
      expect(nextCall?.dateFrom).not.toBe(previousDateFrom);
    });

    unmount();
    mockedGetWorkloadSummary.mockClear();
    mockedGetWorkloadTasks.mockClear();

    mockedGetWorkloadSummary.mockResolvedValue([createSummaryRow({ assignee: "user-1" })]);
    mockedGetWorkloadTasks.mockResolvedValue([createTask({ assignee_id: "user-1" })]);

    renderWithClient(
      <WorkloadDashboard
        initialProjectId="project-1"
        allowProjectSelection={false}
        lockedProjectName="Project Alpha"
      />
    );

    await screen.findAllByText(/Open tasks/i);

    const scopedCall = mockedGetWorkloadSummary.mock.calls.at(-1)?.[0];
    expect(scopedCall?.projectId).toBe("project-1");
  });

  it("opens the task drawer when selecting an assignee", async () => {
    mockedGetWorkloadSummary.mockResolvedValue([
      createSummaryRow({ assignee: "user-1", assignee_name: "Alex Kim", open_tasks: 3 }),
    ]);
    mockedGetWorkloadTasks.mockResolvedValue([
      createTask({ assignee_id: "user-1", assignee_name: "Alex Kim", title: "Design specs" }),
    ]);

    renderWithClient(<WorkloadDashboard />);

    await screen.findAllByText(/Open tasks/i);

    const assigneeCell = await screen.findByRole("cell", { name: /Alex Kim/i });
    const targetRow = assigneeCell.closest("tr");
    expect(targetRow).toBeTruthy();
    const user = userEvent.setup();

    await user.click(targetRow as HTMLElement);

    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByText(/Tasks in the selected range/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/Design specs/i)).toBeInTheDocument();
  });
});

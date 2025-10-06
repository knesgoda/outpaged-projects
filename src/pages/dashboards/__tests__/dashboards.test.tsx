import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";

import DashboardsPage from "../DashboardsPage";
import DashboardDetailPage from "../DashboardDetailPage";
import type { Dashboard, DashboardWidget } from "@/types";
import { getWorkloadSummary, getWorkloadTasks, getDetailedTimeEntries } from "@/services/workload";

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

jest.mock("@/services/projects", () => ({
  listProjects: jest.fn(async () => [
    { id: "project-1", name: "Project Alpha", code: "ALPHA" },
    { id: "project-2", name: "Project Beta", code: "BETA" },
  ]),
  getProject: jest.fn(async (id: string) => ({
    id,
    name: id === "project-1" ? "Project Alpha" : "Project Beta",
    code: null,
  })),
}));

jest.mock("@/services/workload", () => {
  const actual = jest.requireActual("@/services/workload");
  return {
    ...actual,
    getWorkloadSummary: jest.fn(),
    getWorkloadTasks: jest.fn(),
    getDetailedTimeEntries: jest.fn(),
  };
});

jest.mock("@/services/dashboards", () => {
  const store: { dashboards: Dashboard[]; widgets: Map<string, DashboardWidget[]> } = {
    dashboards: [],
    widgets: new Map(),
  };

  const listDashboards = jest.fn(async (projectId?: string) => {
    const items = projectId
      ? store.dashboards.filter((dashboard) => dashboard.project_id === projectId)
      : store.dashboards;
    return items.map((item) => ({ ...item }));
  });

  const getDashboard = jest.fn(async (id: string) => {
    return store.dashboards.find((dashboard) => dashboard.id === id) ?? null;
  });

  const createDashboard = jest.fn(
    async (input: { name: string; projectId?: string | null; layout?: any }) => {
      const now = new Date().toISOString();
      const dashboard: Dashboard = {
        id: `dash-${Math.random().toString(16).slice(2)}`,
        owner: "user-1",
        name: input.name,
        project_id: input.projectId ?? null,
        layout: input.layout ?? {},
        created_at: now,
        updated_at: now,
      };
      store.dashboards = [dashboard, ...store.dashboards];
      return dashboard;
    }
  );

  const updateDashboard = jest.fn(async (id: string, patch: Partial<Pick<Dashboard, "name" | "layout" | "project_id">>) => {
    const index = store.dashboards.findIndex((dashboard) => dashboard.id === id);
    if (index === -1) {
      throw new Error("Dashboard not found");
    }
    const updated: Dashboard = {
      ...store.dashboards[index],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    store.dashboards[index] = updated;
    return updated;
  });

  const deleteDashboard = jest.fn(async (id: string) => {
    store.dashboards = store.dashboards.filter((dashboard) => dashboard.id !== id);
    store.widgets.delete(id);
  });

  const listWidgets = jest.fn(async (dashboardId: string) => {
    const widgets = store.widgets.get(dashboardId) ?? [];
    return widgets.map((widget) => ({ ...widget }));
  });

  const createWidget = jest.fn(
    async (dashboardId: string, input: Omit<DashboardWidget, "id" | "dashboard_id" | "created_at" | "updated_at">) => {
      const now = new Date().toISOString();
      const widget: DashboardWidget = {
        id: `widget-${Math.random().toString(16).slice(2)}`,
        dashboard_id: dashboardId,
        created_at: now,
        updated_at: now,
        ...input,
      };
      const widgets = store.widgets.get(dashboardId) ?? [];
      store.widgets.set(dashboardId, [...widgets, widget]);
      return widget;
    }
  );

  const updateWidget = jest.fn(
    async (id: string, patch: Partial<Pick<DashboardWidget, "title" | "config" | "position">>) => {
      for (const [dashboardId, widgets] of store.widgets.entries()) {
        const index = widgets.findIndex((widget) => widget.id === id);
        if (index !== -1) {
          const updated: DashboardWidget = {
            ...widgets[index],
            ...patch,
            updated_at: new Date().toISOString(),
          };
          widgets[index] = updated;
          store.widgets.set(dashboardId, [...widgets]);
          return updated;
        }
      }
      throw new Error("Widget not found");
    }
  );

  const deleteWidget = jest.fn(async (id: string) => {
    for (const [dashboardId, widgets] of store.widgets.entries()) {
      const filtered = widgets.filter((widget) => widget.id !== id);
      store.widgets.set(dashboardId, filtered);
    }
  });

  const resetStore = () => {
    store.dashboards = [];
    store.widgets = new Map();
  };

  return {
    __esModule: true,
    listDashboards,
    getDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    listWidgets,
    createWidget,
    updateWidget,
    deleteWidget,
    __resetStore: resetStore,
    __store: store,
  };
});

const dashboardsService = jest.requireMock("@/services/dashboards") as typeof import("@/services/dashboards") & {
  __resetStore: () => void;
  __store: { dashboards: Dashboard[]; widgets: Map<string, DashboardWidget[]> };
};

const mockedGetWorkloadSummary = getWorkloadSummary as jest.MockedFunction<typeof getWorkloadSummary>;
const mockedGetWorkloadTasks = getWorkloadTasks as jest.MockedFunction<typeof getWorkloadTasks>;
const mockedGetDetailedTimeEntries = getDetailedTimeEntries as jest.MockedFunction<typeof getDetailedTimeEntries>;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(children: ReactNode, route = "/dashboards") {
  const client = createQueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...result, client };
}

describe("Dashboards experience", () => {
  beforeEach(() => {
    dashboardsService.__resetStore();
    mockedGetWorkloadSummary.mockReset();
    mockedGetWorkloadTasks.mockReset();
    mockedGetDetailedTimeEntries.mockReset();
    mockedGetWorkloadSummary.mockResolvedValue([]);
    mockedGetWorkloadTasks.mockResolvedValue([]);
    mockedGetDetailedTimeEntries.mockResolvedValue([]);
  });

  it("creates a dashboard and shows it in the list", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/dashboards" element={<DashboardsPage />} />
      </Routes>
    );

    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /New dashboard/i }));
    const nameInput = await screen.findByLabelText(/Name/i);
    await user.type(nameInput, "Executive overview");
    await user.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("Executive overview")).toBeInTheDocument();
    });
  });

  it("adds a counter widget and shows aggregated value", async () => {
    const now = new Date().toISOString();
    dashboardsService.__store.dashboards = [
      {
        id: "dash-1",
        owner: "user-1",
        name: "Ops dashboard",
        project_id: null,
        layout: {},
        created_at: now,
        updated_at: now,
      },
    ];

    mockedGetWorkloadSummary.mockResolvedValue([
      {
        assignee: "user-1",
        assignee_name: "Alex",
        open_tasks: 5,
        overdue_tasks: 1,
        estimate_minutes_total: 120,
        logged_minutes_total: 0,
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/dashboards/:dashboardId" element={<DashboardDetailPage />} />
      </Routes>,
      "/dashboards/dash-1"
    );

    const user = userEvent.setup();

    await screen.findByRole("heading", { name: /Ops dashboard/i });

    await user.click(screen.getByRole("button", { name: /New widget/i }));
    await waitFor(() => expect(mockedGetWorkloadSummary).toHaveBeenCalled());
    await user.click(await screen.findByRole("button", { name: /^Save$/i }));

    const widgetHeading = await screen.findByRole("heading", { name: /Open tasks/i });
    const headerContainer = widgetHeading.parentElement?.parentElement;
    const widgetRoot = headerContainer?.parentElement as HTMLElement | undefined;
    expect(widgetRoot).toBeTruthy();
    if (widgetRoot) {
      const valueNode = await within(widgetRoot).findByText((content, element) => {
        return element?.textContent?.trim() === "5";
      });
      expect(valueNode).toBeInTheDocument();
    }
  });

  it("updates a widget after editing", async () => {
    const now = new Date().toISOString();
    dashboardsService.__store.dashboards = [
      {
        id: "dash-2",
        owner: "user-1",
        name: "Team dashboard",
        project_id: null,
        layout: {},
        created_at: now,
        updated_at: now,
      },
    ];
    dashboardsService.__store.widgets.set("dash-2", [
      {
        id: "widget-1",
        dashboard_id: "dash-2",
        type: "counter",
        title: "Open tasks",
        config: { template: "open_tasks_count" },
        position: { order: 0 },
        created_at: now,
        updated_at: now,
      },
    ]);

    let openTasksValue = 4;
    mockedGetWorkloadSummary.mockImplementation(async () => [
      {
        assignee: "user-1",
        assignee_name: "Alex",
        open_tasks: openTasksValue,
        overdue_tasks: 0,
        estimate_minutes_total: 0,
        logged_minutes_total: 0,
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/dashboards/:dashboardId" element={<DashboardDetailPage />} />
      </Routes>,
      "/dashboards/dash-2"
    );

    const user = userEvent.setup();

    await screen.findByRole("heading", { name: /Team dashboard/i });
    await screen.findByText("4");

    openTasksValue = 9;

    await user.click(screen.getByRole("button", { name: /Widget actions/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Edit/i }));

    const titleInput = await screen.findByLabelText(/Title/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Critical load");
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    await screen.findByRole("heading", { name: /Critical load/i });
    await waitFor(() => {
      expect(screen.getByText("9")).toBeInTheDocument();
    });
  });

  it("removes a widget when deleted", async () => {
    const now = new Date().toISOString();
    dashboardsService.__store.dashboards = [
      {
        id: "dash-3",
        owner: "user-1",
        name: "Delivery dashboard",
        project_id: null,
        layout: {},
        created_at: now,
        updated_at: now,
      },
    ];
    dashboardsService.__store.widgets.set("dash-3", [
      {
        id: "widget-1",
        dashboard_id: "dash-3",
        type: "counter",
        title: "Open tasks",
        config: { template: "open_tasks_count" },
        position: { order: 0 },
        created_at: now,
        updated_at: now,
      },
    ]);

    mockedGetWorkloadSummary.mockResolvedValue([
      {
        assignee: "user-1",
        assignee_name: "Alex",
        open_tasks: 2,
        overdue_tasks: 0,
        estimate_minutes_total: 0,
        logged_minutes_total: 0,
      },
    ]);

    renderWithProviders(
      <Routes>
        <Route path="/dashboards/:dashboardId" element={<DashboardDetailPage />} />
      </Routes>,
      "/dashboards/dash-3"
    );

    const user = userEvent.setup();

    await screen.findByRole("heading", { name: /Delivery dashboard/i });
    await screen.findByRole("heading", { name: /Open tasks/i });

    await user.click(screen.getByRole("button", { name: /Widget actions/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Delete/i }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /Open tasks/i })).not.toBeInTheDocument();
    });
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReportCreate from "../ReportCreate";
import ReportDetail from "../ReportDetail";
import ReportEdit from "../ReportEdit";

jest.mock("@/hooks/useReports", () => {
  const actual = jest.requireActual("@/hooks/useReports");
  return {
    ...actual,
    useCreateReport: jest.fn(),
    useReport: jest.fn(),
    useRunReport: jest.fn(),
    useDeleteReport: jest.fn(),
    useUpdateReport: jest.fn(),
  };
});

jest.mock("@/integrations/supabase/client", () => {
  const createBuilder = () => {
    const result = { data: [], error: null };
    const builder: any = {
      select: jest.fn(() => builder),
      order: jest.fn(() => Promise.resolve(result)),
      eq: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      is: jest.fn(() => builder),
      or: jest.fn(() => builder),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: "report-1" }, error: null }),
        }),
      })),
      update: jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: "report-1" }, error: null }),
        }),
      })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
      then: (resolve: (value: any) => void) => Promise.resolve(result).then(resolve),
      catch: (reject: (reason: any) => void) => Promise.resolve(result).catch(reject),
      finally: (callback: () => void) => Promise.resolve(result).finally(callback),
    };
    return builder;
  };

  return {
    supabase: {
      from: jest.fn(() => createBuilder()),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    },
  };
});

const { useCreateReport, useReport, useRunReport, useDeleteReport, useUpdateReport } =
  jest.requireMock("@/hooks/useReports");

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const ReportDetailStub = () => {
  const params = useParams();
  return <div>Report detail {params.reportId}</div>;
};

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

describe("Report pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a report and navigates to detail", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ id: "report-1" });
    (useCreateReport as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

    const client = createQueryClient();
    client.setQueryData(["projects", "options"], []);

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/reports/new"]}>
          <Routes>
            <Route path="/reports/new" element={<ReportCreate />} />
            <Route path="/reports/:reportId" element={<ReportDetailStub />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Weekly summary" } });
    fireEvent.change(screen.getByLabelText("Config JSON"), {
      target: { value: JSON.stringify({ source: "tasks" }) },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(await screen.findByText("Report detail report-1")).toBeInTheDocument();
  });

  it("runs a report and renders results", async () => {
    (useReport as jest.Mock).mockReturnValue({
      data: {
        id: "report-1",
        owner: "user-1",
        name: "Status",
        description: "",
        config: {},
        project_id: null,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const mutateAsync = jest
      .fn()
      .mockResolvedValue({ rows: [{ id: 1, name: "Task Alpha" }], meta: {} });
    (useRunReport as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
    (useDeleteReport as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    const client = createQueryClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/reports/report-1"]}>
          <Routes>
            <Route path="/reports/:reportId" element={<ReportDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByText("Task Alpha")).toBeInTheDocument();
  });

  it("edits a report and saves changes", async () => {
    (useReport as jest.Mock).mockReturnValue({
      data: {
        id: "report-1",
        owner: "user-1",
        name: "Status",
        description: "Old",
        config: { source: "tasks" },
        project_id: null,
        created_at: "",
        updated_at: "",
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const mutateAsync = jest.fn().mockResolvedValue({ id: "report-1" });
    (useUpdateReport as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

    const client = createQueryClient();
    client.setQueryData(["projects", "options"], []);

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/reports/report-1/edit"]}>
          <Routes>
            <Route path="/reports/:reportId/edit" element={<ReportEdit />} />
            <Route path="/reports/:reportId" element={<ReportDetailStub />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Status Updated" } });
    fireEvent.change(screen.getByLabelText("Config JSON"), {
      target: { value: JSON.stringify({ source: "projects" }) },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0].patch.config).toEqual({ source: "projects" });
    expect(await screen.findByText("Report detail report-1")).toBeInTheDocument();
  });
});

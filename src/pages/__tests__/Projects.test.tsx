import React, { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ProjectsListPage } from "../projects/ProjectsListPage";
import { ProjectDetailPage } from "../projects/ProjectDetailPage";
import Projects from "../Projects";

const navigateMock = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const mockUseProjects = jest.fn();
const mockUseProject = jest.fn();
const archiveMutation = { mutateAsync: jest.fn(), isPending: false };
const updateMutation = { mutateAsync: jest.fn(), isPending: false };
const deleteMutation = { mutateAsync: jest.fn(), isPending: false };
const createMutation = { mutateAsync: jest.fn(), isPending: false };
const toastMock = jest.fn();

jest.mock("@/hooks/useProjects", () => ({
  useProjects: (...args: any[]) => mockUseProjects(...args),
  useProject: (...args: any[]) => mockUseProject(...args),
  useArchiveProject: () => archiveMutation,
  useUpdateProject: () => updateMutation,
  useDeleteProject: () => deleteMutation,
  useCreateProject: () => createMutation,
}));

jest.mock("@/hooks/useProjectNavigation", () => ({
  useProjectNavigation: () => ({
    navigateToProject: jest.fn(),
    navigateToProjectSettings: jest.fn(),
    getProjectUrl: () => "#",
  }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

jest.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => ({
    isOffline: false,
    lastOnline: null,
    hasQueuedActions: false,
  }),
}));

jest.mock("@/components/projects/ProjectDialog", () => ({
  ProjectDialog: () => null,
}));

let lastLocation: { pathname: string; search: string } | null = null;
let queryClient: QueryClient;

const LocationTracker: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    lastLocation = { pathname: location.pathname, search: location.search };
  }, [location]);
  return null;
};

const listWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects"]}>
        <LocationTracker />
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  </HelmetProvider>
);

describe("Projects pages", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });
  });

  beforeEach(() => {
    navigateMock.mockReset();
    mockUseProjects.mockReset();
    mockUseProject.mockReset();
    archiveMutation.mutateAsync = jest.fn();
    updateMutation.mutateAsync = jest.fn();
    deleteMutation.mutateAsync = jest.fn();
    createMutation.mutateAsync = jest.fn();
    lastLocation = null;
    toastMock.mockReset();
    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
    queryClient = new QueryClient();
  });

  it("renders projects after loading", async () => {
    const project = {
      id: "abc-123",
      name: "Alpha Initiative",
      description: "Shipping the redesign.",
      status: "cancelled",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const refetch = jest.fn();

    let queryState: any = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch,
    };

    mockUseProjects.mockImplementation(() => queryState);

    const { rerender } = render(<ProjectsListPage />, { wrapper: listWrapper });

    expect(screen.queryByText(project.name)).not.toBeInTheDocument();

    queryState = {
      data: { data: [project], total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    };

    rerender(<ProjectsListPage />);

    expect(await screen.findByText(project.name)).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("navigates to the project overview when a row is clicked", async () => {
    const project = {
      id: "project-42",
      name: "Roadmap Refresh",
      description: "New roadmap planning.",
      status: "planning",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    mockUseProjects.mockReturnValue({
      data: { data: [project], total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProjectsListPage />, { wrapper: listWrapper });

    await userEvent.click(screen.getByText(project.name));

    expect(navigateMock).toHaveBeenCalledWith(`/projects/${project.id}`);
  });

  it("shows not found when a project cannot be loaded", () => {
    const projectId = "missing-id";
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
            <Routes>
              <Route path="/projects/:projectId" element={<ProjectDetailPage tab="overview" />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    );

    expect(screen.getByText("Project not found")).toBeInTheDocument();
    expect(mockUseProject).toHaveBeenCalledWith(projectId);
  });

  it("opens the create dialog and syncs the URL when requested", async () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProjectsListPage />, { wrapper: listWrapper });

    await userEvent.click(screen.getByRole("button", { name: /new project/i }));

    expect(await screen.findByText("Give your project a clear name.")).toBeInTheDocument();
    expect(lastLocation?.search).toContain("new=1");
  });

  it("renders the mobile layout with projects when the viewport is small", async () => {
    window.innerWidth = 500;
    window.dispatchEvent(new Event("resize"));

    const projectA = {
      id: "project-a",
      name: "Mobile Alpha",
      description: "Mobile friendly",
      status: "active",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const projectB = {
      id: "project-b",
      name: "Mobile Beta",
      description: "Another project",
      status: "completed",
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    mockUseProjects.mockReturnValue({
      data: { data: [projectA, projectB], total: 2 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Projects />, { wrapper: listWrapper });

    expect(await screen.findByTestId("projects-mobile-list")).toBeInTheDocument();
    expect(await screen.findByText(projectA.name)).toBeInTheDocument();
    expect(await screen.findByText(projectB.name)).toBeInTheDocument();
  });

  it("passes expanded status filters through to the projects query", () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<Projects />, { wrapper: listWrapper });
    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/projects?status=cancelled"]}>
            <LocationTracker />
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>
    );

    render(<ProjectsListPage />, { wrapper });

    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("displays query error messages when provided", () => {
    const supabaseErrorMessage = "Supabase reported: rate limit exceeded";

    mockUseProjects.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: supabaseErrorMessage },
      refetch: jest.fn(),
    });

    render(<Projects />, { wrapper: listWrapper });

    expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
    expect(screen.getByText(supabaseErrorMessage)).toBeInTheDocument();
    expect(screen.queryByText("An unexpected error occurred")).not.toBeInTheDocument();
  });

  it("displays alternative Supabase error properties when message is missing", () => {
    const supabaseDetail = "Update failed due to policy violation";

    mockUseProjects.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: "", error_description: "", error: "   ", details: supabaseDetail },
      refetch: jest.fn(),
    });

    render(<Projects />, { wrapper: listWrapper });

    expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
    expect(screen.getByText(supabaseDetail)).toBeInTheDocument();
    expect(screen.queryByText("An unexpected error occurred")).not.toBeInTheDocument();
  });

  it("falls back to the default message for technical errors", () => {
    mockUseProjects.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: { message: "column projects.template_key does not exist" },
      refetch: jest.fn(),
    });

    render(<Projects />, { wrapper: listWrapper });

    expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    expect(
      screen.queryByText("column projects.template_key does not exist"),
    ).not.toBeInTheDocument();
  });
});

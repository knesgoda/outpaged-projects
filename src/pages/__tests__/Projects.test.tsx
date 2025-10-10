import React, { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

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

let lastLocation: { pathname: string; search: string } | null = null;

const LocationTracker: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    lastLocation = { pathname: location.pathname, search: location.search };
  }, [location]);
  return null;
};

const listWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HelmetProvider>
    <MemoryRouter initialEntries={["/projects"]}>
      <LocationTracker />
      {children}
    </MemoryRouter>
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
  });

  it("renders projects after loading", async () => {
    const project = {
      id: "abc-123",
      name: "Alpha Initiative",
      description: "Shipping the redesign.",
      status: "active",
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
  });

  it("navigates to the project overview when a row is clicked", async () => {
    const project = {
      id: "project-42",
      name: "Roadmap Refresh",
      description: "New roadmap planning.",
      status: "active",
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
        <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
          <Routes>
            <Route path="/projects/:projectId" element={<ProjectDetailPage tab="overview" />} />
          </Routes>
        </MemoryRouter>
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
});

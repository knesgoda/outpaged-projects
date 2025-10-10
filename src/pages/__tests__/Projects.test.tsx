import React, { useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import { ProjectsListPage } from "../projects/ProjectsListPage";
import { ProjectDetailPage } from "../projects/ProjectDetailPage";

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

jest.mock("@/hooks/useProjects", () => ({
  useProjects: (...args: any[]) => mockUseProjects(...args),
  useProject: (...args: any[]) => mockUseProject(...args),
  useArchiveProject: () => archiveMutation,
  useUpdateProject: () => updateMutation,
  useDeleteProject: () => deleteMutation,
  useCreateProject: () => createMutation,
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
  beforeEach(() => {
    navigateMock.mockReset();
    mockUseProjects.mockReset();
    mockUseProject.mockReset();
    archiveMutation.mutateAsync = jest.fn();
    updateMutation.mutateAsync = jest.fn();
    deleteMutation.mutateAsync = jest.fn();
    createMutation.mutateAsync = jest.fn();
    lastLocation = null;
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

  it("passes expanded status filters through to the projects query", () => {
    mockUseProjects.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <HelmetProvider>
        <MemoryRouter initialEntries={["/projects?status=cancelled"]}>
          <LocationTracker />
          {children}
        </MemoryRouter>
      </HelmetProvider>
    );

    render(<ProjectsListPage />, { wrapper });

    expect(mockUseProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });
});

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";

import ProjectsListPage from "../ProjectsListPage";

jest.mock("@/hooks/useProjects", () => ({
  useProjects: jest.fn(),
  useCreateProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useArchiveProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { useProjects } = jest.requireMock("@/hooks/useProjects") as {
  useProjects: jest.Mock;
};

describe("ProjectsListPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state then project data", async () => {
    const history = createMemoryHistory({ initialEntries: ["/projects"] });
    const state = {
      value: {
        data: [],
        total: 0,
        isLoading: true,
        isFetching: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      },
    };

    useProjects.mockImplementation(() => state.value);

    const { rerender } = render(
      <Router location={history.location} navigator={history}>
        <ProjectsListPage />
      </Router>,
    );

    expect(screen.getByRole("heading", { name: /projects/i })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(6);

    const project = {
      id: "project-1",
      name: "Alpha",
      description: "Test project",
      status: "active",
      updated_at: new Date().toISOString(),
    };

    act(() => {
      state.value = {
        data: [project],
        total: 1,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      };
      rerender(
        <Router location={history.location} navigator={history}>
          <ProjectsListPage />
        </Router>,
      );
    });

    await waitFor(() => expect(screen.getByText(project.name)).toBeInTheDocument());
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("navigates to the project detail when a row is clicked", async () => {
    const history = createMemoryHistory({ initialEntries: ["/projects"] });

    const project = {
      id: "project-2",
      name: "Beta",
      description: "Another project",
      status: "active",
      updated_at: new Date().toISOString(),
    };

    useProjects.mockReturnValue({
      data: [project],
      total: 1,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const user = userEvent.setup();

    render(
      <Router location={history.location} navigator={history}>
        <ProjectsListPage />
      </Router>,
    );

    await user.click(screen.getByText(project.name));

    expect(history.location.pathname).toBe(`/projects/${project.id}`);
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProjectDetailPage from "../ProjectDetailPage";

jest.mock("@/hooks/useProjects", () => ({
  useProject: jest.fn(),
  useCreateProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useArchiveProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { useProject } = jest.requireMock("@/hooks/useProjects") as {
  useProject: jest.Mock;
};

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows not found when the project is missing", async () => {
    useProject.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/projects/project-404/overview"]}>
        <Routes>
          <Route path="/projects/:projectId/*" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/project not found/i)).toBeInTheDocument();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectDetails from "../ProjectDetails";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock("@/integrations/supabase/client") as {
  supabase: { from: jest.Mock };
};

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@/lib/featureFlags", () => ({
  enableOutpagedBrand: false,
}));

describe("ProjectDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches a project by id", async () => {
    const mockProject = {
      id: "project-456",
      name: "Important Project",
      status: "active",
      created_at: new Date().toISOString(),
      description: "A test project",
      end_date: null,
    };

    const maybeSingleMock = jest.fn().mockResolvedValue({ data: mockProject, error: null });
    const projectEqMock = jest.fn(() => ({ maybeSingle: maybeSingleMock }));
    const projectSelectMock = jest.fn(() => ({ eq: projectEqMock }));

    const tasksOrderMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const tasksEqMock = jest.fn(() => ({ order: tasksOrderMock }));
    const tasksSelectMock = jest.fn(() => ({ eq: tasksEqMock }));

    const membersEqMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const membersSelectMock = jest.fn(() => ({ eq: membersEqMock }));

    supabase.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return { select: projectSelectMock };
      }
      if (table === "tasks") {
        return { select: tasksSelectMock };
      }
      if (table === "project_members") {
        return { select: membersSelectMock };
      }
      return { select: jest.fn() };
    });

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProjectDetails overrideProjectId={mockProject.id} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(mockProject.name)).toBeInTheDocument());

    expect(projectEqMock).toHaveBeenCalledWith("id", mockProject.id);
    expect(maybeSingleMock).toHaveBeenCalled();
  });
});

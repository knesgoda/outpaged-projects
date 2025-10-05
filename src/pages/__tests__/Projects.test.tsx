import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Projects from "../Projects";

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

describe("Projects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders project links using the project id", async () => {
    const mockProjects = [
      {
        id: "project-123",
        name: "Demo Project",
        status: "active",
        created_at: new Date().toISOString(),
        description: null,
        end_date: null,
        code: null,
      },
    ];

    const orderMock = jest.fn().mockResolvedValue({ data: mockProjects, error: null });
    const selectMock = jest.fn(() => ({ order: orderMock }));

    supabase.from.mockImplementation((table: string) => {
      if (table === "projects") {
        return { select: selectMock };
      }
      return { select: jest.fn() };
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/projects"]}>
        <Projects />
      </MemoryRouter>
    );

    const link = await waitFor(() => screen.getByTestId(`project-link-${mockProjects[0].id}`));

    expect(link).toHaveAttribute("href", `/dashboard/projects/${mockProjects[0].id}`);
    expect(selectMock).toHaveBeenCalledWith("id, name, code, description, status, created_at, end_date");
  });
});

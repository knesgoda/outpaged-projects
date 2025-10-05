import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import HomePage from "@/pages/ia/HomePage";
import ProjectsPage from "@/pages/ia/ProjectsPage";
import HelpPage from "@/pages/ia/HelpPage";

describe("AppLayout", () => {
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

  const renderWithRoute = (initialEntry: string) =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  it("renders the home page content", () => {
    renderWithRoute("/");
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("renders secondary routes without crashing", () => {
    renderWithRoute("/projects");
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();

    renderWithRoute("/help");
    expect(screen.getByRole("heading", { name: "Help" })).toBeInTheDocument();
  });
});

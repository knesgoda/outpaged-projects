import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import HelpHome from "../HelpHome";
import HelpSearchPage from "../HelpSearchPage";
import FAQPage from "../FAQPage";
import ChangelogPage from "../ChangelogPage";
import ContactSupportPage from "../ContactSupportPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeedbackWidget } from "@/components/help/FeedbackWidget";
import type { HelpArticle, Announcement } from "@/types";
import type { ReactNode } from "react";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "help@example.com" },
    signOut: jest.fn(),
    signInWithPassword: jest.fn(),
  }),
}));

jest.mock("@/state/profile", () => ({
  ProfileProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useProfile: () => ({ profile: null, loading: false, error: null, refresh: jest.fn() }),
}));

jest.mock("@/state/workspace", () => ({
  useWorkspaceContext: () => ({
    workspaces: [],
    currentWorkspace: null,
    setWorkspace: jest.fn(),
    loadingWorkspaces: false,
    workspaceError: null,
    refreshWorkspaces: jest.fn(),
    spaces: [],
    currentSpace: null,
    setSpace: jest.fn(),
    loadingSpaces: false,
    spaceError: null,
    refreshSpaces: jest.fn(),
  }),
}));

jest.mock("@/hooks/useHelp", () => ({
  useHelpSearch: jest.fn(),
  useHelpArticles: jest.fn(),
  useHelpArticle: jest.fn(),
}));

jest.mock("@/hooks/useAnnouncements", () => ({
  useAnnouncements: jest.fn(),
}));

jest.mock("@/hooks/useSupport", () => ({
  useCreateTicket: jest.fn(),
}));

jest.mock("@/hooks/useFeedback", () => ({
  useSubmitFeedback: jest.fn(),
}));

jest.mock("@/components/command/useCommandK", () => ({
  useCommandK: () => ({
    openPalette: jest.fn(),
    closePalette: jest.fn(),
    togglePalette: jest.fn(),
    setQuery: jest.fn(),
    open: false,
    query: "",
    scope: {},
  }),
}));

jest.mock("@/hooks/useWorkspace", () => ({
  useWorkspaceSettings: () => ({
    data: {
      id: "workspace-1",
      name: "Acme Workspace",
      brand_name: "Acme",
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock("@/hooks/useProfile", () => ({
  useMyProfile: () => ({
    data: {
      id: "user-1",
      full_name: "Help Tester",
      email: "help@example.com",
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));

jest.mock("@/services/storage", () => ({
  uploadHelpScreenshot: jest.fn(() => Promise.resolve({ publicUrl: "https://files.example.com/test.png" })),
}));

jest.mock("@/services/session", () => ({
  requireUserId: jest.fn(() => Promise.resolve("user-1")),
}));

const { useHelpSearch, useHelpArticles } = jest.requireMock("@/hooks/useHelp");
const { useAnnouncements } = jest.requireMock("@/hooks/useAnnouncements");
const { useCreateTicket } = jest.requireMock("@/hooks/useSupport");
const { useSubmitFeedback } = jest.requireMock("@/hooks/useFeedback");
const { uploadHelpScreenshot } = jest.requireMock("@/services/storage");
const { requireUserId } = jest.requireMock("@/services/session");

describe("Help experiences", () => {
  const mockArticle = (overrides: Partial<HelpArticle> = {}): HelpArticle => ({
    id: "article-1",
    owner: "owner-1",
    title: "Project basics",
    slug: "project-basics",
    category: "Projects",
    tags: ["projects"],
    body_markdown: "You can manage projects from the dashboard.",
    body_html: null,
    is_published: true,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
    ...overrides,
  });

  const mockAnnouncement = (overrides: Partial<Announcement> = {}): Announcement => ({
    id: "announcement-1",
    title: "Version 1.2",
    version: "1.2.0",
    body_markdown: "New features released.",
    body_html: null,
    published_at: "2024-01-03T00:00:00.000Z",
    created_by: "user-1",
    ...overrides,
  });

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query.includes("max-width: 1023px") ? false : true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    Object.defineProperty(window, "open", {
      writable: true,
      value: jest.fn(() => ({ focus: jest.fn() })),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useHelpSearch as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: false });
    (useHelpArticles as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: false });
    (useAnnouncements as jest.Mock).mockReturnValue({ data: [], isLoading: false, isError: false });
    (useCreateTicket as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    (useSubmitFeedback as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    (uploadHelpScreenshot as jest.Mock).mockClear();
    (requireUserId as jest.Mock).mockResolvedValue("user-1");
  });

  const renderWithRouter = (ui: React.ReactElement, initialEntries = ["/"]) =>
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </HelmetProvider>
    );

  it("renders recent articles and announcements on the help home", () => {
    (useHelpArticles as jest.Mock).mockReturnValue({
      data: [mockArticle()],
      isLoading: false,
      isError: false,
    });
    (useAnnouncements as jest.Mock).mockReturnValue({
      data: [mockAnnouncement()],
      isLoading: false,
      isError: false,
    });

    renderWithRouter(<HelpHome />);

    expect(screen.getByText("Project basics")).toBeInTheDocument();
    expect(screen.getByText("Version 1.2")).toBeInTheDocument();
  });

  it("groups help search results by category", () => {
    (useHelpSearch as jest.Mock).mockReturnValue({
      data: [
        mockArticle({ id: "article-1", category: "Projects", title: "Project planning" }),
        mockArticle({ id: "article-2", category: "Security", title: "Security basics" }),
      ],
      isLoading: false,
      isError: false,
    });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/help/search?q=project"]}>
          <Routes>
            <Route path="/help/search" element={<HelpSearchPage />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    expect(useHelpSearch).toHaveBeenCalledWith("project", expect.any(Object));
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText("Security basics")).toBeInTheDocument();
  });

  it("expands FAQ answers and links to contact support", async () => {
    (useHelpArticles as jest.Mock).mockReturnValue({
      data: [mockArticle({ category: "Security", title: "How secure?", body_markdown: "We encrypt data." })],
      isLoading: false,
      isError: false,
    });

    renderWithRouter(<FAQPage />);

    const question = screen.getByRole("button", { name: "How secure?" });
    await userEvent.click(question);

    expect(screen.getByText(/We encrypt data/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contact support/i })).toBeInTheDocument();
  });

  it("opens the shortcuts modal when pressing question mark", () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<div>Home</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );

    act(() => {
      fireEvent.keyDown(window, { key: "?", shiftKey: true });
    });

    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
    expect(screen.getByText(/Go to home/i)).toBeInTheDocument();
  });

  it("renders changelog announcements", () => {
    (useAnnouncements as jest.Mock).mockReturnValue({
      data: [mockAnnouncement({ title: "Weekly updates" })],
      isLoading: false,
      isError: false,
    });

    renderWithRouter(<ChangelogPage />);

    expect(screen.getByText("Weekly updates")).toBeInTheDocument();
  });

  it("submits the contact support form and shows the ticket id", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({ id: "ticket-123" });
    (useCreateTicket as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

    renderWithRouter(<ContactSupportPage />);

    await userEvent.type(screen.getByLabelText("Subject"), "Need assistance");
    await userEvent.type(screen.getByLabelText("Describe the issue"), "I cannot access my dashboard after login.");

    await userEvent.click(screen.getByRole("button", { name: /Submit ticket/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      subject: "Need assistance",
      priority: "normal",
      body: "I cannot access my dashboard after login.",
    });

    expect(await screen.findByText(/Ticket created/i)).toBeInTheDocument();
    expect(screen.getByText("ticket-123")).toBeInTheDocument();
  });

  it("submits feedback with the current page path", async () => {
    const mutateAsync = jest.fn().mockResolvedValue({});
    (useSubmitFeedback as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/projects/alpha"]}>
          <FeedbackWidget />
        </MemoryRouter>
      </HelmetProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: /Feedback/i }));
    await userEvent.type(screen.getByLabelText("Message"), "This flow works well but needs more filters.");
    await userEvent.click(screen.getByRole("button", { name: /Send feedback/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      type: "idea",
      message: "This flow works well but needs more filters.",
      page_path: "/projects/alpha",
      screenshot_url: undefined,
    });
    expect(await screen.findByText(/Thank you for the feedback/i)).toBeInTheDocument();
  });
});

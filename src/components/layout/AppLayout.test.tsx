import React, { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const signOutMock = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@outpaged.com" },
    signOut: signOutMock,
    signInWithPassword: jest.fn(),
  }),
}));

jest.mock("@/integrations/supabase/client", () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        signInWithPassword: jest.fn(),
        signInWithOAuth: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn(() => queryBuilder),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ data: null, error: null }),
          getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://files.example.com/mock.png" } })),
        })),
      },
      channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockResolvedValue({ error: null }),
      })),
      removeChannel: jest.fn(),
      functions: { invoke: jest.fn().mockResolvedValue({ data: null, error: null }) },
    },
  };
});

jest.mock("@/state/workspace", () => ({
  useWorkspaceContext: () => ({
    organizations: [],
    currentOrganization: null,
    setOrganization: jest.fn(),
    loadingOrganizations: false,
    organizationError: null,
    refreshOrganizations: jest.fn(),
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

jest.mock("@/hooks/useFeedback", () => ({
  useSubmitFeedback: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/useHelp", () => ({
  useHelpSearch: () => ({ data: [], isLoading: false, isError: false }),
  useHelpArticles: () => ({ data: [], isLoading: false, isError: false }),
  useHelpArticle: () => ({ data: null, isLoading: false, isError: false }),
}));

jest.mock("@/hooks/useAnnouncements", () => ({
  useAnnouncements: () => ({ data: [], isLoading: false, isError: false }),
}));

jest.mock("@/services/session", () => ({
  requireUserId: jest.fn(() => Promise.resolve("user-1")),
}));

jest.mock("@/services/storage", () => ({
  uploadHelpScreenshot: jest.fn(() => Promise.resolve({ publicUrl: "https://files.example.com/mock.png" })),
}));

import { AppLayout } from "./AppLayout";
import HomePage from "@/pages/ia/HomePage";
import ProjectsPage from "@/pages/ia/ProjectsPage";
import HelpHome from "@/pages/help/HelpHome";

jest.mock("@/components/command/useCommandK", () => ({
  useCommandK: () => ({
    openPalette: jest.fn(),
    closePalette: jest.fn(),
    togglePalette: jest.fn(),
    open: false,
    query: "",
    scope: {},
    setQuery: jest.fn(),
  }),
}));

jest.mock("@/state/profile", () => ({
  ProfileProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useProfile: () => ({
    profile: { full_name: "Test User", role: "manager" },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

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

  beforeEach(() => {
    signOutMock.mockReset();
    mockNavigate.mockReset();
  });

  const renderWithRoute = (initialEntry: string) => {
    const queryClient = new QueryClient();
    return render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="help" element={<HelpHome />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>
    );
  };

  it("renders the home page content", () => {
    renderWithRoute("/");
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("renders secondary routes without crashing", () => {
    renderWithRoute("/projects");
    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();

    renderWithRoute("/help");
    expect(screen.getByRole("heading", { name: "Help center" })).toBeInTheDocument();
  });

  it("signs out before navigating to the login page", async () => {
    const deferred = createDeferred<void>();
    signOutMock.mockImplementation(() => deferred.promise);

    renderWithRoute("/");

    const user = userEvent.setup();
    const accountButton = await screen.findByTestId("account-menu-trigger");
    await user.click(accountButton);

    const signOutItem = await screen.findByText("Sign out");
    await user.click(signOutItem);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();

    deferred.resolve();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });
  });
});

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

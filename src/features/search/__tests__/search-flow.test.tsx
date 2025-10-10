import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { CommandPalette } from "@/components/command/CommandPalette";
import { CommandKProvider } from "@/components/command/CommandKProvider";
import GlobalSearchPage from "@/pages/search/GlobalSearchPage";
import { act } from "react";

jest.mock("@/services/search", () => ({
  searchAll: jest.fn(),
  searchSuggest: jest.fn(() => Promise.resolve([])),
}));

const saved: any[] = [];

jest.mock("@/services/savedSearches", () => ({
  listSavedSearches: jest.fn(() => Promise.resolve([...saved])),
  createSavedSearch: jest.fn(({ name, query, filters }) => {
    const entry = {
      id: `${saved.length + 1}`,
      name,
      query,
      filters: filters ?? {},
      created_at: new Date().toISOString(),
    };
    saved.unshift(entry);
    return Promise.resolve(entry);
  }),
  deleteSavedSearch: jest.fn((id: string) => {
    const index = saved.findIndex((item) => item.id === id);
    if (index >= 0) {
      saved.splice(index, 1);
    }
    return Promise.resolve();
  }),
  __reset: () => {
    saved.length = 0;
  },
}));

const createSupabaseBuilder = () => {
  const builder: any = {
    select: jest.fn(() => builder),
    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    filter: jest.fn(() => builder),
    textSearch: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return builder;
};

jest.mock("@/integrations/supabase/client", () => ({
  supabaseConfigured: true,
  supabase: {
    from: jest.fn(() => createSupabaseBuilder()),
  },
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const searchModule = jest.requireMock("@/services/search") as {
  searchAll: jest.Mock;
  searchSuggest: jest.Mock;
};

const savedSearchModule = jest.requireMock("@/services/savedSearches") as {
  __reset: () => void;
};

let latestLocation: ReturnType<typeof useLocation>;

const LocationSpy = () => {
  const location = useLocation();
  latestLocation = location;
  return null;
};

const renderWithProviders = (initialEntries: string[]) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CommandKProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <LocationSpy />
          <CommandPalette />
          <Routes>
            <Route path="/search" element={<GlobalSearchPage />} />
            <Route path="*" element={<div />} />
          </Routes>
        </MemoryRouter>
      </CommandKProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  savedSearchModule.__reset();
  searchModule.searchSuggest.mockResolvedValue([]);
});

describe("Command palette", () => {
  it("opens with cmd+k and navigates to full search on enter", async () => {
    searchModule.searchAll.mockResolvedValue([]);
    renderWithProviders(["/search?q=alpha"]);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
      window.dispatchEvent(event);
    });

    const input = await screen.findByLabelText("Search");
    fireEvent.change(input, { target: { value: "plan" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(latestLocation.pathname).toBe("/search");
      expect(latestLocation.search).toBe("?q=plan");
    });
  });

  it("groups suggestions by result type", async () => {
    searchModule.searchAll.mockResolvedValue([]);
    searchModule.searchSuggest.mockResolvedValue([
      { id: "t-1", type: "task", title: "Fix login flow", url: "/tasks/t-1" },
      { id: "p-1", type: "project", title: "Login improvements", url: "/projects/p-1" },
    ]);

    renderWithProviders(["/"]);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
      window.dispatchEvent(event);
    });

    const input = await screen.findByLabelText("Search");
    fireEvent.change(input, { target: { value: "login" } });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    await waitFor(() => {
      expect(searchModule.searchSuggest).toHaveBeenCalledWith(
        expect.objectContaining({ query: "login" })
      );
    });

    expect(await screen.findByRole("group", { name: /tasks/i })).toBeInTheDocument();
    expect(await screen.findByRole("group", { name: /projects/i })).toBeInTheDocument();
  });
});

describe("Global search page", () => {
  it("requests type-specific results when filter changes", async () => {
    searchModule.searchAll.mockImplementation(({ types }) => {
      if (types?.includes("doc")) {
        return Promise.resolve([
          {
            id: "d1",
            type: "doc",
            title: "Design Doc",
            url: "/docs/d1",
            snippet: null,
          },
        ]);
      }
      return Promise.resolve([
        {
          id: "p1",
          type: "project",
          title: "Alpha Project",
          url: "/projects/p1",
          snippet: null,
        },
      ]);
    });

    renderWithProviders(["/search?q=alpha"]);

    await screen.findByText("Alpha Project");

    const docsTab = screen.getByRole("tab", { name: /docs/i });
    fireEvent.click(docsTab);

    await waitFor(() => {
      expect(searchModule.searchAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ types: ["doc"] })
      );
    });
  });
});

describe("Saved searches", () => {
  it("appear as palette actions after saving", async () => {
    searchModule.searchAll.mockResolvedValue([
      {
        id: "p1",
        type: "project",
        title: "Alpha Project",
        url: "/projects/p1",
        snippet: null,
      },
    ]);

    renderWithProviders(["/search?q=alpha"]);

    const saveButton = await screen.findByRole("button", { name: /save search/i });
    fireEvent.click(saveButton);

    const nameInput = await screen.findByPlaceholderText("Search name");
    fireEvent.change(nameInput, { target: { value: "Alpha" } });
    const confirmButton = screen.getByRole("button", { name: /^save$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save search/i })).toBeEnabled();
    });

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
      window.dispatchEvent(event);
    });

    const savedAction = await screen.findByRole("option", { name: /alpha/i });
    expect(savedAction).toBeInTheDocument();
  });
});

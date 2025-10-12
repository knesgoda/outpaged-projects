import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { CommandPalette } from "@/components/command/CommandPalette";
import { CommandKProvider } from "@/components/command/CommandKProvider";
import { GlobalSearchPage } from "@/pages/search/GlobalSearchPage";
import { act } from "react";
import type {
  CreateSavedSearchInput,
  SavedSearch,
  SavedSearchAlertConfig,
} from "@/services/savedSearches";

const makeSearchResponse = (items: any[]) => ({
  items,
  nextCursor: undefined,
  partial: false,
  metrics: { totalMs: 0, timeout: false },
});

jest.mock("@/services/search", () => ({
  searchAll: jest.fn(() => Promise.resolve(makeSearchResponse([]))),
  searchSuggest: jest.fn(() => Promise.resolve(makeSearchResponse([]))),
}));

const defaultAlertConfig: SavedSearchAlertConfig = {
  frequency: "off",
  thresholds: [],
  channels: [],
  metadata: {},
  lastSentAt: null,
};

const createSavedSearchStub = (
  overrides: Partial<SavedSearch>
): SavedSearch => ({
  id: "stub-id",
  name: "Stub",
  query: "",
  filters: {},
  visibility: "private",
  description: null,
  parameterTokens: [],
  owner: { type: "user", id: null },
  sharedSlug: null,
  sharedUrl: null,
  alertConfig: { ...defaultAlertConfig },
  maskedFields: [],
  audit: {},
  created_at: "2024-02-01T00:00:00.000Z",
  updated_at: "2024-02-01T00:00:00.000Z",
  ...overrides,
});

const seededSavedSearches: SavedSearch[] = [
  createSavedSearchStub({
    id: "seed-1",
    name: "My open tasks",
    query: "status:open assignee:me",
    filters: { type: "task" },
  }),
  createSavedSearchStub({
    id: "seed-2",
    name: "Product docs",
    query: "product spec",
    filters: { type: "doc" },
  }),
];

const saved: SavedSearch[] = [];

jest.mock("@/services/savedSearches", () => ({
  listSavedSearches: jest.fn(async () => [...saved]),
  createSavedSearch: jest.fn(
    ({ name, query, filters }: CreateSavedSearchInput) => {
      const now = new Date().toISOString();
      const entry: SavedSearch = createSavedSearchStub({
        id: `${Date.now()}`,
        name,
        query,
        filters: filters ?? {},
        created_at: now,
        updated_at: now,
      });
      saved.unshift(entry);
      return Promise.resolve(entry);
    }
  ),
  deleteSavedSearch: jest.fn(async (id: string) => {
    const index = saved.findIndex((item) => item.id === id);
    if (index >= 0) {
      saved.splice(index, 1);
    }
  }),
  __seed: (items: SavedSearch[]) => {
    saved.length = 0;
    saved.push(...items.map((item) => ({ ...item })));
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

const setSearchAllResults = (items: any[]) => {
  searchModule.searchAll.mockResolvedValue(makeSearchResponse(items));
};

const setSearchSuggestResults = (items: any[]) => {
  searchModule.searchSuggest.mockResolvedValue(makeSearchResponse(items));
};

const savedSearchModule = jest.requireMock("@/services/savedSearches") as {
  __seed: (items: SavedSearch[]) => void;
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
  savedSearchModule.__seed(seededSavedSearches);
  setSearchSuggestResults([]);
});

describe("Command palette", () => {
  it("renders seeded saved searches when opened", async () => {
    setSearchAllResults([]);
    renderWithProviders(["/search?q=alpha"]);

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
      window.dispatchEvent(event);
    });

    const seededAction = await screen.findByRole("option", {
      name: /my open tasks/i,
    });
    expect(seededAction).toBeInTheDocument();
  });

  it("opens with cmd+k and navigates to full search on enter", async () => {
    setSearchAllResults([]);
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
    setSearchAllResults([]);
    setSearchSuggestResults([
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
  it("filters results locally when type facet toggled", async () => {
    const docItem = {
      id: "d1",
      type: "doc",
      title: "Design Doc",
      url: "/docs/d1",
      snippet: null,
    };
    const projectItem = {
      id: "p1",
      type: "project",
      title: "Alpha Project",
      url: "/projects/p1",
      snippet: null,
    };
    setSearchAllResults([projectItem, docItem]);

    renderWithProviders(["/search?q=alpha"]);

    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Alpha Project")).toBeInTheDocument();
    expect(within(listbox).getByText("Design Doc")).toBeInTheDocument();

    const docToggle = await screen.findByRole("button", { name: /doc/i });
    fireEvent.click(docToggle);

    await waitFor(() => {
      expect(within(listbox).queryByText("Alpha Project")).not.toBeInTheDocument();
    });

    expect(within(listbox).getByText("Design Doc")).toBeInTheDocument();
  });
});

describe("Saved searches", () => {
  it("appear as palette actions after saving", async () => {
    savedSearchModule.__seed([]);
    setSearchAllResults([
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

    const nameInput = await screen.findByPlaceholderText("My triage view");
    fireEvent.change(nameInput, { target: { value: "Alpha" } });
    const dialog = await screen.findByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: /save search/i });
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

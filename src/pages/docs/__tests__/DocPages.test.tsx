import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocsHome from "../DocsHome";
import DocEdit from "../DocEdit";
import type { DocPage } from "@/types";
import { useDocSearch } from "@/hooks/useDocs";

jest.mock("@/components/docs/DocToolbar", () => ({
  DocToolbar: () => <div data-testid="doc-toolbar" />,
}));

jest.mock("@/components/docs/VersionHistory", () => ({
  VersionHistory: () => <div data-testid="version-history" />,
}));

jest.mock("@/hooks/useUnsavedChangesPrompt", () => ({
  useUnsavedChangesPrompt: () => undefined,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/hooks/useDocs", () => {
  const actual = jest.requireActual("@/hooks/useDocs");
  return {
    ...actual,
    useDocs: jest.fn(),
    useDoc: jest.fn(),
    useCreateDoc: jest.fn(),
    useUpdateDoc: jest.fn(),
    useDeleteDoc: jest.fn(),
    useDocVersions: jest.fn(),
  };
});

jest.mock("@/services/docs", () => {
  const actual = jest.requireActual("@/services/docs");
  return {
    ...actual,
    createDocVersionFromCurrent: jest.fn(),
  };
});

jest.mock("@/integrations/supabase/client", () => {
  const createBuilder = () => {
    const result = { data: [], error: null };
    const builder: any = {
      select: jest.fn(() => builder),
      order: jest.fn(() => Promise.resolve(result)),
      eq: jest.fn(() => builder),
      is: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: "doc-1" }, error: null }),
        }),
      })),
      update: jest.fn(() => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: "doc-1" }, error: null }),
        }),
      })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
      then: (resolve: (value: any) => void) => Promise.resolve(result).then(resolve),
      catch: (reject: (reason: any) => void) => Promise.resolve(result).catch(reject),
      finally: (callback: () => void) => Promise.resolve(result).finally(callback),
    };
    return builder;
  };

  return {
    supabase: {
      from: jest.fn(() => createBuilder()),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    },
  };
});

const { useDocs, useDoc, useUpdateDoc, useDeleteDoc, useDocVersions } =
  jest.requireMock("@/hooks/useDocs");
const { createDocVersionFromCurrent } = jest.requireMock("@/services/docs");

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const DocDetailStub = () => {
  const params = useParams();
  return <div>Doc detail {params.docId}</div>;
};

describe("Docs flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders docs in the tree", () => {
    const docs: DocPage[] = [
      {
        id: "doc-1",
        owner: "user-1",
        title: "Project Plan",
        body_markdown: "Hello",
        is_published: true,
        version: 1,
        project_id: null,
        parent_id: null,
        slug: "project-plan",
        created_at: "",
        updated_at: "",
        created_by: null,
        updated_by: null,
        body_html: null,
      },
    ];

    (useDocs as jest.Mock).mockReturnValue({
      data: docs,
      isLoading: false,
      isError: false,
    });
    (useDeleteDoc as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    (useUpdateDoc as jest.Mock).mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
    (useDocVersions as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    const client = createClient();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/docs"]}>
          <Routes>
            <Route path="/docs" element={<DocsHome />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getAllByText("Project Plan").length).toBeGreaterThan(0);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("saves doc edits and bumps version", async () => {
    const doc: DocPage = {
      id: "doc-1",
      owner: "user-1",
      title: "Plan",
      body_markdown: "Initial",
      is_published: true,
      version: 2,
      project_id: null,
      parent_id: null,
      slug: "plan",
      created_at: "",
      updated_at: "",
      created_by: null,
      updated_by: null,
      body_html: null,
    };

    (useDoc as jest.Mock).mockReturnValue({
      data: doc,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    (useDocs as jest.Mock).mockReturnValue({ data: [doc], isLoading: false, isError: false });
    const mutateAsync = jest.fn().mockResolvedValue({ id: "doc-1" });
    (useUpdateDoc as jest.Mock).mockReturnValue({ mutateAsync, isPending: false });
    (createDocVersionFromCurrent as jest.Mock).mockResolvedValue(undefined);

    const client = createClient();

    const { container } = render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/docs/doc-1/edit"]}>
          <Routes>
            <Route path="/docs/:docId/edit" element={<DocEdit />} />
            <Route path="/docs/:docId" element={<DocDetailStub />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Plan Updated" } });
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Revised" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(createDocVersionFromCurrent).toHaveBeenCalledWith("doc-1"));
    expect(mutateAsync).toHaveBeenCalled();
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.patch.version).toBe(3);
    expect(await screen.findByText("Doc detail doc-1")).toBeInTheDocument();
  });
});

describe("useDocSearch", () => {
  it("filters docs by title or body", () => {
    const docs: DocPage[] = [
      {
        id: "1",
        owner: "user-1",
        title: "Project Brief",
        body_markdown: "Overview",
        is_published: true,
        version: 1,
        project_id: null,
        parent_id: null,
        slug: "brief",
        created_at: "",
        updated_at: "",
        created_by: null,
        updated_by: null,
        body_html: null,
      },
      {
        id: "2",
        owner: "user-1",
        title: "Release Notes",
        body_markdown: "Updates",
        is_published: true,
        version: 1,
        project_id: null,
        parent_id: null,
        slug: "release",
        created_at: "",
        updated_at: "",
        created_by: null,
        updated_by: null,
        body_html: null,
      },
    ];

    const { result, rerender } = renderHook(({ term }) => useDocSearch(docs, term), {
      initialProps: { term: "" },
    });

    expect(result.current).toHaveLength(2);
    rerender({ term: "release" });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("Release Notes");
  });
});

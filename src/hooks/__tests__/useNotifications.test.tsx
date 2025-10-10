import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useArchive } from "../useNotifications";
import {
  archive as archiveNotification,
  unarchive as unarchiveNotification,
} from "@/services/notifications";

jest.mock("@/services/notifications", () => {
  const actual = jest.requireActual("@/services/notifications");
  return {
    __esModule: true,
    ...actual,
    archive: jest.fn().mockResolvedValue(undefined),
    unarchive: jest.fn().mockResolvedValue(undefined),
  };
});

describe("useNotifications archive helpers", () => {
  const createWrapper = (client: QueryClient) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("archives notifications and refreshes queries", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useArchive(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "note-1", archived: true });
    });

    expect(archiveNotification).toHaveBeenCalledWith("note-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications"] });

    invalidateSpy.mockRestore();
  });

  it("unarchives notifications and refreshes queries", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useArchive(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "note-2", archived: false });
    });

    expect(unarchiveNotification).toHaveBeenCalledWith("note-2");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notifications"] });

    invalidateSpy.mockRestore();
  });
});

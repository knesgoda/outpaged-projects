import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import {
  createBoardShareLink,
  fetchBoardFieldVisibility,
  fetchBoardItemPrivacy,
  fetchBoardMembersWithProfiles,
  fetchBoardMembership,
  fetchBoardShareLinks,
  removeBoardMember,
  removeItemPrivacy,
  revokeBoardShareLink,
  setItemPrivacy,
  updateBoardShareLink,
  updateFieldVisibility,
  upsertBoardMember,
} from "@/services/boards/boardGovernanceService";
import { resetSupabaseMocks, supabaseMock } from "@/testing/supabaseHarness";

jest.mock("@/services/boards/boardGovernanceService", () => {
  const actual = jest.requireActual("@/services/boards/boardGovernanceService");
  return {
    ...actual,
    fetchBoardMembership: jest.fn(),
    fetchBoardMembersWithProfiles: jest.fn(),
    fetchBoardShareLinks: jest.fn(),
    fetchBoardFieldVisibility: jest.fn(),
    fetchBoardItemPrivacy: jest.fn(),
    upsertBoardMember: jest.fn(),
    removeBoardMember: jest.fn(),
    updateFieldVisibility: jest.fn(),
    setItemPrivacy: jest.fn(),
    removeItemPrivacy: jest.fn(),
    createBoardShareLink: jest.fn(),
    updateBoardShareLink: jest.fn(),
    revokeBoardShareLink: jest.fn(),
  };
});

describe("useBoardPermissions", () => {
  let client: QueryClient;
  const fetchMembershipMock = fetchBoardMembership as jest.MockedFunction<typeof fetchBoardMembership>;
  const fetchMembersMock = fetchBoardMembersWithProfiles as jest.MockedFunction<typeof fetchBoardMembersWithProfiles>;
  const fetchShareLinksMock = fetchBoardShareLinks as jest.MockedFunction<typeof fetchBoardShareLinks>;
  const fetchFieldVisibilityMock = fetchBoardFieldVisibility as jest.MockedFunction<typeof fetchBoardFieldVisibility>;
  const fetchItemPrivacyMock = fetchBoardItemPrivacy as jest.MockedFunction<typeof fetchBoardItemPrivacy>;
  const upsertMemberMock = upsertBoardMember as jest.MockedFunction<typeof upsertBoardMember>;
  const removeMemberMock = removeBoardMember as jest.MockedFunction<typeof removeBoardMember>;
  const updateFieldVisibilityMock = updateFieldVisibility as jest.MockedFunction<typeof updateFieldVisibility>;
  const setItemPrivacyMock = setItemPrivacy as jest.MockedFunction<typeof setItemPrivacy>;
  const removeItemPrivacyMock = removeItemPrivacy as jest.MockedFunction<typeof removeItemPrivacy>;
  const createShareLinkMock = createBoardShareLink as jest.MockedFunction<typeof createBoardShareLink>;
  const updateShareLinkMock = updateBoardShareLink as jest.MockedFunction<typeof updateBoardShareLink>;
  const revokeShareLinkMock = revokeBoardShareLink as jest.MockedFunction<typeof revokeBoardShareLink>;

  beforeEach(() => {
    resetSupabaseMocks();
    client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    fetchMembershipMock.mockReset();
    fetchMembersMock.mockReset();
    fetchShareLinksMock.mockReset();
    fetchFieldVisibilityMock.mockReset();
    fetchItemPrivacyMock.mockReset();
    upsertMemberMock.mockReset();
    removeMemberMock.mockReset();
    updateFieldVisibilityMock.mockReset();
    setItemPrivacyMock.mockReset();
    removeItemPrivacyMock.mockReset();
    createShareLinkMock.mockReset();
    updateShareLinkMock.mockReset();
    revokeShareLinkMock.mockReset();

    fetchMembersMock.mockResolvedValue([]);
    fetchShareLinksMock.mockResolvedValue([]);
    fetchFieldVisibilityMock.mockResolvedValue([]);
    fetchItemPrivacyMock.mockResolvedValue([]);
    upsertMemberMock.mockResolvedValue(undefined);
    removeMemberMock.mockResolvedValue(undefined);
    updateFieldVisibilityMock.mockResolvedValue(undefined);
    setItemPrivacyMock.mockResolvedValue(undefined);
    removeItemPrivacyMock.mockResolvedValue(undefined);
    createShareLinkMock.mockResolvedValue({
      id: "share-new",
      board_id: "board-1",
      slug: "newslug",
      allowed_role: "viewer",
      password_hash: null,
      expires_at: null,
      max_uses: null,
      usage_count: 0,
      created_at: new Date().toISOString(),
      created_by: "user-123",
      last_used_at: null,
      revoked_at: null,
    } as any);
    updateShareLinkMock.mockResolvedValue(undefined);
    revokeShareLinkMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    client.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  it("derives manager-level permissions when cached membership exists", async () => {
    const now = new Date().toISOString();
    const membership = {
      board_id: "board-1",
      user_id: "user-123",
      role: "manager",
      created_at: now,
      updated_at: now,
      invitation_message: null,
      invited_by: null,
      id: "membership-1",
    } as const;
    const fieldVisibility = [
      {
        id: "visibility-1",
        board_id: "board-1",
        field_key: "confidential_notes",
        hidden_for_roles: ["manager", "viewer", "guest"],
        is_sensitive: true,
        created_at: now,
        updated_at: now,
      },
    ];
    const itemPrivacy = [
      {
        id: "privacy-1",
        board_id: "board-1",
        item_id: "task-1",
        visibility: "owner",
        reason: "Contains acquisition data",
        created_by: "user-999",
        created_at: now,
        updated_at: now,
      },
    ];
    const shareLinks = [
      {
        id: "share-1",
        board_id: "board-1",
        slug: "share123",
        allowed_role: "viewer",
        password_hash: null,
        expires_at: null,
        max_uses: null,
        usage_count: 0,
        created_by: "user-123",
        created_at: now,
        last_used_at: null,
        revoked_at: null,
      },
    ];

    client.setQueryData(["board", "board-1", "membership"], membership);
    client.setQueryData(["board", "board-1", "field-visibility"], fieldVisibility);
    client.setQueryData(["board", "board-1", "item-privacy"], itemPrivacy);
    client.setQueryData(["board", "board-1", "share-links"], shareLinks);

    fetchMembershipMock.mockResolvedValue(membership as any);
    fetchMembersMock.mockResolvedValue([
      {
        id: "membership-1",
        board_id: "board-1",
        user_id: "user-123",
        role: "manager",
        display_name: "Casey Manager",
        avatar_url: null,
        email: "casey@example.com",
        created_at: now,
        updated_at: now,
        invited_by: null,
        invitation_message: null,
      } as any,
    ]);
    fetchFieldVisibilityMock.mockResolvedValue(fieldVisibility as any);
    fetchItemPrivacyMock.mockResolvedValue(itemPrivacy as any);
    fetchShareLinksMock.mockResolvedValue(shareLinks as any);

    const { result } = renderHook(() => useBoardPermissions("board-1"), { wrapper });

    await waitFor(() => expect(result.current.role).toBe("manager"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.hiddenFields).toContain("confidential_notes"));
    await waitFor(() => expect(result.current.restrictedItemIds).toContain("task-1"));
    await waitFor(() => expect(result.current.shareLinks).toHaveLength(1));
  });

  it("falls back to guest when no membership is present", async () => {
    fetchMembershipMock.mockResolvedValue(null);
    const { result } = renderHook(() => useBoardPermissions("board-1"), { wrapper });

    await waitFor(() => expect(result.current.role).toBe("guest"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions.canManageMembers).toBe(false);
    expect(result.current.members).toHaveLength(0);
  });
});

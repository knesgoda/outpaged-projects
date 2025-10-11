import { render, screen } from "@testing-library/react";
import { BoardAccessPanel } from "@/components/boards/BoardAccessPanel";
import type { BoardRole } from "@/services/boards/boardGovernanceService";

type BoardPermissionsHookResult = {
  role: BoardRole;
  permissions: {
    canView: boolean;
    canComment: boolean;
    canEditItems: boolean;
    canConfigureStructure: boolean;
    canManageMembers: boolean;
    canManagePrivacy: boolean;
    canManageShareLinks: boolean;
    canViewAudit: boolean;
  };
  members: any[];
  shareLinks: any[];
  fieldVisibility: any[];
  itemPrivacy: any[];
  hiddenFields: string[];
  restrictedItemIds: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  actions: {
    inviteOrUpdateMember: jest.MockedFunction<(...args: any[]) => Promise<void>>;
    removeMember: jest.MockedFunction<(userId: string) => Promise<void>>;
    updateFieldVisibility: jest.MockedFunction<(...args: any[]) => Promise<void>>;
    setItemPrivacy: jest.MockedFunction<(...args: any[]) => Promise<void>>;
    removeItemPrivacy: jest.MockedFunction<(itemId: string) => Promise<void>>;
    createShareLink: jest.MockedFunction<(...args: any[]) => Promise<void>>;
    updateShareLink: jest.MockedFunction<(...args: any[]) => Promise<void>>;
    revokeShareLink: jest.MockedFunction<(id: string) => Promise<void>>;
  };
};

jest.mock("@/hooks/useBoardPermissions", () => {
  const actual = jest.requireActual("@/hooks/useBoardPermissions");
  return {
    ...actual,
    useBoardPermissions: jest.fn(),
  };
});

const mockUseBoardPermissions = jest.requireMock("@/hooks/useBoardPermissions").useBoardPermissions as jest.MockedFunction<
  (boardId?: string) => BoardPermissionsHookResult
>;

function buildPermissions(overrides: Partial<BoardPermissionsHookResult> = {}): BoardPermissionsHookResult {
  return {
    role: "guest",
    permissions: {
      canView: true,
      canComment: false,
      canEditItems: false,
      canConfigureStructure: false,
      canManageMembers: false,
      canManagePrivacy: false,
      canManageShareLinks: false,
      canViewAudit: false,
      ...(overrides.permissions ?? {}),
    },
    members: [],
    shareLinks: [],
    fieldVisibility: [],
    itemPrivacy: [],
    hiddenFields: [],
    restrictedItemIds: [],
    isLoading: false,
    refresh: jest.fn().mockResolvedValue(undefined),
    actions: {
      inviteOrUpdateMember: jest.fn().mockResolvedValue(undefined),
      removeMember: jest.fn().mockResolvedValue(undefined),
      updateFieldVisibility: jest.fn().mockResolvedValue(undefined),
      setItemPrivacy: jest.fn().mockResolvedValue(undefined),
      removeItemPrivacy: jest.fn().mockResolvedValue(undefined),
      createShareLink: jest.fn().mockResolvedValue(undefined),
      updateShareLink: jest.fn().mockResolvedValue(undefined),
      revokeShareLink: jest.fn().mockResolvedValue(undefined),
    },
    ...overrides,
    permissions: {
      canView: true,
      canComment: false,
      canEditItems: false,
      canConfigureStructure: false,
      canManageMembers: false,
      canManagePrivacy: false,
      canManageShareLinks: false,
      canViewAudit: false,
      ...(overrides.permissions ?? {}),
    },
  };
}

describe("BoardAccessPanel", () => {
  it("hides management controls when the user lacks permissions", () => {
    mockUseBoardPermissions.mockReturnValue(
      buildPermissions({
        hiddenFields: ["confidential_notes"],
        restrictedItemIds: ["task-99"],
      })
    );

    render(<BoardAccessPanel boardId="board-1" />);

    expect(screen.queryByLabelText(/User ID/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Role/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Create share link/i)).not.toBeInTheDocument();
    expect(screen.getByText(/confidential_notes/)).toBeInTheDocument();
    expect(screen.getByText(/task-99/)).toBeInTheDocument();
  });

  it("enables member management and share link creation for managers", async () => {
    const permissions = buildPermissions({
      role: "manager",
      permissions: {
        canView: true,
        canComment: true,
        canEditItems: true,
        canConfigureStructure: true,
        canManageMembers: true,
        canManagePrivacy: true,
        canManageShareLinks: true,
        canViewAudit: true,
      },
      members: [
        {
          board_id: "board-1",
          user_id: "user-123",
          role: "manager",
          full_name: "Ada Manager",
          avatar_url: null,
          department: "Operations",
          title: "Lead",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      shareLinks: [],
      fieldVisibility: [],
      itemPrivacy: [],
    });

    mockUseBoardPermissions.mockReturnValue(permissions);

    render(<BoardAccessPanel boardId="board-1" />);

    expect(screen.getByLabelText(/User ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Add or update member/i)).toBeInTheDocument();
    expect(screen.getByText(/Create share link/i)).toBeInTheDocument();

    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
    expect(screen.getByText(/Create share link/i)).toBeInTheDocument();
  });
});

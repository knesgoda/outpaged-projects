import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { InboxPage } from "@/pages/inbox/InboxPage";
import NotificationSettingsPage from "@/pages/settings/NotificationSettings";
import type { NotificationItem, NotificationPreferences } from "@/types";

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-test" } }, error: null }),
      signOut: jest.fn(),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => ({ id: "channel" })),
    })),
    removeChannel: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock("@/hooks/useNotifications", () => {
  const original = jest.requireActual("@/hooks/useNotifications");
  return {
    __esModule: true,
    ...original,
    useNotifications: jest.fn(),
    useMarkRead: jest.fn(),
    useMarkUnread: jest.fn(),
    useMarkAllRead: jest.fn(),
    useArchive: jest.fn(),
  };
});

jest.mock("@/hooks/useNotificationPrefs", () => ({
  useNotificationPrefs: jest.fn(),
  useSaveNotificationPrefs: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@/hooks/useSubscriptions", () => ({
  useSubscriptions: () => ({
    subscriptions: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isFollowing: () => false,
    toggleSubscription: jest.fn(),
    isToggling: false,
  }),
}));

const mockUseNotifications = jest.requireMock("@/hooks/useNotifications");
const mockUseNotificationPrefs = jest.requireMock("@/hooks/useNotificationPrefs");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Notification UI", () => {
  const DEFAULT_PREFS: NotificationPreferences = {
    user_id: "",
    in_app: {
      mention: true,
      assigned: true,
      comment_reply: true,
      status_change: true,
      due_soon: true,
      automation: true,
      file_shared: true,
      doc_comment: true,
    },
    email: {
      mention: false,
      assigned: false,
      comment_reply: false,
      status_change: false,
      due_soon: true,
      automation: false,
      file_shared: false,
      doc_comment: false,
    },
    digest_frequency: "daily",
    updated_at: new Date().toISOString(),
  };

  const sampleNotifications: NotificationItem[] = [
    {
      id: "1",
      user_id: "user-1",
      type: "mention",
      title: "Mentioned in comment",
      body: "Alice mentioned you on task X",
      entity_type: "task",
      entity_id: "task-1",
      project_id: "proj-1",
      link: "/tasks/task-1",
      read_at: null,
      archived_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      user_id: "user-1",
      type: "assigned",
      title: "New assignment",
      body: "Bob assigned you a task",
      entity_type: "task",
      entity_id: "task-2",
      project_id: "proj-2",
      link: "/tasks/task-2",
      read_at: new Date().toISOString(),
      archived_at: null,
      created_at: new Date().toISOString(),
    },
  ];

  it("renders bell with unread badge and dropdown content", async () => {
    mockUseNotifications.useNotifications.mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: jest.fn(),
      invalidateAllTabs: jest.fn(),
    });
    mockUseNotifications.useMarkRead.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseNotifications.useMarkAllRead.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseNotifications.useMarkUnread.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseNotifications.useArchive.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    const trigger = screen.getByLabelText(/open notifications/i);
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.pointerDown(trigger, { button: 0 });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(await screen.findByText(/mentioned in comment/i)).toBeVisible();
    expect(await screen.findByText(/new assignment/i)).toBeVisible();
    expect(await screen.findByText(/mark all read/i)).toBeInTheDocument();
  });

  it("renders inbox page with notifications and actions", () => {
    mockUseNotifications.useNotifications.mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
      refetch: jest.fn(),
      invalidateAllTabs: jest.fn(),
    });
    mockUseNotifications.useMarkRead.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseNotifications.useMarkUnread.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseNotifications.useMarkAllRead.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockUseNotifications.useArchive.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });

    render(
      <MemoryRouter>
        <InboxPage tab="all" />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /inbox/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search notifications/i)).toBeInTheDocument();
    expect(screen.getByText(/archive selected/i)).toBeDisabled();
    expect(screen.getByText(/new assignment/i)).toBeInTheDocument();
  });

  it("renders notification settings toggles", () => {
    const preferences: NotificationPreferences = {
      ...DEFAULT_PREFS,
      user_id: "user-1",
      updated_at: new Date().toISOString(),
    };

    mockUseNotificationPrefs.useNotificationPrefs.mockReturnValue({
      data: preferences,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseNotificationPrefs.useSaveNotificationPrefs.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });

    render(<NotificationSettingsPage />);

    expect(screen.getByRole("heading", { name: /notification settings/i })).toBeInTheDocument();
    expect(screen.getAllByText(/mentions/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/digest summary/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });
});

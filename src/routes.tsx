import { Suspense, lazy, type ReactNode } from "react";
import { Navigate, useRoutes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import type { InboxTab } from "@/pages/inbox/InboxPage";

const HomePage = lazy(() => import("@/pages/ia/HomePage"));
const TimelinePage = lazy(() => import("@/pages/ia/TimelinePage"));
const MyWorkPage = lazy(() => import("@/pages/ia/MyWorkPage"));
const BoardsPage = lazy(() => import("@/pages/BoardsPage"));
const KanbanBoard = lazy(() => import("@/pages/KanbanBoard"));
// const CalendarPage = lazy(() => import("@/pages/calendar/CalendarPage"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDetails = lazy(() => import("@/pages/ProjectDetails"));
const TasksPage = lazy(() => import("@/pages/Tasks"));
const ReportsPage = lazy(() => import("@/pages/Reports"));
const DocumentsPage = lazy(() => import("@/pages/Documents"));
const FilesPage = lazy(() => import("@/pages/files/FilesPage"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const TeamDirectoryPage = lazy(() => import("@/pages/TeamDirectory"));
const TeamMemberProfilePage = lazy(() => import("@/pages/TeamMemberProfile"));
const SpaceOverviewPage = lazy(() => import("@/pages/spaces/SpaceOverviewPage"));
const DocsHome = lazy(() => import("@/pages/docs/DocsHome"));
const DocCreate = lazy(() => import("@/pages/docs/DocCreate"));
const DocDetail = lazy(() => import("@/pages/docs/DocDetail"));
const DocEdit = lazy(() => import("@/pages/docs/DocEdit"));
const TimeHomePage = lazy(() => import("@/pages/time/TimeHomePage"));
const MyTimePage = lazy(() => import("@/pages/time/MyTimePage"));
const ApprovalsPage = lazy(() => import("@/pages/time/ApprovalsPage"));
const HelpHome = lazy(() => import("@/pages/help/HelpHome"));
const FAQPage = lazy(() => import("@/pages/help/FAQPage"));
const ShortcutsPage = lazy(() => import("@/pages/help/ShortcutsPage"));
const ChangelogPage = lazy(() => import("@/pages/help/ChangelogPage"));
const ContactSupportPage = lazy(() => import("@/pages/help/ContactSupportPage"));
const HelpSearchPage = lazy(() => import("@/pages/help/HelpSearchPage"));
const OnboardingPage = lazy(() => import("@/pages/help/OnboardingPage"));
const Login = lazy(() => import("@/pages/Login"));
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const Logout = lazy(() => import("@/pages/Logout"));
const NotAuthorizedPage = lazy(() => import("@/pages/NotAuthorized"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const WorkspaceSettings = lazy(() => import("@/pages/admin/WorkspaceSettings"));
const MembersPage = lazy(() => import("@/pages/admin/MembersPage"));
const PermissionsPage = lazy(() => import("@/pages/admin/PermissionsPage"));
const SecurityPage = lazy(() => import("@/pages/admin/SecurityPage"));
const OfflinePoliciesPage = lazy(() => import("@/pages/admin/OfflinePoliciesPage"));
const AuditLogsPage = lazy(() => import("@/pages/admin/AuditLogsPage"));
const DataPage = lazy(() => import("@/pages/admin/DataPage"));
const WebhooksPage = lazy(() => import("@/pages/admin/WebhooksPage"));
const ApiExplorerPage = lazy(() => import("@/pages/admin/ApiExplorerPage"));
const BillingPage = lazy(() => import("@/pages/admin/BillingPage"));
const BoardGovernancePage = lazy(() => import("@/pages/admin/BoardGovernancePage"));
const ViewSchemaPlayground = lazy(() => import("@/pages/dev/ViewSchemaPlayground"));
const MobileBoardPreview = lazy(() => import("@/pages/mobile/MobileBoardPreview"));
const InboxPage = lazy(() =>
  import("@/pages/inbox/InboxPage").then((module) => ({ default: module.InboxPage }))
);

const suspenseFallback = (
  <div className="p-6 text-sm text-muted-foreground">Loading…</div>
);

function InboxRoute({ tab }: { tab: InboxTab }) {
  return <InboxPage tab={tab} />;
}

function withAppLayout(element: ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={suspenseFallback}>{element}</Suspense>
    </ErrorBoundary>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={suspenseFallback}>{element}</Suspense>;
}

const TaskView = lazy(() => import("@/pages/TaskView"));
const UnifiedProjectView = lazy(() => import("@/pages/projects/UnifiedProjectView"));
const ProjectKanbanView = lazy(() => import("@/pages/projects/views/ProjectKanbanView"));
const ProjectTableView = lazy(() => import("@/pages/projects/views/ProjectTableView"));
const ProjectTimelineView = lazy(() => import("@/pages/projects/views/ProjectTimelineView"));
const ProjectCalendarView = lazy(() => import("@/pages/projects/views/ProjectCalendarView"));

export function AppRoutes() {
  return useRoutes([
    {
      path: "/",
      element: withAppLayout(<AppLayout />),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: "dashboard", element: withSuspense(<HomePage />) },
        { path: "board", element: withSuspense(<KanbanBoard />) },
        { path: "inbox", element: withSuspense(<InboxPage />) },
        { path: "projects", element: withSuspense(<Projects />) },
        {
          path: "projects/:projectId",
          element: withSuspense(<UnifiedProjectView />),
          children: [
            { index: true, element: <Navigate to="kanban" replace /> },
            { path: "kanban", element: withSuspense(<ProjectKanbanView />) },
            { path: "table", element: withSuspense(<ProjectTableView />) },
            { path: "timeline", element: withSuspense(<ProjectTimelineView />) },
            { path: "calendar", element: withSuspense(<ProjectCalendarView />) },
            { path: "settings", element: withSuspense(<ProjectDetails />) },
          ],
        },
        { path: "spaces/:spaceId", element: withSuspense(<SpaceOverviewPage />) },
        { path: "tasks", element: withSuspense(<TasksPage />) },
        { path: "tasks/:taskId", element: withSuspense(<TaskView />) },
        { path: "reports", element: withSuspense(<ReportsPage />) },
        { path: "documents", element: withSuspense(<DocumentsPage />) },
        { path: "files", element: withSuspense(<FilesPage />) },
        { path: "notifications", element: withSuspense(<NotificationsPage />) },
        { path: "profile", element: withSuspense(<ProfilePage />) },
        { path: "team", element: withSuspense(<TeamDirectoryPage />) },
        { path: "team/:userId", element: withSuspense(<TeamMemberProfilePage />) },
        {
          path: "docs",
          children: [
            { index: true, element: withSuspense(<DocsHome />) },
            { path: "create", element: withSuspense(<DocCreate />) },
            { path: ":docId", element: withSuspense(<DocDetail />) },
            { path: ":docId/edit", element: withSuspense(<DocEdit />) },
          ],
        },
        {
          path: "time",
          children: [
            { index: true, element: withSuspense(<TimeHomePage />) },
            { path: "my-time", element: withSuspense(<MyTimePage />) },
            { path: "approvals", element: withSuspense(<ApprovalsPage />) },
          ],
        },
        {
          path: "help",
          children: [
            { index: true, element: withSuspense(<HelpHome />) },
            { path: "faq", element: withSuspense(<FAQPage />) },
            { path: "shortcuts", element: withSuspense(<ShortcutsPage />) },
            { path: "changelog", element: withSuspense(<ChangelogPage />) },
            { path: "contact", element: withSuspense(<ContactSupportPage />) },
            { path: "search", element: withSuspense(<HelpSearchPage />) },
            { path: "onboarding", element: withSuspense(<OnboardingPage />) },
          ],
        },
        {
          path: "admin",
          element: <AdminLayout />,
          children: [
            { index: true, element: withSuspense(<AdminHome />) },
            { path: "workspace", element: withSuspense(<WorkspaceSettings />) },
            { path: "members", element: withSuspense(<MembersPage />) },
            { path: "permissions", element: withSuspense(<PermissionsPage />) },
            { path: "security", element: withSuspense(<SecurityPage />) },
            { path: "offline", element: withSuspense(<OfflinePoliciesPage />) },
            { path: "audit-logs", element: withSuspense(<AuditLogsPage />) },
            { path: "data", element: withSuspense(<DataPage />) },
            { path: "webhooks", element: withSuspense(<WebhooksPage />) },
            { path: "api", element: withSuspense(<ApiExplorerPage />) },
            { path: "billing", element: withSuspense(<BillingPage />) },
            { path: "board-governance", element: withSuspense(<BoardGovernancePage />) },
          ],
        },
        {
          path: "dev/view-schema",
          element: withSuspense(<ViewSchemaPlayground />),
        },
        {
          path: "mobile/board-preview",
          element: withSuspense(<MobileBoardPreview />),
        },
      ],
    },
    { path: "/login", element: withSuspense(<Login />) },
    { path: "/auth/callback", element: withSuspense(<AuthCallback />) },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: withSuspense(<Logout />) },
    { path: "/not-authorized", element: withSuspense(<NotAuthorizedPage />) },
    { path: "*", element: withSuspense(<NotFound />) },
  ]);
}

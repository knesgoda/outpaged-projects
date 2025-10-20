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

export function AppRoutes() {
  return useRoutes([
    {
      path: "/dashboard",
      element: withAppLayout(<AppLayout />),
      children: [
        { index: true, element: withSuspense(<HomePage />) },
        { path: "my-work", element: withSuspense(<MyWorkPage />) },
        { path: "boards", element: withSuspense(<BoardsPage />) },
        // { path: "calendar", element: withSuspense(<CalendarPage />) },
        { path: "timeline", element: withSuspense(<TimelinePage />) },
        { path: "inbox", element: withSuspense(<InboxRoute tab="all" />) },
        { path: "inbox/mentions", element: withSuspense(<InboxRoute tab="mentions" />) },
        { path: "inbox/assigned", element: withSuspense(<InboxRoute tab="assigned" />) },
        { path: "inbox/following", element: withSuspense(<InboxRoute tab="following" />) },
        { path: "inbox/due-soon", element: withSuspense(<InboxRoute tab="due-soon" />) },
        { path: "inbox/unread", element: withSuspense(<InboxRoute tab="unread" />) },
        { path: "projects", element: withSuspense(<Projects />) },
        { path: "projects/:projectId", element: withSuspense(<ProjectDetails />) },
        { path: "spaces/:spaceId", element: withSuspense(<SpaceOverviewPage />) },
        { path: "tasks", element: withSuspense(<TasksPage />) },
        { path: "tasks/:taskId", element: withSuspense(<TaskView />) },
        { path: "reports", element: withSuspense(<ReportsPage />) },
        { path: "documents", element: withSuspense(<DocumentsPage />) },
        {
          path: "docs",
          children: [
            { index: true, element: withSuspense(<DocsHome />) },
            { path: "new", element: withSuspense(<DocCreate />) },
            { path: ":docId", element: withSuspense(<DocDetail />) },
            { path: ":docId/edit", element: withSuspense(<DocEdit />) },
          ],
        },
        { path: "files", element: withSuspense(<FilesPage />) },
        {
          path: "time",
          element: withSuspense(<TimeHomePage />),
          children: [
            { index: true, element: <Navigate to="my" replace /> },
            { path: "my", element: withSuspense(<MyTimePage />) },
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
        { path: "__dev__/view-schema", element: withSuspense(<ViewSchemaPlayground />) },
        { path: "__mobile__/board-preview", element: withSuspense(<MobileBoardPreview />) },
        { path: "notifications", element: withSuspense(<NotificationsPage />) },
        { path: "profile", element: withSuspense(<ProfilePage />) },
        { path: "team", element: withSuspense(<TeamDirectoryPage />) },
        { path: "team/:memberId", element: withSuspense(<TeamMemberProfilePage />) },
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
            { path: "boards", element: withSuspense(<BoardGovernancePage />) },
            { path: "audit", element: withSuspense(<AuditLogsPage />) },
            { path: "data", element: withSuspense(<DataPage />) },
            { path: "webhooks", element: withSuspense(<WebhooksPage />) },
            { path: "api", element: withSuspense(<ApiExplorerPage />) },
            { path: "billing", element: withSuspense(<BillingPage />) },
          ],
        },
      ],
    },
    { path: "/", element: <Navigate to="/dashboard" replace /> },
    { path: "/login", element: withSuspense(<Login />) },
    { path: "/auth/callback", element: withSuspense(<AuthCallback />) },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: withSuspense(<Logout />) },
    { path: "/not-authorized", element: withSuspense(<NotAuthorizedPage />) },
    { path: "*", element: withSuspense(<NotFound />) },
  ]);
}

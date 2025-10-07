import { Suspense } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import HomePage from "@/pages/ia/HomePage";
import MyWorkPage from "@/pages/ia/MyWorkPage";
import { InboxPage } from "@/pages/inbox/InboxPage";
import { ProjectsListPage } from "@/pages/projects/ProjectsListPage";
import BoardsPage from "@/pages/ia/BoardsPage";
import CalendarPage from "@/pages/calendar/CalendarPage";
import TimelinePage from "@/pages/ia/TimelinePage";
import WorkloadPage from "@/pages/ia/WorkloadPage";
import DashboardsPage from "@/pages/ia/DashboardsPage";
import ReportsHome from "@/pages/reports/ReportsHome";
import ReportCreate from "@/pages/reports/ReportCreate";
import ReportDetail from "@/pages/reports/ReportDetail";
import ReportEdit from "@/pages/reports/ReportEdit";
import DocsHome from "@/pages/docs/DocsHome";
import DocCreate from "@/pages/docs/DocCreate";
import DocDetail from "@/pages/docs/DocDetail";
import DocEdit from "@/pages/docs/DocEdit";
import FilesPage from "@/pages/files/FilesPage";
import AutomationsPage from "@/pages/automations/AutomationsPage";
import AutomationDetailPage from "@/pages/automations/AutomationDetailPage";
import IntegrationsPage from "@/pages/integrations/IntegrationsPage";
import FormsPage from "@/pages/ia/FormsPage";
import GoalsPage from "@/pages/ia/GoalsPage";
import TemplatesPage from "@/pages/ia/TemplatesPage";
import PeoplePage from "@/pages/people/PeoplePage";
import ProfilePage from "@/pages/people/ProfilePage";
import TeamsPage from "@/pages/teams/TeamsPage";
import TeamDetailPage from "@/pages/teams/TeamDetailPage";
import TimeHomePage from "@/pages/time/TimeHomePage";
import MyTimePage from "@/pages/time/MyTimePage";
import ApprovalsPage from "@/pages/time/ApprovalsPage";
import ProjectPeoplePage from "@/pages/projects/ProjectPeoplePage";
import ProjectTeamsPage from "@/pages/projects/ProjectTeamsPage";
import ProjectTimePage from "@/pages/projects/ProjectTimePage";
 codex/implement-reports-and-docs-ui-and-backend
import PeoplePage from "@/pages/ia/PeoplePage";
import TimeTrackingPage from "@/pages/ia/TimeTrackingPage";
import HelpPage from "@/pages/ia/HelpPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminHome from "@/pages/admin/AdminHome";
import WorkspaceSettings from "@/pages/admin/WorkspaceSettings";
import MembersPage from "@/pages/admin/MembersPage";
import PermissionsPage from "@/pages/admin/PermissionsPage";
import SecurityPage from "@/pages/admin/SecurityPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import DataPage from "@/pages/admin/DataPage";
import WebhooksPage from "@/pages/admin/WebhooksPage";
import ApiExplorerPage from "@/pages/admin/ApiExplorerPage";
import BillingPage from "@/pages/admin/BillingPage";
import HelpHome from "@/pages/help/HelpHome";
import HelpSearchPage from "@/pages/help/HelpSearchPage";
import FAQPage from "@/pages/help/FAQPage";
import ShortcutsPage from "@/pages/help/ShortcutsPage";
import ChangelogPage from "@/pages/help/ChangelogPage";
import ContactSupportPage from "@/pages/help/ContactSupportPage";
import OnboardingPage from "@/pages/help/OnboardingPage";
import AdminHomePage from "@/pages/ia/admin/AdminHomePage";
import AdminWorkspacePage from "@/pages/ia/admin/AdminWorkspacePage";
import AdminPermissionsPage from "@/pages/ia/admin/AdminPermissionsPage";
import AdminSecurityPage from "@/pages/ia/admin/AdminSecurityPage";
import AdminAuditPage from "@/pages/ia/admin/AdminAuditPage";
import AdminDataPage from "@/pages/ia/admin/AdminDataPage";
import AdminWebhooksPage from "@/pages/ia/admin/AdminWebhooksPage";
import AdminApiPage from "@/pages/ia/admin/AdminApiPage";
import AdminBillingPage from "@/pages/ia/admin/AdminBillingPage";
codex/perform-code-audit-and-fix-for-projects-area
import { ProjectDetailPage } from "@/pages/projects/ProjectDetailPage";
import ProjectOverviewPage from "@/pages/ia/projects/ProjectOverviewPage";
import ProjectListPage from "@/pages/ia/projects/ProjectListPage";
import ProjectBoardPage from "@/pages/ia/projects/ProjectBoardPage";
import ProjectBacklogPage from "@/pages/ia/projects/ProjectBacklogPage";
import ProjectSprintsPage from "@/pages/ia/projects/ProjectSprintsPage";
import ProjectCalendarPage from "@/pages/ia/projects/ProjectCalendarPage";
import ProjectTimelinePage from "@/pages/ia/projects/ProjectTimelinePage";
import ProjectDependenciesPage from "@/pages/ia/projects/ProjectDependenciesPage";
import ProjectReportsPage from "@/pages/ia/projects/ProjectReportsPage";
import ProjectDocsHome from "@/pages/projects/ProjectDocsHome";
import ProjectDocCreate from "@/pages/projects/ProjectDocCreate";
import ProjectDocDetail from "@/pages/projects/ProjectDocDetail";
import ProjectDocEdit from "@/pages/projects/ProjectDocEdit";
import ProjectFilesPage from "@/pages/projects/ProjectFilesPage";
import ProjectIntegrationsPage from "@/pages/projects/ProjectIntegrationsPage";
import ProjectAutomationsPage from "@/pages/projects/ProjectAutomationsPage";
import ProjectSettingsPage from "@/pages/ia/projects/ProjectSettingsPage";
import NewProjectPage from "@/pages/ia/NewProjectPage";
import NewBoardPage from "@/pages/ia/NewBoardPage";
import NewTaskPage from "@/pages/ia/NewTaskPage";
import NewDashboardPage from "@/pages/ia/NewDashboardPage";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import { SettingsLayout } from "@/pages/settings/SettingsLayout";
import SettingsHome from "@/pages/settings/SettingsHome";
import ProfileSettings from "@/pages/settings/ProfileSettings";
import AccountSettings from "@/pages/settings/AccountSettings";
import SecuritySettings from "@/pages/settings/SecuritySettings";
import NotificationSettings from "@/pages/settings/NotificationSettings";
import AppearanceSettings from "@/pages/settings/AppearanceSettings";
import ConnectionsSettings from "@/pages/settings/ConnectionsSettings";
import SearchPage from "@/pages/Search";
import GlobalSearchPage from "@/pages/search/GlobalSearchPage";
import NotAuthorizedPage from "@/pages/NotAuthorized";
import { RequireAdmin } from "@/lib/auth"; codex/implement-reports-and-docs-ui-and-backend
import Settings from "@/pages/Settings";
import { NotificationSettingsPage } from "@/pages/settings/NotificationSettings";
import SearchPage from "@/pages/Search";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminHome from "@/pages/admin/AdminHome";
import WorkspaceSettings from "@/pages/admin/WorkspaceSettings";
import MembersPage from "@/pages/admin/MembersPage";
import PermissionsPage from "@/pages/admin/PermissionsPage";
import SecurityPage from "@/pages/admin/SecurityPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import DataPage from "@/pages/admin/DataPage";
import WebhooksPage from "@/pages/admin/WebhooksPage";
import ApiExplorerPage from "@/pages/admin/ApiExplorerPage";
import BillingPage from "@/pages/admin/BillingPage";
import { FEATURE_PEOPLE_TEAMS, FEATURE_TIME_TRACKING } from "@/lib/featureFlags";

const Suspended = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-6">Loading...</div>}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Suspense>
);

export function AppRoutes() {
  const children = [
    { index: true, element: <HomePage /> },
    { path: "my-work", element: <MyWorkPage /> },
    {
      path: "inbox",
      element: <InboxPage tab="all" />,
    },
    { path: "inbox/mentions", element: <InboxPage tab="mentions" /> },
    { path: "inbox/assigned", element: <InboxPage tab="assigned" /> },
    { path: "inbox/following", element: <InboxPage tab="following" /> },
    { path: "inbox/due-soon", element: <InboxPage tab="due-soon" /> },
    { path: "inbox/unread", element: <InboxPage tab="unread" /> },
codex/perform-code-audit-and-fix-for-projects-area
    { path: "projects", element: <ProjectsListPage /> },
    { path: "projects/:projectId", element: <ProjectDetailPage tab="overview" /> },
    { path: "projects/:projectId/overview", element: <ProjectDetailPage tab="overview" /> },
    { path: "projects/:projectId/list", element: <ProjectDetailPage tab="list" /> },
    { path: "projects/:projectId/board", element: <ProjectDetailPage tab="board" /> },
    { path: "projects/:projectId/backlog", element: <ProjectDetailPage tab="backlog" /> },
    { path: "projects/:projectId/sprints", element: <ProjectDetailPage tab="sprints" /> },
    { path: "projects/:projectId/calendar", element: <ProjectDetailPage tab="calendar" /> },
    { path: "projects/:projectId/timeline", element: <ProjectDetailPage tab="timeline" /> },
    { path: "projects/:projectId/dependencies", element: <ProjectDetailPage tab="dependencies" /> },
    { path: "projects/:projectId/reports", element: <ProjectDetailPage tab="reports" /> },
    { path: "projects/:projectId/docs", element: <ProjectDetailPage tab="docs" /> },
    { path: "projects/:projectId/files", element: <ProjectDetailPage tab="files" /> },
    { path: "projects/:projectId/automations", element: <ProjectDetailPage tab="automations" /> },
    { path: "projects/:projectId/settings", element: <ProjectDetailPage tab="settings" /> },
    { path: "projects", element: <ProjectsPage /> },
    { path: "projects/new", element: <NewProjectPage /> },
    { path: "projects/:projectId", element: <ProjectOverviewPage /> },
    { path: "projects/:projectId/overview", element: <ProjectOverviewPage /> },
    { path: "projects/:projectId/list", element: <ProjectListPage /> },
    { path: "projects/:projectId/board", element: <ProjectBoardPage /> },
    { path: "projects/:projectId/backlog", element: <ProjectBacklogPage /> },
    { path: "projects/:projectId/sprints", element: <ProjectSprintsPage /> },
    { path: "projects/:projectId/calendar", element: <ProjectCalendarPage /> },
    { path: "projects/:projectId/timeline", element: <ProjectTimelinePage /> },
    { path: "projects/:projectId/dependencies", element: <ProjectDependenciesPage /> },
    { path: "projects/:projectId/reports", element: <ProjectReportsPage /> },
    { path: "projects/:projectId/docs", element: <ProjectDocsHome /> },
    { path: "projects/:projectId/docs/new", element: <ProjectDocCreate /> },
    { path: "projects/:projectId/docs/:docId", element: <ProjectDocDetail /> },
    { path: "projects/:projectId/docs/:docId/edit", element: <ProjectDocEdit /> },
    { path: "projects/:projectId/files", element: <ProjectFilesPage /> },
    { path: "projects/:projectId/integrations", element: <ProjectIntegrationsPage /> },
    { path: "projects/:projectId/automations", element: <ProjectAutomationsPage /> },
    { path: "projects/:projectId/settings", element: <ProjectSettingsPage /> },
    { path: "boards", element: <BoardsPage /> },
    { path: "boards/new", element: <NewBoardPage /> },
    { path: "calendar", element: <CalendarPage /> },
    { path: "timeline", element: <TimelinePage /> },
    { path: "workload", element: <WorkloadPage /> },
    { path: "dashboards", element: <DashboardsPage /> },
    { path: "dashboards/new", element: <NewDashboardPage /> },
    { path: "reports", element: <ReportsHome /> },
    { path: "reports/new", element: <ReportCreate /> },
    { path: "reports/:reportId", element: <ReportDetail /> },
    { path: "reports/:reportId/edit", element: <ReportEdit /> },
    { path: "docs", element: <DocsHome /> },
    { path: "docs/new", element: <DocCreate /> },
    { path: "docs/:docId", element: <DocDetail /> },
    { path: "docs/:docId/edit", element: <DocEdit /> },
    { path: "files", element: <FilesPage /> },
    { path: "automations", element: <AutomationsPage /> },
    { path: "automations/:automationId", element: <AutomationDetailPage /> },
    { path: "integrations", element: <IntegrationsPage /> },
    { path: "forms", element: <FormsPage /> },
    { path: "goals", element: <GoalsPage /> },
    { path: "templates", element: <TemplatesPage /> },
    { path: "tasks/new", element: <NewTaskPage /> },
    { path: "profile", element: <Profile /> },
    { path: "search", element: <GlobalSearchPage /> },
    {
      path: "settings",
      element: <SettingsLayout />,
      children: [
        { index: true, element: <SettingsHome /> },
        { path: "profile", element: <ProfileSettings /> },
        { path: "account", element: <AccountSettings /> },
        { path: "security", element: <SecuritySettings /> },
        { path: "notifications", element: <NotificationSettings /> },
        { path: "appearance", element: <AppearanceSettings /> },
        { path: "connections", element: <ConnectionsSettings /> },
      ],
    },
    {
      path: "admin",
      element: (
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      ),
      children: [
        { index: true, element: <AdminHome /> },
        { path: "workspace", element: <WorkspaceSettings /> },
        { path: "members", element: <MembersPage /> },
        { path: "permissions", element: <PermissionsPage /> },
        { path: "security", element: <SecurityPage /> },
        { path: "audit", element: <AuditLogsPage /> },
        { path: "data", element: <DataPage /> },
        { path: "webhooks", element: <WebhooksPage /> },
        { path: "api", element: <ApiExplorerPage /> },
        { path: "billing", element: <BillingPage /> },
      ],
    },
    { path: "help", element: <HelpHome /> },
    { path: "help/search", element: <HelpSearchPage /> },
    { path: "help/faq", element: <FAQPage /> },
    { path: "help/shortcuts", element: <ShortcutsPage /> },
    { path: "help/changelog", element: <ChangelogPage /> },
    { path: "help/contact", element: <ContactSupportPage /> },
    { path: "help/onboarding", element: <OnboardingPage /> },
  ];

  if (FEATURE_PEOPLE_TEAMS) {
    children.push(
      { path: "people", element: <PeoplePage /> },
      { path: "people/:userId", element: <ProfilePage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "teams/:teamId", element: <TeamDetailPage /> },
      { path: "projects/:projectId/people", element: <ProjectPeoplePage /> },
      { path: "projects/:projectId/teams", element: <ProjectTeamsPage /> }
    );
  }

  if (FEATURE_TIME_TRACKING) {
    children.push(
      {
        path: "time",
        element: <TimeHomePage />,
        children: [
          { index: true, element: <MyTimePage /> },
          { path: "my", element: <MyTimePage /> },
          { path: "approvals", element: <ApprovalsPage /> },
        ],
      },
      { path: "projects/:projectId/time", element: <ProjectTimePage /> }
    );
  }

  return useRoutes([
    {
      path: "/",
      element: (
        <Suspended>
          <AppLayout />
        </Suspended>
      ),
codex/implement-reports-and-docs-ui-and-backend
      children: [
        { index: true, element: <HomePage /> },
        { path: "my-work", element: <MyWorkPage /> },
        {
          path: "inbox",
          element: <InboxPage tab="all" />,
        },
        { path: "inbox/mentions", element: <InboxPage tab="mentions" /> },
        { path: "inbox/assigned", element: <InboxPage tab="assigned" /> },
        { path: "inbox/following", element: <InboxPage tab="following" /> },
        { path: "inbox/due-soon", element: <InboxPage tab="due-soon" /> },
        { path: "inbox/unread", element: <InboxPage tab="unread" /> },
        { path: "projects", element: <ProjectsPage /> },
        { path: "projects/new", element: <NewProjectPage /> },
        // Canonicalize on :projectId and keep *all* project routes
        { path: "projects/:projectId", element: <ProjectOverviewPage /> },
        { path: "projects/:projectId/overview", element: <ProjectOverviewPage /> },
        { path: "projects/:projectId/list", element: <ProjectListPage /> },
        { path: "projects/:projectId/board", element: <ProjectBoardPage /> },
        { path: "projects/:projectId/backlog", element: <ProjectBacklogPage /> },
        { path: "projects/:projectId/sprints", element: <ProjectSprintsPage /> },
        { path: "projects/:projectId/calendar", element: <ProjectCalendarPage /> },
        { path: "projects/:projectId/timeline", element: <ProjectTimelinePage /> },
        { path: "projects/:projectId/dependencies", element: <ProjectDependenciesPage /> },
        { path: "projects/:projectId/reports", element: <ProjectReportsPage /> },
        { path: "projects/:projectId/docs", element: <ProjectDocsHome /> },
        { path: "projects/:projectId/docs/new", element: <ProjectDocCreate /> },
        { path: "projects/:projectId/docs/:docId", element: <ProjectDocDetail /> },
        { path: "projects/:projectId/docs/:docId/edit", element: <ProjectDocEdit /> },
        { path: "projects/:projectId/files", element: <ProjectFilesPage /> },
        { path: "projects/:projectId/integrations", element: <ProjectIntegrationsPage /> },
        { path: "projects/:projectId/automations", element: <ProjectAutomationsPage /> },
        { path: "projects/:projectId/settings", element: <ProjectSettingsPage /> },
        { path: "boards", element: <BoardsPage /> },
        { path: "boards/new", element: <NewBoardPage /> },
        { path: "calendar", element: <CalendarPage /> },
        { path: "timeline", element: <TimelinePage /> },
        { path: "workload", element: <WorkloadPage /> },
        { path: "dashboards", element: <DashboardsPage /> },
        { path: "dashboards/new", element: <NewDashboardPage /> },
        { path: "reports", element: <ReportsHome /> },
        { path: "reports/new", element: <ReportCreate /> },
        { path: "reports/:reportId", element: <ReportDetail /> },
        { path: "reports/:reportId/edit", element: <ReportEdit /> },
        { path: "docs", element: <DocsHome /> },
        { path: "docs/new", element: <DocCreate /> },
        { path: "docs/:docId", element: <DocDetail /> },
        { path: "docs/:docId/edit", element: <DocEdit /> },
        { path: "files", element: <FilesPage /> },
        { path: "automations", element: <AutomationsPage /> },
        { path: "integrations", element: <IntegrationsPage /> },
        { path: "projects/:projectId/integrations", element: <ProjectIntegrationsPage /> },
        { path: "forms", element: <FormsPage /> },
        { path: "goals", element: <GoalsPage /> },
        { path: "templates", element: <TemplatesPage /> },
        { path: "people", element: <PeoplePage /> },
        { path: "time", element: <TimeTrackingPage /> },
        { path: "tasks/new", element: <NewTaskPage /> },
        { path: "profile", element: <Profile /> },
        {
          path: "settings",
          element: <SettingsLayout />,
          children: [
            { index: true, element: <SettingsHome /> },
            { path: "profile", element: <ProfileSettings /> },
            { path: "account", element: <AccountSettings /> },
            { path: "security", element: <SecuritySettings /> },
            { path: "notifications", element: <NotificationSettings /> },
            { path: "appearance", element: <AppearanceSettings /> },
            { path: "connections", element: <ConnectionsSettings /> },
          ],
        },
        { path: "search", element: <SearchPage /> },
        {
          path: "admin",
          element: (
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          ),
          children: [
            { index: true, element: <AdminHome /> },
            { path: "workspace", element: <WorkspaceSettings /> },
            { path: "members", element: <MembersPage /> },
            { path: "permissions", element: <PermissionsPage /> },
            { path: "security", element: <SecurityPage /> },
            { path: "audit", element: <AuditLogsPage /> },
            { path: "data", element: <DataPage /> },
            { path: "webhooks", element: <WebhooksPage /> },
            { path: "api", element: <ApiExplorerPage /> },
            { path: "billing", element: <BillingPage /> },
          ],
        },
        { path: "help", element: <HelpPage /> },
        { path: "settings", element: <Settings /> },
        { path: "settings/notifications", element: <NotificationSettingsPage /> },
        { path: "search", element: <SearchPage /> },
        { path: "search", element: <GlobalSearchPage /> },
        { path: "admin", element: <AdminHomePage /> },
        { path: "admin/workspace", element: <AdminWorkspacePage /> },
        { path: "admin/permissions", element: <AdminPermissionsPage /> },
        { path: "admin/security", element: <AdminSecurityPage /> },
        { path: "admin/audit", element: <AdminAuditPage /> },
        { path: "admin/data", element: <AdminDataPage /> },
        { path: "admin/webhooks", element: <AdminWebhooksPage /> },
        { path: "admin/api", element: <AdminApiPage /> },
        { path: "admin/billing", element: <AdminBillingPage /> },
        { path: "help", element: <HelpHome /> },
        { path: "help/search", element: <HelpSearchPage /> },
        { path: "help/faq", element: <FAQPage /> },
        { path: "help/shortcuts", element: <ShortcutsPage /> },
        { path: "help/changelog", element: <ChangelogPage /> },
        { path: "help/contact", element: <ContactSupportPage /> },
        { path: "help/onboarding", element: <OnboardingPage /> },
      ],
      children,
    },
    { path: "/login", element: <Login /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: <Navigate to="/login" replace /> },
    { path: "/not-authorized", element: <NotAuthorizedPage /> },
    { path: "*", element: <NotFound /> },
  ]);
}

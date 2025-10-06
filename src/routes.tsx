import { Suspense } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import HomePage from "@/pages/ia/HomePage";
import MyWorkPage from "@/pages/ia/MyWorkPage";
import InboxPage from "@/pages/ia/InboxPage";
import ProjectsPage from "@/pages/ia/ProjectsPage";
import BoardsPage from "@/pages/ia/BoardsPage";
import CalendarPage from "@/pages/calendar/CalendarPage";
import TimelinePage from "@/pages/ia/TimelinePage";
import WorkloadPage from "@/pages/ia/WorkloadPage";
import DashboardsPage from "@/pages/ia/DashboardsPage";
import ReportsPage from "@/pages/ia/ReportsPage";
import DocsPage from "@/pages/ia/DocsPage";
import FilesPage from "@/pages/ia/FilesPage";
import AutomationsPage from "@/pages/ia/AutomationsPage";
import IntegrationsPage from "@/pages/ia/IntegrationsPage";
import FormsPage from "@/pages/ia/FormsPage";
import GoalsPage from "@/pages/ia/GoalsPage";
import TemplatesPage from "@/pages/ia/TemplatesPage";
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
import ProjectOverviewPage from "@/pages/ia/projects/ProjectOverviewPage";
import ProjectListPage from "@/pages/ia/projects/ProjectListPage";
import ProjectBoardPage from "@/pages/ia/projects/ProjectBoardPage";
import ProjectBacklogPage from "@/pages/ia/projects/ProjectBacklogPage";
import ProjectSprintsPage from "@/pages/ia/projects/ProjectSprintsPage";
import ProjectCalendarPage from "@/pages/ia/projects/ProjectCalendarPage";
import ProjectTimelinePage from "@/pages/ia/projects/ProjectTimelinePage";
import ProjectDependenciesPage from "@/pages/ia/projects/ProjectDependenciesPage";
import ProjectReportsPage from "@/pages/ia/projects/ProjectReportsPage";
import ProjectDocsPage from "@/pages/ia/projects/ProjectDocsPage";
import ProjectFilesPage from "@/pages/ia/projects/ProjectFilesPage";
import ProjectAutomationsPage from "@/pages/ia/projects/ProjectAutomationsPage";
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
import NotAuthorizedPage from "@/pages/NotAuthorized";
import { RequireAdmin } from "@/lib/auth";

const Suspended = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-6">Loading...</div>}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Suspense>
);

export function AppRoutes() {
  return useRoutes([
    {
      path: "/",
      element: (
        <Suspended>
          <AppLayout />
        </Suspended>
      ),
      children: [
        { index: true, element: <HomePage /> },
        { path: "my-work", element: <MyWorkPage /> },
        { path: "inbox", element: <InboxPage /> },
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
        { path: "projects/:projectId/docs", element: <ProjectDocsPage /> },
        { path: "projects/:projectId/files", element: <ProjectFilesPage /> },
        { path: "projects/:projectId/automations", element: <ProjectAutomationsPage /> },
        { path: "projects/:projectId/settings", element: <ProjectSettingsPage /> },
        { path: "boards", element: <BoardsPage /> },
        { path: "boards/new", element: <NewBoardPage /> },
        { path: "calendar", element: <CalendarPage /> },
        { path: "timeline", element: <TimelinePage /> },
        { path: "workload", element: <WorkloadPage /> },
        { path: "dashboards", element: <DashboardsPage /> },
        { path: "dashboards/new", element: <NewDashboardPage /> },
        { path: "reports", element: <ReportsPage /> },
        { path: "docs", element: <DocsPage /> },
        { path: "files", element: <FilesPage /> },
        { path: "automations", element: <AutomationsPage /> },
        { path: "integrations", element: <IntegrationsPage /> },
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
      ],
    },
    { path: "/login", element: <Login /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: <Navigate to="/login" replace /> },
    { path: "/not-authorized", element: <NotAuthorizedPage /> },
    { path: "*", element: <NotFound /> },
  ]);
}

import { Suspense } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import HomePage from "@/pages/ia/HomePage";
import MyWorkPage from "@/pages/ia/MyWorkPage";
import InboxPage from "@/pages/ia/InboxPage";
import ProjectsPage from "@/pages/ia/ProjectsPage";
import BoardsPage from "@/pages/ia/BoardsPage";
import CalendarPage from "@/pages/ia/CalendarPage";
import TimelinePage from "@/pages/ia/TimelinePage";
import WorkloadPage from "@/pages/ia/WorkloadPage";
import DashboardsPage from "@/pages/ia/DashboardsPage";
import ReportsHome from "@/pages/reports/ReportsHome";
import ReportCreate from "@/pages/reports/ReportCreate";
import ReportDetail from "@/pages/reports/ReportDetail";
import ReportEdit from "@/pages/reports/ReportEdit";
import DocsPage from "@/pages/ia/DocsPage";
import FilesPage from "@/pages/files/FilesPage";
import AutomationsPage from "@/pages/automations/AutomationsPage";
import AutomationDetailPage from "@/pages/automations/AutomationDetailPage";
import IntegrationsPage from "@/pages/ia/IntegrationsPage";
import FormsPage from "@/pages/ia/FormsPage";
import GoalsPage from "@/pages/ia/GoalsPage";
import TemplatesPage from "@/pages/ia/TemplatesPage";
import PeoplePage from "@/pages/ia/PeoplePage";
import TimeTrackingPage from "@/pages/ia/TimeTrackingPage";
import HelpPage from "@/pages/ia/HelpPage";
import AdminHomePage from "@/pages/ia/admin/AdminHomePage";
import AdminWorkspacePage from "@/pages/ia/admin/AdminWorkspacePage";
import AdminPermissionsPage from "@/pages/ia/admin/AdminPermissionsPage";
import AdminSecurityPage from "@/pages/ia/admin/AdminSecurityPage";
import AdminAuditPage from "@/pages/ia/admin/AdminAuditPage";
import AdminDataPage from "@/pages/ia/admin/AdminDataPage";
import AdminWebhooksPage from "@/pages/ia/admin/AdminWebhooksPage";
import AdminApiPage from "@/pages/ia/admin/AdminApiPage";
import AdminBillingPage from "@/pages/ia/admin/AdminBillingPage";
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
import ProjectFilesPage from "@/pages/projects/ProjectFilesPage";
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
import Settings from "@/pages/Settings";
import SearchPage from "@/pages/Search";

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
        { path: "projects/:id", element: <ProjectOverviewPage /> },
        { path: "projects/:id/overview", element: <ProjectOverviewPage /> },
        { path: "projects/:id/list", element: <ProjectListPage /> },
        { path: "projects/:id/board", element: <ProjectBoardPage /> },
        { path: "projects/:id/backlog", element: <ProjectBacklogPage /> },
        { path: "projects/:id/sprints", element: <ProjectSprintsPage /> },
        { path: "projects/:id/calendar", element: <ProjectCalendarPage /> },
        { path: "projects/:id/timeline", element: <ProjectTimelinePage /> },
        { path: "projects/:id/dependencies", element: <ProjectDependenciesPage /> },
        { path: "projects/:id/reports", element: <ProjectReportsPage /> },
        { path: "projects/:id/docs", element: <ProjectDocsPage /> },
        { path: "projects/:projectId/files", element: <ProjectFilesPage /> },
        { path: "projects/:projectId/automations", element: <ProjectAutomationsPage /> },
        { path: "projects/:id/settings", element: <ProjectSettingsPage /> },
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
        { path: "docs", element: <DocsPage /> },
        { path: "files", element: <FilesPage /> },
        { path: "automations", element: <AutomationsPage /> },
        { path: "automations/new", element: <AutomationDetailPage /> },
        { path: "automations/:automationId", element: <AutomationDetailPage /> },
        { path: "integrations", element: <IntegrationsPage /> },
        { path: "forms", element: <FormsPage /> },
        { path: "goals", element: <GoalsPage /> },
        { path: "templates", element: <TemplatesPage /> },
        { path: "people", element: <PeoplePage /> },
        { path: "time", element: <TimeTrackingPage /> },
        { path: "tasks/new", element: <NewTaskPage /> },
        { path: "profile", element: <Profile /> },
        { path: "settings", element: <Settings /> },
        { path: "search", element: <SearchPage /> },
        { path: "admin", element: <AdminHomePage /> },
        { path: "admin/workspace", element: <AdminWorkspacePage /> },
        { path: "admin/permissions", element: <AdminPermissionsPage /> },
        { path: "admin/security", element: <AdminSecurityPage /> },
        { path: "admin/audit", element: <AdminAuditPage /> },
        { path: "admin/data", element: <AdminDataPage /> },
        { path: "admin/webhooks", element: <AdminWebhooksPage /> },
        { path: "admin/api", element: <AdminApiPage /> },
        { path: "admin/billing", element: <AdminBillingPage /> },
        { path: "help", element: <HelpPage /> },
      ],
    },
    { path: "/login", element: <Login /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: <Navigate to="/login" replace /> },
    { path: "*", element: <NotFound /> },
  ]);
}

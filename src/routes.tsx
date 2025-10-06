import { Suspense } from "react";
import { Navigate, useParams, useRoutes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import HomePage from "@/pages/ia/HomePage";
import MyWorkPage from "@/pages/ia/MyWorkPage";
import InboxPage from "@/pages/ia/InboxPage";
import ProjectsListPage from "@/pages/projects/ProjectsListPage";
import BoardsPage from "@/pages/ia/BoardsPage";
import CalendarPage from "@/pages/ia/CalendarPage";
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
import AdminHomePage from "@/pages/ia/admin/AdminHomePage";
import AdminWorkspacePage from "@/pages/ia/admin/AdminWorkspacePage";
import AdminPermissionsPage from "@/pages/ia/admin/AdminPermissionsPage";
import AdminSecurityPage from "@/pages/ia/admin/AdminSecurityPage";
import AdminAuditPage from "@/pages/ia/admin/AdminAuditPage";
import AdminDataPage from "@/pages/ia/admin/AdminDataPage";
import AdminWebhooksPage from "@/pages/ia/admin/AdminWebhooksPage";
import AdminApiPage from "@/pages/ia/admin/AdminApiPage";
import AdminBillingPage from "@/pages/ia/admin/AdminBillingPage";
import NewBoardPage from "@/pages/ia/NewBoardPage";
import NewTaskPage from "@/pages/ia/NewTaskPage";
import NewDashboardPage from "@/pages/ia/NewDashboardPage";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import SearchPage from "@/pages/Search";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import { PROJECT_TABS } from "@/pages/projects/projectTabs";

const Suspended = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-6">Loading...</div>}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Suspense>
);

const LegacyProjectRouteRedirect = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  return <Navigate to={projectId ? `/projects/${projectId}` : "/projects"} replace />;
};

export function AppRoutes() {
  const OverviewComponent = PROJECT_TABS[0]?.Component;
  const projectTabChildren = [
    ...(OverviewComponent ? [{ index: true, element: <OverviewComponent /> }] : []),
    ...PROJECT_TABS.map((tab) => {
      const TabComponent = tab.Component;
      return { path: tab.path, element: <TabComponent /> };
    }),
  ];

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
        { path: "projects", element: <ProjectsListPage /> },
        {
          path: "projects/:projectId",
          element: <ProjectDetailPage />,
          children: projectTabChildren,
        },
        { path: "dashboard/projects", element: <Navigate to="/projects" replace /> },
        { path: "dashboard/projects/:projectId", element: <LegacyProjectRouteRedirect /> },
        { path: "dashboard/projects/:projectId/*", element: <LegacyProjectRouteRedirect /> },
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

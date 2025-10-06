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
import IntegrationsHome from "@/pages/integrations/IntegrationsHome";
import GoogleIntegrationsPage from "@/pages/integrations/GoogleIntegrationsPage";
import GitHubIntegrationsPage from "@/pages/integrations/GitHubIntegrationsPage";
import ProjectIntegrationsPage from "@/pages/integrations/ProjectIntegrationsPage";
import ProjectGoogleIntegrationsPage from "@/pages/integrations/ProjectGoogleIntegrationsPage";
import ProjectGitHubIntegrationsPage from "@/pages/integrations/ProjectGitHubIntegrationsPage";
import FormsPage from "@/pages/ia/FormsPage";
import GoalsPage from "@/pages/ia/GoalsPage";
import TemplatesPage from "@/pages/ia/TemplatesPage";
import PeoplePage from "@/pages/ia/PeoplePage";
import TimeTrackingPage from "@/pages/ia/TimeTrackingPage";
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
import ProjectIntegrationsPage from "@/pages/ia/projects/ProjectIntegrationsPage";
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
import Settings from "@/pages/Settings";
import GlobalSearchPage from "@/pages/search/GlobalSearchPage";

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
        { path: "projects/:projectId/docs", element: <ProjectDocsPage /> },
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
        { path: "reports", element: <ReportsPage /> },
        { path: "docs", element: <DocsPage /> },
        { path: "files", element: <FilesPage /> },
        { path: "automations", element: <AutomationsPage /> },
        { path: "integrations", element: <IntegrationsHome /> },
        { path: "integrations/google", element: <GoogleIntegrationsPage /> },
        { path: "integrations/github", element: <GitHubIntegrationsPage /> },
        { path: "projects/:projectId/integrations", element: <ProjectIntegrationsPage /> },
        {
          path: "projects/:projectId/integrations/google",
          element: <ProjectGoogleIntegrationsPage />,
        },
        {
          path: "projects/:projectId/integrations/github",
          element: <ProjectGitHubIntegrationsPage />,
        },
        { path: "forms", element: <FormsPage /> },
        { path: "goals", element: <GoalsPage /> },
        { path: "templates", element: <TemplatesPage /> },
        { path: "people", element: <PeoplePage /> },
        { path: "time", element: <TimeTrackingPage /> },
        { path: "tasks/new", element: <NewTaskPage /> },
        { path: "profile", element: <Profile /> },
        { path: "settings", element: <Settings /> },
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
    },
    { path: "/login", element: <Login /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    { path: "/auth", element: <Navigate to="/login" replace /> },
    { path: "/logout", element: <Navigate to="/login" replace /> },
    { path: "*", element: <NotFound /> },
  ]);
}

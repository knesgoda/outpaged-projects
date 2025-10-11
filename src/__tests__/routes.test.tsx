import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";

import { AppRoutes } from "@/routes";

jest.mock("@/components/layout/AppLayout", () => {
  const React = require("react");
  const { Outlet } = require("react-router-dom");

  const MockLayout = () => (
    <div data-testid="app-layout">
      <Outlet />
    </div>
  );

  return { __esModule: true, AppLayout: MockLayout };
});

jest.mock("@/pages/inbox/InboxPage", () => ({
  __esModule: true,
  InboxPage: () => <div>Inbox Page</div>,
}));
jest.mock("@/pages/ia/HomePage", () => ({ __esModule: true, default: () => <div>Home Page</div> }));
jest.mock("@/pages/ia/MyWorkPage", () => ({ __esModule: true, default: () => <div>My Work Page</div> }));
jest.mock("@/pages/Projects", () => ({ __esModule: true, default: () => <div>Projects Page</div> }));
jest.mock("@/pages/ProjectDetails", () => ({ __esModule: true, default: () => <div>Project Details Page</div> }));
jest.mock("@/pages/Tasks", () => ({ __esModule: true, default: () => <div>Tasks Page</div> }));
jest.mock("@/pages/Reports", () => ({ __esModule: true, default: () => <div>Reports Page</div> }));
jest.mock("@/pages/Documents", () => ({ __esModule: true, default: () => <div>Documents Page</div> }));

jest.mock("@/pages/BoardsPage", () => ({ __esModule: true, default: () => <div>Boards Page</div> }));
jest.mock("@/pages/calendar/CalendarPage", () => ({ __esModule: true, default: () => <div>Calendar Page</div> }));
jest.mock("@/pages/ia/TimelinePage", () => ({ __esModule: true, default: () => <div>Timeline Page</div> }));
jest.mock("@/pages/docs/DocsHome", () => ({ __esModule: true, default: () => <div>Docs Home Page</div> }));
jest.mock("@/pages/docs/DocCreate", () => ({ __esModule: true, default: () => <div>Doc Create Page</div> }));
jest.mock("@/pages/docs/DocDetail", () => ({ __esModule: true, default: () => <div>Doc Detail Page</div> }));
jest.mock("@/pages/docs/DocEdit", () => ({ __esModule: true, default: () => <div>Doc Edit Page</div> }));
jest.mock("@/pages/time/TimeHomePage", () => {
  const React = require("react");
  const { Outlet } = require("react-router-dom");

  const TimeHomeMock = () => (
    <div>
      <div>Time Home Layout</div>
      <Outlet />
    </div>
  );

  return { __esModule: true, default: TimeHomeMock };
});
jest.mock("@/pages/time/MyTimePage", () => ({ __esModule: true, default: () => <div>My Time Page</div> }));
jest.mock("@/pages/time/ApprovalsPage", () => ({ __esModule: true, default: () => <div>Approvals Page</div> }));
jest.mock("@/pages/help/HelpHome", () => ({ __esModule: true, default: () => <div>Help Home Page</div> }));
jest.mock("@/pages/help/FAQPage", () => ({ __esModule: true, default: () => <div>FAQ Page</div> }));
jest.mock("@/pages/help/ShortcutsPage", () => ({ __esModule: true, default: () => <div>Shortcuts Page</div> }));
jest.mock("@/pages/help/ChangelogPage", () => ({ __esModule: true, default: () => <div>Changelog Page</div> }));
jest.mock("@/pages/help/ContactSupportPage", () => ({ __esModule: true, default: () => <div>Contact Page</div> }));
jest.mock("@/pages/help/HelpSearchPage", () => ({ __esModule: true, default: () => <div>Help Search Page</div> }));
jest.mock("@/pages/help/OnboardingPage", () => ({ __esModule: true, default: () => <div>Onboarding Page</div> }));
jest.mock("@/pages/files/FilesPage", () => ({ __esModule: true, default: () => <div>Files Page</div> }));
jest.mock("@/pages/Notifications", () => ({ __esModule: true, default: () => <div>Notifications Page</div> }));
jest.mock("@/pages/Profile", () => ({ __esModule: true, default: () => <div>Profile Page</div> }));
jest.mock("@/pages/TeamDirectory", () => ({ __esModule: true, default: () => <div>Team Directory Page</div> }));
jest.mock("@/pages/TeamMemberProfile", () => ({ __esModule: true, default: () => <div>Team Member Profile Page</div> }));
jest.mock("@/pages/Login", () => ({ __esModule: true, default: () => <div>Login Page</div> }));
jest.mock("@/pages/AuthCallback", () => ({ __esModule: true, default: () => <div>Auth Callback Page</div> }));
jest.mock("@/pages/NotAuthorized", () => ({ __esModule: true, default: () => <div>Not Authorized Page</div> }));
jest.mock("@/pages/NotFound", () => ({ __esModule: true, default: () => <div>Not Found Page</div> }));

const renderPath = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );

describe("AppRoutes", () => {
  it.each([
    ["/boards", "Boards Page"],
    ["/calendar", "Calendar Page"],
    ["/timeline", "Timeline Page"],
    ["/docs", "Docs Home Page"],
    ["/docs/new", "Doc Create Page"],
    ["/docs/doc-123", "Doc Detail Page"],
    ["/docs/doc-123/edit", "Doc Edit Page"],
    ["/time", "My Time Page"],
    ["/time/my", "My Time Page"],
    ["/time/approvals", "Approvals Page"],
    ["/help", "Help Home Page"],
    ["/help/faq", "FAQ Page"],
    ["/help/shortcuts", "Shortcuts Page"],
    ["/help/changelog", "Changelog Page"],
    ["/help/contact", "Contact Page"],
    ["/help/search", "Help Search Page"],
    ["/help/onboarding", "Onboarding Page"],
  ])("renders %s without hitting the 404 page", async (path, expectedText) => {
    renderPath(path);

    expect(await screen.findByText(expectedText)).toBeInTheDocument();
    expect(screen.queryByText(/Oops! Page not found/i)).not.toBeInTheDocument();
  });
});

import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { MobileTopbar } from "../MobileTopbar";

const signOutMock = jest.fn();
const navigateMock = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      email: "user@example.com",
      full_name: "Test User",
    },
    signOut: signOutMock,
  }),
}));

jest.mock("@/components/command/useCommandK", () => ({
  useCommandK: () => ({
    openPalette: jest.fn(),
  }),
}));

jest.mock("@/hooks/useConnectivityStatus", () => ({
  useConnectivityStatus: () => ({ state: "online" }),
}));

jest.mock("@/services/offline/opqlIndex", () => ({
  executeOfflineQuery: jest.fn(),
}));

describe("MobileTopbar", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    navigateMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
  });

  const renderComponent = (props: Partial<ComponentProps<typeof MobileTopbar>> = {}) =>
    render(
      <MemoryRouter>
        <MobileTopbar {...props} />
      </MemoryRouter>
    );

  it("opens the account menu when the avatar is pressed", async () => {
    renderComponent();

    const trigger = await screen.findByTestId("mobile-account-menu-trigger");
    await userEvent.setup().click(trigger);

    expect(await screen.findByText("Profile")).toBeInTheDocument();
  });

  it("navigates to the profile page when the profile item is selected", async () => {
    const onNavigate = jest.fn();
    renderComponent({ onNavigate });

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("mobile-account-menu-trigger"));

    const profileItem = await screen.findByText("Profile");
    await user.click(profileItem);

    expect(navigateMock).toHaveBeenCalledWith("/profile");
    expect(onNavigate).toHaveBeenCalled();
  });

  it("calls signOut and redirects to the login page", async () => {
    renderComponent();

    const user = userEvent.setup();
    await user.click(await screen.findByTestId("mobile-account-menu-trigger"));

    const signOutItem = await screen.findByText("Sign out");
    await user.click(signOutItem);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
    });
  });
});

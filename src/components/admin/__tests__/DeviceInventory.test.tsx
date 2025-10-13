import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DeviceInventory } from "../DeviceInventory";

jest.mock("@/services/admin/deviceInventory", () => ({
  fetchDeviceSessions: jest.fn(),
  triggerRemoteWipe: jest.fn(),
}));

const { fetchDeviceSessions, triggerRemoteWipe } = jest.requireMock("@/services/admin/deviceInventory");

describe("DeviceInventory", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (window as unknown as { confirm: jest.Mock }).confirm = jest.fn().mockReturnValue(true);
  });

  it("renders device sessions from the backend", async () => {
    fetchDeviceSessions.mockResolvedValue([
      {
        id: "device-1",
        user_id: "user-1",
        user_email: "user@example.com",
        device_type: "desktop",
        browser: "Chrome",
        last_seen_at: "2024-06-01T12:00:00Z",
        sw_version: "1.2.3",
      },
    ]);

    render(<DeviceInventory />);

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Chrome"))).toBeInTheDocument();
    await waitFor(() => expect(fetchDeviceSessions).toHaveBeenCalled());
  });

  it("triggers a remote wipe for a device", async () => {
    fetchDeviceSessions
      .mockResolvedValueOnce([
        {
          id: "device-2",
          user_id: "user-2",
          user_email: "owner@example.com",
          device_type: "mobile",
          browser: "Safari",
          last_seen_at: "2024-06-01T12:00:00Z",
          sw_version: "2.0.0",
        },
      ])
      .mockResolvedValueOnce([]);
    triggerRemoteWipe.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<DeviceInventory />);

    const wipeButton = await screen.findByRole("button", { name: /remote wipe/i });
    await user.click(wipeButton);

    await waitFor(() => {
      expect(triggerRemoteWipe).toHaveBeenCalledWith("device-2");
    });
  });
});

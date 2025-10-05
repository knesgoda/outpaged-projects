import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";

import { ProfileProvider, type ProfileContextValue, useProfile } from "../profile";
import { getMyProfile } from "@/lib/profile";

jest.mock("@/lib/profile", () => ({
  getMyProfile: jest.fn(),
}));

const mockedGetMyProfile = getMyProfile as jest.MockedFunction<typeof getMyProfile>;

function TestConsumer({ onValue }: { onValue: (value: ProfileContextValue) => void }) {
  const value = useProfile();

  useEffect(() => {
    onValue(value);
  }, [value, onValue]);

  return null;
}

describe("ProfileProvider.refresh", () => {
  beforeEach(() => {
    mockedGetMyProfile.mockReset();
  });

  it("swallows profile refresh errors and leaves profile null", async () => {
    const error = new Error("boom");
    mockedGetMyProfile.mockRejectedValue(error);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    let latestValue: ProfileContextValue | undefined;

    render(
      <ProfileProvider>
        <TestConsumer onValue={(value) => {
          latestValue = value;
        }} />
      </ProfileProvider>
    );

    await waitFor(() => {
      expect(latestValue).toBeDefined();
      expect(latestValue?.loading).toBe(false);
    });

    expect(latestValue?.error).toBe(error);
    expect(latestValue?.profile).toBeNull();

    const refresh = latestValue!.refresh;

    await act(async () => {
      await expect(refresh()).resolves.toBeUndefined();
    });

    expect(latestValue?.profile).toBeNull();
    expect(latestValue?.error).toBe(error);
    expect(mockedGetMyProfile).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });
});

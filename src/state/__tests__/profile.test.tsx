import { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { ProfileProvider, useProfileState } from "../profile";
import { getMyProfile } from "@/services/profile";

jest.mock("@/services/profile", () => ({
  getMyProfile: jest.fn(),
}));

describe("ProfileProvider", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProfileProvider>{children}</ProfileProvider>
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("swallows Supabase failures when refreshing", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const mockGetMyProfile = getMyProfile as jest.MockedFunction<typeof getMyProfile>;

    mockGetMyProfile.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useProfileState(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);

    mockGetMyProfile.mockRejectedValue(new Error("still down"));

    await act(async () => {
      await expect(result.current.refresh()).resolves.toBeUndefined();
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.error?.message).toBe("still down");
    expect(result.current.loading).toBe(false);

    consoleSpy.mockRestore();
  });
});

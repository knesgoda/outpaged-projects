import { describe, expect, it } from "@jest/globals";
import { homeReducer } from "@/features/home/store";
import {
  DEFAULT_WORKSPACE_HOME,
  createDefaultUserHome,
  createInitialHomeState,
} from "@/features/home/defaults";

const BASE_STATE = createInitialHomeState(DEFAULT_WORKSPACE_HOME);

describe("homeReducer", () => {
  it("updates the active page", () => {
    const next = homeReducer(BASE_STATE, {
      type: "setActivePage",
      pageId: "home-default",
    });

    expect(next.userHome.preferences.activePageId).toBe("home-default");
  });

  it("upserts a user page", () => {
    const page = {
      ...BASE_STATE.userHome.pages[0],
      id: "custom-page",
      name: "Custom",
    };

    const afterAdd = homeReducer(BASE_STATE, {
      type: "upsertUserPage",
      page,
    });

    expect(afterAdd.userHome.pages.some((p) => p.id === "custom-page")).toBe(true);

    const updatedPage = { ...page, name: "Custom updated" };
    const afterUpdate = homeReducer(afterAdd, {
      type: "upsertUserPage",
      page: updatedPage,
    });

    expect(afterUpdate.userHome.pages.find((p) => p.id === "custom-page")?.name).toBe(
      "Custom updated",
    );
  });

  it("resets to workspace defaults", () => {
    const mutated = {
      ...BASE_STATE,
      userHome: {
        ...BASE_STATE.userHome,
        pages: [],
      },
    };

    const reset = homeReducer(mutated, { type: "resetUserHome" });
    const defaultUserState = createDefaultUserHome(DEFAULT_WORKSPACE_HOME);

    expect(reset.userHome.pages).toEqual(defaultUserState.pages);
    expect(reset.userHome.preferences).toEqual(defaultUserState.preferences);
  });
});

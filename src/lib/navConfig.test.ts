import { describe, expect, it } from "@jest/globals";
import { NAV, getNavForRole } from "./navConfig";

const TOP_LEVEL_IDS = [
  "home",
  "my-work",
  "inbox",
  "projects",
  "boards",
  "calendar",
  "timeline",
  "workload",
  "dashboards",
  "reports",
  "docs",
  "files",
  "automations",
  "integrations",
  "forms",
  "goals",
  "templates",
  "people",
  "time",
  "admin",
  "help",
];

describe("navConfig", () => {
  it("contains the expected top-level item order", () => {
    const ids = NAV.map((item) => item.id);
    expect(ids).toEqual(TOP_LEVEL_IDS);
  });

  it("hides admin entries for managers", () => {
    const managerNav = getNavForRole("manager");
    const topLevelIds = managerNav.map((item) => item.id);

    expect(topLevelIds).not.toContain("admin");
    expect(topLevelIds).toContain("projects");
  });

  it("excludes member-only areas for viewers", () => {
    const viewerNav = getNavForRole("viewer");
    const topLevelIds = viewerNav.map((item) => item.id);

    expect(topLevelIds).toContain("home");
    expect(topLevelIds).not.toContain("my-work");
  });
});

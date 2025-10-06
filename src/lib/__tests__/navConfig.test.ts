import { NAV } from "../navConfig";

describe("navigation config", () => {
  it("includes a reports entry that points to /reports", () => {
    const reportsItem = NAV.find((item) => item.id === "reports");
    expect(reportsItem).toBeDefined();
    expect(reportsItem?.path).toBe("/reports");
  });
});

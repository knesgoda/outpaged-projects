import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filesToCheck = [
  "src/components/layout/AppHeader.tsx",
  "src/components/layout/Topbar.tsx",
  "src/pages/Settings.tsx",
  "src/state/profile.tsx",
  "src/state/__tests__/profile.test.tsx",
  "src/components/layout/AppLayout.tsx",
];

const markers = ["<<<<<<<", "=======", ">>>>>>>"] as const;

describe("merge conflict markers", () => {
  it.each(filesToCheck)("does not exist in %s", (relativePath) => {
    const absolutePath = resolve(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, "utf8");

    for (const marker of markers) {
      expect(content.includes(marker)).toBe(false);
    }
  });
});

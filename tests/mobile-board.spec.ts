import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.goto("/__mobile__/board-preview");
  await expect(page.locator('[data-testid="mobile-board-preview"]')).toBeVisible();
});

test("kanban quick actions move the card forward", async ({ page }) => {
  const firstCard = page
    .locator('[data-testid="mobile-kanban-column"]')
    .first()
    .locator('[data-testid="mobile-kanban-card"]').first();
  const cardTitle = (await firstCard.locator("div").first().textContent())?.trim();
  expect(cardTitle).toBeTruthy();

  await firstCard.click();
  const sheet = page.locator('[data-testid="mobile-quick-actions"]');
  await expect(sheet).toBeVisible();

  await page.locator('[data-testid="quick-action-move-forward"]').click();
  await expect(sheet).toBeHidden();

  const secondColumn = page.locator('[data-testid="mobile-kanban-column"]').nth(1);
  await expect(secondColumn.locator(`text=${cardTitle}`)).toBeVisible();
});

test("timeline zoom controls update the indicator", async ({ page }) => {
  const indicator = page.locator('[data-testid="mobile-timeline-zoom-indicator"]');
  const initialValue = await indicator.textContent();
  await page.locator('[data-testid="mobile-timeline-zoom-in"]').click();
  await expect(indicator).not.toHaveText(initialValue ?? "");
});

test("kanban navigation buttons adjust the active column", async ({ page }) => {
  const track = page.locator('[data-testid="mobile-kanban-track"]');
  await expect(track).toHaveAttribute("data-active-index", "0");
  await page.locator('[data-testid="mobile-kanban-next"]').click();
  await expect(track).toHaveAttribute("data-active-index", "1");
  await page.locator('[data-testid="mobile-kanban-prev"]').click();
  await expect(track).toHaveAttribute("data-active-index", "0");
});

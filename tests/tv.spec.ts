import { test, expect } from "@playwright/test";
import { resetDb } from "./db";
import { addMember, login, setupAdmin } from "./helpers";

const DAN = { email: "dan@example.com", password: "supersecret123" };

test.describe.serial("TV kiosk", () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test("setup: family with a reminder today and an event tomorrow", async ({ page }) => {
    await setupAdmin(page, DAN);
    await addMember(page, "Ella");

    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.check('input[name="isReminder"]');
    await page.fill('input[name="title"]', "Pack swimming bag");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    const tomorrow = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    });
    await page.goto(`/week?view=today&day=${tomorrow}`);
    await page.waitForSelector('button[aria-label="Add event"]');
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.fill('input[name="title"]', "Tomorrow-only event");
    await page.fill('input[name="startTime"]', "11:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto("/admin");
    await page.click('button:has-text("+ Generate TV link")');
    await page.waitForTimeout(500);
  });

  test("the grid fits the screen without horizontal scrolling", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/admin");
    const codeText = await page.locator("code").first().innerText();
    const tvHref = "/" + codeText.split("/").slice(-2).join("/");

    const tvPage = await page.context().newPage();
    await tvPage.setViewportSize({ width: 1920, height: 1080 });
    await tvPage.goto(tvHref);
    await tvPage.waitForTimeout(500);

    const overflow = await tvPage.evaluate(() => {
      const el = document.querySelector(".overflow-x-auto");
      if (!el) return null;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(overflow).not.toBeNull();
    expect(overflow!.scrollWidth).toBeLessThanOrEqual(overflow!.clientWidth);
    await tvPage.close();
  });

  test("reminders sit in their own member's row, not someone else's or a shared strip", async ({
    page,
  }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/admin");
    const codeText = await page.locator("code").first().innerText();
    const tvHref = "/" + codeText.split("/").slice(-2).join("/");

    const tvPage = await page.context().newPage();
    await tvPage.setViewportSize({ width: 1920, height: 1080 });
    await tvPage.goto(tvHref);
    await tvPage.waitForTimeout(500);

    // Reminders live in a column inside their own owner's row. A past bug
    // put them all in one shared strip at the top of the page instead,
    // detached from any particular member.
    const info = await tvPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[data-testid="tv-member-row"]'));
      const danRow = rows.find((r) => r.getAttribute("data-member-name") === "Dan Monaghan");
      const ellaRow = rows.find((r) => r.getAttribute("data-member-name") === "Ella");
      return {
        reminderInDanRow: danRow?.textContent?.includes("Pack swimming bag") ?? false,
        reminderInEllaRow: ellaRow?.textContent?.includes("Pack swimming bag") ?? false,
      };
    });
    expect(info.reminderInDanRow).toBe(true);
    expect(info.reminderInEllaRow).toBe(false);
    await tvPage.close();
  });

  test("day navigation shows the right day's events and 'back to today' returns", async ({
    page,
  }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/admin");
    const codeText = await page.locator("code").first().innerText();
    const tvHref = "/" + codeText.split("/").slice(-2).join("/");

    const tvPage = await page.context().newPage();
    await tvPage.setViewportSize({ width: 1920, height: 1080 });
    await tvPage.goto(tvHref);
    await tvPage.waitForTimeout(500);

    await expect(tvPage.locator("text=Tomorrow-only event")).toHaveCount(0);
    await expect(tvPage.locator("text=Back to today")).toHaveCount(0);

    await tvPage.click('a[aria-label="Next day"]');
    await tvPage.waitForTimeout(500);
    await expect(tvPage.locator("text=Tomorrow-only event")).toBeVisible();
    await expect(tvPage.locator("text=Back to today")).toBeVisible();

    await tvPage.click("text=Back to today");
    await tvPage.waitForTimeout(500);
    await expect(tvPage.locator("text=Tomorrow-only event")).toHaveCount(0);
    await expect(tvPage.locator("text=Back to today")).toHaveCount(0);
    await tvPage.close();
  });

  test("picking a date jumps straight to that day", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/admin");
    const codeText = await page.locator("code").first().innerText();
    const tvHref = "/" + codeText.split("/").slice(-2).join("/");

    const tvPage = await page.context().newPage();
    await tvPage.setViewportSize({ width: 1920, height: 1080 });
    await tvPage.goto(tvHref);
    await tvPage.waitForTimeout(500);

    const { tomorrow, monthChanged } = await tvPage.evaluate(() => {
      const now = new Date();
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return {
        tomorrow: d.toISOString().slice(0, 10),
        monthChanged: d.getMonth() !== now.getMonth(),
      };
    });
    await expect(tvPage.locator("text=Tomorrow-only event")).toHaveCount(0);

    await tvPage.click('button[aria-label="Pick a date"]');
    await tvPage.waitForTimeout(300);
    if (monthChanged) {
      await tvPage.click('button[aria-label="Next month"]');
      await tvPage.waitForTimeout(300);
    }
    await tvPage.click(`[data-testid="tv-calendar-day"][data-date="${tomorrow}"]`);
    await tvPage.waitForTimeout(500);

    await expect(tvPage).toHaveURL(new RegExp(`day=${tomorrow}`));
    await expect(tvPage.locator("text=Tomorrow-only event")).toBeVisible();
    await expect(tvPage.locator("text=Back to today")).toBeVisible();
    await tvPage.close();
  });
});

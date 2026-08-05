import { test, expect } from "@playwright/test";
import { resetDb } from "./db";
import { login, setupAdmin } from "./helpers";

// Monday 2026-08-10 through Sunday 2026-08-16 — the app's week runs
// Mon-Sun, so the week param must itself be a Monday or getWeekStart snaps
// it back to the *previous* Monday.
const WEEK_START = "2026-08-10";
const NEXT_WEEK_START = "2026-08-17";
const MON = "2026-08-10";
const WED = "2026-08-12";
const DAN = { email: "dan@example.com", password: "supersecret123" };

test.describe.serial("recurrence types", () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test("setup", async ({ page }) => {
    await setupAdmin(page, DAN);
  });

  test("DAILY repeats every day with no end date until repeatUntil is set", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto(`/week?view=today&day=${MON}`);
    await page.waitForSelector('button[aria-label="Add event"]');
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.fill('input[name="title"]', "Daily pill");
    await page.fill('input[name="startTime"]', "08:00");
    await page.selectOption('select[name="repeat"]', "DAILY");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto(`/week?week=${WEEK_START}`);
    await expect(page.locator("text=Daily pill")).toHaveCount(7);
  });

  test("WEEKLY repeats only on the same weekday", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto(`/week?view=today&day=${MON}`);
    await page.waitForSelector('button[aria-label="Add event"]');
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.fill('input[name="title"]', "Weekly pill");
    await page.fill('input[name="startTime"]', "09:00");
    await page.selectOption('select[name="repeat"]', "WEEKLY");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto(`/week?week=${WEEK_START}`);
    // Only Monday 2026-08-10 in this week — one occurrence.
    await expect(page.locator("text=Weekly pill")).toHaveCount(1);
  });

  test("CUSTOM_DAYS repeats only on the picked days, forever, until repeatUntil bounds it", async ({
    page,
  }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto(`/week?view=today&day=${MON}`);
    await page.waitForSelector('button[aria-label="Add event"]');
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.fill('input[name="title"]', "Certain days pill");
    await page.fill('input[name="startTime"]', "10:00");
    await page.selectOption('select[name="repeat"]', "CUSTOM_DAYS");
    // Mon and Wed only.
    await page.check('input[name="repeatDays"][value="1"]');
    await page.check('input[name="repeatDays"][value="3"]');
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto(`/week?week=${WEEK_START}`);
    await expect(page.locator("text=Certain days pill")).toHaveCount(2);

    // With no repeatUntil, it must still be showing the FOLLOWING week too
    // — the exact confusion a real user hit ("I left it blank, thought that
    // meant just this week").
    await page.goto(`/week?week=${NEXT_WEEK_START}`);
    await expect(page.locator("text=Certain days pill")).toHaveCount(2);

    // Now bound it with repeatUntil and confirm it stops appearing after.
    await page.goto(`/week?week=${WEEK_START}`);
    await page.click("text=Certain days pill");
    await page.waitForSelector("text=Edit event");
    await page.fill('input[name="repeatUntil"]', WED);
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(500);

    await page.goto(`/week?week=${NEXT_WEEK_START}`);
    await expect(page.locator("text=Certain days pill")).toHaveCount(0);
  });

  test("SET_DATES only lands on the exact dates chosen", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto(`/week?view=today&day=${MON}`);
    await page.waitForSelector('button[aria-label="Add event"]');
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.selectOption('select[name="repeat"]', "SET_DATES");
    await page.fill('input[name="title"]', "Set dates pill");
    await page.fill('input[name="startTime"]', "11:00");
    const dateInputs = page.locator('input[name="dates"]');
    await dateInputs.nth(0).fill(MON);
    await page.click("text=+ Add another date");
    await dateInputs.nth(1).fill("2026-08-14");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto(`/week?week=${WEEK_START}`);
    await expect(page.locator("text=Set dates pill")).toHaveCount(2);
  });
});

import { test, expect } from "@playwright/test";
import { resetDb } from "./db";
import { addMember, login, logout, setupAdmin } from "./helpers";

const DAN = { email: "dan@example.com", password: "supersecret123" };
const ELLA = { email: "ella@example.com", password: "ellapassword123" };

test.describe.serial("event-group ownership editing/deleting", () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test("setup: admin plus two members, one with login access", async ({ page }) => {
    await setupAdmin(page, { name: "Dan Monaghan", ...DAN });
    await addMember(page, "Ella", ELLA);
    await addMember(page, "Max");
    await expect(page.getByText("Ella", { exact: true })).toBeVisible();
    await expect(page.getByText("Max", { exact: true })).toBeVisible();
  });

  test("admin edits without opting in only change the row they opened", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.check('label:has-text("Dan Monaghan") input[type="checkbox"]');
    await page.check('label:has-text("Ella") input[type="checkbox"]');
    await page.fill('input[name="title"]', "Shared outing");
    await page.fill('input[name="startTime"]', "10:00");
    await page.fill('input[name="endTime"]', "11:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.click("text=Shared outing");
    await page.waitForSelector("text=Edit event");
    await page.fill('input[name="title"]', "Shared outing RENAMED");
    // "applyToBatch" left unchecked — should only affect this one row.
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await expect(page.locator("text=Shared outing RENAMED")).toHaveCount(1);
    await expect(page.locator('text="Shared outing"')).toHaveCount(1);
  });

  test("admin edits with the batch checkbox change every calendar it's on", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.click("text=Shared outing RENAMED");
    await page.waitForSelector("text=Edit event");
    await page.fill('input[name="title"]', "Shared outing BOTH");
    await page.check('input[name="applyToBatch"]');
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await expect(page.locator("text=Shared outing BOTH")).toHaveCount(2);
  });

  test("the owner picker lets an admin move a solo event to a different calendar", async ({
    page,
  }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.check('label:has-text("Dan Monaghan") input[type="checkbox"]');
    await page.fill('input[name="title"]', "Solo event");
    await page.fill('input[name="startTime"]', "09:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await page.click("text=Solo event");
    await page.waitForSelector("text=Edit event");
    await page.uncheck('label:has-text("Dan Monaghan") input[type="checkbox"]');
    await page.check('label:has-text("Max") input[type="checkbox"]');
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(500);

    // Moving the sole owner should leave exactly one row, now owned by Max
    // — not a duplicate on both calendars (a bug caught during development).
    await page.goto("/week?view=today");
    await expect(page.locator("text=Solo event")).toHaveCount(1);
  });

  test("admin can delete a shared event for everyone in one action", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.click("text=Shared outing BOTH");
    await page.waitForSelector("text=Edit event");
    page.once("dialog", (d) => d.accept());
    await page.click("text=/Delete for everyone/");
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await expect(page.locator("text=Shared outing BOTH")).toHaveCount(0);
  });

  test("a member can bulk-delete only their own occurrences, leaving others' untouched", async ({
    page,
  }) => {
    // Dan shares a new event with Ella so there's a mixed-owner group.
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.check('label:has-text("Dan Monaghan") input[type="checkbox"]');
    await page.check('label:has-text("Ella") input[type="checkbox"]');
    await page.fill('input[name="title"]', "Family dinner");
    await page.fill('input[name="startTime"]', "18:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    // Ella adds a self-only event across three set dates.
    await logout(page);
    await login(page, ELLA.email, ELLA.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.selectOption('select[name="repeat"]', "SET_DATES");
    await page.fill('input[name="title"]', "Piano practice");
    await page.fill('input[name="startTime"]', "16:00");
    const dateInputs = page.locator('input[name="dates"]');
    await dateInputs.nth(0).fill("2026-08-10");
    await page.click("text=+ Add another date");
    await dateInputs.nth(1).fill("2026-08-11");
    await page.click("text=+ Add another date");
    await dateInputs.nth(2).fill("2026-08-12");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    // On her own multi-date event she gets the bulk-delete option, scoped
    // to her own rows.
    await page.goto("/week?week=2026-08-10");
    await page.waitForSelector("text=Piano practice");
    await page.locator("text=Piano practice").first().click();
    await page.waitForSelector("text=Edit event");
    await expect(page.locator("text=/Delete all \\d+ of your occurrences/")).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.click("text=/Delete all \\d+ of your occurrences/");
    await page.waitForTimeout(500);

    await page.goto("/week?week=2026-08-10");
    await expect(page.locator("text=Piano practice")).toHaveCount(0);

    // On the event she shares with Dan (just 1 of 2 rows is hers) there's
    // no group-delete option — only a plain delete for her own copy.
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator("text=Family dinner").last().click();
    await page.waitForSelector("text=Edit event");
    await expect(page.locator("text=/Delete all \\d+ of your occurrences/")).toHaveCount(0);
    page.once("dialog", (d) => d.accept());
    await page.click('button:has-text("Delete this one"), button:has-text("Delete")');
    await page.waitForTimeout(500);

    // Dan's copy must survive.
    await logout(page);
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await expect(page.locator("text=Family dinner")).toHaveCount(1);
  });
});

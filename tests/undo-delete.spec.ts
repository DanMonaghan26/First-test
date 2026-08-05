import { test, expect } from "@playwright/test";
import { resetDb } from "./db";
import { addMember, login, setupAdmin } from "./helpers";

const DAN = { email: "dan@example.com", password: "supersecret123" };

async function openMenu(page: import("@playwright/test").Page) {
  await page.click('button[aria-label="Menu"]');
}

test.describe.serial("undo a delete", () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test("deleting a solo event offers a Restore option that brings it back", async ({ page }) => {
    await setupAdmin(page, { name: "Dan Monaghan", ...DAN });
    await addMember(page, "Ella");

    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.fill('input[name="title"]', "Dentist appointment");
    await page.fill('input[name="startTime"]', "14:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await page.click("text=Dentist appointment");
    await page.waitForSelector("text=Edit event");
    page.once("dialog", (d) => d.accept());
    await page.click('button:has-text("Delete this one"), button:has-text("Delete")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await expect(page.locator("text=Dentist appointment")).toHaveCount(0);

    await openMenu(page);
    await expect(page.locator("text=/Last deleted:/")).toBeVisible();
    await expect(page.locator("text=Dentist appointment")).toBeVisible();
    await page.click('button:has-text("Restore")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await expect(page.locator("text=Dentist appointment")).toHaveCount(1);
  });

  test("deleting a shared event for everyone restores every calendar's copy together", async ({
    page,
  }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.locator('button[aria-label="Add event"]').first().click();
    await page.check('label:has-text("Dan Monaghan") input[type="checkbox"]');
    await page.check('label:has-text("Ella") input[type="checkbox"]');
    await page.fill('input[name="title"]', "Movie night");
    await page.fill('input[name="startTime"]', "19:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await page.click("text=Movie night");
    await page.waitForSelector("text=Edit event");
    page.once("dialog", (d) => d.accept());
    await page.click("text=/Delete for everyone/");
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await expect(page.locator("text=Movie night")).toHaveCount(0);

    await openMenu(page);
    await expect(page.locator("text=/Last deleted:/")).toBeVisible();
    await expect(page.locator("text=/other calendar/")).toBeVisible();
    await page.click('button:has-text("Restore")');
    await page.waitForTimeout(500);

    // Both Dan's and Ella's rows should be back.
    await page.goto("/week?view=today");
    await expect(page.locator("text=Movie night")).toHaveCount(2);
  });

  test("adding something new after a delete makes Undo show the add again", async ({ page }) => {
    await login(page, DAN.email, DAN.password);
    await page.goto("/week?view=today");
    await page.waitForSelector("text=Today –");
    await page.click("text=Movie night");
    await page.waitForSelector("text=Edit event");
    page.once("dialog", (d) => d.accept());
    await page.click("text=/Delete for everyone/");
    await page.waitForTimeout(500);

    await page.locator('button[aria-label="Add event"]').first().click();
    await page.fill('input[name="title"]', "Grocery run");
    await page.fill('input[name="startTime"]', "11:00");
    await page.click('button[type="submit"]:has-text("Add event")');
    await page.waitForTimeout(500);

    await page.goto("/week?view=today");
    await openMenu(page);
    await expect(page.locator("text=/Last added:.*Grocery run/")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { resetDb } from "./db";
import { addMember, setupAdmin } from "./helpers";

const DAN = { email: "dan@example.com", password: "supersecret123" };

async function memberOrder(page: import("@playwright/test").Page): Promise<string[]> {
  return page.locator('[data-testid="admin-member-row"]').evaluateAll((rows) =>
    rows.map((r) => r.getAttribute("data-member-name") ?? "")
  );
}

test.describe.serial("reordering family members", () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test("moving a member up/down swaps it with its neighbor, everywhere the family is listed", async ({
    page,
  }) => {
    await setupAdmin(page, { name: "Dan Monaghan", ...DAN });
    await addMember(page, "Ella");
    await addMember(page, "Max");

    await page.goto("/admin");
    await expect(await memberOrder(page)).toEqual(["Dan Monaghan", "Ella", "Max"]);

    // Move Ella up — swaps with Dan Monaghan.
    await page.click('button[aria-label="Move Ella up"]');
    await page.waitForTimeout(1000);
    await expect(await memberOrder(page)).toEqual(["Ella", "Dan Monaghan", "Max"]);

    // Move Max up twice — first swaps with Dan, then with Ella.
    await page.click('button[aria-label="Move Max up"]');
    await page.waitForTimeout(1000);
    await page.click('button[aria-label="Move Max up"]');
    await page.waitForTimeout(1000);
    await expect(await memberOrder(page)).toEqual(["Max", "Ella", "Dan Monaghan"]);

    // The ends can't move further in that direction.
    await expect(page.locator('button[aria-label="Move Max up"]')).toBeDisabled();
    await expect(
      page.locator('button[aria-label="Move Dan Monaghan down"]')
    ).toBeDisabled();

    // The new order shows up on /week too, not just admin.
    await page.goto("/week");
    const weekOrder = await page
      .locator('[data-testid="week-member-legend"]')
      .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-member-name")));
    expect(weekOrder).toEqual(["Max", "Ella", "Dan Monaghan"]);
  });
});

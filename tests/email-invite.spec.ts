import { test, expect } from "@playwright/test";
import { resetDb } from "./db";
import { addMember, login, logout, setupAdmin } from "./helpers";

const DAN = { email: "dan@example.com", password: "supersecret123" };

// The test environment doesn't set RESEND_API_KEY, so every send here is
// expected to fail gracefully — this exercises exactly the path a real
// deployment hits if the admin never configured email sending: the member
// still gets created/updated with working login credentials, and the admin
// sees a warning instead of a silent false "success".
test.describe.serial("email invites without RESEND_API_KEY configured", () => {
  test.beforeAll(async () => {
    await resetDb();
  });

  test("adding a member with 'Send invite' still creates a working login, with a warning shown", async ({
    page,
  }) => {
    await setupAdmin(page, { name: "Dan Monaghan", ...DAN });

    const ELLA = { email: "ella@example.com", password: "ellapassword123" };
    await addMember(page, "Ella", ELLA);

    await expect(page.locator("text=/invite email couldn't be sent/")).toBeVisible();
    await expect(page.getByText("Ella", { exact: true })).toBeVisible();

    await logout(page);
    await login(page, ELLA.email, ELLA.password);
    await expect(page).toHaveURL(/\/week/);
  });

  test("granting access to an existing placeholder member also warns but still works", async ({
    page,
  }) => {
    await login(page, DAN.email, DAN.password);
    await addMember(page, "Max");

    await page.goto("/admin");
    await page.click('button:has-text("Send invite")');
    await page.waitForSelector("text=Send invite – Max");
    await page.fill('input[name="email"]', "max@example.com");
    await page.check('input[name="requiresPassword"]');
    await page.fill('input[name="password"]', "maxpassword123");
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(500);

    await expect(page.locator("text=/the email couldn't be sent/")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await logout(page);
    await login(page, "max@example.com", "maxpassword123");
    await expect(page).toHaveURL(/\/week/);
  });
});

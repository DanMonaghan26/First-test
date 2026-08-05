import type { Page } from "@playwright/test";

export async function setupAdmin(
  page: Page,
  {
    name = "Dan Monaghan",
    email = "dan@example.com",
    password = "supersecret123",
  }: { name?: string; email?: string; password?: string } = {}
) {
  await page.goto("/");
  await page.waitForURL("**/setup");
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/week");
}

export async function addMember(
  page: Page,
  name: string,
  opts?: { email?: string; password?: string }
) {
  await page.goto("/admin");
  await page.click("text=+ Add family member");
  await page.fill('input[name="name"]', name);
  if (opts?.email) {
    await page.check('input[name="sendInvite"]');
    await page.fill('input[name="email"]', opts.email);
    if (opts.password) {
      await page.fill('input[name="password"]', opts.password);
    }
  }
  await page.click('button[type="submit"]:has-text("Add member")');
  await page.waitForTimeout(500);
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/week");
}

export async function logout(page: Page) {
  await page.click('button:has-text("Sign out")');
  await page.waitForURL("**/login");
}

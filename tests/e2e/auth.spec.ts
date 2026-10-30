import { expect, test } from "@playwright/test";
import { ACCOUNTS, DEMO_PASSWORD, login } from "./helpers";

test.describe("authentication and role routing", () => {
  for (const [role, email, path, heading] of [
    ["super admin", ACCOUNTS.admin, "/en/admin", "Platform analytics"],
    ["hospital admin", ACCOUNTS.hospital, "/en/hospital", "Facility overview"],
    ["hotel manager", ACCOUNTS.hotel, "/en/hotel", "Hotel overview"],
    ["patient", ACCOUNTS.patient, "/en/dashboard", "Your Dashboard"],
  ] as const) {
    test(`${role} lands in their portal`, async ({ page }) => {
      await login(page, email);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    });
  }

  test("rejects a wrong password with a localized message", async ({ page }) => {
    await page.goto("/ar/login");
    await page.locator("#email").fill(ACCOUNTS.patient);
    await page.locator("#password").fill("wrong-password-1");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة")).toBeVisible();
  });

  test("sends guests to sign in and back to the requested page", async ({ page }) => {
    await page.goto("/en/hospital/appointments");
    await expect(page).toHaveURL(/\/en\/login\?callbackUrl=/);
    // Sign in on the redirected page so the callback URL is preserved.
    await page.locator("#email").fill(ACCOUNTS.hospital);
    await page.locator("#password").fill(DEMO_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/en\/hospital\/appointments$/);
  });

  test("keeps patients out of staff portals", async ({ page }) => {
    await login(page, ACCOUNTS.patient);
    await page.goto("/en/admin");
    await expect(page).toHaveURL(/\/en\/dashboard$/);
    const res = await page.request.get("/api/admin/users");
    expect(res.status()).toBe(403);
  });
});

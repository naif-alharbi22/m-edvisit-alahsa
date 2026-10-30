import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "MedVisit@2026";

export const ACCOUNTS = {
  admin: "admin@medvisit.sa",
  hospital: "admin.almoosa@medvisit.sa",
  hotel: "manager.grand@medvisit.sa",
  patient: "patient@medvisit.sa",
} as const;

export async function login(page: Page, email: string, password = DEMO_PASSWORD, locale = "en") {
  await page.goto(`/${locale}/login`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login/);
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@e2e.test`;
}

export async function registerPatient(page: Page, name: string, email: string, password = "E2eTest1234") {
  await page.goto("/en/register");
  await page.locator("#name").fill(name);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
}

/** YYYY-MM-DD n days from today (Riyadh calendar). */
export function isoDay(n: number) {
  return new Date(Date.now() + 3 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
}

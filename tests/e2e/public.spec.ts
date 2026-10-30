import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("redirects to the default locale and renders the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Medical Journey");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("serves Arabic right-to-left", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("رحلتك العلاجية");
  });

  test("browses facilities, filters by specialty and opens a facility", async ({ page }) => {
    await page.goto("/en/facilities?specialty=Ophthalmology");
    const cards = page.getByRole("link", { name: "View details" });
    await expect(cards.first()).toBeVisible();
    await cards.first().click();
    await expect(page).toHaveURL(/\/en\/facilities\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { name: "Treatment Packages" })).toBeVisible();
    await expect(page.getByText("Stay nearby")).toBeVisible();
  });

  test("lists hotels sorted by distance from a facility", async ({ page }) => {
    await page.goto("/en/hotels");
    await expect(page.getByRole("link", { name: "View hotel" }).first()).toBeVisible();
    await page.goto("/en/facilities");
    await page.getByRole("link", { name: "View details" }).first().click();
    await page.getByRole("link", { name: "View all nearby hotels" }).click();
    await expect(page).toHaveURL(/\/en\/hotels\?facility=/);
    await expect(page.getByText(/km from/).first()).toBeVisible();
  });

  test("shows a localized 404 page", async ({ page }) => {
    const res = await page.goto("/en/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("exposes health, robots and sitemap", async ({ request }) => {
    expect((await request.get("/api/health")).ok()).toBe(true);
    expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap:");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/facilities/");
  });
});

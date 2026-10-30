import { expect, test } from "@playwright/test";
import { ACCOUNTS, isoDay, login, registerPatient, uniqueEmail } from "./helpers";

test.describe("end-to-end journeys", () => {
  test("patient books an appointment, hospital confirms it, patient is notified", async ({ browser }) => {
    const patientName = `E2E Patient ${Date.now()}`;
    const patient = await browser.newPage();
    await registerPatient(patient, patientName, uniqueEmail("journey"));

    // Book a package at Al-Moosa (managed by the seeded hospital admin).
    await patient.goto("/en/facilities/al-moosa-specialist-hospital");
    await patient.getByRole("button", { name: "Book this package" }).first().click();
    await patient.locator("#bk-date").fill(isoDay(20));
    await patient.locator("#bk-notes").fill("Booked by an automated end-to-end test");
    await patient.locator('button[form="appointment-form"]').click();
    await expect(patient).toHaveURL(/\/en\/dashboard$/);
    const reference = (await patient.getByText(/AP-[A-Z0-9]{6}/).first().textContent())!.match(/AP-[A-Z0-9]{6}/)![0];
    await expect(patient.getByText("Pending").first()).toBeVisible();

    // Hospital admin confirms it from the appointments queue.
    const staff = await browser.newPage();
    await login(staff, ACCOUNTS.hospital);
    await staff.goto(`/en/hospital/appointments?q=${reference}`);
    const row = staff.getByRole("row", { name: new RegExp(reference) });
    await row.getByRole("button", { name: "Confirm" }).click();
    await expect(staff.getByText("Updated successfully")).toBeVisible();
    await expect(row.getByText("Confirmed")).toBeVisible();

    // Patient sees the confirmation and a notification.
    await patient.reload();
    await expect(patient.getByText(reference).locator("xpath=ancestor::li[1]").getByText("Confirmed")).toBeVisible();
    await patient.getByRole("button", { name: /Notifications/ }).click();
    await expect(patient.getByText("Appointment confirmed").first()).toBeVisible();
  });

  test("patient books a hotel stay and the hotel manager confirms it", async ({ browser }) => {
    const patient = await browser.newPage();
    await registerPatient(patient, `E2E Guest ${Date.now()}`, uniqueEmail("stay"));
    await patient.goto("/en/hotels/al-hofuf-grand-hotel");
    await patient.locator("#ci").fill(isoDay(45));
    await patient.locator("#co").fill(isoDay(48));
    await patient.getByRole("button", { name: "Check availability" }).click();
    await expect(patient.getByText(/Total for 3 nights/).first()).toBeVisible();
    await patient.getByRole("button", { name: "Book", exact: true }).first().click();
    await patient.getByRole("button", { name: "Request booking" }).click();
    await expect(patient).toHaveURL(/\/en\/dashboard$/);
    const reference = (await patient.getByText(/HB-[A-Z0-9]{6}/).first().textContent())!.match(/HB-[A-Z0-9]{6}/)![0];

    const manager = await browser.newPage();
    await login(manager, ACCOUNTS.hotel);
    await manager.goto(`/en/hotel/bookings?q=${reference}`);
    const row = manager.getByRole("row", { name: new RegExp(reference) });
    await row.getByRole("button", { name: "Confirm" }).click();
    await expect(row.getByText("Confirmed")).toBeVisible();
  });

  test("super admin onboards a facility and the action is audited", async ({ page }) => {
    const name = `E2E Clinic ${Date.now()}`;
    await login(page, ACCOUNTS.admin);
    await page.goto("/en/admin/facilities");
    await page.getByRole("button", { name: "Add facility" }).click();
    await page.locator("#crud-form-name").fill(name);
    await page.locator("#crud-form-specialties").fill("Dermatology, ENT");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

    await page.goto("/en/admin/audit?q=facility.create");
    await expect(page.getByText("facility.create").first()).toBeVisible();

    // The new facility is public immediately.
    await page.goto(`/en/facilities?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("analytics range switching keeps the dashboard usable", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await page.getByRole("radio", { name: "Last 12 months" }).click();
    await expect(page).toHaveURL(/range=12m/);
    await expect(page.getByText("Revenue over time")).toBeVisible();
    await page.getByRole("button", { name: "Show table" }).first().click();
    await expect(page.getByRole("table").first()).toBeVisible();
  });
});

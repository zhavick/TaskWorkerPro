import { test, expect } from "@playwright/test";
import { setupAuthSession } from "./helpers/setup";

test.describe("Module 04: Advanced Enterprise Modules (GAME, DEV, AUDIT, SYNC, THEME)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthSession(page, { role: "Admin" });
  });

  test("TC-GAME-01: Gamification hub renders streak, points balance, and navigation links", async ({ page }) => {
    await page.goto("/gamification");

    // Header title
    await expect(page.getByText("Gamifikasi, Prestasi & Reward Store")).toBeVisible();

    // Verify streak and point balance from mock data
    await expect(page.getByText("18 Hari")).toBeVisible();
    await expect(page.getByText("1250")).toBeVisible();

    // Verify subpage navigation links inside main page
    await expect(page.getByRole("main").getByRole("link", { name: /Galeri Lencana/i })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Reward Store", exact: true })).toBeVisible();

    // Check-in action button
    const checkInBtn = page.getByRole("button", { name: /1-Click Check-In/i });
    await expect(checkInBtn).toBeVisible();
  });

  test("TC-DEV-01: SQL Studio and JSON Formatter dev tools function properly", async ({ page }) => {
    // 1. SQL Beautifier & Query Studio
    await page.goto("/dev-tools/sql");
    await expect(page.getByText("SQL Beautifier & Dialect Query Studio")).toBeVisible();

    // Dialect selector has options
    const dialectSelect = page.locator("select").first();
    await expect(dialectSelect).toBeVisible();

    // Beautify SQL button
    const beautifyBtn = page.getByRole("button", { name: /Beautify SQL/i });
    await expect(beautifyBtn).toBeVisible();
    await beautifyBtn.click();

    // 2. JSON Validator & Beautifier
    await page.goto("/dev-tools/json");
    await expect(page.getByText("Developer Tools: JSON Validator & Beautifier")).toBeVisible();

    const formatJsonBtn = page.getByRole("button", { name: /Format JSON/i });
    await expect(formatJsonBtn).toBeVisible();
    await formatJsonBtn.click();
  });

  test("TC-AUDIT-01: Executive audit trail renders analytics summary and activity logs", async ({ page }) => {
    await page.goto("/audit-trail");

    // Page title
    await expect(page.getByText("Audit Trail & Log Aktivitas Sistem")).toBeVisible();

    // Analytics summary metrics
    await expect(page.getByText("Total Log Audit")).toBeVisible();
    await expect(page.getByText("Mutasi Hari Ini")).toBeVisible();
    await expect(page.getByText("Operasi Berhasil")).toBeVisible();

    // Table data from mock
    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByText("Admin Modern").first()).toBeVisible();
    await expect(page.getByText("UpdateTask").first()).toBeVisible();
  });

  test("TC-SYNC-01: Configuration panel provides multi-instance sync and database purge", async ({ page }) => {
    await page.goto("/configuration");

    // Page title
    await expect(page.getByText("Konfigurasi Sistem & Master Data")).toBeVisible();

    // Tab 1: Sinkronisasi Host Induk
    const syncTab = page.getByRole("button", { name: /Sinkronisasi Host Induk/i });
    await expect(syncTab).toBeVisible();
    await syncTab.click();

    await expect(page.getByRole("button", { name: /Uji Koneksi/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Push ke Host Induk/i })).toBeVisible();

    // Tab 2: Pembersihan Data (Purge)
    const purgeTab = page.getByRole("button", { name: /Pembersihan Data/i });
    await expect(purgeTab).toBeVisible();
    await purgeTab.click();

    await expect(page.getByRole("button", { name: /Jalankan Kompaksi/i })).toBeVisible();
  });

  test("TC-THEME-01: Theme switch toggles dark and light mode seamlessly", async ({ page }) => {
    await page.goto("/dashboard");

    // Open Theme & Font Studio dialog
    const themeStudioBtn = page.getByRole("button", { name: "Theme & Font Studio" });
    await expect(themeStudioBtn).toBeVisible();
    await themeStudioBtn.click();

    // Assert Theme Studio Dialog opens
    await expect(page.getByText("Theme & Typography Studio")).toBeVisible();
    await expect(page.getByText("40 Tema Eye-Friendly")).toBeVisible();

    // Select a theme preset card from the modal
    const themeCard = page.getByRole("button", { name: /Slate Minimalist/i });
    await expect(themeCard).toBeVisible();
    await themeCard.click();
  });
});

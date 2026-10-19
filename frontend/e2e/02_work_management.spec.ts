import { test, expect } from "@playwright/test";
import { setupAuthSession } from "./helpers/setup";

test.describe("Module 02: Work Management (PROJ, TASK, KANBAN, TIME)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthSession(page, { role: "Admin" });
  });

  test("TC-PROJ-01: Projects page displays project cards with budget & burn rate", async ({ page }) => {
    await page.goto("/projects");

    // Header check
    await expect(page.getByText("Manajemen Proyek & Analitik Finansial")).toBeVisible();

    // Verify mock projects are rendered
    await expect(page.getByText("Migrasi Core Banking Cloud")).toBeVisible();
    await expect(page.getByText("Sistem Presensi Geofencing AI")).toBeVisible();

    // Check budget label
    await expect(page.getByText("Anggaran").first()).toBeVisible();
  });

  test("TC-PROJ-02: Project creation dialog opens and has form fields", async ({ page }) => {
    await page.goto("/projects");

    const newProjectBtn = page.getByRole("button", { name: "Proyek Baru" });
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // Modal dialog title
    await expect(page.getByText("Buat Proyek Baru")).toBeVisible();
    await expect(page.locator('input[placeholder*="Core Platform"], input[placeholder*="Banking"]').first()).toBeVisible();
  });

  test("TC-TASK-01: Tasks list displays table with filters and assignee chips", async ({ page }) => {
    await page.goto("/tasks");

    // Page title heading
    await expect(page.getByRole("heading", { name: "Daftar Tugas Operasional" })).toBeVisible();

    // Verify task title appears in the table
    await expect(page.getByRole("table").getByText("Implementasi JWT Dual Auth & Session Inactivity")).toBeVisible();
    await expect(page.getByText("Optimasi ClosedXML ARMS 21-Kolom & Standar 9-Kolom")).toBeVisible();

    // Verify filter input
    const searchInput = page.locator('input[placeholder*="Cari tugas"]');
    await expect(searchInput).toBeVisible();
  });

  test("TC-KANBAN-01: Kanban board renders columns and task cards", async ({ page }) => {
    await page.goto("/tasks/kanban");

    // Title
    await expect(page.getByText("Papan Kanban Interaktif")).toBeVisible();

    // Verify column headers exist
    await expect(page.getByRole("heading", { name: "Todo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();

    // Verify task card in In Progress column
    await expect(page.getByText("Implementasi JWT Dual Auth & Session Inactivity").first()).toBeVisible();
  });

  test("TC-TIME-01: Timesheets dashboard displays log sessions & manual entry button", async ({ page }) => {
    await page.goto("/timesheets");

    // Header
    await expect(page.getByText("Log Timesheet & Rekap Jam Kerja")).toBeVisible();

    // Check export button
    await expect(page.getByText("Ekspor Excel Resmi (.xlsx)")).toBeVisible();

    // Check manual session button & click
    const manualBtn = page.getByRole("button", { name: "Catat Jam Manual" });
    await expect(manualBtn).toBeVisible();
    await manualBtn.click();

    // Dialog title
    await expect(page.getByText("Catat Jam Kerja Manual")).toBeVisible();
  });
});

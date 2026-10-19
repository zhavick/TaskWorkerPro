import { test, expect } from "@playwright/test";
import { setupAuthSession } from "./helpers/setup";

test.describe("Module 03: Attendance, Notes, Calendar & Excel Interop (ATTEND, NOTE, CAL, EXCEL)", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthSession(page, { role: "Admin" });
  });

  test("TC-ATTEND-01: Attendance page displays Clock In status & tab controls", async ({ page }) => {
    await page.goto("/attendance");

    // Header check
    await expect(page.getByText("Presensi Terpadu & Rekonsiliasi Tim")).toBeVisible();

    // Verify clock in active status or hero card
    await expect(page.getByText("Status Presensi Hari Ini")).toBeVisible();
    await expect(page.getByText("Sedang Bekerja (Clock In Aktif)")).toBeVisible();

    // Verify tabs
    await expect(page.getByRole("button", { name: "Presensi Mandiri" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rekonsiliasi Tim (Admin)" })).toBeVisible();
  });

  test("TC-ATTEND-02: Switching to team reconciliation tab renders team monthly records", async ({ page }) => {
    await page.goto("/attendance");

    const rekonTab = page.getByRole("button", { name: "Rekonsiliasi Tim (Admin)" });
    await rekonTab.click();

    // Check team members list appears in reconciliation view
    await expect(page.getByText("Admin Modern").first()).toBeVisible();
    await expect(page.getByText("Budi Santoso").first()).toBeVisible();
  });

  test("TC-NOTE-01: Notes page displays SOP list and create note dialog", async ({ page }) => {
    await page.goto("/notes");

    // Header check
    await expect(page.getByText("Dokumentasi Kerja & SOP Teknis")).toBeVisible();

    // Verify mock note card
    await expect(page.getByText("Arsitektur Multi-Tenancy & Corporate Code")).toBeVisible();

    // Open new note modal
    const newNoteBtn = page.getByRole("button", { name: "Catatan Baru" });
    await expect(newNoteBtn).toBeVisible();
    await newNoteBtn.click();

    // Dialog form
    await expect(page.locator('input[placeholder*="Contoh: Arsitektur"]').first()).toBeVisible();
  });

  test("TC-CAL-01: Calendar page renders SDLC timeline and task events", async ({ page }) => {
    await page.goto("/calendar");

    // Header check
    await expect(page.getByText("Kalender Jadwal & Tenggat Tugas")).toBeVisible();

    // Verify task event appears in calendar
    await expect(page.getByText("Implementasi JWT Dual Auth & Session Inactivity").first()).toBeVisible();

    // Verify view mode switcher buttons
    await expect(page.getByRole("button", { name: /Bulan|Month/i })).toBeVisible();
  });

  test("TC-EXCEL-01: Tasks page Excel import modal displays Standard & ARMS template downloads", async ({ page }) => {
    await page.goto("/tasks");

    // Open Import Excel Dialog
    const importBtn = page.getByRole("button", { name: "Impor Excel" });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Verify dialog header
    await expect(page.getByText("Impor Tugas dari Excel")).toBeVisible();

    // Verify official template buttons
    await expect(page.getByText("Template Standar (9 Kolom)").first()).toBeVisible();
    await expect(page.getByText("Template ARMS (21 Kolom)").first()).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { setupAuthSession } from "./helpers/setup";
import { mockAdminUser } from "./helpers/mock-data";

test.describe("Module 01: Auth, Multi-Tenancy & Team Directory (AUTH, TENANT, TEAM)", () => {
  test("TC-AUTH-01: Login page renders branding, Lottie card, and form elements", async ({ page }) => {
    await page.goto("/login");

    // Title and branding verification
    await expect(page.locator("h1")).toContainText("Masuk ke Akun Anda");
    await expect(page.getByText("Kelola Waktu & Proyek Tanpa Hambatan")).toBeVisible();

    // Verify form input existence
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test("TC-AUTH-02: Displays error alert upon invalid credentials", async ({ page }) => {
    // Intercept login route with 401 error
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        json: { message: "Email atau kata sandi yang Anda masukkan salah." },
      });
    });

    await page.goto("/login");
    await page.locator('input[type="email"]').fill("wrong@company.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    // Verify error banner appears
    await expect(page.getByText("Email atau kata sandi yang Anda masukkan salah.")).toBeVisible();
  });

  test("TC-AUTH-03: Successfully logs in and stores auth tokens", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          accessToken: "mock-valid-e2e-access-token",
          user: mockAdminUser,
        },
      });
    });

    // Setup other standard mocks
    await setupAuthSession(page);

    await page.goto("/login");
    await page.locator('input[type="email"]').fill("admin@trackerkerja.local");
    await page.locator('input[type="password"]').fill("AdminPassword123!");
    await page.locator('button[type="submit"]').click();

    // Redirection to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");

    // Check LocalStorage token
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    expect(token).toBe("mock-valid-e2e-access-token");
  });

  test("TC-AUTH-04 & TC-TENANT-01: Register page renders corporate code and approval workflow", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText("Daftar Akun TrackerKerja")).toBeVisible();
    await expect(page.getByText("Kode Perusahaan / Holding")).toBeVisible();

    // Mock successful register call
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          message: "Akun berhasil didaftarkan.",
        },
      });
    });

    await page.locator('input[placeholder="Contoh: WCH"]').fill("MODERN2026");
    await page.locator('input[placeholder="Budi Santoso"]').fill("Karyawan Baru");
    await page.locator('input[placeholder="Senior Engineer"]').fill("Fullstack Dev");
    await page.locator('input[placeholder="budi@wahana.com"]').fill("karyawan@modern.com");

    const passInputs = page.locator('input[type="password"]');
    await passInputs.nth(0).fill("SecurePassword123!");
    await passInputs.nth(1).fill("SecurePassword123!");

    await page.locator('button[type="submit"]').click();

    // Success screen with Admin Approval message
    await expect(page.getByText("Registrasi Berhasil!")).toBeVisible();
    await expect(page.getByText("Menunggu Persetujuan Administrator")).toBeVisible();
  });

  test("TC-TEAM-01: Team directory page displays member cards and filters", async ({ page }) => {
    await setupAuthSession(page, { role: "Admin" });
    await page.goto("/members");

    // Check directory header
    await expect(page.getByText("Direktori Anggota Tim Enterprise")).toBeVisible();

    // Verify mock members displayed
    await expect(page.getByText("Admin Modern").first()).toBeVisible();
    await expect(page.getByText("Budi Santoso").first()).toBeVisible();

    // Verify search input
    const searchInput = page.locator('input[placeholder*="Cari anggota"]');
    await expect(searchInput).toBeVisible();
  });
});

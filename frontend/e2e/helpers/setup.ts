import { Page } from "@playwright/test";
import {
  mockAdminUser,
  mockMemberUser,
  mockCompany,
  mockProjects,
  mockTasks,
  mockTimesheets,
  mockActiveTimer,
  mockAttendances,
  mockNotes,
  mockGamification,
  mockAuditLogs,
  mockAnnouncements,
  mockSqlDialects,
  mockMasterPriorities,
  mockMasterStatuses,
  mockMasterMilestones,
  mockMasterCategories,
} from "./mock-data";

export interface SetupAuthOptions {
  role?: "Admin" | "Member";
  dismissTour?: boolean;
}

export async function setupAuthSession(
  page: Page,
  options: SetupAuthOptions = { role: "Admin", dismissTour: true }
) {
  const user = options.role === "Member" ? mockMemberUser : mockAdminUser;

  // Intercept standard API routes deterministically
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 200, json: user });
  });

  await page.route("**/api/auth/refresh-token", async (route) => {
    await route.fulfill({
      status: 200,
      json: { accessToken: "mock-valid-access-token", user },
    });
  });

  await page.route("**/api/settings**", async (route) => {
    const url = route.request().url();
    if (url.includes("/maintenance/stats")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            totalTasks: 42,
            totalProjects: 6,
            totalAttendances: 120,
            totalNotes: 15,
            totalNonAdminUsers: 10,
            totalAuditLogs: 148,
          },
        },
      });
    } else if (url.includes("/test-smtp")) {
      await route.fulfill({
        status: 200,
        json: { success: true, message: "Email pengujian SMTP terkirim!" },
      });
    } else if (route.request().method() === "PUT") {
      await route.fulfill({
        status: 200,
        json: { success: true, message: "Konfigurasi sistem berhasil disimpan!" },
      });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          appName: "TrackerKerja Modern",
          companyName: "PT Modern Solusi Teknologi",
          inactivityTimeoutMinutes: 60,
          data: [
            { key: "AppName", value: "TrackerKerja Modern" },
            { key: "CompanyDisplayName", value: "Wahana Central Holding" },
            { key: "DefaultCurrency", value: "IDR" },
            { key: "MaxFailedLoginAttempts", value: "3" },
            { key: "LockoutDurationMinutes", value: "30" },
            { key: "InactivityTimeoutMinutes", value: "60" },
          ],
        },
      });
    }
  });

  await page.route("**/api/profile**", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          ...user,
          roles: options.role === "Member" ? ["Member"] : ["Administrator"],
          jobTitle: options.role === "Member" ? "Senior Developer" : "System Administrator",
        },
      },
    });
  });

  await page.route("**/api/companies**", async (route) => {
    await route.fulfill({ status: 200, json: [mockCompany] });
  });

  await page.route("**/api/members**", async (route) => {
    const list = [
      {
        ...mockAdminUser,
        isApproved: true,
        isLockedOut: false,
        totalTasks: 5,
        completedTasks: 3,
        totalHours: 42.5,
      },
      {
        ...mockMemberUser,
        isApproved: true,
        isLockedOut: false,
        totalTasks: 8,
        completedTasks: 6,
        totalHours: 78.0,
      },
    ];
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: list,
        groups: [
          {
            companyId: 1,
            companyName: "PT Modern Solusi Teknologi",
            companyCode: "MODERN2026",
            totalMembers: 2,
            totalTasks: 13,
            completedTasks: 9,
            totalHours: 120.5,
            members: list,
          },
        ],
      },
    });
  });

  await page.route("**/api/projects**", async (route) => {
    if (route.request().url().includes("/projects/proj-1")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockProjects[0] } });
    } else {
      await route.fulfill({ status: 200, json: { success: true, data: mockProjects } });
    }
  });

  await page.route("**/api/tasks**", async (route) => {
    const url = route.request().url();
    if (url.includes("/tasks/kanban")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            Todo: [mockTasks[2]],
            InProgress: [mockTasks[0]],
            Done: [mockTasks[1]],
            Overdue: [],
          },
        },
      });
    } else if (url.includes("/tasks/task-101")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockTasks[0] } });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: mockTasks,
          totalCount: mockTasks.length,
          totalPages: 1,
        },
      });
    }
  });

  await page.route("**/api/timesheets**", async (route) => {
    const url = route.request().url();
    if (url.includes("/active-timers") || url.includes("/active-timer")) {
      await route.fulfill({ status: 200, json: { success: true, data: [mockActiveTimer] } });
    } else if (url.includes("/sessions")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: mockTimesheets,
          summary: {
            totalHours: 25.5,
            totalDays: 4,
            todayHours: 2.5,
          },
          totalCount: 1,
          totalPages: 1,
        },
      });
    } else {
      await route.fulfill({ status: 200, json: { success: true, data: mockTimesheets } });
    }
  });

  await page.route(/.*\/api\/attendances?.*/, async (route) => {
    const url = route.request().url();
    if (url.includes("/today")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            hasClockedIn: true,
            hasClockedOut: false,
            type: 1,
            clockInTime: new Date(Date.now() - 3600000).toISOString(),
            location: 1,
            notes: "Bekerja di kantor pusat",
          },
        },
      });
    } else if (url.includes("/monthly")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            members: [
              {
                userId: "user-admin-1",
                fullName: "Admin Modern",
                jobTitle: "System Administrator",
                totalHours: 40,
                totalPresent: 5,
                dailyRecords: [],
              },
              {
                userId: "user-member-1",
                fullName: "Budi Santoso",
                jobTitle: "Senior Developer",
                totalHours: 42,
                totalPresent: 5,
                dailyRecords: [],
              },
            ],
          },
        },
      });
    } else if (url.includes("/reconciliation")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: 101,
              userId: "user-admin-1",
              userName: "Admin Modern",
              userEmail: "admin@trackerkerja.local",
              date: "2026-10-19",
              hasClockedIn: true,
              hasClockedOut: false,
              workLocation: 1,
              type: 1,
              clockIn: new Date(Date.now() - 3600000).toISOString(),
              totalHours: 4,
            },
            {
              id: 102,
              userId: "user-member-1",
              userName: "Budi Santoso",
              userEmail: "budi@trackerkerja.local",
              date: "2026-10-19",
              hasClockedIn: true,
              hasClockedOut: true,
              workLocation: 1,
              type: 1,
              clockIn: new Date(Date.now() - 7200000).toISOString(),
              clockOut: new Date().toISOString(),
              totalHours: 8,
            },
          ],
        },
      });
    } else if (url.includes("/my-history")) {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    } else if (url.includes("/my-summary")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: { totalHours: 160, presentDays: 20, lateDays: 0, leaveDays: 0 },
        },
      });
    } else {
      await route.fulfill({ status: 200, json: { success: true, data: mockAttendances.today } });
    }
  });

  await page.route("**/api/notes**", async (route) => {
    await route.fulfill({ status: 200, json: { success: true, data: mockNotes } });
  });

  await page.route("**/api/calendar/events**", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: mockTasks.map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          priority: t.priority,
          status: t.status,
          projectName: t.projectName,
          assignedToUserName: t.assignedToUserName,
        })),
      },
    });
  });

  await page.route("**/api/gamification**", async (route) => {
    const url = route.request().url();
    if (url.includes("/badges")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockGamification.badges } });
    } else if (url.includes("/rewards/claims")) {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    } else if (url.includes("/rewards")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockGamification.rewards } });
    } else if (url.includes("/check-in")) {
      await route.fulfill({ status: 200, json: { success: true, message: "Check-in harian berhasil! +10 poin." } });
    } else {
      await route.fulfill({ status: 200, json: { success: true, data: mockGamification } });
    }
  });

  await page.route("**/api/audit-logs**", async (route) => {
    const url = route.request().url();
    if (url.includes("/summary")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockAuditLogs.summary } });
    } else if (url.includes("/modules")) {
      await route.fulfill({ status: 200, json: { success: true, data: ["Tasks", "Attendance", "Projects", "Auth", "Settings"] } });
    } else if (url.includes("/task/")) {
      await route.fulfill({ status: 200, json: { success: true, data: [mockAuditLogs.items[0]] } });
    } else {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: mockAuditLogs.items,
          pagination: {
            page: 1,
            pageSize: 15,
            totalItems: mockAuditLogs.items.length,
            totalPages: 1,
          },
        },
      });
    }
  });

  await page.route("**/api/sqltools**", async (route) => {
    const url = route.request().url();
    if (url.includes("/dialects")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockSqlDialects } });
    } else if (url.includes("/history")) {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    } else if (url.includes("/format")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            formattedSql: "SELECT\n  id,\n  name\nFROM users\nORDER BY id ASC;",
            lineCount: 5,
            characterCount: 42,
            elapsedMilliseconds: 14,
          },
        },
      });
    } else if (url.includes("/minify")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            minifiedSql: "SELECT id, name FROM users ORDER BY id ASC;",
            minifiedLength: 42,
            compressionRatio: 25.0,
          },
        },
      });
    } else if (url.includes("/validate")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            isValid: true,
            statementType: "SELECT",
            errors: [],
            detectedKeywords: ["SELECT", "FROM", "ORDER BY"],
          },
        },
      });
    } else {
      await route.fulfill({ status: 200, json: { success: true, data: null } });
    }
  });

  await page.route("**/api/master/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/priorities")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockMasterPriorities } });
    } else if (url.includes("/statuses")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockMasterStatuses } });
    } else if (url.includes("/milestones")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockMasterMilestones } });
    } else if (url.includes("/categories")) {
      await route.fulfill({ status: 200, json: { success: true, data: mockMasterCategories } });
    } else {
      await route.fulfill({ status: 200, json: { success: true, data: [] } });
    }
  });

  await page.route("**/api/sync/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/ping-host")) {
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          ready: true,
          responseLatencyMs: 28,
          instanceName: "TrackerKerja Host Central",
          version: "2.5.0",
        },
      });
    } else if (url.includes("/ping")) {
      await route.fulfill({
        status: 200,
        json: {
          ready: true,
          instanceName: "TrackerKerja Local Node",
          version: "2.5.0",
        },
      });
    } else if (url.includes("/history")) {
      await route.fulfill({ status: 200, json: [] });
    } else {
      await route.fulfill({ status: 200, json: { success: true } });
    }
  });

  await page.route("**/api/dev-tools/**", async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          formatted: '{\n  "title": "TrackerKerja Modern",\n  "version": 2\n}',
        },
      },
    });
  });

  await page.route("**/api/maintenance/**", async (route) => {
    await route.fulfill({
      status: 200,
      json: { success: true, message: "Operasi pemeliharaan database berhasil dijalankan." },
    });
  });

  await page.route("**/api/announcements**", async (route) => {
    const url = route.request().url();
    if (url.includes("/active")) {
      await route.fulfill({ status: 200, json: mockAnnouncements });
    } else {
      await route.fulfill({ status: 200, json: mockAnnouncements });
    }
  });

  // Inject LocalStorage state before document load
  await page.addInitScript(
    ({ user, dismissTour }) => {
      localStorage.setItem("access_token", "mock-e2e-jwt-access-token");
      localStorage.setItem("user_profile", JSON.stringify(user));
      if (dismissTour) {
        localStorage.setItem("onboarding_tour_completed", "true");
        localStorage.setItem("wtp_tour_seen", "true");
      }
    },
    { user, dismissTour: options.dismissTour ?? true }
  );
}

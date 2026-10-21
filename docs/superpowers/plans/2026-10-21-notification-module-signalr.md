# Modul Notifikasi Terpadu (Hybrid SignalR Real-Time Push & REST API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun subsistem notifikasi terpadu multi-tenant di TrackerKerja Modern menggunakan ASP.NET Core SignalR untuk push instan sub-detik dan REST API untuk persistensi basis data, integrasi live header bell popover, halaman Pusat Notifikasi (`/notifications`) dengan fitur Admin Broadcast, dan pemicu otomatis event penugasan tugas serta pengumuman.

**Architecture:** Menggunakan SignalR Hub (`/hubs/notifications`) yang terproteksi token JWT via query string handshake, dikombinasikan dengan entitas `UserNotification` di EF Core. `NotificationService` memancarkan event ke koneksi pengguna/grup perusahaan sekaligus menyimpan riwayat, sementara frontend React Query memvalidasi cache dan menampilkan toast notifikasi interaktif via Sonner.

**Tech Stack:** ASP.NET Core 8.0 Web API, SignalR, Entity Framework Core 8, PostgreSQL 16 / SQLite, Next.js 16 (App Router), `@microsoft/signalr`, TanStack React Query, TailGrids UI, Lucide React, Sonner Toasts.

**Spec:** `docs/superpowers/specs/2026-10-21-notification-module-signalr-design.md`

## Global Constraints
- Multi-tenant strict isolation: Pengguna hanya dapat membaca dan menghapus notifikasi dalam `CompanyId` dan `UserId` miliknya sendiri.
- Admin Broadcast: Hanya pengguna dengan Role Administrator atau Superadmin yang diizinkan memanggil endpoint `POST /api/notifications/broadcast`.
- SignalR Handshake: Menggunakan JWT token dari `access_token` query parameter pada rute hub `/hubs/notifications`.
- UI Aesthetics: Mengikuti standar TailGrids & custom token TrackerKerja Modern dengan badge berwarna per kategori dan micro-animation.
- 0 test failures pada suite unit test backend (`dotnet test`) dan 0 error pada kompilasi frontend (`tsc --noEmit`).

---

### Task 1: Backend Domain Entity, DTOs & DbContext Registration

**Files:**
- Create: `backend/src/TrackerKerja.Domain/Entities/UserNotification.cs`
- Create: `backend/src/TrackerKerja.Application/DTOs/NotificationDtos.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`

**Interfaces:**
- Produces: `UserNotification` entity, `NotificationDto`, `BroadcastNotificationRequest`, `NotificationFilterRequest`, `NotificationUnreadCountDto`, `AppDbContext.UserNotifications`.

- [ ] **Step 1: Create `UserNotification` domain entity**
Create `backend/src/TrackerKerja.Domain/Entities/UserNotification.cs`:
```csharp
namespace TrackerKerja.Domain.Entities;

public class UserNotification
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = "Task"; // "Task", "Announcement", "Attendance", "System", "Broadcast"
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedByUserId { get; set; }

    public AppUser? User { get; set; }
    public Company? Company { get; set; }
    public AppUser? CreatedByUser { get; set; }
}
```

- [ ] **Step 2: Create `NotificationDtos.cs` in Application layer**
Create `backend/src/TrackerKerja.Application/DTOs/NotificationDtos.cs`:
```csharp
namespace TrackerKerja.Application.DTOs;

public record NotificationDto(
    int Id,
    string UserId,
    int CompanyId,
    string Title,
    string Message,
    string Category,
    string? ActionUrl,
    bool IsRead,
    DateTimeOffset? ReadAt,
    DateTimeOffset CreatedAt,
    string? CreatedByUserName
);

public record BroadcastNotificationRequest(
    string Title,
    string Message,
    string Category = "Broadcast",
    string? ActionUrl = null,
    string? TargetUserId = null
);

public record NotificationFilterRequest(
    bool? OnlyUnread = null,
    string? Category = null,
    int Page = 1,
    int PageSize = 20
);

public record NotificationUnreadCountDto(
    int UnreadCount
);
```

- [ ] **Step 3: Register `UserNotifications` in `AppDbContext.cs`**
Add `public DbSet<UserNotification> UserNotifications => Set<UserNotification>();` and entity relationship configuration in `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`.

- [ ] **Step 4: Verify build**
Run: `dotnet build backend/TrackerKerja.sln`
Expected: Build succeeded with 0 errors.

---

### Task 2: SignalR Hub, Notification Service & WebSockets JWT Configuration

**Files:**
- Create: `backend/src/TrackerKerja.Application/Common/Interfaces/INotificationService.cs`
- Create: `backend/src/TrackerKerja.Infrastructure/Services/NotificationService.cs`
- Create: `backend/src/TrackerKerja.WebApi/Hubs/NotificationHub.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Program.cs`

**Interfaces:**
- Produces: `INotificationService`, `NotificationHub` mounted at `/hubs/notifications`.
- Consumes: `AppDbContext`, `UserNotification`, `NotificationDto`.

- [ ] **Step 1: Create `INotificationService.cs`**
Create `backend/src/TrackerKerja.Application/Common/Interfaces/INotificationService.cs`:
```csharp
using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface INotificationService
{
    Task<NotificationDto> SendNotificationAsync(
        string userId,
        int companyId,
        string title,
        string message,
        string category = "Task",
        string? actionUrl = null,
        string? createdByUserId = null
    );

    Task<int> BroadcastCompanyAsync(
        int companyId,
        string title,
        string message,
        string category = "Broadcast",
        string? actionUrl = null,
        string? createdByUserId = null
    );
}
```

- [ ] **Step 2: Create `NotificationHub.cs`**
Create `backend/src/TrackerKerja.WebApi/Hubs/NotificationHub.cs`:
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace TrackerKerja.WebApi.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var companyIdClaim = Context.User?.FindFirst("companyId")?.Value
            ?? Context.User?.FindFirst("CompanyId")?.Value;

        if (!string.IsNullOrEmpty(companyIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"company_{companyIdClaim}");
        }

        await base.OnConnectedAsync();
    }
}
```

- [ ] **Step 3: Implement `NotificationService.cs`**
Create `backend/src/TrackerKerja.Infrastructure/Services/NotificationService.cs` implementing `INotificationService` using `AppDbContext` and `IHubContext<NotificationHub>`.

- [ ] **Step 4: Configure `Program.cs`**
In `backend/src/TrackerKerja.WebApi/Program.cs`:
1. Add `builder.Services.AddSignalR();`
2. Register `builder.Services.AddScoped<INotificationService, NotificationService>();`
3. Configure `JwtBearerOptions.Events.OnMessageReceived` to read `context.Token = accessToken` from `context.Request.Query["access_token"]` when path starts with `/hubs/notifications`.
4. Map hub: `app.MapHub<NotificationHub>("/hubs/notifications");`.

- [ ] **Step 5: Verify build**
Run: `dotnet build backend/TrackerKerja.sln`
Expected: Build succeeded with 0 errors.

---

### Task 3: Backend Notifications Controller & Unit Tests (TDD)

**Files:**
- Create: `backend/src/TrackerKerja.WebApi/Controllers/NotificationsController.cs`
- Create: `backend/tests/TrackerKerja.Tests/NotificationsControllerTests.cs`

**Interfaces:**
- Produces: Endpoints `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/{id}/read`, `/api/notifications/read-all`, `/api/notifications/{id}` (DELETE), `/api/notifications/broadcast` (POST).

- [ ] **Step 1: Write Unit Tests for `NotificationsController`**
Create `backend/tests/TrackerKerja.Tests/NotificationsControllerTests.cs` covering:
- Non-admin user gets only their own notifications.
- `unread-count` returns correct count.
- `read` marks specific notification read and sets `ReadAt`.
- `read-all` marks all unread notifications of user as read.
- `delete` deletes notification.
- `broadcast` returns 403 Forbidden for non-admin user, and 200 OK for admin.

- [ ] **Step 2: Run tests to verify failure**
Run: `dotnet test backend/tests/TrackerKerja.Tests --filter FullyQualifiedName~NotificationsControllerTests`
Expected: Fail (Controller does not exist yet).

- [ ] **Step 3: Implement `NotificationsController.cs`**
Create `backend/src/TrackerKerja.WebApi/Controllers/NotificationsController.cs` with full RBAC, multi-tenant isolation, and pagination.

- [ ] **Step 4: Re-run tests to verify pass**
Run: `dotnet test backend/tests/TrackerKerja.Tests --filter FullyQualifiedName~NotificationsControllerTests`
Expected: All tests PASS.

---

### Task 4: Integration of Notification Triggers in Tasks & Announcements Controllers

**Files:**
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/TasksController.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/AnnouncementsController.cs`

**Interfaces:**
- Consumes: `INotificationService`.

- [ ] **Step 1: Inject `INotificationService` into `TasksController`**
In `backend/src/TrackerKerja.WebApi/Controllers/TasksController.cs`:
- Trigger `SendNotificationAsync` when a task is created or updated with an `AssignedToUserId` different from current user:
  - Title: `"Tugas Baru Ditugaskan"`
  - Message: `"Anda ditugaskan pada tugas: {task.Title}"`
  - ActionUrl: `"/tasks"`
  - Category: `"Task"`
- Trigger `SendNotificationAsync` when status is updated to `Done`:
  - Title: `"Tugas Selesai"`
  - Message: `"Tugas '{task.Title}' telah diselesaikan."`

- [ ] **Step 2: Inject `INotificationService` into `AnnouncementsController`**
In `backend/src/TrackerKerja.WebApi/Controllers/AnnouncementsController.cs`:
- Trigger `BroadcastCompanyAsync` when an announcement is published:
  - Title: `"Pengumuman Baru: {announcement.Title}"`
  - Message: snippet of announcement content
  - ActionUrl: `"/announcements"`
  - Category: `"Announcement"`

- [ ] **Step 3: Run all backend tests**
Run: `dotnet test backend/tests/TrackerKerja.Tests`
Expected: All 164+ tests pass.

---

### Task 5: Frontend SignalR Hub Integration & Header Bell Popover

**Files:**
- Install: `@microsoft/signalr` in `frontend`
- Create: `frontend/src/services/signalr/notification-hub.ts`
- Create: `frontend/src/hooks/use-notification-hub.ts`
- Modify: `frontend/src/components/common/header/notifications.tsx`
- Modify: `frontend/src/app/(with-layouts)/layout.tsx` (mount notification hub listener)

**Interfaces:**
- Consumes: `/hubs/notifications`, `/api/notifications`, `/api/notifications/unread-count`.

- [ ] **Step 1: Install `@microsoft/signalr`**
Run: `npm install @microsoft/signalr` in `c:/TEMP/VSCODE/TrackerKerjaModern/frontend`.

- [ ] **Step 2: Create SignalR client helper and hook**
Create `frontend/src/services/signalr/notification-hub.ts` and `frontend/src/hooks/use-notification-hub.ts`:
- Sets up `HubConnectionBuilder` with auto-reconnect and bearer token from `localStorage.getItem("token")`.
- Listens to `"ReceiveNotification"`:
  - Displays `toast.info(title, { description: message, action: { label: "Buka", onClick: () => router.push(actionUrl) } })`.
  - Invalidates `["notifications"]` and `["notifications-unread-count"]` in React Query.

- [ ] **Step 3: Update `components/common/header/notifications.tsx`**
- Replace static mock data with:
  - `useQuery(["notifications-unread-count"])`
  - `useQuery(["notifications-header"])`
- Render real notifications with relative timestamps, category icons, read/unread states, and action click navigation.
- Implement "Tandai Semua Dibaca" calling `PUT /api/notifications/read-all`.
- Link "Lihat Semua" to `/notifications`.

- [ ] **Step 4: Mount `useNotificationHub` in layout**
Include notification hub listener in client layout so real-time push is active across all authenticated pages.

- [ ] **Step 5: Verify TypeScript compilation**
Run: `node ./node_modules/typescript/bin/tsc --noEmit` in `frontend`
Expected: 0 errors.

---

### Task 6: Frontend Notification Center Page & Sidebar Navigation

**Files:**
- Create: `frontend/src/app/(with-layouts)/notifications/page.tsx`
- Modify: `frontend/src/components/common/sidebar/data.tsx`

**Interfaces:**
- Consumes: `/api/notifications`, `/api/notifications/{id}/read`, `/api/notifications/read-all`, `/api/notifications/{id}` (DELETE), `/api/notifications/broadcast` (POST).

- [ ] **Step 1: Create `/notifications` Studio Page**
Create `frontend/src/app/(with-layouts)/notifications/page.tsx`:
- Header with title, unread count badge, "Tandai Semua Dibaca" button, and "Kirim Siaran" button (for Admin role).
- Category Filter Tabs: *Semua*, *Belum Dibaca*, *Tugas*, *Pengumuman*, *Presensi*, *Broadcast*.
- Card List with:
  - Category icon & color badges.
  - Title, full message body, and relative timestamp.
  - Action button: "Buka Tautan" -> opens `actionUrl`.
  - Action button: "Tandai Dibaca" / "Hapus".
- Admin Broadcast Modal Dialog:
  - Input: Judul, Isi Pesan, Kategori, Tautan Tindakan (opsional), Target (Semua / Anggota Tertentu).
  - Submits `POST /api/notifications/broadcast`.

- [ ] **Step 2: Add to Sidebar Menu**
In `frontend/src/components/common/sidebar/data.tsx`:
Add `{ title: "Pusat Notifikasi", icon: <Bell className="h-5 w-5" />, url: "/notifications", items: [] }` under the `OPERASIONAL KERJA` section.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `node ./node_modules/typescript/bin/tsc --noEmit` in `frontend`
Expected: 0 errors.

---

### Task 7: Full System Verification & Regression Testing

**Files:**
- Run automated test suites on both backend and frontend.

- [ ] **Step 1: Run complete backend test suite**
Run: `dotnet test backend/tests/TrackerKerja.Tests`
Expected: All tests pass (0 failures).

- [ ] **Step 2: Run frontend typecheck**
Run: `node ./node_modules/typescript/bin/tsc --noEmit` in `frontend`
Expected: 0 errors.

- [ ] **Step 3: Git commit**
Commit all changes with meaningful message: `feat: add notification module with signalr real-time push and notification center`.

# FSD 5.10 Modul Ekspor Tugas Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul ekspor tugas Excel lengkap (FSD 5.10) dengan ClosedXML engine mendukung Format Standar (9 Kolom) dan Format ARMS Enterprise (21 Kolom + Executive Summary Sheet), penegakan RBAC scoping (`mine` vs `all`), filter tanggal & proyek, dan dialog interaktif di Next.js frontend.

**Architecture:** ASP.NET Core 8 Clean Architecture dengan DTO filter di Application layer, implementasi generasi spreadsheet ClosedXML di Infrastructure layer, REST endpoint `GET /api/tasks/export` di WebApi layer, serta dialog unduh berkas di Next.js 16 frontend.

**Tech Stack:** C# 12, .NET 8.0, ClosedXML 0.104.2, EF Core 8, Next.js 16, TypeScript, Tailwind CSS, TanStack Query, Sonner.

**Spec:** [`docs/superpowers/specs/2026-10-13-excel-task-export-design.md`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docs/superpowers/specs/2026-10-13-excel-task-export-design.md)

## Global Constraints
- Target Framework: .NET 8.0 LTS (`net8.0`) dan Next.js 16 (React 19).
- Spreadsheet Engine: ClosedXML 0.104.2 (`IXLWorkbook`, `IXLWorksheet`).
- Multi-Tenancy: Seluruh query harus difilter berdasarkan `CompanyId` milik pengguna aktif.
- RBAC Security: Pengguna non-admin (`!isAdmin`) hanya boleh mengekspor tugas miliknya sendiri (`AssignedToUserId == currentUserId`), mengabaikan manipulasi parameter `scope=all`.
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Zero TypeScript & Lint Errors saat `npm run build`.

---

### Task 1: Application Layer DTO & Interface (`TaskDtos.cs` & `IExcelExportService.cs`)

**Files:**
- Modify: `backend/src/TrackerKerja.Application/DTOs/TaskDtos.cs`
- Modify: `backend/src/TrackerKerja.Application/Common/Interfaces/IExcelExportService.cs`

**Interfaces:**
- Produces: `TaskExportFilterDto` record
- Produces: `Task<byte[]> GenerateTasksExcelAsync(TaskExportFilterDto filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken cancellationToken = default)`

- [ ] **Step 1: Tambahkan `TaskExportFilterDto` di `TaskDtos.cs`**

```csharp
public record TaskExportFilterDto
{
    public string Format { get; init; } = "standard"; // "standard" | "arms"
    public DateTimeOffset? StartDate { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? ProjectId { get; init; }
    public int? Status { get; init; }
    public string Scope { get; init; } = "mine"; // "mine" | "all"
}
```

- [ ] **Step 2: Perluas interface `IExcelExportService.cs`**

```csharp
using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IExcelExportService
{
    Task<byte[]> GenerateTimesheetExcelAsync(TimesheetExportFilter filter, int? companyId);
    Task<byte[]> GenerateTasksExcelAsync(
        TaskExportFilterDto filter,
        int? companyId,
        string currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 3: Verifikasi kompilasi Application layer**

Run: `dotnet build backend/src/TrackerKerja.Application/TrackerKerja.Application.csproj`
Expected: `Build succeeded. 0 Error(s)`.

- [ ] **Step 4: Commit perubahan Application layer**

```bash
git add backend/src/TrackerKerja.Application/DTOs/TaskDtos.cs backend/src/TrackerKerja.Application/Common/Interfaces/IExcelExportService.cs
git commit -m "feat(tasks): define TaskExportFilterDto and expand IExcelExportService interface"
```

---

### Task 2: Infrastructure Layer ClosedXML Export & Unit Tests (`ClosedXmlExportService.cs`)

**Files:**
- Create: `backend/tests/TrackerKerja.Tests/TaskExportTests.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlExportService.cs`

**Interfaces:**
- Consumes: `TaskExportFilterDto`, `IExcelExportService`, `AppDbContext`
- Produces: `byte[]` binary excel stream for Standard and ARMS formats

- [ ] **Step 1: Tulis unit test gagal di `TrackerKerja.Tests/TaskExportTests.cs`**

```csharp
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class TaskExportTests
{
    private AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);

        // Seed initial company, users, project, category, tasks
        var company = new Company { Id = 1, Name = "Test Company", Code = "TEST" };
        context.Companies.Add(company);

        var user1 = new ApplicationUser { Id = "user-1", FullName = "Budi Santoso", Email = "budi@test.com", CompanyId = 1 };
        var user2 = new ApplicationUser { Id = "user-2", FullName = "Dewi Lestari", Email = "dewi@test.com", CompanyId = 1 };
        context.Users.AddRange(user1, user2);

        var project = new Project { Id = 10, Name = "Portal E-Commerce", CompanyId = 1, Color = "#4F46E5" };
        context.Projects.Add(project);

        var category = new Category { Id = 20, Name = "Backend API", CompanyId = 1 };
        context.Categories.Add(category);

        var task1 = new WorkTask
        {
            Id = 101,
            Title = "API Checkout Payment",
            Description = "Integrasi payment gateway QRIS",
            ProjectId = 10,
            CategoryId = 20,
            AssignedToUserId = "user-1",
            Priority = TaskPriority.High,
            Status = Domain.Enums.TaskStatus.Done,
            Progress = 100,
            Milestone = "Implementation",
            Obstacle = "Latency webhook",
            Solution = "Tambah async queue",
            CompanyId = 1,
            StartDate = DateTimeOffset.UtcNow.AddDays(-5),
            DueDate = DateTimeOffset.UtcNow.AddDays(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-5)
        };

        var task2 = new WorkTask
        {
            Id = 102,
            Title = "UI Dashboard Admin",
            Description = "Desain halaman analitik",
            ProjectId = 10,
            AssignedToUserId = "user-2",
            Priority = TaskPriority.Medium,
            Status = Domain.Enums.TaskStatus.InProgress,
            Progress = 60,
            Milestone = "System Design",
            CompanyId = 1,
            StartDate = DateTimeOffset.UtcNow.AddDays(-2),
            DueDate = DateTimeOffset.UtcNow.AddDays(3),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2)
        };

        context.Tasks.AddRange(task1, task2);
        context.SaveChanges();

        return context;
    }

    [Fact]
    public async Task GenerateTasksExcelAsync_StandardFormat_ProducesValidWorkbookWith9Columns()
    {
        using var context = CreateInMemoryContext();
        var service = new ClosedXmlExportService(context);

        var filter = new TaskExportFilterDto { Format = "standard", Scope = "all" };
        var bytes = await service.GenerateTasksExcelAsync(filter, 1, "user-admin", isAdmin: true);

        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        var ws = workbook.Worksheets.FirstOrDefault(w => w.Name == "Daftar Tugas");
        Assert.NotNull(ws);

        // Header row should be row 3 with 9 columns
        Assert.Equal("No", ws.Cell(3, 1).GetString());
        Assert.Equal("Proyek", ws.Cell(3, 2).GetString());
        Assert.Equal("Judul Tugas", ws.Cell(3, 3).GetString());
        Assert.Equal("Prioritas", ws.Cell(3, 4).GetString());
        Assert.Equal("Status", ws.Cell(3, 5).GetString());
        Assert.Equal("Progres (%)", ws.Cell(3, 6).GetString());
        Assert.Equal("PIC", ws.Cell(3, 7).GetString());
        Assert.Equal("Tenggat Waktu", ws.Cell(3, 8).GetString());
        Assert.Equal("Kendala & Solusi", ws.Cell(3, 9).GetString());

        // Should have 2 task rows
        Assert.Equal("API Checkout Payment", ws.Cell(4, 3).GetString());
        Assert.Equal("UI Dashboard Admin", ws.Cell(5, 3).GetString());
    }

    [Fact]
    public async Task GenerateTasksExcelAsync_ArmsFormat_ProducesSummarySheetAnd21ColumnsDetail()
    {
        using var context = CreateInMemoryContext();
        var service = new ClosedXmlExportService(context);

        var filter = new TaskExportFilterDto { Format = "arms", Scope = "all" };
        var bytes = await service.GenerateTasksExcelAsync(filter, 1, "user-admin", isAdmin: true);

        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        Assert.Equal(2, workbook.Worksheets.Count);
        var wsSummary = workbook.Worksheets.FirstOrDefault(w => w.Name == "Ringkasan Eksekutif");
        var wsDetail = workbook.Worksheets.FirstOrDefault(w => w.Name == "Rincian Tugas ARMS");

        Assert.NotNull(wsSummary);
        Assert.NotNull(wsDetail);

        // 21 columns on detail sheet
        Assert.Equal("No", wsDetail.Cell(3, 1).GetString());
        Assert.Equal("Project Code", wsDetail.Cell(3, 2).GetString());
        Assert.Equal("Project Name", wsDetail.Cell(3, 3).GetString());
        Assert.Equal("Task Code", wsDetail.Cell(3, 4).GetString());
        Assert.Equal("Updated At", wsDetail.Cell(3, 21).GetString());
    }

    [Fact]
    public async Task GenerateTasksExcelAsync_NonAdmin_EnforcesMineScopeOnly()
    {
        using var context = CreateInMemoryContext();
        var service = new ClosedXmlExportService(context);

        // Non-admin user-1 attempts to request scope="all"
        var filter = new TaskExportFilterDto { Format = "standard", Scope = "all" };
        var bytes = await service.GenerateTasksExcelAsync(filter, 1, "user-1", isAdmin: false);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);
        var ws = workbook.Worksheet("Daftar Tugas");

        // Should only contain user-1's task (row 4 only, row 5 empty)
        Assert.Equal("API Checkout Payment", ws.Cell(4, 3).GetString());
        Assert.True(string.IsNullOrEmpty(ws.Cell(5, 3).GetString()));
    }
}
```

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~TaskExportTests"`
Expected: FAIL with compilation error (metode `GenerateTasksExcelAsync` belum diimplementasikan di `ClosedXmlExportService`).

- [ ] **Step 3: Implementasikan `GenerateTasksExcelAsync` di `ClosedXmlExportService.cs`**

Buka `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlExportService.cs` dan tambahkan implementasi `GenerateTasksExcelAsync`:
- Query `_context.Tasks` dengan filter `CompanyId`.
- Penegakan RBAC (`!isAdmin || filter.Scope == "mine"` -> `t.AssignedToUserId == currentUserId`).
- Filter `ProjectId`, `Status`, dan `StartDate`/`EndDate`.
- Render Format Standar (9 Kolom) dan Format ARMS (Summary + 21 Kolom) lengkap dengan styling ClosedXML.

- [ ] **Step 4: Jalankan test dan verifikasi semua lulus**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~TaskExportTests"`
Expected: PASS (Semua 3 test lulus).

- [ ] **Step 5: Commit implementasi ClosedXmlExportService dan test**

```bash
git add backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlExportService.cs backend/tests/TrackerKerja.Tests/TaskExportTests.cs
git commit -m "feat(tasks): implement ClosedXML task export with Standard and ARMS formats and unit tests"
```

---

### Task 3: WebApi Controller Endpoint & Unit Tests (`TasksController.cs`)

**Files:**
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/TasksController.cs`
- Create: `backend/tests/TrackerKerja.Tests/TasksControllerExportTests.cs`

**Interfaces:**
- Consumes: `IExcelExportService.GenerateTasksExcelAsync`, `ICurrentTenantService`
- Produces: `GET /api/tasks/export` returning FileContentResult

- [ ] **Step 1: Tulis unit test untuk controller di `TrackerKerja.Tests/TasksControllerExportTests.cs`**

```csharp
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class TasksControllerExportTests
{
    [Fact]
    public async Task ExportTasks_ReturnsFileResult_WithCorrectContentType()
    {
        var mockExportService = new Mock<IExcelExportService>();
        var mockTenantService = new Mock<ICurrentTenantService>();
        mockTenantService.Setup(t => t.CompanyId).ToString();

        var fakeBytes = new byte[] { 0x50, 0x4B, 0x03, 0x04 }; // zip/xlsx header
        mockExportService
            .Setup(s => s.GenerateTasksExcelAsync(
                It.IsAny<TaskExportFilterDto>(),
                It.IsAny<int?>(),
                It.IsAny<string>(),
                It.IsAny<bool>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(fakeBytes);

        // Setup controller with context
        var controller = new TasksController(
            null!, // context
            mockTenantService.Object,
            null!, // taskImportService
            mockExportService.Object);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user-123"),
            new Claim(ClaimTypes.Role, "Administrator")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var filter = new TaskExportFilterDto { Format = "arms" };
        var result = await controller.ExportTasks(filter, CancellationToken.None);

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
        Assert.Contains(".xlsx", fileResult.FileDownloadName);
    }
}
```

- [ ] **Step 2: Jalankan test controller untuk memastikan fail**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~TasksControllerExportTests"`
Expected: FAIL (method `ExportTasks` belum ada di `TasksController`).

- [ ] **Step 3: Tambahkan dependency `IExcelExportService` dan endpoint `[HttpGet("export")]` di `TasksController.cs`**

Inject `IExcelExportService` di constructor `TasksController`, lalu tambahkan method:
```csharp
[HttpGet("export")]
public async Task<IActionResult> ExportTasks([FromQuery] TaskExportFilterDto filter, CancellationToken cancellationToken)
{
    var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
    var isAdmin = User.IsInRole("Administrator") || User.IsInRole("SuperAdmin");

    var bytes = await _excelExportService.GenerateTasksExcelAsync(
        filter,
        _tenantService.CompanyId,
        currentUserId,
        isAdmin,
        cancellationToken);

    var prefix = filter.Format?.ToLowerInvariant() == "arms" ? "Laporan_ARMS_Enterprise" : "Laporan_Tugas";
    var fileName = $"{prefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";

    return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
}
```

- [ ] **Step 4: Jalankan test dan verifikasi semua lulus**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~TasksControllerExportTests"`
Expected: PASS.

- [ ] **Step 5: Commit perubahan WebApi Controller**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/TasksController.cs backend/tests/TrackerKerja.Tests/TasksControllerExportTests.cs
git commit -m "feat(tasks): implement GET /api/tasks/export endpoint with RBAC scoping and tests"
```

---

### Task 4: Frontend UI Dialog Ekspor & Integrasi Toolbar (`export-excel-dialog.tsx` & `tasks/page.tsx`)

**Files:**
- Create: `frontend/src/components/tasks/export-excel-dialog.tsx`
- Modify: `frontend/src/app/(with-layouts)/tasks/page.tsx`

**Interfaces:**
- Consumes: `GET /api/tasks/export?format={...}&...` (Blob response), `GET /api/projects`, `GET /profile`
- Produces: Modal dialog UI with export triggers and direct file download

- [ ] **Step 1: Buat komponen `frontend/src/components/tasks/export-excel-dialog.tsx`**

Komponen memuat:
- Kartu pemilih format:
  1. *Format Standar (9 Kolom)*: "Ringkas untuk evaluasi harian/mingguan".
  2. *Format ARMS Enterprise (21 Kolom)*: "Lengkap dengan SDLC Waterfall Milestone & Executive Summary".
- Preset rentang waktu: *Semua Waktu*, *7 Hari Terakhir*, *Bulan Ini*, *30 Hari Terakhir*, *Rentang Kustom*.
- Filter Proyek & Status dropdown.
- RBAC Scope switcher (hanya aktif untuk Admin: "Semua Tim" vs "Tugas Saya").
- Download Handler via `apiClient.get('/tasks/export', { responseType: 'blob', params: ... })` + `URL.createObjectURL(blob)`.
- State visual loading dan feedback Sonner toast.

- [ ] **Step 2: Tambahkan tombol "Ekspor Excel" di toolbar `frontend/src/app/(with-layouts)/tasks/page.tsx`**

Tambahkan tombol di samping tombol "Impor Excel":
```tsx
<Button
  variant="outline"
  onClick={() => setExportModalOpen(true)}
  className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
>
  <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
  Ekspor Excel
</Button>
```
Serta pasang `<ExportTasksDialog open={exportModalOpen} onOpenChange={setExportModalOpen} />`.

- [ ] **Step 3: Uji build frontend Next.js**

Run: `cmd /c "npm --prefix frontend run build"`
Expected: `Compiled successfully` dengan exit code 0 tanpa error TypeScript atau lint.

- [ ] **Step 4: Commit perubahan Frontend UI**

```bash
git add frontend/src/components/tasks/export-excel-dialog.tsx "frontend/src/app/(with-layouts)/tasks/page.tsx"
git commit -m "feat(tasks): create ExportTasksDialog and integrate into tasks page toolbar"
```

---

### Task 5: Full Integration Verification & Smoke Test

**Files:**
- Test all backend and frontend components.

- [ ] **Step 1: Jalankan seluruh suite backend unit test**

Run: `dotnet test backend/TrackerKerja.sln`
Expected: `Passed! Failed: 0, Total: 68+`.

- [ ] **Step 2: Jalankan full production build frontend**

Run: `cmd /c "npm --prefix frontend run build"`
Expected: `Compiled successfully in <time>s`.

- [ ] **Step 3: Verifikasi git status dan ringkasan implementasi**

Run: `git status`
Expected: `working tree clean`.

# Generator Timesheet Otomatis Administrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fitur generator timesheet otomatis bagi Administrator yang mengonversi data tugas (`WorkTask`) menjadi log jam kerja (`WorkSession`) harian 8 jam terdistribusi proporsional sesuai bobot prioritas tugas, dilengkapi sinkronisasi absensi WFO, opsi Overwrite/FillEmpty, serta modal UI interaktif.

**Architecture:** Modul backend berbasis Clean Architecture (.NET 8 WebApi) dengan service `AutomatedTimesheetGeneratorService` yang mengimplementasikan `IAutomatedTimesheetGeneratorService`. Endpoint REST `POST /api/timesheets/auto-generate` khusus Admin. Antarmuka frontend React/Next.js dengan modal `automated-timesheet-generator-modal.tsx` yang terintegrasi di `/timesheets`.

**Tech Stack:** .NET 8, C#, Entity Framework Core, PostgreSQL, Next.js 14 App Router, TypeScript, TailwindCSS, TanStack React Query, Lucide Icons, xUnit, FluentAssertions.

**Spec:** [docs/superpowers/specs/2026-10-27-automated-timesheet-generator-design.md](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docs/superpowers/specs/2026-10-27-automated-timesheet-generator-design.md)

## Global Constraints
- Target total jam kerja per hari kerja aktif (Senin-Jumat) tepat 8.0 jam (28.800 detik).
- Sabtu dan Minggu diabaikan (tidak di-generate sebagai sesi pengerjaan, karena ditangani sebagai baris libur otomatis pada engine ekspor).
- Jam kerja dijadwalkan mulai 08:00 WIB, jeda istirahat 12:00 - 13:00 WIB, dan selesai 17:00 WIB.
- Pembagian jam harian jika ada > 1 tugas dilakukan proporsional berdasarkan bobot prioritas (Urgent: 4, High: 3, Medium: 2, Low: 1) dengan penyesuaian selisih agar total detik persis 28.800.
- Hanya pengguna bertingkat Administrator yang diizinkan memanggil endpoint generator.

---

### Task 1: DTO Models & Service Interface

**Files:**
- Modify: `backend/src/TrackerKerja.Application/DTOs/TimesheetDtos.cs`
- Create: `backend/src/TrackerKerja.Application/Common/Interfaces/IAutomatedTimesheetGeneratorService.cs`
- Test: `backend/tests/TrackerKerja.Tests/AutomatedTimesheetDtoTests.cs`

**Interfaces:**
- Produces:
  - `AutoGenerateTimesheetRequest(int? CompanyId, int PeriodId, string? UserId, string Mode)`
  - `AutoGenerateTimesheetResultDto(bool Success, string Message, int UsersProcessedCount, int WorkingDaysCount, int GeneratedSessionsCount, int AttendancesCreatedCount, double TotalHoursGenerated)`
  - `IAutomatedTimesheetGeneratorService.GenerateTimesheetsAsync(AutoGenerateTimesheetRequest request, int companyId, CancellationToken cancellationToken)`

- [ ] **Step 1: Write failing test for DTOs and Interface contract**

Create `backend/tests/TrackerKerja.Tests/AutomatedTimesheetDtoTests.cs`:
```csharp
using FluentAssertions;
using TrackerKerja.Application.DTOs;
using Xunit;

namespace TrackerKerja.Tests;

public class AutomatedTimesheetDtoTests
{
    [Fact]
    public void AutoGenerateTimesheetRequest_ShouldStorePropertiesProperly()
    {
        var request = new AutoGenerateTimesheetRequest(
            CompanyId: 10,
            PeriodId: 5,
            UserId: "all",
            Mode: "Overwrite"
        );

        request.CompanyId.Should().Be(10);
        request.PeriodId.Should().Be(5);
        request.UserId.Should().Be("all");
        request.Mode.Should().Be("Overwrite");
    }

    [Fact]
    public void AutoGenerateTimesheetResultDto_ShouldStoreMetricsProperly()
    {
        var result = new AutoGenerateTimesheetResultDto(
            Success: true,
            Message: "Berhasil",
            UsersProcessedCount: 4,
            WorkingDaysCount: 21,
            GeneratedSessionsCount: 84,
            AttendancesCreatedCount: 84,
            TotalHoursGenerated: 168.0
        );

        result.Success.Should().BeTrue();
        result.UsersProcessedCount.Should().Be(4);
        result.WorkingDaysCount.Should().Be(21);
        result.GeneratedSessionsCount.Should().Be(84);
        result.AttendancesCreatedCount.Should().Be(84);
        result.TotalHoursGenerated.Should().Be(168.0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "AutomatedTimesheetDtoTests"
```
Expected: FAIL because `AutoGenerateTimesheetRequest` and `AutoGenerateTimesheetResultDto` do not exist yet.

- [ ] **Step 3: Implement DTOs and IAutomatedTimesheetGeneratorService**

Append to `backend/src/TrackerKerja.Application/DTOs/TimesheetDtos.cs`:
```csharp
public record AutoGenerateTimesheetRequest(
    int? CompanyId,
    int PeriodId,
    string? UserId = "all",
    string Mode = "Overwrite"
);

public record AutoGenerateTimesheetResultDto(
    bool Success,
    string Message,
    int UsersProcessedCount,
    int WorkingDaysCount,
    int GeneratedSessionsCount,
    int AttendancesCreatedCount,
    double TotalHoursGenerated
);
```

Create `backend/src/TrackerKerja.Application/Common/Interfaces/IAutomatedTimesheetGeneratorService.cs`:
```csharp
using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IAutomatedTimesheetGeneratorService
{
    Task<AutoGenerateTimesheetResultDto> GenerateTimesheetsAsync(
        AutoGenerateTimesheetRequest request,
        int companyId,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "AutomatedTimesheetDtoTests"
```
Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add backend/src/TrackerKerja.Application/DTOs/TimesheetDtos.cs backend/src/TrackerKerja.Application/Common/Interfaces/IAutomatedTimesheetGeneratorService.cs backend/tests/TrackerKerja.Tests/AutomatedTimesheetDtoTests.cs
git commit -m "feat: add DTOs and interface for automated timesheet generator"
```

---

### Task 2: Service Implementation & Proportional Priority Engine

**Files:**
- Create: `backend/src/TrackerKerja.Infrastructure/Services/AutomatedTimesheetGeneratorService.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs`
- Test: `backend/tests/TrackerKerja.Tests/AutomatedTimesheetGeneratorServiceTests.cs`

**Interfaces:**
- Consumes:
  - `AppDbContext`
  - `TimesheetPeriod`
  - `WorkTask`
  - `WorkSession`
  - `Attendance`
- Produces:
  - `AutomatedTimesheetGeneratorService` implementing `IAutomatedTimesheetGeneratorService`
  - Proportional division of 28,800 seconds (8 hours) based on `TaskPriority`
  - Scheduling sessions around 12:00 - 13:00 lunch break
  - Creation of `Attendance` records (08:00 - 17:00, WFO)

- [ ] **Step 1: Write failing unit tests for AutomatedTimesheetGeneratorService**

Create `backend/tests/TrackerKerja.Tests/AutomatedTimesheetGeneratorServiceTests.cs`:
- Test 1: Single task in a day gets exactly 28,800 seconds (8.0 hours), 08:00 to 17:00 with lunch gap.
- Test 2: Multiple tasks (e.g. Urgent + Low, weights 4 + 1 = 5) divide proportionally ($4/5 \times 28800 = 23040$s and $1/5 \times 28800 = 5760$s, summing to 28,800s).
- Test 3: Weekend days (Saturday & Sunday) are skipped.
- Test 4: Mode `Overwrite` deletes prior sessions in period, while `FillEmptyOnly` skips days with $\ge 8$ hours.
- Test 5: Missing attendance records are created with ClockIn 08:00, ClockOut 17:00, and Location WFO.

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "AutomatedTimesheetGeneratorServiceTests"
```
Expected: FAIL because service is not implemented yet.

- [ ] **Step 3: Implement AutomatedTimesheetGeneratorService**

Create `backend/src/TrackerKerja.Infrastructure/Services/AutomatedTimesheetGeneratorService.cs`:
Implement:
- Query `TimesheetPeriod` by `request.PeriodId` and `companyId`.
- Query target users (`u.CompanyId == companyId && u.IsApproved && u.RejectionReason == null`). If `request.UserId` != "all", filter for that specific user.
- Query tasks for the company and users.
- Loop each date between `period.StartDate` and `period.EndDate`:
  - If date is Saturday or Sunday, skip.
  - For each user:
    - If `Mode == "FillEmptyOnly"`, check existing duration for that date. If $\ge 28800$, skip.
    - If `Mode == "Overwrite"`, remove existing sessions for that date.
    - Filter user's active tasks for date:
      - Has `StartDate` and `DueDate` with `date >= StartDate && date <= DueDate`.
      - Or `StartDate` only with `date >= StartDate`.
      - Or fallback to all active tasks of user if none match exact date.
    - If no tasks at all for user, fallback to company general tasks.
    - Calculate weights:
      - `Urgent` -> 4
      - `High` -> 3
      - `Medium` -> 2
      - `Low` -> 1
    - Allocate seconds: `dur = (int)Math.Round((double)w / totalWeight * 28800)`.
    - Adjust residual seconds so `sum(dur) == 28800`.
    - Generate `WorkSession` entries starting from 08:00:
      - Split or advance time across 12:00 - 13:00 lunch break.
    - Check/Insert `Attendance`:
      - If no attendance on `date`, add `Attendance` with `ClockIn = 08:00:00`, `ClockOut = 17:00:00`, `WorkLocation = WFO`.
- Save changes to database and return `AutoGenerateTimesheetResultDto`.

Register in `backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs`:
`services.AddScoped<IAutomatedTimesheetGeneratorService, AutomatedTimesheetGeneratorService>();`

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "AutomatedTimesheetGeneratorServiceTests"
```
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add backend/src/TrackerKerja.Infrastructure/Services/AutomatedTimesheetGeneratorService.cs backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs backend/tests/TrackerKerja.Tests/AutomatedTimesheetGeneratorServiceTests.cs
git commit -m "feat: implement AutomatedTimesheetGeneratorService with proportional priority weights and attendance creation"
```

---

### Task 3: Backend Controller Endpoint & Authorization

**Files:**
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/TimesheetsController.cs`
- Test: `backend/tests/TrackerKerja.Tests/TimesheetsAutoGenerateControllerTests.cs`

**Interfaces:**
- Produces:
  - `POST /api/timesheets/auto-generate`
  - Validates `_tenantService.IsAdmin` (returns 403 Forbidden for non-admin)
  - Validates company and period
  - Calls `IAutomatedTimesheetGeneratorService.GenerateTimesheetsAsync`

- [ ] **Step 1: Write failing controller test**

Create `backend/tests/TrackerKerja.Tests/TimesheetsAutoGenerateControllerTests.cs`:
- Test that non-admin receives 403 Forbidden.
- Test that admin with valid request receives 200 OK and summary result.

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "TimesheetsAutoGenerateControllerTests"
```
Expected: FAIL because endpoint does not exist.

- [ ] **Step 3: Implement endpoint in TimesheetsController.cs**

Inject `IAutomatedTimesheetGeneratorService` into `TimesheetsController`.
Add action:
```csharp
[HttpPost("auto-generate")]
public async Task<IActionResult> AutoGenerateTimesheets(
    [FromBody] AutoGenerateTimesheetRequest request,
    CancellationToken cancellationToken)
{
    if (!_tenantService.IsAdmin) return Forbid();

    var targetCompanyId = request.CompanyId ?? _tenantService.CompanyId;
    if (!targetCompanyId.HasValue)
    {
        return BadRequest(new { success = false, message = "ID perusahaan tidak valid." });
    }

    var result = await _autoGenService.GenerateTimesheetsAsync(request, targetCompanyId.Value, cancellationToken);
    return Ok(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "TimesheetsAutoGenerateControllerTests"
```
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/TimesheetsController.cs backend/tests/TrackerKerja.Tests/TimesheetsAutoGenerateControllerTests.cs
git commit -m "feat: add POST auto-generate endpoint in TimesheetsController with admin authorization"
```

---

### Task 4: Frontend Automated Timesheet Generator Modal

**Files:**
- Create: `frontend/src/components/timesheets/automated-timesheet-generator-modal.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/companies`
  - `GET /api/companies/{companyId}/timesheet-periods`
  - `GET /api/members?companyId={companyId}`
  - `POST /api/timesheets/auto-generate`
- Produces:
  - Modal component `<AutomatedTimesheetGeneratorModal open={...} onOpenChange={...} />`
  - Interactive selection of Company, Period, Target Personel ("all" or individual), and Generation Mode ("Overwrite" vs "FillEmptyOnly").
  - Live metric card showing Target Working Days & Total Expected Hours ($days \times 8$).
  - Explanatory card on proportional priority weights ($Urgent=4, High=3, Medium=2, Low=1$) and automatic WFO attendance sync.

- [ ] **Step 1: Implement automated-timesheet-generator-modal.tsx**

Write complete, robust modal component matching design system guidelines.

- [ ] **Step 2: Run typecheck check**

Run:
```powershell
cmd /c "npx tsc --noEmit"
```
Expected: PASS.

- [ ] **Step 3: Commit Task 4**

```bash
git add frontend/src/components/timesheets/automated-timesheet-generator-modal.tsx
git commit -m "feat: create automated timesheet generator modal component"
```

---

### Task 5: Frontend Integration on /timesheets Page

**Files:**
- Modify: `frontend/src/app/(with-layouts)/timesheets/page.tsx`

**Interfaces:**
- Produces:
  - Tombol *"Generate Timesheet Otomatis"* di samping *"Ekspor Standar Perusahaan (ELISTEC)"*.
  - Menampilkan modal saat tombol ditekan.
  - Memanggil query invalidation untuk `timesheetSessions`, `timesheetSummary`, dan `activeTimers` setelah proses generate selesai.

- [ ] **Step 1: Integrate modal into timesheets/page.tsx**

Add state `autoGenModalOpen`.
Add Admin button with `Sparkles` or `Wand2` icon in header button group.
Render `<AutomatedTimesheetGeneratorModal open={autoGenModalOpen} onOpenChange={setAutoGenModalOpen} />`.

- [ ] **Step 2: Run TypeScript typecheck**

Run:
```powershell
cmd /c "npx tsc --noEmit"
```
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit Task 5**

```bash
git add "frontend/src/app/(with-layouts)/timesheets/page.tsx"
git commit -m "feat: integrate automated timesheet generator trigger button on timesheets page"
```

---

### Task 6: End-to-End Verification & Real Timesheet Generation Test

**Files:**
- Run full backend test suite: `dotnet test`
- Run Python verification script to test auto-generation flow and inspect generated `WorkSession` & `Attendance` records.
- Run frontend typecheck: `cmd /c "npx tsc --noEmit"`.

- [ ] **Step 1: Run all timesheet and backend tests**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~Timesheet"
```
Expected: All tests PASS.

- [ ] **Step 2: Verify frontend builds without error**

Run:
```powershell
cmd /c "npx tsc --noEmit"
```
Expected: 0 errors.

- [ ] **Step 3: Final Git status and commit**

```bash
git status
git commit -am "chore: complete end-to-end verification of automated timesheet generator"
```

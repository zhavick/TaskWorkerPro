# Interactive Calendar & Task Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul kalender tugas interaktif lengkap (FSD 5.14) dengan dedicated REST API (`/api/calendar/events`), penegakan hak akses RBAC scoping (`mine` vs `all`), multi-view (Bulan, Minggu, Hari, Agenda), dan modal popup detail tugas interaktif dengan quick status update.

**Architecture:** Menggunakan arsitektur Clean Architecture: DTOs di `TrackerKerja.Application`, Controller REST API di `TrackerKerja.WebApi`, Unit Test TDD di `TrackerKerja.Tests`, dan antarmuka responsif Next.js 16 + TailGrids di `frontend/src/app/(with-layouts)/calendar/page.tsx`.

**Tech Stack:** ASP.NET Core 8.0, EF Core 8.0, Next.js 16, React Query, TailGrids, Lucide Icons, xUnit.

**Spec:** [`docs/superpowers/specs/2026-10-13-calendar-task-integration-design.md`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docs/superpowers/specs/2026-10-13-calendar-task-integration-design.md)

## Global Constraints
- Framework C#: .NET 8.0 C# 12.
- Framework Web: Next.js 16 + React 19 + TailGrids.
- Zero dependency kalender eksternal berat (menggunakan TailGrids responsive grid system).
- Penegakan Multi-Tenant `CurrentCompanyId` dan RBAC (`filter=mine` otomatis untuk non-admin).

---

### Task 1: Application Layer DTOs (`CalendarDtos.cs`)

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/CalendarDtos.cs`

**Interfaces:**
- Produces: `CalendarEventDto`, `QuickUpdateTaskStatusRequest`.

- [ ] **Step 1: Create `CalendarDtos.cs`**

```csharp
namespace TrackerKerja.Application.DTOs;

public record CalendarEventDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset? Start { get; init; }
    public DateTimeOffset? End { get; init; }
    public string Priority { get; init; } = "Medium";
    public string PriorityColor { get; init; } = "#3B82F6";
    public string Status { get; init; } = "Todo";
    public string StatusColor { get; init; } = "#6366F1";
    public int Progress { get; init; }
    public string? ProjectName { get; init; }
    public string ProjectColor { get; init; } = "#6366F1";
    public int? ProjectId { get; init; }
    public string? CategoryName { get; init; }
    public string? AssignedToUserId { get; init; }
    public string? AssignedToUserName { get; init; }
    public string? AssignedToUserAvatarColor { get; init; }
    public string? Milestone { get; init; }
    public string? Obstacle { get; init; }
    public string? Solution { get; init; }
    public bool IsOverdue { get; init; }
    public bool AllDay { get; init; } = true;
}

public record QuickUpdateTaskStatusRequest(
    Domain.Enums.TaskStatus Status,
    int? Progress
);
```

- [ ] **Step 2: Verify Compilation**

Run: `dotnet build backend/src/TrackerKerja.Application/TrackerKerja.Application.csproj`
Expected: Build succeeded with 0 errors.

- [ ] **Step 3: Commit DTOs**

```bash
git add backend/src/TrackerKerja.Application/DTOs/CalendarDtos.cs
git commit -m "feat(calendar): add CalendarEventDto and QuickUpdateTaskStatusRequest"
```

---

### Task 2: WebApi Controller & Unit Tests (`CalendarController.cs`)

**Files:**
- Create: `backend/tests/TrackerKerja.Tests/CalendarControllerTests.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/CalendarController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`, `CalendarEventDto`, `QuickUpdateTaskStatusRequest`.
- Produces: `CalendarController` endpoints (`GET /api/calendar/events`, `PATCH /api/calendar/events/{id}/status`).

- [ ] **Step 1: Write failing unit tests in `TrackerKerja.Tests/CalendarControllerTests.cs`**

Write tests for:
- Date range filtering (`start` and `end`).
- RBAC scoping: Non-admin is restricted to tasks assigned to themselves; admin can toggle `filter=all` or `filter=mine`.
- Project and Status filtering.
- Quick status update patch: Changing status to `Done` automatically sets progress to `100`.

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~CalendarControllerTests"`
Expected: FAIL because `CalendarController` does not exist yet.

- [ ] **Step 3: Implement `CalendarController.cs` in `TrackerKerja.WebApi/Controllers`**

Implement `CalendarController` with:
- `[HttpGet("events")]`: filtering by tenant, date range, RBAC scope, project, and status, projecting into `CalendarEventDto`.
- `[HttpPatch("events/{id}/status")]`: updating task status and auto-adjusting progress.

- [ ] **Step 4: Run tests and verify they pass**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~CalendarControllerTests"`
Expected: PASS with 0 failed tests.

- [ ] **Step 5: Commit Calendar Controller implementation**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/CalendarController.cs backend/tests/TrackerKerja.Tests/CalendarControllerTests.cs
git commit -m "feat(calendar): implement CalendarController with RBAC scoping and unit tests"
```

---

### Task 3: Frontend Multi-View Calendar & Interactive Task Detail Modal (`calendar/page.tsx`)

**Files:**
- Modify: `frontend/src/app/(with-layouts)/calendar/page.tsx`

**Interfaces:**
- Consumes: `/api/calendar/events`, `/api/calendar/events/{id}/status`, `/api/projects`, `/api/master/statuses`.

- [ ] **Step 1: Update `calendar/page.tsx` with dedicated calendar API integration & multi-views**

Implement:
- React Query hooking into `/api/calendar/events?start={}&end={}&filter={}&projectId={}&status={}`.
- View modes: Month (Grid), Week (7 columns), Day (timeline), Agenda (chronological list).
- Filter toolbar: RBAC scope selector, Project dropdown filter, Status pill filter, Month/Year jumper.
- Task detail modal: full task details, quick status change buttons (1-click call to `PATCH /api/calendar/events/{id}/status`), direct link to studio edit `/tasks/{id}`.
- Day task recap popup when clicking on dates with many tasks.

- [ ] **Step 2: Test frontend compilation with `npm run build`**

Run: `cmd /c "npm --prefix frontend run build"`
Expected: Build succeeded with 0 TypeScript errors.

- [ ] **Step 3: Commit Frontend UI changes**

```bash
git add "frontend/src/app/(with-layouts)/calendar/page.tsx"
git commit -m "feat(calendar): enhance calendar UI with multi-views, dedicated API integration, and interactive detail modal"
```

---

### Task 4: Full Integration Verification & Smoke Test

**Files:**
- Solution-wide validation.

- [ ] **Step 1: Run complete backend test suite**

Run: `dotnet test backend/TrackerKerja.sln`
Expected: 100% tests pass.

- [ ] **Step 2: Run frontend production build**

Run: `cmd /c "npm --prefix frontend run build"`
Expected: 100% build succeeds.

- [ ] **Step 3: Commit and summarize implementation**

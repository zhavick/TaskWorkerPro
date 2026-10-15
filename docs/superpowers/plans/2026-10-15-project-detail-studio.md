# FSD 5.4 & FSD 5.21.5 Project Studio Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun halaman studio detail proyek bentang penuh 12-kolom (`/projects/[id]`) dengan analitik finansial Burn Rate, agregasi jam kerja riil, tabel interaktif tugas terikat, dialog alokasi tugas massal, dan endpoint pendukung backend.

**Architecture:** Menggunakan arsitektur Clean Architecture: DTOs di `TrackerKerja.Application`, Controller REST API di `TrackerKerja.WebApi`, Unit Test TDD di `TrackerKerja.Tests`, dan antarmuka responsif Next.js 16 + TailGrids UI di `frontend/src/app/(with-layouts)/projects/[id]/page.tsx`.

**Tech Stack:** ASP.NET Core 8.0, EF Core 8.0, Next.js 16 (React 19, TypeScript, Tailwind CSS v4, TailGrids UI, TanStack Query, Lucide Icons, Sonner), xUnit.

**Spec:** [`docs/superpowers/specs/2026-10-15-project-detail-studio-design.md`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docs/superpowers/specs/2026-10-15-project-detail-studio-design.md)

## Global Constraints
- Target Framework: .NET 8.0 C# 12 dan Next.js 16 (React 19, Tailwind CSS v4).
- Isolasi Multi-Tenant: Query proyek dan tugas terisolasi ketat berdasarkan `CompanyId`.
- Tata Letak Lebar Penuh: Studio menggunakan CSS Grid 12-kolom (`lg:grid-cols-12`) tanpa pembatasan lebar kontainer sempit.
- Formula Burn Rate: `(ActualCost / Budget) * 100%`, kode warna: Emerald (<80%), Amber (80-100%), Rose (>100%).

---

### Task 1: Application Layer DTOs (`ProjectDtos.cs`)

**Files:**
- Modify: `backend/src/TrackerKerja.Application/DTOs/ProjectDtos.cs`

**Interfaces:**
- Produces: `ProjectTaskItemDto`, `ProjectDetailDto`.

- [x] **Step 1: Add `ProjectTaskItemDto` and `ProjectDetailDto` in `ProjectDtos.cs`**

```csharp
public record ProjectTaskItemDto(
    int Id,
    string TaskCode,
    string Title,
    string? Description,
    TaskStatus Status,
    Priority Priority,
    int Progress,
    string? Milestone,
    string? CategoryName,
    string? AssignedToUserId,
    string? AssignedToUserName,
    string? AssignedToUserAvatarColor,
    DateTimeOffset? DueDate,
    long TotalDurationSeconds
);

public record ProjectDetailDto(
    int Id,
    string Name,
    string? Description,
    string Color,
    ProjectStatus Status,
    string? ClientName,
    string? ProjectManagerId,
    string? ProjectManagerName,
    string? ProjectManagerEmail,
    string? ProjectManagerAvatarColor,
    decimal Budget,
    decimal ActualCost,
    double BurnRatePercent,
    string BurnRateStatus, // "Safe", "Warning", "Overbudget"
    int TotalTasks,
    int CompletedTasks,
    int ProgressPercent,
    long TotalWorkDurationSeconds,
    DateTimeOffset? Deadline,
    DateTimeOffset CreatedAt,
    List<ProjectTaskItemDto> Tasks
);
```

- [x] **Step 2: Verify Compilation**

Run: `dotnet build backend/src/TrackerKerja.Application/TrackerKerja.Application.csproj`
Expected: Build succeeded with 0 errors.

- [x] **Step 3: Commit DTO additions**

```bash
git add backend/src/TrackerKerja.Application/DTOs/ProjectDtos.cs
git commit -m "feat(projects): add ProjectTaskItemDto and ProjectDetailDto"
```

---

### Task 2: Backend Controller & Unit Tests (`ProjectsController.cs` & `ProjectsControllerTests.cs`)

**Files:**
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/ProjectsController.cs`
- Modify: `backend/tests/TrackerKerja.Tests/ProjectsControllerTests.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`, `ProjectDetailDto`.
- Produces: Enhanced `GET /api/projects/{id}` returning `ProjectDetailDto`, new `POST /api/projects/{id}/unassign-task/{taskId}` endpoint.

- [x] **Step 1: Write unit tests in `ProjectsControllerTests.cs`**

Write tests for:
- `GetProjectById` returning `ProjectDetailDto` with mapped tasks and total session duration.
- `UnassignTask` endpoint setting task `ProjectId = null`.
- Non-existent project returning 404.

- [x] **Step 2: Run tests to verify failure**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~ProjectsControllerTests"`

- [x] **Step 3: Implement `GetProjectById` and `UnassignTask` in `ProjectsController.cs`**

Enhance `GetProjectById`:
- Include ProjectManager, Tasks, Category, AssignedToUser.
- Fetch work sessions belonging to this project's tasks to calculate `totalWorkDurationSeconds` and individual task `TotalDurationSeconds`.
- Project into `ProjectDetailDto`.

Implement `UnassignTask`:
```csharp
[HttpPost("{id}/unassign-task/{taskId}")]
public async Task<IActionResult> UnassignTask(int id, int taskId)
{
    var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == id);
    if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan pada proyek ini." });

    task.ProjectId = null;
    task.UpdatedAt = DateTimeOffset.UtcNow;
    await _context.SaveChangesAsync();

    return Ok(new { success = true, message = $"Tugas '{task.Title}' berhasil dilepaskan dari proyek." });
}
```

- [x] **Step 4: Run tests to verify all pass**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~ProjectsControllerTests"`
Expected: All tests pass.

- [x] **Step 5: Commit backend controller updates**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/ProjectsController.cs backend/tests/TrackerKerja.Tests/ProjectsControllerTests.cs
git commit -m "feat(projects): enhance GetProjectById with tasks and add unassign task endpoint"
```

---

### Task 3: Frontend Project Studio Page (`frontend/src/app/(with-layouts)/projects/[id]/page.tsx`)

**Files:**
- Create: `frontend/src/app/(with-layouts)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/projects/{id}`, `PUT /api/projects/{id}`, `GET /api/projects/{id}/unassigned-tasks`, `POST /api/projects/{id}/assign-tasks`, `POST /api/projects/{id}/unassign-task/{taskId}`, `DELETE /api/projects/{id}`, `GET /api/members`.

- [x] **Step 1: Create `frontend/src/app/(with-layouts)/projects/[id]/page.tsx`**

Implement:
- Top breadcrumbs & back link to `/projects`.
- 12-column layout (`lg:grid-cols-12 gap-6`):
  - **Left 8-col workspace**:
    - Executive Title Banner with Project Color Badge, Client entity, and Description.
    - Financial Burn Rate card:
      - 3 KPI metric tiles: Pagu Anggaran (Budget), Biaya Riil (Actual Cost), Sisa Saldo (Remaining Budget).
      - Visual adaptive Burn Rate progress bar (<80% Emerald, 80-100% Amber, >100% Rose).
    - Workload & Time Summary Cards:
      - Total Tasks & Completion Rate (%).
      - Accumulated Work Hours and Man-Days (MD) conversion (8h/MD).
    - Project Tasks Workbench:
      - Search input & status filter pills (Semua, Todo, In Progress, Review, Done).
      - Table: Task Code, Title, Priority badge, Progress slider visual, PIC name & avatar, Direct link to `/tasks/{id}`, Unassign button.
  - **Right 4-col sticky panel**:
    - Status Switcher (`Active`, `Completed`, `Archived`).
    - Project Manager info card & selector.
    - Target Deadline indicator with overdue warning if date passed.
    - Action buttons:
      - "+ Alokasi Tugas Massal" (opens modal).
      - "Simpan Perubahan Metadata Proyek".
      - "Hapus Proyek" (Admin only, confirmation dialog).
  - Bulk Task Assignment Dialog:
    - Multi-select checklist table for unassigned tasks.

- [x] **Step 2: Verify TypeScript Compilation**

Run: `cmd.exe /c "npm --prefix frontend run build"`
Expected: Compiled successfully with 0 errors.

- [x] **Step 3: Commit Studio Page**

```bash
git add "frontend/src/app/(with-layouts)/projects/[id]/page.tsx"
git commit -m "feat(projects): implement full-width 12-column project studio detail page"
```

---

### Task 4: Link Project Cards to Studio Page in `/projects/page.tsx`

**Files:**
- Modify: `frontend/src/app/(with-layouts)/projects/page.tsx`

**Interfaces:**
- Consumes: Next.js `Link` component.
- Produces: Action button "Buka Studio Proyek" on each project card.

- [x] **Step 1: Update project cards in `projects/page.tsx`**

Add prominent link button to `/projects/${p.id}` on each card.

- [x] **Step 2: Verify Frontend Build**

Run: `cmd.exe /c "npm --prefix frontend run build"`
Expected: Build passes.

- [x] **Step 3: Commit Navigation Link**

```bash
git add "frontend/src/app/(with-layouts)/projects/page.tsx"
git commit -m "feat(projects): add studio navigation links on project cards"
```

---

### Task 5: End-to-End Verification

**Files:**
- All touched files.

- [x] **Step 1: Run complete backend test suite**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj`
Expected: 100% passed.

- [x] **Step 2: Run complete frontend production build**

Run: `cmd.exe /c "npm --prefix frontend run build"`
Expected: Build succeeds with static route `/projects/[id]`.

# FSD 5.4 & FSD 5.21.5: Project Studio Detail & Financial Burn Rate Specification

## 1. Overview & Business Objectives
The Project Management & Financial Analytics module (FSD 5.4) and Full-Width Responsive Studio Layout (FSD 5.21.5) require an interactive, widescreen 12-column studio detail page for projects (`/projects/[id]`).

### Objectives:
1. Provide an executive summary of the project scope, financial burn rate, and real-time budget tracking.
2. Display financial indicators:
   - Budget, Actual Cost, and Remaining Budget (`Budget - ActualCost`).
   - Adaptive Burn Rate formula: `(ActualCost / Budget) * 100%`.
   - Adaptive visual status:
     - **Emerald (< 80%)**: Safe expenditure.
     - **Amber (80% - 100%)**: Nearing threshold warning.
     - **Rose (> 100%)**: Overbudget alert.
3. Aggregate workload metrics:
   - Total Tasks count and Completed Tasks percentage.
   - Total accumulated work hours from associated `WorkSessions`.
4. Provide a full task workbench within the project:
   - Table of all tasks assigned to the project with search, status filters, priority badges, progress slider display, and PIC avatars.
   - Direct link from each task to the task studio edit page (`/tasks/{id}`).
   - Ability to detach/unassign a task from the project without deleting it.
5. Interactive Bulk Task Allocation dialog:
   - Modal to inspect unassigned tasks in the company and link them in bulk.
6. Responsive 12-Column Studio Layout:
   - 8-column main workbench (left): executive header, financial KPI cards & progress bar, project tasks table.
   - 4-column control panel (right - sticky): workflow status toggle (`Active`, `Completed`, `Archived`), Project Manager card, target deadline with countdown, and primary action buttons.

---

## 2. Architecture & Data Contracts

### 2.1 Backend Models & DTOs (`TrackerKerja.Application/DTOs/ProjectDtos.cs`)

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

### 2.2 REST Endpoints (`TrackerKerja.WebApi/Controllers/ProjectsController.cs`)

1. **`GET /api/projects/{id}`**:
   - Queries `Project` with `.Include(p => p.ProjectManager)` and `.Include(p => p.Tasks).ThenInclude(t => t.AssignedToUser)` and `.Include(p => p.Tasks).ThenInclude(t => t.Category)`.
   - Queries total work session duration from `_context.Sessions` for all tasks in this project.
   - Returns `ProjectDetailDto`.
   - Multi-tenant scoped by `CompanyId`.

2. **`POST /api/projects/{id}/unassign-task/{taskId}`**:
   - Locates task belonging to project `id`.
   - Sets `task.ProjectId = null` and updates `UpdatedAt`.
   - Returns standard success envelope.

3. **`POST /api/projects/{id}/assign-tasks`**:
   - Existing endpoint, consumes `BulkAssignTasksRequest` (`List<int> TaskIds`), sets `task.ProjectId = id`.

4. **`PUT /api/projects/{id}`**:
   - Existing endpoint, updates project metadata (Name, Description, Color, Status, ClientName, ProjectManagerId, Budget, ActualCost, Deadline).

---

## 3. Frontend Architecture (`frontend/src/app/(with-layouts)/projects/[id]/page.tsx`)

### 3.1 State Management & API Hooks
- Uses `@tanstack/react-query` with key `["projectDetail", projectId]`.
- Mutations for:
  - Update project properties (`PUT /api/projects/{id}`).
  - Bulk assign tasks (`POST /api/projects/{id}/assign-tasks`).
  - Unassign task (`POST /api/projects/{id}/unassign-task/{taskId}`).
  - Delete project (`DELETE /api/projects/{id}`) with router redirection back to `/projects`.

### 3.2 Visual Structure (TailGrids Grid System)
```
+---------------------------------------------------------------------------------------------------+
| Top Navigation / Breadcrumbs: "Proyek" > [Nama Proyek]                                           |
+------------------------------------------------------------------+--------------------------------+
| LEFT WORKSPACE (lg:col-span-8)                                   | RIGHT CONTROL PANEL (col-span-4)|
| 1. Executive Banner & Color Accent Pill                          | 1. Workflow Status Switcher    |
| 2. Financial Analytics & Adaptive Burn Rate Progress Bar        | 2. Project Manager Card        |
|    - Pagu Anggaran (Budget)                                      | 3. Target Deadline & Schedule  |
|    - Biaya Aktual (Actual Cost)                                  | 4. Action Buttons:             |
|    - Sisa Anggaran (Remaining Budget)                            |    - "+ Alokasi Tugas Massal"  |
|    - Burn Rate Progress Bar (Emerald / Amber / Rose)             |    - "Simpan Perubahan"        |
| 3. Workload & Time Summary Cards:                                |    - "Hapus Proyek" (Admin)    |
|    - Total Tasks & Completion Rate (%)                           |                                |
|    - Total Accumulated Work Hours (Hours + Man-Days conversion)  |                                |
| 4. Project Tasks Table:                                          |                                |
|    - Search & Status Filter pills                                |                                |
|    - Table: Code, Title, Priority, Progress Slider, PIC, Action  |                                |
|    - Action: Studio Link (/tasks/{id}), Unassign button          |                                |
+------------------------------------------------------------------+--------------------------------+
```

### 3.3 Integration with `/projects/page.tsx`
- Enhance the project cards on `/projects` to include a prominent **"Buka Studio Proyek"** action linking to `/projects/${p.id}`.

---

## 4. Testing & Quality Assurance
- **Unit Tests (`ProjectsControllerTests.cs`)**:
  - Test `GetProjectById` returns `ProjectDetailDto` with tasks and correct work session duration.
  - Test `UnassignTask` endpoint removes project association and leaves task intact.
  - Test Burn Rate calculation edge cases (`Budget == 0`, `ActualCost > Budget`, `ActualCost == 0`).
- **Frontend Verification**:
  - Verify Next.js Turbopack build succeeds (`npm run build`) with zero TypeScript errors.

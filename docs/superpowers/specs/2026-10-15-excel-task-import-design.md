# Design Spec: Excel Task Import (FSD 5.10)

## 1. Overview & Objective
Implement a robust, modern Excel Task Import workflow according to **FSD 5.10** for TrackerKerja Modern.
The feature enables Administrators to:
1. Download official templates: Standard (9 columns) and ARMS format (21 columns).
2. Upload an Excel `.xlsx` file and receive an interactive **Preview & Validation** report before writing anything to the database.
3. Review rows flagged as `Valid`, `Warning` (e.g., unmatched project/PIC/category where soft fallback applies), or `Error` (e.g., missing task title).
4. Apply Bulk PIC assignment and Default Project fallback for rows lacking explicit project or PIC definitions.
5. Commit only valid/approved rows in a single atomic database transaction.

## 2. Supported Formats & Column Mapping

### 2.1 Standard Format (9 Columns)
| # | Column Name | Target Property | Validation Rule | Fallback / Default |
|---|-------------|-----------------|-----------------|--------------------|
| 1 | Kode Tugas | TaskCode | Optional (alphanumeric) | Auto-generated or null |
| 2 | Judul Tugas | Title | **Required** (non-empty string) | If missing -> `Error` |
| 3 | Deskripsi | Description | Optional string | Null |
| 4 | Proyek | ProjectName | Optional string | Match existing or fallback to defaultProjectId |
| 5 | Prioritas | Priority | Optional string: Rendah/Sedang/Tinggi/Kritis | `Medium` |
| 6 | Status | Status | Optional string: Todo/InProgress/Done/Overdue | `Todo` |
| 7 | Progres (%) | Progress | Optional integer (0-100) or decimal (0.0-1.0) | 0 (or 100 if Status=Done) |
| 8 | Email / Nama PIC | PicIdentifier | Optional string | Match User by Email or FullName; fallback to bulk PIC |
| 9 | Target Selesai | DueDate | Optional date | Null |

### 2.2 ARMS Format (21 Columns)
Matches ARMS Enterprise export structure:
`No`, `Task Code`, `Parent Task Code`, `Project Name`, `Module / Milestone`, `Task Title`, `Description`, `Priority`, `Status`, `Progress (%)`, `Start Date`, `Due Date`, `PIC Name`, `PIC Email`, `Category`, `Obstacle / Kendala`, `Solution / Solusi`, `Estimated Hours`, `Actual Hours`, `Billable`, `Notes`.

- **Hierarchy Resolution within Batch**:
  If `Parent Task Code` is provided, the import matches with another row in the same batch whose `Task Code` matches, establishing parent-child hierarchy.

## 3. Architecture & API Endpoints

### 3.1 DTOs (`TrackerKerja.Application.DTOs.TaskImportDtos`)
- `TaskImportPreviewDto`:
  - `FileName`: string
  - `TotalRows`: int
  - `ValidCount`: int
  - `WarningCount`: int
  - `ErrorCount`: int
  - `Rows`: List of `TaskImportRowDto`
- `TaskImportRowDto`:
  - `RowIndex`: int
  - `TaskCode`: string?
  - `ParentTaskCode`: string?
  - `Title`: string
  - `Description`: string?
  - `ProjectName`: string?
  - `MatchedProjectId`: int?
  - `PicIdentifier`: string?
  - `MatchedUserId`: string?
  - `MatchedUserName`: string?
  - `Priority`: TaskPriority
  - `Status`: Domain.Enums.TaskStatus
  - `Progress`: int
  - `StartDate`: DateTimeOffset?
  - `DueDate`: DateTimeOffset?
  - `Milestone`: string?
  - `Obstacle`: string?
  - `Solution`: string?
  - `ValidationStatus`: `Valid` | `Warning` | `Error`
  - `ValidationMessages`: List<string>
- `TaskImportCommitRequest`:
  - `DefaultProjectId`: int?
  - `BulkAssignUserId`: string?
  - `SelectedRowIndexes`: List<int>? (null means all valid/warning rows)
  - `Rows`: List<TaskImportRowDto>
- `TaskImportResultDto`:
  - `TotalProcessed`: int
  - `TotalImported`: int
  - `TotalProjectsCreated`: int
  - `Messages`: List<string>

### 3.2 Service Interface (`ITaskExcelImportService`)
```csharp
public interface ITaskExcelImportService
{
    byte[] GenerateTemplate(string format);
    Task<TaskImportPreviewDto> PreviewImportAsync(Stream fileStream, int? companyId, CancellationToken cancellationToken = default);
    Task<TaskImportResultDto> CommitImportAsync(TaskImportCommitRequest request, int? companyId, CancellationToken cancellationToken = default);
    Task<ExcelImportResultDto> ImportTasksFromExcelAsync(Stream fileStream, int? companyId, CancellationToken cancellationToken = default);
}
```

### 3.3 Endpoints (`TasksController` or `TaskImportController`)
- `GET /api/tasks/import/template?format=standard|arms` -> returns `.xlsx` file.
- `POST /api/tasks/import/preview` -> multipart file -> returns `TaskImportPreviewDto`.
- `POST /api/tasks/import/commit` -> JSON `TaskImportCommitRequest` -> commits in single transaction.
- `POST /api/tasks/import-excel` -> keeps backwards-compatible one-step import.

## 4. UI / UX Design (`import-excel-dialog.tsx`)
1. **Step 1: Upload & Format Selection**
   - Drag-and-drop zone with file size & type verification (.xlsx).
   - Download template buttons: "Template Standar (9 Kolom)" & "Template ARMS (21 Kolom)".
   - Option for default fallback project.
2. **Step 2: Preview & Validation Table**
   - Summary statistics banner: Valid (Green), Warning (Amber), Error (Red).
   - Filterable data table showing Row #, Title, Project, PIC, Status, Priority, Due Date, and Validation status badge.
   - Bulk actions: "Bulk Assign PIC" dropdown, "Pilih Semua Valid", "Sembunyikan Error".
3. **Step 3: Commit & Confirmation**
   - Progress state with spinner.
   - Result card with success metrics and links to view imported tasks in List or Kanban view.

## 5. Security & Isolation
- Restricted to `Administrator` & `SuperAdmin` roles via `[Authorize(Roles = "Administrator,SuperAdmin")]`.
- Multi-tenancy enforcement: All matched or created entities (Projects, Tasks) are tagged with `_tenantService.CompanyId`.

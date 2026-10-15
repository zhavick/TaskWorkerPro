# Implementation Plan: Excel Task Import (FSD 5.10)

## Phase 1: DTOs & Contracts
- [ ] Add `TaskImportDtos.cs` to `TrackerKerja.Application/DTOs/` containing:
  - `TaskImportValidationStatus` enum (`Valid`, `Warning`, `Error`)
  - `TaskImportRowDto`
  - `TaskImportPreviewDto`
  - `TaskImportCommitRequest`
  - `TaskImportResultDto`
- [ ] Update `ITaskExcelImportService.cs` with `GenerateTemplate`, `PreviewImportAsync`, and `CommitImportAsync`.

## Phase 2: Backend Implementation in `TrackerKerja.Infrastructure`
- [ ] In `TaskExcelImportService.cs`:
  - Implement `GenerateTemplate(string format)` using `ClosedXML` with styled headers and example rows for both `standard` and `arms`.
  - Implement `PreviewImportAsync`:
    - Reads sheets (Standard or ARMS).
    - Validates mandatory fields (Title required).
    - Resolves existing projects and users (by email or full name) within tenant (`CompanyId`).
    - Produces warnings for missing/unmatched references without failing.
    - Sets validation status: `Error` (missing title or unparseable critical data), `Warning` (unmatched PIC/Project), `Valid` (all resolved).
  - Implement `CommitImportAsync`:
    - Handles transaction (`_context.Database.IsRelational() ? await _context.Database.BeginTransactionAsync() : null`).
    - Resolves hierarchy for batch using `TaskCode` and `ParentTaskCode`.
    - Applies `BulkAssignUserId` or `DefaultProjectId` overrides if configured.
    - Inserts tasks and returns `TaskImportResultDto`.

## Phase 3: WebApi Endpoints & Unit Tests
- [ ] In `TasksController.cs`:
  - `GET /api/tasks/import/template?format=standard|arms` (Authorize: Administrator, SuperAdmin)
  - `POST /api/tasks/import/preview` (Authorize: Administrator, SuperAdmin)
  - `POST /api/tasks/import/commit` (Authorize: Administrator, SuperAdmin)
- [ ] Create `backend/tests/TrackerKerja.Tests/TaskExcelImportServiceTests.cs`:
  - Test 1: Template generation (Standard & ARMS return valid non-empty byte arrays).
  - Test 2: Preview parsing with valid rows, missing title (Error), and unknown PIC (Warning).
  - Test 3: Commit import creates tasks with correct CompanyId and resolves parent-child relations.
  - Run `dotnet test` to verify all pass.

## Phase 4: Frontend Modern Wizard (`import-excel-dialog.tsx`)
- [ ] Update `import-excel-dialog.tsx`:
  - Step 1: Upload state + Template download links ("Standard 9 Kolom" & "ARMS 21 Kolom") + Fallback Project picker + File Dropzone.
  - Step 2: Interactive Preview table with summary pills (Valid / Warning / Error), searchable row list, and Bulk PIC assigner.
  - Step 3: Commit execution with spinner and detailed results summary.
- [ ] Verify frontend build with `cmd.exe /c "npm --prefix frontend run build"`.

## Phase 5: Verification & Completion
- [ ] Run complete test suite (`dotnet test`).
- [ ] Run full Next.js production build.
- [ ] Review git status and summarize delivery.

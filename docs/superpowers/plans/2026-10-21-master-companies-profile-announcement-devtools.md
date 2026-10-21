# Master Companies, User Folder Uploads, Dashboard Announcement Popup, and DevTools Task Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Master Data Perusahaan with user/import auto-binding, user-specific avatar/cover upload folder isolation, dashboard login announcement popup, and Developer Tools (JSON & SQL) task binding.

**Architecture:** ASP.NET Core 8 Web API + Entity Framework Core with PostgreSQL on backend, Next.js 14 App Router with React Query and TailGrids Core on frontend.

**Tech Stack:** .NET 8, C#, EF Core, ClosedXML, Next.js, React, TypeScript, TailwindCSS, Lucide-react, Sonner.

**Spec:** `docs/superpowers/specs/2026-10-21-master-companies-profile-announcement-devtools-design.md`

## Global Constraints
- Preserve existing comments and docstrings.
- Strict multi-tenant isolation: non-admin can only access their company's data.
- Ensure all backend unit tests pass without warnings or errors.
- Ensure `node ./node_modules/typescript/bin/tsc --noEmit` passes with 0 errors.

---

### Task 1: Master Companies Backend CRUD (`CompanyDtos.cs`, `CompaniesController.cs`, Unit Tests)

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/CompanyDtos.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/CompaniesController.cs`
- Create: `backend/tests/TrackerKerja.Tests/CompaniesControllerTests.cs`

**Interfaces:**
- Produces: `GET /api/companies`, `GET /api/companies/{id}`, `POST /api/companies`, `PUT /api/companies/{id}`, `DELETE /api/companies/{id}`.
- DTOs: `CompanyDto`, `CompanyDetailDto`, `CreateCompanyRequest`, `UpdateCompanyRequest`.

- [ ] **Step 1: Write unit tests for CompaniesController**
  Create `CompaniesControllerTests.cs` testing listing, creating, updating, and deleting companies.
- [ ] **Step 2: Run test to verify it fails**
  Run: `dotnet test backend/tests/TrackerKerja.Tests --filter FullyQualifiedName~CompaniesControllerTests`
  Expected: FAIL with missing classes.
- [ ] **Step 3: Create CompanyDtos.cs and CompaniesController.cs**
  Implement CRUD operations with multi-tenant permissions (Administrator only for CUD, all authenticated for GET).
- [ ] **Step 4: Run tests to verify they pass**
  Run: `dotnet test backend/tests/TrackerKerja.Tests --filter FullyQualifiedName~CompaniesControllerTests`
  Expected: PASS.
- [ ] **Step 5: Commit**
  `git add backend/src/TrackerKerja.Application/DTOs/CompanyDtos.cs backend/src/TrackerKerja.WebApi/Controllers/CompaniesController.cs backend/tests/TrackerKerja.Tests/CompaniesControllerTests.cs`
  `git commit -m "feat(companies): add CompaniesController with full CRUD endpoints and unit tests"`

---

### Task 2: Excel Import Company Auto-Resolution & User Binding (`TaskExcelImportService.cs`)

**Files:**
- Modify: `backend/src/TrackerKerja.Infrastructure/Services/TaskExcelImportService.cs`
- Modify: `backend/tests/TrackerKerja.Tests/TaskExcelImportServiceTests.cs`

**Interfaces:**
- Consumes: `AppDbContext.Companies`.
- Produces: Automatically looks up or creates `Company` from sheet metadata or "Perusahaan" column and sets `CompanyId` on new users and imported tasks.

- [ ] **Step 1: Write unit test for auto-creating and binding company on import**
  Add test in `TaskExcelImportServiceTests.cs` verifying that importing tasks with a new company name auto-creates the Company in master data and assigns `CompanyId`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `dotnet test backend/tests/TrackerKerja.Tests --filter FullyQualifiedName~TaskExcelImportServiceTests`
- [ ] **Step 3: Update TaskExcelImportService.cs**
  Add company lookup/creation logic by company name/code in `PreviewImportAsync` and `CommitImportAsync`.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `dotnet test backend/tests/TrackerKerja.Tests --filter FullyQualifiedName~TaskExcelImportServiceTests`
  Expected: PASS.
- [ ] **Step 5: Commit**
  `git add backend/src/TrackerKerja.Infrastructure/Services/TaskExcelImportService.cs backend/tests/TrackerKerja.Tests/TaskExcelImportServiceTests.cs`
  `git commit -m "feat(import): auto-resolve and bind company master data during Excel import"`

---

### Task 3: Master Data Perusahaan Frontend UI (`configuration/page.tsx`)

**Files:**
- Modify: `frontend/src/app/(with-layouts)/configuration/page.tsx`

**Interfaces:**
- Consumes: `/api/companies` endpoints.
- Produces: "Master Perusahaan" management card with search, table of companies (Name, Code, Contact, Total Members, Projects), and Create/Edit modal dialog.

- [ ] **Step 1: Add Company interface and React Query hooks in configuration/page.tsx**
  Query `/companies` and create mutations for create, edit, delete.
- [ ] **Step 2: Add Master Perusahaan section in Master Data tab**
  Render table and "Tambah Perusahaan" modal with validation.
- [ ] **Step 3: Verify with TypeScript build**
  Run: `node ./node_modules/typescript/bin/tsc --noEmit` in `frontend`.
- [ ] **Step 4: Commit**
  `git add frontend/src/app/(with-layouts)/configuration/page.tsx`
  `git commit -m "feat(ui): add Master Data Perusahaan management to configuration page"`

---

### Task 4: User-Specific Folder File Upload for Avatars & Covers

**Files:**
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/ProfileController.cs`
- Modify: `frontend/src/app/(with-layouts)/profile/account/page.tsx`
- Modify: `backend/tests/TrackerKerja.Tests/ProfileControllerTests.cs`

**Interfaces:**
- Produces: Upload paths `uploads/users/{userName}/avatar/{fileName}` and `uploads/users/{userName}/cover/{fileName}`.

- [ ] **Step 1: Write test for user folder upload paths**
  Add test verifying upload creates and returns `/uploads/users/{userName}/avatar/...` URL.
- [ ] **Step 2: Update ProfileController.cs**
  Sanitize username and save files to user subdirectories in both backend and frontend public directories.
- [ ] **Step 3: Update profile/account/page.tsx**
  Ensure immediate state preview and persistent saving.
- [ ] **Step 4: Verify backend tests and frontend typecheck**
  Run: `dotnet test backend/tests/TrackerKerja.Tests` and `node ./node_modules/typescript/bin/tsc --noEmit`.
- [ ] **Step 5: Commit**
  `git add backend/src/TrackerKerja.WebApi/Controllers/ProfileController.cs frontend/src/app/(with-layouts)/profile/account/page.tsx backend/tests/TrackerKerja.Tests/ProfileControllerTests.cs`
  `git commit -m "feat(profile): store avatar and cover uploads in user-specific folder with persistent save"`

---

### Task 5: Dashboard Announcement Modal Popup on Login (`dashboard/page.tsx`)

**Files:**
- Modify: `frontend/src/app/(with-layouts)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `/api/announcements/active` and `/api/announcements/{id}/mark-read`.
- Produces: Automatic announcement dialog upon dashboard load if unread/undismissed.

- [ ] **Step 1: Add active announcement query and modal state in dashboard/page.tsx**
  Query `/announcements/active`, check `sessionStorage` and `userAnnouncementReads`.
- [ ] **Step 2: Implement TailGrids Dialog popup**
  Render announcement with urgency badge, author, content, "Jangan tampilkan lagi" checkbox, and dismiss button.
- [ ] **Step 3: Verify with TypeScript build**
  Run: `node ./node_modules/typescript/bin/tsc --noEmit` in `frontend`.
- [ ] **Step 4: Commit**
  `git add frontend/src/app/(with-layouts)/dashboard/page.tsx`
  `git commit -m "feat(dashboard): show active announcement popup modal on login"`

---

### Task 6: Developer Tools (JSON & SQL) Task Binding

**Files:**
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/DevToolsController.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/SqlToolsController.cs`
- Modify: `frontend/src/app/(with-layouts)/dev-tools/json/page.tsx`
- Modify: `frontend/src/app/(with-layouts)/dev-tools/sql/page.tsx`
- Modify: `backend/tests/TrackerKerja.Tests/DeveloperToolsTests.cs`

**Interfaces:**
- Consumes: `GET /api/tasks` for active task picker.
- Produces: JSON & SQL formats and history bound to `TaskId`, with `TaskTitle` displayed in history.

- [ ] **Step 1: Update backend DevToolsController & SqlToolsController**
  Include `Task` in history responses and save `TaskId` from requests.
- [ ] **Step 2: Update frontend JSON Formatter page**
  Add task dropdown, save snippet modal, and history panel with task badge.
- [ ] **Step 3: Update frontend SQL Beautifier page**
  Add task dropdown to save modal and display task badge in history dialog.
- [ ] **Step 4: Verify backend tests and frontend typecheck**
  Run: `dotnet test backend/tests/TrackerKerja.Tests` and `node ./node_modules/typescript/bin/tsc --noEmit`.
- [ ] **Step 5: Commit**
  `git add backend/src/TrackerKerja.WebApi/Controllers/DevToolsController.cs backend/src/TrackerKerja.WebApi/Controllers/SqlToolsController.cs frontend/src/app/(with-layouts)/dev-tools/json/page.tsx frontend/src/app/(with-layouts)/dev-tools/sql/page.tsx`
  `git commit -m "feat(devtools): bind JSON and SQL beautifier snippets to active user tasks"`

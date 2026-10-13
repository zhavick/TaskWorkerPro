# TrackerKerja Modern Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple and build TrackerKerja Modern into an enterprise multi-tier platform comprising an ASP.NET Core 8 Web API backend (Clean Architecture), PostgreSQL 16 relational database, and Next.js 16 App Router frontend with complete Docker containerization for one-command deployment.

**Architecture:** ASP.NET Core 8 Web API serves RESTful JSON endpoints with stateless JWT + refresh token authentication and strict multi-tenancy scoping via EF Core global query filters. PostgreSQL 16 stores 21+ relational tables with ACID guarantees, `timestamptz`, and `jsonb`. Next.js 16 (React 19, TypeScript, Tailwind CSS v4) consumes the API using TanStack Query, rendering components adapted from `sample-web-ui/nextjs-admin-dashboard-main`.

**Tech Stack:** 
- Backend: C# 12, .NET 8.0 SDK, ASP.NET Core Web API, EF Core 8, Npgsql, ClosedXML 0.104.2, FluentValidation, Swashbuckle OpenAPI
- Database: PostgreSQL 16-alpine, Docker Compose
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, TailGrids Core UI, TanStack Query v5, TanStack Table v8, @dnd-kit/react, FullCalendar, Recharts, Sonner
- DevOps: Dockerfile (multi-stage .NET 8), Dockerfile (multi-stage Node.js), `docker-compose.yml`

**Spec:** [reqs/00_MASTER_PLAN_DAN_ROADMAP.md](file:///c:/TEMP/VSCODE/TrackerKerjaModern/reqs/00_MASTER_PLAN_DAN_ROADMAP.md) and all companion specs `reqs/01_*.md` to `reqs/13_*.md`.

## Global Constraints
- Target Framework: .NET 8.0 LTS (`net8.0`) and Node.js 20+ / Next.js 16.
- Database: PostgreSQL 16 (`timestamptz` for dates, `numeric(18,2)` for financials, `boolean` for flags, `jsonb` for tool history/settings).
- Multi-Tenancy: Every operational entity must enforce tenant isolation by `CompanyId` unless user role is `Administrator`.
- Docker Ready: System must run locally via native CLIs (`dotnet run` / `npm run dev`) AND via `docker compose up --build`.
- Zero-Knowledge Privacy: Corporate registration does not expose public company lists; joins require exact matching `CompanyCode`.
- Unified Save: Task edit form must support saving task properties and logging manual time sessions in one atomic transaction.
- Concurrent Timers: Multiple tasks can have running timers simultaneously per user.

---

### Task 1: Docker Compose & PostgreSQL Infrastructure Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `database/init/01_init_schema.sql`
- Create: `database/init/02_init_seed.sql`
- Test: Verify PostgreSQL container starts, creates tables, and seeds initial data.

**Interfaces:**
- Consumes: Specifications from `reqs/01_KERANGKA_APLIKASI_DAN_INFRASTRUKTUR.md` & `reqs/03_SKEMA_DATABASE_POSTGRESQL.md`.
- Produces: Running PostgreSQL service on port `5432` with preloaded `trackerkerja_db` schema.

- [x] **Step 1: Create `docker-compose.yml` with PostgreSQL 16 and backend/frontend service templates**
- [x] **Step 2: Create `database/init/01_init_schema.sql` containing full 21+ tables DDL**
- [x] **Step 3: Create `database/init/02_init_seed.sql` containing initial roles, default company, priorities, and statuses**
- [x] **Step 4: Verify SQL syntax and file creation**

---

### Task 2: Backend Solution & Clean Architecture Scaffolding

**Files:**
- Create: `backend/TrackerKerja.sln`
- Create: `backend/src/TrackerKerja.Domain/TrackerKerja.Domain.csproj`
- Create: `backend/src/TrackerKerja.Application/TrackerKerja.Application.csproj`
- Create: `backend/src/TrackerKerja.Infrastructure/TrackerKerja.Infrastructure.csproj`
- Create: `backend/src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj`
- Create: `backend/src/TrackerKerja.WebApi/Dockerfile`
- Create: `backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj`

**Interfaces:**
- Consumes: Task 1 Docker infrastructure.
- Produces: Compilable .NET 8 solution with dependency injection wiring and package references.

- [x] **Step 1: Execute `dotnet new` commands to create solution and 4 clean architecture projects plus test project**
- [x] **Step 2: Add project references (Inversion of Control: WebApi -> Infrastructure & Application -> Domain)**
- [x] **Step 3: Install NuGet packages (`Npgsql.EntityFrameworkCore.PostgreSQL`, `FluentValidation`, `ClosedXML`, `Swashbuckle`, etc.)**
- [x] **Step 4: Create multi-stage .NET 8 `Dockerfile` in `backend/src/TrackerKerja.WebApi/Dockerfile`**
- [x] **Step 5: Execute `dotnet build` to verify clean compilation**

---

### Task 3: Domain Entities, Enums & AppDbContext Implementation

**Files:**
- Create: `backend/src/TrackerKerja.Domain/Entities/*.cs` (Company, User, Task, Project, Session, Attendance, Note, Badges, etc.)
- Create: `backend/src/TrackerKerja.Domain/Enums/*.cs` (TaskStatus, Priority, AttendanceType, WorkLocation, etc.)
- Create: `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`
- Create: `backend/src/TrackerKerja.Infrastructure/Persistence/Configurations/*.cs`
- Create: `backend/tests/TrackerKerja.Tests/DomainEntityTests.cs`

**Interfaces:**
- Consumes: EF Core 8 and Npgsql packages.
- Produces: EF Core models mapped to PostgreSQL schema with Global Query Filter for `CompanyId`.

- [x] **Step 1: Write failing unit test for `WorkTask` and `Company` tenant relationship in `TrackerKerja.Tests`**
- [x] **Step 2: Create domain entities and enums in `TrackerKerja.Domain`**
- [x] **Step 3: Implement `AppDbContext` and entity configurations in `TrackerKerja.Infrastructure`**
- [x] **Step 4: Run unit tests to verify domain model passes**

---

### Task 4: Multi-Tenant Context, JWT Authentication & Security Middleware

**Files:**
- Create: `backend/src/TrackerKerja.Application/Common/Interfaces/ICurrentTenantService.cs`
- Create: `backend/src/TrackerKerja.Infrastructure/Services/CurrentTenantService.cs`
- Create: `backend/src/TrackerKerja.Infrastructure/Services/JwtTokenService.cs`
- Create: `backend/src/TrackerKerja.WebApi/Middlewares/ExceptionHandlingMiddleware.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Program.cs`
- Modify: `backend/src/TrackerKerja.WebApi/appsettings.json`

**Interfaces:**
- Consumes: `AppDbContext`, ASP.NET Core Identity.
- Produces: Claims-based JWT authentication, refresh token rotation, and automatic `CompanyId` scoping.

- [x] **Step 1: Write unit test for JWT generation and claims extraction**
- [x] **Step 2: Implement `ICurrentTenantService` and `CurrentTenantService`**
- [x] **Step 3: Implement `JwtTokenService` with HMAC-SHA256 and refresh token generation**
- [x] **Step 4: Configure `Program.cs` with JWT Bearer authentication, CORS Next.js policy, and Swagger UI Bearer Modal**
- [x] **Step 5: Verify build with `dotnet test`**

---

### Task 5: Master Data, Settings & Low-Dependency API Controllers

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/MasterDataDtos.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/MasterDataController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/SettingsController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/DevToolsController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/AuditLogsController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`.
- Produces: REST endpoints for priorities, statuses, milestones, categories, 4-tab system settings, and dev tools.

- [x] **Step 1: Implement DTOs and Controller for Master Priorities, Statuses, and Milestones**
- [x] **Step 2: Implement `SettingsController` with batch key-value update and SMTP test endpoint**
- [x] **Step 3: Implement `DevToolsController` for JSON formatting and SQL beautifying**
- [x] **Step 4: Implement `AuditLogsController` with pagination and filter support**
- [x] **Step 5: Verify endpoints build and test compilation**

---

### Task 6: Authentication, Company Registration & Member Approval Workflow

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/AuthDtos.cs`
- Create: `backend/src/TrackerKerja.Application/DTOs/MemberDtos.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/AuthController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/MembersController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/ProfileController.cs`

**Interfaces:**
- Consumes: Identity `UserManager`, `JwtTokenService`, `AppDbContext`.
- Produces: Registration with existing company code or new company, login with `IsApproved` guard, admin approval/rejection endpoints, profile & cover updates.

- [x] **Step 1: Write integration tests for registration flow (`existing` vs `new` company) and `IsApproved` block**
- [x] **Step 2: Implement `AuthController` (Register, Login, RefreshToken, Logout, ForgotPassword)**
- [x] **Step 3: Implement `MembersController` (Approve, Reject, Unlock, List with Company Grouping)**
- [x] **Step 4: Implement `ProfileController` (Get, Update, Upload Avatar, Upload Cover)**
- [x] **Step 5: Run tests and verify**

---

### Task 7: Projects & Financial Burn Rate Controller

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/ProjectDtos.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/ProjectsController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`.
- Produces: Projects CRUD, financial burn rate calculation (`ActualCost / Budget * 100%`), and bulk task assignment (`POST /api/projects/{id}/assign-tasks`).

- [x] **Step 1: Write unit test for Burn Rate percentage and status calculation (<80% Safe, 80-100% Warning, >100% Overbudget)**
- [x] **Step 2: Implement `ProjectDtos` and `ProjectsController`**
- [x] **Step 3: Implement bulk task assignment endpoint in `ProjectsController`**
- [x] **Step 4: Verify test passes**

---

### Task 8: Tasks, Subtasks, Kanban & Unified Save Controller

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/TaskDtos.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/TasksController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`.
- Produces: Task CRUD, subtask hierarchy, status patch for Kanban, progress slider, and `PUT /api/tasks/{id}/unified-save` atomic transaction.

- [x] **Step 1: Write unit test for `UnifiedSave` verifying task update and work session creation occur atomically**
- [x] **Step 2: Implement `TasksController` CRUD, Subtasks, and Kanban grouping**
- [x] **Step 3: Implement `UnifiedSave` endpoint with `IDbContextTransaction`**
- [x] **Step 4: Verify test passes**

---

### Task 9: Timesheet, Concurrent Multi-Timer & ClosedXML Export

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/TimesheetDtos.cs`
- Create: `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlExportService.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/TimesheetsController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`.
- Produces: Live timer start/stop (`end_time IS NULL`), concurrent active timers query, manual session log, and 3-sheet ClosedXML Excel export.

- [x] **Step 1: Write unit test for ClosedXML 3-sheet workbook generation and Man-Days formula**
- [x] **Step 2: Implement `ClosedXmlExportService` generating Daily Details, Project Recap, and Member Contribution**
- [x] **Step 3: Implement `TimesheetsController` (Start, Stop, Active-Timers, Manual, Export)**
- [x] **Step 4: Run tests and verify**

---

### Task 10: Attendances, Notes, Gamification & Announcements Controllers

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/AttendanceDtos.cs`
- Create: `backend/src/TrackerKerja.Application/DTOs/NoteDtos.cs`
- Create: `backend/src/TrackerKerja.Application/DTOs/GamificationDtos.cs`
- Create: `backend/src/TrackerKerja.Application/DTOs/AnnouncementDtos.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/AttendancesController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/NotesController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/GamificationController.cs`
- Create: `backend/src/TrackerKerja.WebApi/Controllers/AnnouncementsController.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`.
- Produces: Endpoints for Clock In/Out, Notes with file attachments, Gamification daily check-in with 15/30-day rules and rewards, and Announcements with anti-overlap read tracking.

- [x] **Step 1: Implement `AttendancesController` (ClockIn, ClockOut, Today, Team Reconciliation)**
- [x] **Step 2: Implement `NotesController` (Notes CRUD, Pin toggle, File Upload/Download)**
- [x] **Step 3: Implement `GamificationController` (CheckIn, Streak, Badges, Reward Store & Claims)**
- [x] **Step 4: Implement `AnnouncementsController` (Active popup, Mark Read, Admin CRUD)**
- [x] **Step 5: Verify all backend controllers compile and tests pass**

---

### Task 11: Frontend Workspace Scaffolding from `sample-web-ui` & Dockerfile

**Files:**
- Create: `frontend/` (adapted from `sample-web-ui/nextjs-admin-dashboard-main`)
- Create: `frontend/Dockerfile`
- Modify: `frontend/package.json`
- Create: `frontend/src/services/api/client.ts`
- Modify: `frontend/src/components/common/sidebar/data.tsx`
- Modify: `frontend/src/app/providers.tsx`

**Interfaces:**
- Consumes: `sample-web-ui` template components and assets.
- Produces: Working Next.js 16 app with configured API client, JWT interceptor, sidebar navigation, and multi-stage Docker build.

- [x] **Step 1: Copy base template from `sample-web-ui/nextjs-admin-dashboard-main` to `frontend/`**
- [x] **Step 2: Create `frontend/src/services/api/client.ts` with Axios base URL and silent refresh token interceptor**
- [x] **Step 3: Update `src/components/common/sidebar/data.tsx` to include TrackerKerja's real business navigation**
- [x] **Step 4: Update `src/app/providers.tsx` with TanStack Query Client, Next-Themes, and Toaster**
- [x] **Step 5: Create production multi-stage `frontend/Dockerfile`**
- [x] **Step 6: Verify `npm run build` succeeds**

---

### Task 12: Frontend Authentication, Layout & Navigation Integration

**Files:**
- Create: `frontend/src/app/(auth)/login/page.tsx`
- Create: `frontend/src/app/(auth)/register/page.tsx`
- Modify: `frontend/src/components/common/header/index.tsx`
- Create: `frontend/src/components/guards/SessionInactivityGuard.tsx`
- Create: `frontend/src/components/widgets/AnnouncementModal.tsx`

**Interfaces:**
- Consumes: Auth API endpoints (`/api/auth/*`).
- Produces: Login with Lottie and Dark/Light toggle, 2-tab Company Code registration, Topbar tenant badge, 60-min session guard with 5-min warning modal, and anti-overlap announcement popup.

- [x] **Step 1: Implement Login page with JWT storing and error handling**
- [x] **Step 2: Implement Register page with Existing Company Code vs New Company tab**
- [x] **Step 3: Update Header with tenant badge `[KODE] Nama Perusahaan` and user profile dropdown**
- [x] **Step 4: Implement `SessionInactivityGuard` and `AnnouncementModal`**
- [x] **Step 5: Verify auth flow navigation**

---

### Task 13: Frontend Operational Modules Implementation (Projects, Tasks, Kanban, Timesheet)

**Files:**
- Create: `frontend/src/app/(with-layouts)/dashboard/page.tsx`
- Create: `frontend/src/app/(with-layouts)/projects/page.tsx`
- Create: `frontend/src/app/(with-layouts)/projects/[id]/page.tsx`
- Create: `frontend/src/app/(with-layouts)/tasks/page.tsx`
- Create: `frontend/src/app/(with-layouts)/tasks/kanban/page.tsx`
- Create: `frontend/src/app/(with-layouts)/tasks/[id]/page.tsx`
- Create: `frontend/src/app/(with-layouts)/timesheets/page.tsx`
- Create: `frontend/src/components/widgets/ActiveTimersBar.tsx`

**Interfaces:**
- Consumes: Task, Project, and Timesheet API endpoints.
- Produces: Executive dashboard with burn rate charts, projects list & bulk task modal, task table grid & @dnd-kit Kanban board, studio 12-column unified save form, and active timers widget.

- [x] **Step 1: Implement Dashboard with Recharts KPI metrics and task status distribution**
- [x] **Step 2: Implement Projects list with Burn Rate progress bar and detail page with bulk task assignment modal**
- [x] **Step 3: Implement Tasks table and interactive Kanban board with `@dnd-kit`**
- [x] **Step 4: Implement Full-Width Studio Task Edit form with unified task + manual session save**
- [x] **Step 5: Implement Timesheets page with floating active multi-timer bar and Excel export trigger**
- [x] **Step 6: Verify frontend pages render and build cleanly**

---

### Task 14: Frontend Enterprise Modules (Attendance, Notes, Members, Gamification, Config)

**Files:**
- Create: `frontend/src/app/(with-layouts)/attendance/page.tsx`
- Create: `frontend/src/app/(with-layouts)/notes/page.tsx`
- Create: `frontend/src/app/(with-layouts)/members/page.tsx`
- Create: `frontend/src/app/(with-layouts)/gamification/page.tsx`
- Create: `frontend/src/app/(with-layouts)/configuration/page.tsx`

**Interfaces:**
- Consumes: Attendance, Notes, Members, Gamification, and Settings API endpoints.
- Produces: Attendance Clock In/Out & reconciliation, rich-text Notes, member cards grouped by company with approval actions, gamification streak/badges/reward claims, and 4-tab configuration.

- [x] **Step 1: Implement Attendance page with Clock In/Out buttons and admin reconciliation tab**
- [x] **Step 2: Implement Notes page with categories and attachment upload dropzone**
- [x] **Step 3: Implement Members directory with pure grid cards and admin approval buttons**
- [x] **Step 4: Implement Gamification page with streak counter, 15/30-day bars, and reward store**
- [x] **Step 5: Implement 4-Tab Configuration page and audit trail modal**
- [x] **Step 6: Verify build with `npm run build`**

---

### Task 15: End-to-End Docker Orchestration & Verification

**Files:**
- Modify: `docker-compose.yml` (wire up backend, frontend, and postgres services)
- Test: Build images, start stack, verify health checks, and test API/UI connectivity.

**Interfaces:**
- Consumes: All backend and frontend artifacts.
- Produces: Fully containerized application stack runnable via `docker compose up --build`.

- [x] **Step 1: Update `docker-compose.yml` linking `postgres`, `backend`, and `frontend` with network bridge and volume persistence**
- [x] **Step 2: Verify backend `.NET` build in container**
- [x] **Step 3: Verify frontend `Next.js` production build in container**
- [x] **Step 4: Perform end-to-end smoke test verifying registration, login, task creation, and timer run**
- [x] **Step 5: Commit all implementation changes to repository**

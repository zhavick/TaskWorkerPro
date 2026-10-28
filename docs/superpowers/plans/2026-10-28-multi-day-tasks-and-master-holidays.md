# Multi-Day Task Carryover & Master Data Hari Libur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-day task carryover across active working days in timesheets and introduce Master Data Hari Libur (Holidays) so that holidays are skipped in timesheet generation, reporting, and exports.

**Architecture:** 
1. Create `Holiday` domain entity, map to table `holidays`, configure EF Core DbContext with schema auto-migration in `DbInitializer`.
2. Implement `MasterDataController` CRUD endpoints for holidays and national holiday seeder.
3. Update `AutomatedTimesheetGeneratorService` to support multi-day tasks (`[StartDate, DueDate]`) crossing working days, skipping weekends and holidays.
4. Update `ClosedXmlCompanyTimesheetExportService` to respect holidays by rendering non-working holiday rows (0 hours) and skipping work task allocation on holidays.
5. Add "Hari Libur" master data management UI in `/configuration` under the Master Data tab.

**Tech Stack:** ASP.NET Core 8 (.NET 8), Entity Framework Core, PostgreSQL, ClosedXML, Next.js 14, React, Tailwind CSS / Vanilla CSS, Lucide icons.

---

### Task 1: Domain Entity & Database Migration for Master Hari Libur

**Files:**
- Create/Modify: `backend/src/TrackerKerja.Domain/Entities/MasterEntities.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/Persistence/DbInitializer.cs`
- Test: `backend/tests/TrackerKerja.Tests/HolidayEntityTests.cs`

**Interfaces:**
- `Holiday`: `Id` (int), `Date` (DateOnly), `Name` (string), `Description` (string?), `IsNational` (bool), `CompanyId` (int?), `CreatedAt` (DateTimeOffset), `UpdatedAt` (DateTimeOffset), `Company` (Company?)

- [ ] **Step 1: Write the failing test for Holiday entity and DbContext**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Define `Holiday` class in `MasterEntities.cs`, add `DbSet<Holiday> Holidays` to `AppDbContext`, and add DDL in `DbInitializer.cs`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 2: Backend Master Data Holidays API & National Holiday Seeder

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/HolidayDtos.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/MasterDataController.cs`
- Test: `backend/tests/TrackerKerja.Tests/MasterDataHolidaysControllerTests.cs`

**Interfaces:**
- `HolidayDto(int Id, DateOnly Date, string Name, string? Description, bool IsNational, int? CompanyId, string? CompanyName)`
- `CreateHolidayRequest(DateOnly Date, string Name, string? Description, bool IsNational, int? CompanyId)`
- `UpdateHolidayRequest(DateOnly Date, string Name, string? Description, bool IsNational, int? CompanyId)`
- Endpoints:
  - `GET /api/master/holidays?year=&companyId=`
  - `POST /api/master/holidays`
  - `PUT /api/master/holidays/{id}`
  - `DELETE /api/master/holidays/{id}`
  - `POST /api/master/holidays/seed-national?year=`

- [ ] **Step 1: Write failing controller tests for Holiday CRUD and Seeder**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement Holiday DTOs and endpoints in `MasterDataController.cs`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit changes**

---

### Task 3: Multi-Day Task Carryover & Holiday Skipping in Automated Timesheet Generator

**Files:**
- Modify: `backend/src/TrackerKerja.Infrastructure/Services/AutomatedTimesheetGeneratorService.cs`
- Test: `backend/tests/TrackerKerja.Tests/AutomatedTimesheetGeneratorServiceTests.cs`

**Interfaces:**
- `AutomatedTimesheetGeneratorService.GenerateTimesheetsAsync`
- Requirements:
  - When a task spans multiple days (`StartDate` to `DueDate`), it is allocated to *every* working day within that range (and clamped to the target period).
  - Skips weekends and any date matching `Holiday` records for that company / national holidays.
  - If multiple tasks fall on the same day, distributes 8 hours among all active tasks on that day.

- [ ] **Step 1: Write unit tests verifying multi-day carryover and holiday skipping**
  - Test 1: Task spanning 3 days (e.g. Mon-Wed) creates sessions on all 3 days.
  - Test 2: Task spanning Mon-Wed where Tue is a holiday creates sessions on Mon and Wed, skipping Tue.
  - Test 3: Multiple tasks spanning overlapping days properly divide the 8 daily hours.
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Update `AutomatedTimesheetGeneratorService.cs` to map multi-day date ranges and filter out holidays**
- [ ] **Step 4: Run tests to verify all pass**
- [ ] **Step 5: Commit changes**

---

### Task 4: Holiday and Multi-Day Support in Company Timesheet Export Service

**Files:**
- Modify: `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlCompanyTimesheetExportService.cs`
- Test: `backend/tests/TrackerKerja.Tests/CompanyTimesheetExportServiceTests.cs`

**Interfaces:**
- `ClosedXmlCompanyTimesheetExportService.ExportUserTimesheetAsync`
- Requirements:
  - Detects holidays in the export period.
  - Renders holiday row: `"Hari Libur ({holiday.Name}) - Tidak Ada Pengerjaan Task"` with 0 hours, dash clock-in/out.
  - Skips allocating tasks/standby on holiday dates.
  - Tasks spanning multiple days appear on each working day they cover.

- [ ] **Step 1: Write unit test verifying holiday row formatting and multi-day export**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Update `ClosedXmlCompanyTimesheetExportService.cs` to fetch holidays and output holiday rows**
- [ ] **Step 4: Run test to verify all tests pass**
- [ ] **Step 5: Commit changes**

---

### Task 5: Frontend UI for Master Data Hari Libur in Configuration Page

**Files:**
- Modify: `frontend/src/app/(with-layouts)/configuration/page.tsx`
- Create: `frontend/src/components/configuration/master-holidays-manager.tsx`

**Features:**
- Add "Hari Libur" subtab under Master Data in `/configuration`.
- Card overview showing Total Hari Libur, Libur Nasional, and Libur Perusahaan.
- Year selector (2026, 2027) and Company filter.
- Modal to Add/Edit Holiday (Date picker, Name input, National switch, Company select, Description).
- "Muat Hari Libur Nasional 2026" quick action button.
- Delete confirmation dialog.

- [ ] **Step 1: Create `master-holidays-manager.tsx` component with full CRUD and seeder actions**
- [ ] **Step 2: Integrate `master-holidays-manager` into `configuration/page.tsx` under master subtabs**
- [ ] **Step 3: Verify with type check (`npx tsc --noEmit`)**
- [ ] **Step 4: Commit changes**

---

### Task 6: Database Seeding & End-to-End Verification

**Files:**
- Verify in PostgreSQL container
- Verify test suite

- [ ] **Step 1: Rebuild backend container and apply DDL to PostgreSQL**
- [ ] **Step 2: Seed 2026 Indonesian National Holidays via API**
- [ ] **Step 3: Run full backend test suite (`dotnet test`)**
- [ ] **Step 4: Commit and verify git status**

# Playwright Automated E2E Testing Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and execute an enterprise-grade automated End-to-End (E2E) testing suite with Playwright covering all 19 modules of TaskWorker Pro (TrackerKerja Modern) based on the SOP in `QA/README.md` and `QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx`.

**Architecture:** Playwright test runner in `frontend/e2e/` with deterministic route mocking and authentication state helpers, allowing isolated headless browser validation of frontend UI pages, interactions, state transitions, and API contracts across Chromium.

**Tech Stack:** Playwright (`@playwright/test`), Next.js 16 (React 19), TypeScript.

**Spec / Blueprint Reference:** `QA/README.md`, `QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx`, `documents/FSD_WORK_TRACKER_PRO.md`.

## Global Constraints
- Target 19 system modules: `AUTH`, `TENANT`, `PROJ`, `TASK`, `KANBAN`, `TIME`, `ATTEND`, `NOTE`, `EXCEL`, `TEAM`, `CAL`, `DEV`, `AUDIT`, `MASTER`, `GAME`, `NOTIF`, `SYNC`, `THEME`, `API`.
- All tests must run cleanly via `npx playwright test` in `frontend/`.
- Must support headless mode on Windows and CI environments.
- Use deterministic route mocking (`page.route`) so tests can execute reliably in development and CI pipelines without requiring an external PostgreSQL instance to be pre-seeded.

---

### Task 1: Scaffolding Playwright Configuration & Mocking Helpers

**Files:**
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/helpers/mock-data.ts`
- Create: `frontend/e2e/helpers/setup.ts`
- Modify: `frontend/package.json` (add scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`)

- [ ] **Step 1: Create `frontend/playwright.config.ts`**
  - Set test directory to `./e2e`
  - Enable base URL `http://localhost:3000`
  - Configure Chromium project and timeouts
- [ ] **Step 2: Create mock data & setup helper in `frontend/e2e/helpers/`**
  - Setup authenticated session token and cookies
  - Mock company, user claims (Admin & Member), and common settings
- [ ] **Step 3: Update `package.json` with test scripts**
- [ ] **Step 4: Verify test runner scaffolding with a baseline smoke test**

---

### Task 2: Core Authentication, Multi-Tenancy & Team Directory Tests (`AUTH`, `TENANT`, `TEAM`)

**Files:**
- Create: `frontend/e2e/01_auth_tenant_team.spec.ts`

- [ ] **Step 1: Implement TC-AUTH-01 to TC-AUTH-04**
  - Login page render with Lottie animation container
  - Validation of invalid credentials & empty fields
  - Successful login flow, localStorage token storage & redirection
  - Registration page with corporate code validation
- [ ] **Step 2: Implement TC-TENANT-01 to TC-TENANT-03 & TC-TEAM-01 to TC-TEAM-03**
  - Multi-company isolation display and corporate code
  - Team member directory grid cards (`/members`)
  - Member role elevation, approval modal, and profile views
- [ ] **Step 3: Run Playwright test for Task 2 and verify pass**

---

### Task 3: Projects, Tasks, Kanban Board & Timesheets Tests (`PROJ`, `TASK`, `KANBAN`, `TIME`)

**Files:**
- Create: `frontend/e2e/02_work_management.spec.ts`

- [ ] **Step 1: Implement TC-PROJ-01 to TC-PROJ-03**
  - Projects list view (`/projects`), budget vs actual cost metrics, status badges
  - Project detail studio (`/projects/[id]`) full-width layout and financial burn rate indicators
- [ ] **Step 2: Implement TC-TASK-01 to TC-TASK-03 & TC-KANBAN-01 to TC-KANBAN-03**
  - Task list view (`/tasks`) with filters, priorities, and assignee chips
  - Task studio layout (`/tasks/[id]`) with unified save and activity timeline
  - Interactive Kanban board (`/tasks/kanban`), column switcher, and task cards
- [ ] **Step 3: Implement TC-TIME-01 to TC-TIME-03**
  - Timesheets dashboard (`/timesheets`)
  - Multi-timer live ticking timer controls
  - Manual time entry dialog (+30m, +1h)
- [ ] **Step 4: Run Playwright test for Task 3 and verify pass**

---

### Task 4: Attendance, Notes, Calendar & Excel Interop Tests (`ATTEND`, `NOTE`, `CAL`, `EXCEL`)

**Files:**
- Create: `frontend/e2e/03_attendance_notes_calendar_excel.spec.ts`

- [ ] **Step 1: Implement TC-ATTEND-01 to TC-ATTEND-03**
  - Attendance page (`/attendance`) Clock In / Clock Out cards and live clock
  - Team monthly reconciliation matrix (`GET /api/attendance/monthly`)
- [ ] **Step 2: Implement TC-NOTE-01 to TC-NOTE-03**
  - Rich-text notes management (`/notes`), color tag categories, pin notes
- [ ] **Step 3: Implement TC-CAL-01 to TC-CAL-03**
  - Interactive calendar view (`/calendar`) with Month/Week/Day switchers
  - Quick add task modal and RBAC scope filter
- [ ] **Step 4: Implement TC-EXCEL-01 to TC-EXCEL-02**
  - Import dialog in tasks (`import-excel-dialog.tsx`) with 9-column standard & 21-column ARMS format selector
  - Export trigger validation
- [ ] **Step 5: Run Playwright test for Task 4 and verify pass**

---

### Task 5: Gamification, Dev Tools, Audit Trail, Themes, Announcements & API (`GAME`, `DEV`, `AUDIT`, `THEME`, `NOTIF`, `MASTER`, `SYNC`, `API`)

**Files:**
- Create: `frontend/e2e/04_advanced_enterprise_modules.spec.ts`

- [ ] **Step 1: Implement TC-GAME-01 to TC-GAME-03**
  - Gamification hub (`/gamification`), 30-day streak indicator, check-in button
  - Master Badges gallery (`/gamification/badges`) and Reward store claim flow (`/gamification/rewards`)
- [ ] **Step 2: Implement TC-DEV-01 to TC-DEV-02**
  - SQL Beautifier & Query Tools (`/dev-tools/sql`)
  - JSON Validator & Formatter (`/dev-tools/json`)
- [ ] **Step 3: Implement TC-AUDIT-01 to TC-AUDIT-02 & TC-SYNC-01**
  - Executive Audit Trail page (`/audit-trail`), analytics cards, filter toolbar, detail drawer
  - Configuration & multi-instance sync panel (`/configuration`)
- [ ] **Step 4: Implement TC-THEME-01, TC-NOTIF-01 & TC-API-01**
  - Theme Studio modal (40 themes, dark/light switch, 5 Google Fonts)
  - Official announcement modal (`AnnouncementModal.tsx`) with Anti-Overlap rule
  - Profile and notification center
- [ ] **Step 5: Run Playwright test for Task 5 and verify pass**

---

### Task 6: Execution, Quality Gate Sign-Off & Documentation Synchronization

**Files:**
- Modify: `QA/README.md` (Update execution records with automated test run metrics)
- Modify: `frontend/package.json`

- [ ] **Step 1: Run complete Playwright E2E test suite (`npx playwright test`)**
- [ ] **Step 2: Run backend tests (`dotnet test`) to verify zero regressions**
- [ ] **Step 3: Run Next.js production build (`npm run build`)**
- [ ] **Step 4: Update QA README with automated test execution sign-off certificate**
- [ ] **Step 5: Commit changes to git and summarize results**

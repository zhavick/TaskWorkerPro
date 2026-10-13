# FSD 5.16 Multi-Instance Synchronization & Host Induk Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate an enterprise multi-instance database and file attachment synchronization engine (FSD 5.16) supporting online REST API Push/Pull to Host Induk and offline air-gapped `.zip` package export/import, wired into a dedicated tab on the Next.js 16 System Configuration UI.

**Architecture:** `SyncHistory` entity in PostgreSQL tracks sync audits. `ISyncService` and `SyncService` in `TrackerKerja.Infrastructure` handle data serialization, atomic EF Core upserts, ZIP compression/extraction with Zip Slip traversal protection, and HTTP client communication. `SyncController` exposes endpoints authenticated via JWT or `X-Sync-Key`. The frontend adds an interactive Tab "Sinkronisasi Host Induk" in `/configuration`.

**Tech Stack:** C# 12, .NET 8.0 SDK, EF Core 8, System.IO.Compression, Npgsql, Next.js 16 (React 19, TypeScript, Tailwind CSS v4, TailGrids UI, Sonner, Lucide React).

**Spec:** [docs/superpowers/specs/2026-10-13-multi-instance-sync-design.md](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docs/superpowers/specs/2026-10-13-multi-instance-sync-design.md)

## Global Constraints
- Target Framework: .NET 8.0 LTS (`net8.0`) and Next.js 16 (React 19, Tailwind CSS v4).
- Safe File Extraction: Protect against Zip Slip directory traversal vulnerabilities via `Path.GetFullPath` validation.
- Atomic Database Transactions: Use `IDbContextTransaction` during data merge/import to guarantee rollback on integrity errors.
- Dual Sync Modes: Online REST API (Push/Pull with `X-Sync-Key`) AND Offline Air-Gapped (`.zip` export/import).
- Uniform API Response Envelope: `{ "success": true, "data": { ... }, "message": "..." }`.

---

### Task 1: Domain Entities & AppDbContext Integration

**Files:**
- Create: `backend/src/TrackerKerja.Domain/Entities/SyncEntities.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`

**Interfaces:**
- Produces: `SyncHistory`, `SyncDirection`, `SyncStatus`, and `DbSet<SyncHistory> SyncHistories` in `AppDbContext`.

- [ ] **Step 1: Create `SyncEntities.cs` in `TrackerKerja.Domain/Entities`**

```csharp
namespace TrackerKerja.Domain.Entities;

public enum SyncDirection
{
    Push,
    Pull,
    ExportZip,
    ImportZip,
    Receive
}

public enum SyncStatus
{
    Success,
    Failed,
    Partial
}

public class SyncHistory
{
    public int Id { get; set; }
    public SyncDirection Direction { get; set; }
    public SyncStatus Status { get; set; }
    public string TargetHost { get; set; } = string.Empty;
    public int TotalRecordsSynced { get; set; }
    public long FileSizeBytes { get; set; }
    public string? SummaryJson { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? TriggeredByUserId { get; set; }
}
```

- [ ] **Step 2: Add `SyncHistories` to `AppDbContext.cs`**

Add `public DbSet<SyncHistory> SyncHistories => Set<SyncHistory>();` and table mapping `modelBuilder.Entity<SyncHistory>().ToTable("sync_histories");`.

- [ ] **Step 3: Run `dotnet build backend/src/TrackerKerja.Infrastructure` to verify compilation**

Run: `dotnet build backend/src/TrackerKerja.Infrastructure/TrackerKerja.Infrastructure.csproj`
Expected: Build succeeded with 0 errors.

- [ ] **Step 4: Commit Domain & Infrastructure entity changes**

```bash
git add backend/src/TrackerKerja.Domain/Entities/SyncEntities.cs backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs
git commit -m "feat(sync): add SyncHistory entity and AppDbContext table mapping"
```

---

### Task 2: Application Layer DTOs & Service Contract

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/SyncDtos.cs`
- Create: `backend/src/TrackerKerja.Application/Common/Interfaces/ISyncService.cs`

**Interfaces:**
- Produces: `ISyncService`, `SyncPingResponse`, `SyncPushRequest`, `SyncPullRequest`, `SyncPayload`, `SyncManifest`, `SyncDatabaseData`, `SyncOperationResult`, `SyncHistoryDto`.

- [ ] **Step 1: Create `SyncDtos.cs` in `TrackerKerja.Application/DTOs`**

Define all record DTOs for manifest, database payload, sync requests, and history summaries.

- [ ] **Step 2: Create `ISyncService.cs` in `TrackerKerja.Application/Common/Interfaces`**

Define interface methods for ping, ping remote, export package, import package, push, pull, receive, and history.

- [ ] **Step 3: Run `dotnet build backend/src/TrackerKerja.Application` to verify compilation**

Run: `dotnet build backend/src/TrackerKerja.Application/TrackerKerja.Application.csproj`
Expected: Build succeeded with 0 errors.

- [ ] **Step 4: Commit Application layer changes**

```bash
git add backend/src/TrackerKerja.Application/DTOs/SyncDtos.cs backend/src/TrackerKerja.Application/Common/Interfaces/ISyncService.cs
git commit -m "feat(sync): define sync DTOs and ISyncService interface"
```

---

### Task 3: Infrastructure Layer Implementation (`SyncService`) & Unit Tests

**Files:**
- Create: `backend/src/TrackerKerja.Infrastructure/Services/SyncService.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Program.cs`
- Create: `backend/tests/TrackerKerja.Tests/SyncServiceTests.cs`

**Interfaces:**
- Consumes: `ISyncService`, `AppDbContext`, `IWebHostEnvironment`, `IHttpClientFactory`.
- Produces: Concrete `SyncService` registered in DI.

- [ ] **Step 1: Write failing unit tests in `TrackerKerja.Tests/SyncServiceTests.cs`**

Write tests for:
- Local ping info generation (counts entities and calculates folder size).
- Export package `.zip` generation (includes manifest and data).
- Manifest serialization and entity count verification.
- Zip Slip path traversal guard prevention.

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SyncServiceTests"`
Expected: FAIL because `SyncService` does not exist yet.

- [ ] **Step 3: Implement `SyncService.cs` in `TrackerKerja.Infrastructure/Services`**

Implement complete export, import, Zip Slip security, database serialization, entity merging, and history recording.

- [ ] **Step 4: Register `ISyncService` and `HttpClient` in `Program.cs`**

```csharp
builder.Services.AddHttpClient();
builder.Services.AddScoped<ISyncService, SyncService>();
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SyncServiceTests"`
Expected: All tests pass.

- [ ] **Step 6: Commit Infrastructure implementation**

```bash
git add backend/src/TrackerKerja.Infrastructure/Services/SyncService.cs backend/src/TrackerKerja.WebApi/Program.cs backend/tests/TrackerKerja.Tests/SyncServiceTests.cs
git commit -m "feat(sync): implement SyncService with Zip export/import, Zip Slip protection, and unit tests"
```

---

### Task 4: WebApi Controller & REST Endpoints (`/api/sync`)

**Files:**
- Create: `backend/src/TrackerKerja.WebApi/Controllers/SyncController.cs`
- Create: `backend/tests/TrackerKerja.Tests/SyncControllerTests.cs`

**Interfaces:**
- Consumes: `ISyncService`, `AppDbContext`, `ICurrentTenantService`.
- Produces: REST endpoints `/api/sync/ping`, `/api/sync/ping-host`, `/api/sync/push`, `/api/sync/pull`, `/api/sync/receive`, `/api/sync/export-package`, `/api/sync/import-package`, `/api/sync/history`.

- [ ] **Step 1: Write controller tests in `TrackerKerja.Tests/SyncControllerTests.cs`**

Test ping, export-package, and history endpoints.

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SyncControllerTests"`
Expected: FAIL.

- [ ] **Step 3: Implement `SyncController.cs` in `TrackerKerja.WebApi/Controllers`**

Implement endpoints with `[Authorize(Roles = "Administrator")]`, `X-Sync-Key` authentication on `receive`, and file download/upload handling.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SyncControllerTests"`
Expected: PASS.

- [ ] **Step 5: Commit WebApi Controller implementation**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/SyncController.cs backend/tests/TrackerKerja.Tests/SyncControllerTests.cs
git commit -m "feat(sync): implement SyncController REST endpoints and tests"
```

---

### Task 5: Frontend Configuration UI (`/configuration` Tab Sinkronisasi)

**Files:**
- Modify: `frontend/src/app/(with-layouts)/configuration/page.tsx`

**Interfaces:**
- Consumes: `/api/sync/*` endpoints via `apiClient`.
- Produces: Integrated Tab 6 ("sync") with Host Configuration, Ping Host test, Online Push/Pull triggers, Offline ZIP export/import, and Sync Audit Trail.

- [ ] **Step 1: Add "sync" tab pill and tab content to `configuration/page.tsx`**

Implement:
- Host URL input, API Key input, Include Files toggle.
- Ping Host button with latency and status indicator.
- Push to Host & Pull from Host action buttons with toast updates.
- Export Package `.zip` download action.
- Import Package `.zip` file input & confirmation dialog.
- Sync History audit table showing direction, status, records, size, and date.

- [ ] **Step 2: Test frontend compilation with `npm run build`**

Run: `cmd /c "npm --prefix frontend run build"`
Expected: Production build succeeds with 0 errors.

- [ ] **Step 3: Commit frontend UI changes**

```bash
git add frontend/src/app/\(with-layouts\)/configuration/page.tsx
git commit -m "feat(sync): add Host Induk Synchronization tab to system configuration UI"
```

---

### Task 6: Full Integration Verification & Smoke Test

**Files:**
- Test backend solution compilation: `dotnet build backend/TrackerKerja.sln`
- Run all unit tests: `dotnet test backend/TrackerKerja.sln`
- Test frontend production build: `cmd /c "npm --prefix frontend run build"`

- [ ] **Step 1: Run complete backend test suite**
- [ ] **Step 2: Run frontend production build**
- [ ] **Step 3: Commit and summarize implementation**

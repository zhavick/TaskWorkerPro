# Implementation Plan: Audit Trail & Activity Timeline (FSD 5.12 / 5.17)

## Phase 1: Backend Infrastructure & Filter
- [ ] Create `backend/src/TrackerKerja.Infrastructure/Filters/AuditLogActionFilter.cs`:
  - Intercepts mutating actions (`POST`, `PUT`, `DELETE`, `PATCH`).
  - Measures execution duration with `Stopwatch`.
  - Extracts user context from `User.Claims` (`sub`, `name`, `email`).
  - Serializes arguments safely (sanitizing password, token, secret keys).
  - Persists `AuditLog` asynchronously without blocking or failing user request.
- [ ] Register `AuditLogActionFilter` in `Program.cs` under `builder.Services.AddControllers(options => options.Filters.Add<AuditLogActionFilter>())`.

## Phase 2: DTOs & Controller Enhancements
- [ ] Add `AuditLogSummaryDto` & `AuditUserStatDto` in `TrackerKerja.Application/DTOs/MasterDataDtos.cs` or dedicated file.
- [ ] Enhance `AuditLogsController.cs`:
  - Add date filters (`startDate`, `endDate`) to `GET /api/audit-logs`.
  - Add `GET /api/audit-logs/summary` endpoint returning totals, today count, success/error count, method breakdown, and top users.
  - Add `GET /api/audit-logs/task/{taskId}` returning activity timeline for a specific task.
  - Add `DELETE /api/audit-logs/cleanup?days=90` endpoint to delete logs older than retention period.
- [ ] Add unit tests in `backend/tests/TrackerKerja.Tests/AuditLogsControllerTests.cs`.
  - Test pagination & filters.
  - Test summary metrics.
  - Test task timeline.
  - Test cleanup.

## Phase 3: Frontend Audit Trail Management Page (`/audit-trail`)
- [ ] Create `frontend/src/app/(with-layouts)/audit-trail/page.tsx`:
  - Top analytic stat cards (Total, Hari Ini, Sukses, Error).
  - Search & filter toolbar (Text search, HTTP Method filter, Date filter, Status Code).
  - TailGrids styled responsive audit log table.
  - Slide-over detail drawer (`Sheet`) for inspecting payload JSON, headers, and device telemetry.
  - Cleanup dialog for admins.
- [ ] Add "Audit Trail & Log Keamanan" to `NAV_DATA` in `frontend/src/components/common/sidebar/data.tsx`.

## Phase 4: Task Detail Activity Timeline Integration
- [ ] In `frontend/src/app/(with-layouts)/tasks/[id]/page.tsx`:
  - Add Activity Timeline card displaying chronological log of task updates.
  - Query `GET /api/audit-logs/task/{taskId}`.
  - Render human-friendly timeline items with user info, action type, and timestamps.

## Phase 5: Verification & Delivery
- [ ] Run `dotnet test` to verify all tests pass.
- [ ] Run `cmd.exe /c "npm --prefix frontend run build"` to verify Next.js build.
- [ ] Commit and push to GitHub.

# Implementation Plan: Configuration Data Maintenance & Purge Tab

## Phase 1: DTOs & Contracts
- [ ] Add `DataMaintenanceDtos.cs` to `backend/src/TrackerKerja.Application/DTOs/`:
  - `DataMaintenanceStatsDto`
  - `DataPurgeRequest`
  - `DataPurgeResultDto`

## Phase 2: Backend Controller Implementation
- [ ] Extend `SettingsController.cs` with:
  - `GET /api/settings/maintenance/stats`: Calculate and return counts of all entities, categorized as operational vs preserved.
  - `POST /api/settings/maintenance/purge`:
    - Validates confirmation keyword (`RESET-TOTAL` for full purge, or `KONFIRMASI` for partial purge).
    - Checks `IsAdmin` (or Administrator role).
    - Identifies current user ID and admin user IDs to preserve.
    - Executes cascaded/ordered deletions in transaction (`IsRelational` check).
    - Preserves Master Data (Priorities, Statuses, Milestones, Categories, Settings, EmailTemplates, Companies) and Announcements.
    - Returns detailed deletion counts.
- [ ] Add unit tests in `backend/tests/TrackerKerja.Tests/DataMaintenanceTests.cs`.
  - Test statistics calculation.
  - Test full purge preserves admin users, announcements, and master data while wiping operational data.
  - Test partial purge deletes only selected domain data.

## Phase 3: Frontend Integration in `/configuration`
- [ ] Update `frontend/src/app/(with-layouts)/configuration/page.tsx`:
  - Add `"maintenance"` to `activeTab` type and tab navigation with icon `Trash2` (styled with rose accents).
  - Add Query for `maintenanceStats` (`GET /api/settings/maintenance/stats`).
  - Add Mutation for `purgeMutation` (`POST /api/settings/maintenance/purge`).
  - Render Tab Content for "Pembersihan Data":
    - Summary of Protected vs Purgeable data cards.
    - Full Reset card with strict confirmation modal (`RESET-TOTAL`).
    - Selective/Modular purge checkboxes.

## Phase 4: Verification & Push
- [ ] Run `dotnet test` to verify all 88+ tests pass.
- [ ] Run `cmd.exe /c "npm --prefix frontend run build"` to verify Next.js build.
- [ ] Git commit and push to GitHub.

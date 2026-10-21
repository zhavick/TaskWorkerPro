# Design Specification: Master Companies, User Folder Uploads, Dashboard Announcement Modal, and DevTools Task Binding

**Date:** 2026-10-21  
**Status:** Approved  
**Author:** Antigravity & User  

---

## 1. Overview & Goals

This specification covers four requested enhancements for TrackerKerja Modern:
1. **Master Data Perusahaan**: Comprehensive CRUD for companies (`Company` entity), linking companies to users during registration, management, and automatic binding during Excel task imports.
2. **User-Specific Folder File Uploads**: Saving user avatars and cover banners into a dedicated folder named by the user's username (`uploads/users/{userName}/avatar/` and `uploads/users/{userName}/cover/`) in both backend storage and frontend public assets, ensuring profile edits save reliably.
3. **Announcement Modal Popup on Dashboard**: Automatic popup dialog on the dashboard upon login displaying active announcements, with a "Don't show again" option and dismissal tracking.
4. **Developer Tools Binding to Tasks**: Linking JSON Validator/Beautifier and SQL Formatter queries to the active task the user is working on, with task selection and history badge display.

---

## 2. Subsystem Architecture

### 2.1 Master Data Perusahaan (`Company` Management & Binding)
- **Domain Entity**: `Company` (already in `TrackerKerja.Domain.Entities.Company`: `Id`, `Name`, `Code`, `Description`, `Address`, `ContactEmail`, `CreatedAt`).
- **Backend Controller**: `CompaniesController.cs` at `/api/companies`:
  - `GET /api/companies`: Returns list of companies with metrics (`TotalMembers`, `TotalProjects`, `TotalTasks`). Searchable by query.
  - `GET /api/companies/{id}`: Returns company details.
  - `POST /api/companies`: Creates a new company (`Name`, `Code`, `Description`, `Address`, `ContactEmail`).
  - `PUT /api/companies/{id}`: Updates company information.
  - `DELETE /api/companies/{id}`: Deletes company if no users/tasks are attached.
- **Excel Import Auto-Binding (`TaskExcelImportService.cs`)**:
  - In `PreviewImportAsync` & `CommitImportAsync`: If sheet metadata or a "Perusahaan" / "Company" column contains a company name or code, look it up in `_context.Companies`. If not found, automatically register a new `Company` entity into master data.
  - Bind imported tasks and new/updated users to this `CompanyId`.
- **Frontend UI (`/configuration` / Master Data)**:
  - Add a dedicated "Master Perusahaan" management section with a searchable table, Create/Edit modal dialog, and status badge.

### 2.2 User-Specific Folder File Uploads
- **File System Structure**:
  - Backend: `wwwroot/uploads/users/{userName}/avatar/{fileName}` & `wwwroot/uploads/users/{userName}/cover/{fileName}`
  - Frontend: `frontend/public/uploads/users/{userName}/avatar/{fileName}` & `frontend/public/uploads/users/{userName}/cover/{fileName}`
- **Backend Controller (`ProfileController.cs`)**:
  - `UploadAvatar(IFormFile file)`:
    - Resolves `userName` from `user.UserName ?? user.Id`.
    - Sanitizes `userName` to remove directory traversal or invalid characters.
    - Saves file to both backend and frontend user folders.
    - Sets `user.ProfilePictureUrl = $"/uploads/users/{cleanUserName}/avatar/{fileName}"` and saves to DB.
  - `UploadCover(IFormFile file)`:
    - Saves file to both backend and frontend user folders.
    - Sets `user.CoverPictureUrl = $"/uploads/users/{cleanUserName}/cover/{fileName}"` and saves to DB.
  - `UpdateProfile([FromBody] UpdateProfileRequest request)`:
    - Accurately persists `ProfilePictureUrl` and `CoverPictureUrl`.
- **Frontend (`profile/account/page.tsx`)**:
  - Ensures immediate optimistic preview and persistence when avatar or cover is updated.

### 2.3 Dashboard Announcement Modal Popup
- **Backend**:
  - Leverages existing `/api/announcements/active` and `/api/announcements/{id}/mark-read`.
- **Frontend (`dashboard/page.tsx`)**:
  - Queries active announcements on dashboard mount.
  - Filters out announcements marked as "Don't show again" or already dismissed in `sessionStorage`.
  - Shows modern TailGrids `Dialog` modal with priority styling (e.g. Red for "Mendesak / Darurat", Indigo for "Informasi Penting").
  - Offers checkbox "Jangan tampilkan lagi" and button "Saya Mengerti / Tutup", calling `/api/announcements/{id}/mark-read`.

### 2.4 Developer Tools Task Binding
- **Backend**:
  - `DevToolsController.cs`:
    - `JsonFormatRequest`: add `int? TaskId`.
    - `JsonHistory`: records `TaskId`.
    - `GetJsonHistory`: returns `id`, `name`, `taskId`, `taskTitle`, `createdAt`.
  - `SqlToolsController.cs`:
    - `SqlFormatRequest`: ensure `int? TaskId` is saved to `SqlHistory`.
    - `GetHistory`: returns `id`, `name`, `dialect`, `content`, `taskId`, `taskTitle`, `createdAt`.
- **Frontend**:
  - JSON Formatter (`dev-tools/json/page.tsx`):
    - Fetches active user tasks via `apiClient.get('/tasks')`.
    - Adds Task selection dropdown (`Pilih Tugas yang Sedang Dikerjakan`).
    - Adds snippet name input & save action.
    - Adds History drawer / list showing saved JSON items with their bound Task badge.
  - SQL Beautifier (`dev-tools/sql/page.tsx`):
    - In Save modal & format toolbar: adds Task selection dropdown.
    - In History modal: displays bound Task name badge and allows restoring the query with one click.

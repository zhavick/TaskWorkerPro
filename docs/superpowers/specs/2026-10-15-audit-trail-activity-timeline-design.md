# Design Spec: Audit Trail & Activity Timeline (FSD 5.12 / 5.17 & TSD 2.10)

## 1. Overview & Objective
Implement a comprehensive, enterprise-grade **Audit Trail & Activity Timeline** module for TrackerKerja Modern.
The system provides:
1. **Automated Interception (`AuditLogActionFilter`)**: Automatically intercepts mutating HTTP requests (`POST`, `PUT`, `DELETE`, `PATCH`) to log user actions, IP address, execution duration, HTTP status code, and sanitized request details.
2. **Audit Intelligence & Analytics Backend**:
   - `GET /api/audit-logs` (Filtered & paginated logs)
   - `GET /api/audit-logs/summary` (Analytics counters: total, today's mutations, method breakdown, error rates)
   - `GET /api/audit-logs/{id}` (Detail with formatted JSON payload)
   - `GET /api/audit-logs/task/{taskId}` (Task-scoped activity timeline)
   - `DELETE /api/audit-logs/cleanup?days=90` (Log pruning for retention management)
3. **Enterprise Frontend Experience**:
   - Dedicated **Audit Trail & Log Keamanan** page at `/audit-trail` with real-time analytics stat cards, filter controls, and pagination.
   - **Slide-Over Detail Drawer (`Sheet`)** for inspecting full JSON payloads, headers, and device telemetry.
   - **Task Studio Activity Timeline**: Embedded chronological timeline inside `/tasks/[id]` displaying audit events specific to that task.
   - Sidebar navigation integration under "TIM & ENTERPRISE".

## 2. Architecture & Data Flow

```
[Client HTTP Request (POST/PUT/DELETE)]
             │
             ▼
   [JWT Authentication]
             │
             ▼
   [AuditLogActionFilter] ──(Execution Stopwatch)──► [Action Execution]
             │                                              │
             │◄───(Response Status, Duration, User Info)────┘
             │
   (Sanitize Sensitive Fields: password, secret, token)
             │
             ▼
      [AppDbContext] ──► [audit_logs Table]
```

## 3. Data Schema & Models

### 3.1 Entity: `AuditLog`
Existing table `audit_logs` in PostgreSQL:
- `Id`: `long` (Primary Key, Identity)
- `UserId`: `string?`
- `UserEmail`: `string?`
- `UserName`: `string?`
- `ControllerName`: `string?`
- `ActionName`: `string?`
- `HttpMethod`: `string?` (POST, PUT, DELETE, PATCH, etc.)
- `Path`: `string?`
- `QueryString`: `string?`
- `IpAddress`: `string?`
- `StatusCode`: `int`
- `DurationMs`: `int`
- `Timestamp`: `DateTimeOffset` (Indexed DESC)
- `Details`: `string?` (JSON text)

### 3.2 DTOs (`TrackerKerja.Application.DTOs`)
- `AuditLogDto`:
  - `Id`: long
  - `UserId`: string?
  - `UserEmail`: string?
  - `UserName`: string?
  - `ControllerName`: string?
  - `ActionName`: string?
  - `HttpMethod`: string?
  - `Path`: string?
  - `StatusCode`: int
  - `DurationMs`: int
  - `Timestamp`: DateTimeOffset
  - `Details`: string?
- `AuditLogSummaryDto`:
  - `TotalLogs`: int
  - `TodayCount`: int
  - `SuccessCount`: int
  - `ErrorCount`: int
  - `MethodBreakdown`: Dictionary<string, int>
  - `TopUsers`: List<AuditUserStatDto>
- `AuditUserStatDto`:
  - `UserId`: string
  - `UserName`: string
  - `Count`: int

## 4. API Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| GET | `/api/audit-logs` | Admin / SuperAdmin | Paginated list with search, method, status, date filters |
| GET | `/api/audit-logs/summary` | Admin / SuperAdmin | Summary analytics & method metrics |
| GET | `/api/audit-logs/{id}` | Admin / SuperAdmin | Single audit log entry detail |
| GET | `/api/audit-logs/task/{taskId}` | Authenticated | Activity timeline entries for a specific task |
| DELETE | `/api/audit-logs/cleanup` | Admin / SuperAdmin | Delete logs older than specified days (default: 90) |

## 5. Frontend Specification

### 5.1 `/audit-trail` Page
1. **Stat Cards Banner**:
   - Total Log Tercatat (Slate/Indigo)
   - Mutasi Hari Ini (Emerald)
   - Permintaan Sukses 2xx (Cyan)
   - Peringatan & Error 4xx/5xx (Rose)
2. **Filter & Action Toolbar**:
   - Search input (User, Controller, Path)
   - Method selector: Semua, POST, PUT, DELETE, PATCH
   - Date range selector: Semua, Hari Ini, 7 Hari, 30 Hari
   - Tombol "Bersihkan Log Lama" (Admin dialog)
3. **Audit Table**:
   - Columns: Waktu, Pengguna (Avatar + Nama + Email), Aksi/Controller, Metode HTTP (Color badge), Path, Status Code, Durasi (ms), Tombol Rincian.
4. **Slide-over Drawer (`Sheet`)**:
   - Metadata header, status badge, user pill, client IP.
   - Code block with formatted, syntax-highlighted JSON payload.

### 5.2 `/tasks/[id]` Task Studio Activity Timeline
- Adds a card or tab **"Riwayat Perubahan & Log Aktivitas"**.
- Displays chronologically sorted events (e.g., status changes, assignees, subtasks, session logs).
- Displays relative time (e.g., "10 menit lalu", "Kemarin 14:30") and author.

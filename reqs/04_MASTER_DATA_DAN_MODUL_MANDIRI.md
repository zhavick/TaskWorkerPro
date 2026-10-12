# 📦 FASE 4: MASTER DATA DAN MODUL MANDIRI (LOW DEPENDENCY)
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Tanpa / Rendah Dependensi: Master Referensi, Kategori, Pengaturan Sistem, Template Email, Audit Trail, dan Alat Pengembang (Developer Tools)**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids)  
> **Status**: Ready for Implementation  

---

## 1. Modul Master Referensi (`MasterPriorities`, `MasterStatuses`, `MasterMilestones`)

Modul ini menjadi rujukan konstan untuk seluruh status, prioritas, dan fase SDLC pada modul tugas.

### A. Kontrak Endpoint REST API
- `GET /api/master/priorities` — Mengambil daftar seluruh tingkat prioritas (Urut berdasarkan `orderIndex`).
- `POST /api/master/priorities` (Admin Only) — Menambah prioritas baru.
- `PUT /api/master/priorities/{id}` (Admin Only) — Memperbarui nama, warna Hex, icon, orderIndex, atau status default.
- `DELETE /api/master/priorities/{id}` (Admin Only) — Menghapus prioritas (dilarang jika sedang digunakan oleh tugas).
- `GET /api/master/statuses` — Mengambil daftar status tugas (`Todo`, `InProgress`, `Done`, `Overdue`).
- `PUT /api/master/statuses/{id}` (Admin Only) — Mengedit properti status (`isDoneState`, warna, dll.).
- `GET /api/master/milestones` — Mengambil daftar fase tonggak SDLC (Planning, Design, Development, Testing, Release).
- `POST /api/master/milestones` (Admin Only) — Menambah tonggak pencapaian baru.

### B. Format DTO (C#)
```csharp
public record MasterPriorityDto(
    int Id,
    string Name,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record CreateMasterPriorityRequest(
    string Name,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);
```

---

## 2. Modul Kategori Pekerjaan (`Categories`)

Menyimpan tag atau divisi kategori tugas (misal: *Backend*, *Frontend*, *DevOps*, *UI/UX Design*, *Database*, *QA Testing*).

### A. Kontrak Endpoint REST API
- `GET /api/categories` — Mendapatkan semua kategori aktif.
- `GET /api/categories/{id}` — Detail kategori.
- `POST /api/categories` (Admin / Elevated) — Menambah kategori baru (`name`, `color`, `description`).
- `PUT /api/categories/{id}` — Memperbarui kategori.
- `DELETE /api/categories/{id}` — Menghapus kategori.

---

## 3. Modul Pengaturan Sistem 4-Tab (`SystemSettings`)

Menyimpan pasangan *Key-Value* konfigurasi global yang dikelola melalui antarmuka 4-Tab di frontend:
1. **Tab 1: Sinkronisasi Host Induk & Cabang** (`Sync:MasterHostUrl`, `Sync:ApiKey`, `Sync:AutoSyncIntervalMinutes`).
2. **Tab 2: Database & Pemeliharaan** (`Database:VacuumSchedule`, `Database:BackupRetentionDays`).
3. **Tab 3: Server Email SMTP** (`Smtp:Host`, `Smtp:Port`, `Smtp:Username`, `Smtp:SenderEmail`).
4. **Tab 4: Umum & Swagger API** (`App:PublicBaseUrl`, `App:EnableSwaggerInProd`).

### Kontrak Endpoint REST API
- `GET /api/settings` (Admin Only) — Mengambil seluruh pasangan konfigurasi.
- `PUT /api/settings/batch` (Admin Only) — Memperbarui sekumpulan konfigurasi sekaligus secara atomik.
- `POST /api/settings/test-smtp` (Admin Only) — Menguji koneksi SMTP dengan mengirim email uji coba instan.

---

## 4. Modul Template Email Dinamis (`EmailTemplates`)

Menyimpan template HTML untuk notifikasi otomatis:
- `ADMIN_NEW_USER_ALERT`: Notifikasi admin saat ada user baru registrasi.
- `USER_APPROVED`: Notifikasi kepada user saat akunnya disetujui.
- `USER_REJECTED`: Notifikasi saat pendaftaran ditolak.
- `PASSWORD_RESET`: Tautan pemulihan kata sandi.
- `TASK_ASSIGNED`: Notifikasi saat tugas baru didelegasikan ke pengguna.

### Kontrak Endpoint REST API
- `GET /api/email-templates` (Admin Only) — Daftar seluruh template.
- `GET /api/email-templates/{eventCode}` — Detail template berdasarkan kode event unik.
- `PUT /api/email-templates/{id}` (Admin Only) — Menyimpan perubahan subjek dan konten HTML template.
- `POST /api/email-templates/{id}/preview` — Menghasilkan pratinjau HTML dengan data dummy pengganti variabel.

---

## 5. Modul Audit Trail & Log Keamanan (`AuditLogs`)

Mencatat seluruh aksi mutasi HTTP (`POST`, `PUT`, `DELETE`) dan error ke dalam tabel PostgreSQL berpartisi/terindeks.

### A. Mekanisme Perekaman Otomatis (`AuditLogActionFilter`)
Dijalankan sebagai ASP.NET Core Action Filter global:
```csharp
public class AuditLogActionFilter : IAsyncActionFilter
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var sw = Stopwatch.StartNew();
        var executedContext = await next();
        sw.Stop();

        // Hanya catat aksi non-GET atau aksi sensitif
        if (context.HttpContext.Request.Method != "GET" || context.ActionDescriptor.DisplayName.Contains("Auth"))
        {
            var log = new AuditLog
            {
                UserId = _tenantService.UserId,
                UserEmail = context.HttpContext.User?.FindFirst(ClaimTypes.Email)?.Value,
                ControllerName = context.Controller.GetType().Name,
                ActionName = context.ActionDescriptor.RouteValues["action"],
                HttpMethod = context.HttpContext.Request.Method,
                Path = context.HttpContext.Request.Path,
                QueryString = context.HttpContext.Request.QueryString.ToString(),
                IpAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString(),
                StatusCode = context.HttpContext.Response.StatusCode,
                DurationMs = (int)sw.ElapsedMilliseconds,
                Timestamp = DateTimeOffset.UtcNow
            };
            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}
```

### B. Kontrak Endpoint REST API
- `GET /api/audit-logs` (Admin Only) — Paginasi riwayat audit log dengan filter (`userId`, `method`, `statusCode`, `startDate`, `endDate`).
- `GET /api/audit-logs/{id}` (Admin Only) — Detail log lengkap termasuk parameter JSON dan informasi perangkat.

---

## 6. Modul Alat Pengembang (Developer Tools: JSON & SQL)

Menyediakan utilitas terintegrasi untuk para developer di tim:
1. **JSON Payload Formatter & Validator**: Mempercantik format JSON (*beautify*), memvalidasi struktur sintaksis, dan menyimpan ke riwayat `json_histories`.
2. **SQL Beautifier & Query Formatter**: Memformat sintaksis kueri SQL, menyorot kata kunci (*syntax highlighting*), dan menyimpan ke `sql_histories`.

### Kontrak Endpoint REST API
- `POST /api/dev-tools/json/format` — Memvalidasi dan merapikan string JSON mentah.
- `GET /api/dev-tools/json/history` — Riwayat penyimpanan payload JSON pengguna.
- `POST /api/dev-tools/sql/format` — Memformat kueri SQL dengan dialek PostgreSQL/ANSI.
- `GET /api/dev-tools/sql/history` — Riwayat kueri SQL tersimpan.

---

## 7. Desain Komponen UI Rujukan (`sample-web-ui`)

Untuk modul mandiri ini di Next.js:
- **Tabel Master Data & Audit Log**: Gunakan komponen TailGrids `table.tsx` dan `pagination.tsx` yang dipadukan dengan `@tanstack/react-table`.
- **Form Edit Master**: Gunakan `dialog.tsx` (modal) dengan input `text-field.tsx` dan `select.tsx`.
- **Pengaturan 4-Tab**: Gunakan `tabs.tsx` dari `src/components/tailgrids/core/tabs.tsx`.
- **Audit Detail Modal**: Gunakan `sheet.tsx` (slide-over drawer dari samping) untuk menampilkan payload JSON detail audit log secara estetik.

using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Filters;

public class AuditLogActionFilter : IAsyncActionFilter
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuditLogActionFilter> _logger;

    private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "secret", "token", "refreshToken", "authorization", "apiKey", "credential"
    };

    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "DELETE", "PATCH"
    };

    public AuditLogActionFilter(AppDbContext context, ILogger<AuditLogActionFilter> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpMethod = context.HttpContext.Request.Method;
        var path = context.HttpContext.Request.Path.Value ?? string.Empty;

        // Skip non-mutating requests and diagnostic/health endpoints
        if (!MutatingMethods.Contains(httpMethod) || path.StartsWith("/health", StringComparison.OrdinalIgnoreCase))
        {
            await next();
            return;
        }

        var stopwatch = Stopwatch.StartNew();

        // Capture sanitized action arguments before execution
        Dictionary<string, object?>? sanitizedArgs = null;
        string? attemptedEmail = null;

        try
        {
            if (context.ActionArguments.Count > 0)
            {
                sanitizedArgs = new Dictionary<string, object?>();
                foreach (var (k, v) in context.ActionArguments)
                {
                    if (SensitiveKeys.Any(s => k.Contains(s, StringComparison.OrdinalIgnoreCase)))
                    {
                        sanitizedArgs[k] = "[REDACTED]";
                    }
                    else if (v != null && v.GetType().Name.Contains("FormFile", StringComparison.OrdinalIgnoreCase))
                    {
                        sanitizedArgs[k] = "[FILE_UPLOAD]";
                    }
                    else
                    {
                        sanitizedArgs[k] = v;

                        // Capture email from login or registration request if available
                        if (v != null)
                        {
                            var emailProp = v.GetType().GetProperty("Email") ?? v.GetType().GetProperty("email");
                            if (emailProp != null)
                            {
                                attemptedEmail = emailProp.GetValue(v)?.ToString();
                            }
                        }
                    }
                }
            }
        }
        catch
        {
            sanitizedArgs = new Dictionary<string, object?> { ["error"] = "[Serialization Error]" };
        }

        // Execute action
        var executedContext = await next();
        stopwatch.Stop();

        // Record audit log asynchronously
        try
        {
            var user = context.HttpContext.User;
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? user.FindFirst("sub")?.Value;
            var userEmail = user.FindFirst(ClaimTypes.Email)?.Value
                           ?? user.FindFirst("email")?.Value;
            var userName = user.FindFirst(ClaimTypes.Name)?.Value
                          ?? user.FindFirst("name")?.Value
                          ?? userEmail;

            var controllerName = context.Controller?.GetType().Name.Replace("Controller", "") ?? "Unknown";
            var actionName = context.ActionDescriptor.RouteValues.TryGetValue("action", out var act) ? act : context.ActionDescriptor.DisplayName;

            var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString();
            var statusCode = executedContext.HttpContext.Response.StatusCode;

            // Correlate Auth login/registration events when context.User wasn't populated yet
            if (string.IsNullOrEmpty(userEmail) && !string.IsNullOrEmpty(attemptedEmail))
            {
                userEmail = attemptedEmail;
                var dbUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == attemptedEmail);
                if (dbUser != null)
                {
                    userId = dbUser.Id;
                    userName = dbUser.FullName;
                }
                else
                {
                    userName = attemptedEmail;
                }
            }

            var module = GetModuleName(controllerName);
            var actionSummary = GenerateActionSummary(controllerName, actionName, httpMethod, path, statusCode);

            var detailsPayload = new Dictionary<string, object?>
            {
                ["module"] = module,
                ["actionSummary"] = actionSummary,
                ["params"] = sanitizedArgs
            };

            var details = JsonSerializer.Serialize(detailsPayload, new JsonSerializerOptions
            {
                WriteIndented = false,
                MaxDepth = 4
            });

            var auditLog = new AuditLog
            {
                UserId = userId,
                UserEmail = userEmail,
                UserName = userName,
                ControllerName = controllerName,
                ActionName = actionName,
                HttpMethod = httpMethod,
                Path = path,
                QueryString = context.HttpContext.Request.QueryString.Value,
                IpAddress = ipAddress,
                StatusCode = statusCode,
                DurationMs = (int)stopwatch.ElapsedMilliseconds,
                Timestamp = DateTimeOffset.UtcNow,
                Details = details
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist audit log entry for {Method} {Path}", httpMethod, path);
        }
    }

    private static string GetModuleName(string controllerName) => controllerName switch
    {
        "Auth" => "Autentikasi & Akun",
        "Tasks" => "Manajemen Tugas",
        "Projects" => "Manajemen Proyek",
        "Timesheets" => "Timesheet & Timer",
        "Attendances" => "Presensi & Kehadiran",
        "Notes" => "Catatan & Dokumen",
        "Gamification" => "Gamifikasi & Hadiah",
        "Announcements" => "Pengumuman Resmi",
        "Members" => "Manajemen Anggota",
        "Settings" => "Konfigurasi Sistem",
        "MasterData" => "Master Data SDLC",
        "DevTools" => "Developer Tools",
        "Sync" => "Sinkronisasi Host Induk",
        "Calendar" => "Jadwal & Kalender",
        "AuditLogs" => "Audit Trail & Log",
        _ => controllerName
    };

    private static string GenerateActionSummary(string controllerName, string? actionName, string httpMethod, string path, int statusCode)
    {
        var lowerPath = path.ToLowerInvariant();

        // 1. Auth Module
        if (controllerName.Equals("Auth", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/login"))
            {
                if (statusCode >= 200 && statusCode < 300) return "Pengguna berhasil masuk (Login)";
                if (statusCode == 401) return "Percobaan masuk gagal (Email/kata sandi salah)";
                if (statusCode == 403) return "Percobaan masuk ditolak (Akun belum disetujui Admin)";
                if (statusCode == 423) return "Percobaan masuk ditolak (Akun terkunci)";
                return "Percobaan masuk (Login)";
            }
            if (lowerPath.Contains("/register")) return "Pendaftaran akun pengguna baru";
            if (lowerPath.Contains("/logout")) return "Pengguna keluar sistem (Logout)";
            if (lowerPath.Contains("/refresh-token")) return "Pembaruan token sesi";
            if (lowerPath.Contains("/forgot-password") || lowerPath.Contains("/reset-password")) return "Permintaan pengaturan ulang kata sandi";
        }

        // 2. Tasks Module
        if (controllerName.Equals("Tasks", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/import/commit")) return "Mengeksekusi impor massal tugas dari Excel";
            if (lowerPath.Contains("/status")) return "Mengubah status tugas";
            if (httpMethod == "POST") return "Membuat tugas baru";
            if (httpMethod == "PUT") return "Memperbarui detail tugas";
            if (httpMethod == "DELETE") return "Menghapus tugas";
        }

        // 3. Projects Module
        if (controllerName.Equals("Projects", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/bulk-assign")) return "Alokasi massal tugas ke proyek";
            if (httpMethod == "POST") return "Membuat proyek baru";
            if (httpMethod == "PUT") return "Memperbarui detail proyek & pagu anggaran";
            if (httpMethod == "DELETE") return "Menghapus proyek";
        }

        // 4. Timesheets Module
        if (controllerName.Equals("Timesheets", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/start")) return "Memulai timer kerja tugas";
            if (lowerPath.Contains("/stop")) return "Menghentikan timer kerja";
            if (lowerPath.Contains("/manual")) return "Mencatat jam kerja manual";
            if (httpMethod == "DELETE") return "Menghapus sesi kerja";
        }

        // 5. Attendances Module
        if (controllerName.Equals("Attendances", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/clock-in")) return "Mencatat presensi masuk (Clock In)";
            if (lowerPath.Contains("/clock-out")) return "Mencatat presensi pulang (Clock Out)";
            if (lowerPath.Contains("/leave")) return "Mengajukan izin / cuti";
            if (lowerPath.Contains("/reconciliation")) return "Admin merekonsiliasi presensi staf";
        }

        // 6. Notes Module
        if (controllerName.Equals("Notes", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/pin")) return "Menyematkan / melepas pin catatan";
            if (lowerPath.Contains("/attachments")) return "Mengunggah lampiran berkas catatan";
            if (httpMethod == "POST") return "Membuat catatan kerja baru";
            if (httpMethod == "PUT") return "Memperbarui catatan kerja";
            if (httpMethod == "DELETE") return "Menghapus catatan kerja";
        }

        // 7. Gamification Module
        if (controllerName.Equals("Gamification", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/check-in")) return "Daily check-in presensi gamifikasi (+10 Poin)";
            if (lowerPath.Contains("/rewards/claim")) return "Mengajukan penukaran hadiah di Reward Store";
            if (lowerPath.Contains("/admin/claims") && lowerPath.Contains("/process")) return "Admin memproses persetujuan klaim hadiah";
            if (lowerPath.Contains("/admin/rewards")) return httpMethod == "DELETE" ? "Admin menghapus hadiah dari katalog" : "Admin mengelola item hadiah";
            if (lowerPath.Contains("/admin/badges/award")) return "Admin menganugerahkan lencana prestasi ke staf";
            if (lowerPath.Contains("/admin/badges") && httpMethod == "DELETE") return "Admin mencabut lencana prestasi dari staf";
        }

        // 8. Announcements Module
        if (controllerName.Equals("Announcements", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/mark-read")) return "Membaca & menutup pengumuman";
            if (lowerPath.Contains("/toggle-active")) return "Mengubah status aktif pengumuman";
            if (httpMethod == "POST") return "Menerbitkan pengumuman resmi";
            if (httpMethod == "PUT") return "Memperbarui pengumuman";
            if (httpMethod == "DELETE") return "Menghapus pengumuman";
        }

        // 9. Members Module
        if (controllerName.Equals("Members", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/approve")) return "Admin menyetujui pendaftaran staf baru";
            if (lowerPath.Contains("/reject")) return "Admin menolak pendaftaran akun";
            if (lowerPath.Contains("/unlock")) return "Admin membuka kunci lockout akun staf";
            if (lowerPath.Contains("/permanent")) return "Admin menghapus akun anggota secara permanen";
            if (httpMethod == "PUT") return "Memperbarui data profil staf";
        }

        // 10. Settings Module
        if (controllerName.Equals("Settings", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/maintenance/purge")) return "Mengeksekusi pembersihan & reset data operasional";
            if (lowerPath.Contains("/test-smtp")) return "Menguji konfigurasi email SMTP";
            return "Menyimpan konfigurasi sistem";
        }

        // 11. DevTools & Sync
        if (controllerName.Equals("DevTools", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/json")) return "Memformat / memvalidasi payload JSON";
            if (lowerPath.Contains("/sql")) return "Mengeksekusi / memformat query SQL";
        }
        if (controllerName.Equals("Sync", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/push")) return "Mengirim paket sinkronisasi data ke host induk";
            if (lowerPath.Contains("/pull")) return "Menerima data sinkronisasi dari host induk";
            if (lowerPath.Contains("/ping")) return "Menguji koneksi ke host induk";
        }

        return $"{httpMethod} {actionName ?? path}";
    }
}


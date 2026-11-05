using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Filters;

public class AuditLogActionFilter : IAsyncActionFilter
{

    private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "secret", "token", "refreshToken", "authorization", "apiKey", "credential"
    };

    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "DELETE", "PATCH"
    };

    private readonly IServiceScopeFactory? _scopeFactory;
    private readonly AppDbContext? _directContext;
    private readonly ILogger<AuditLogActionFilter> _logger;

    public AuditLogActionFilter(IServiceScopeFactory scopeFactory, ILogger<AuditLogActionFilter> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    internal AuditLogActionFilter(AppDbContext directContext, ILogger<AuditLogActionFilter> logger)
    {
        _directContext = directContext;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpMethod = context.HttpContext.Request.Method;
        var path = context.HttpContext.Request.Path.Value ?? string.Empty;

        // Skip diagnostic, health, CORS preflight and static endpoints
        if (!ShouldAuditRequest(httpMethod, path))
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
                    else if (v != null && (v.GetType().Name.Contains("FormFile", StringComparison.OrdinalIgnoreCase) ||
                                           v is CancellationToken ||
                                           v is Stream ||
                                           v.GetType().Name.Contains("CancellationToken", StringComparison.OrdinalIgnoreCase) ||
                                           v.GetType().Name.Contains("HttpContext", StringComparison.OrdinalIgnoreCase)))
                    {
                        sanitizedArgs[k] = $"[{v.GetType().Name}]";
                    }
                    else if (v != null)
                    {
                        var emailProp = v.GetType().GetProperty("Email") ?? v.GetType().GetProperty("email");
                        if (emailProp != null)
                        {
                            attemptedEmail = emailProp.GetValue(v)?.ToString();
                        }

                        var type = v.GetType();
                        if (type.IsPrimitive || v is string || v is decimal || v is DateTime || v is DateTimeOffset || v is Guid)
                        {
                            sanitizedArgs[k] = v;
                        }
                        else
                        {
                            try
                            {
                                var safeJson = JsonSerializer.Serialize(v, new JsonSerializerOptions
                                {
                                    WriteIndented = false,
                                    MaxDepth = 8,
                                    ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
                                });
                                sanitizedArgs[k] = JsonSerializer.Deserialize<JsonElement>(safeJson);
                            }
                            catch
                            {
                                sanitizedArgs[k] = v.ToString() ?? "[Complex Data]";
                            }
                        }
                    }
                    else
                    {
                        sanitizedArgs[k] = null;
                    }
                }
            }
        }
        catch
        {
            sanitizedArgs = new Dictionary<string, object?> { ["error"] = "[Serialization Error]" };
        }

        // Execute action
        ActionExecutedContext? executedContext = null;
        try
        {
            executedContext = await next();
        }
        finally
        {
            stopwatch.Stop();
        }

        // Record audit log asynchronously in an isolated scope
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

            var ipAddress = ResolveClientIpAddress(context.HttpContext);
            var userAgent = context.HttpContext.Request.Headers.TryGetValue("User-Agent", out var ua) ? ua.ToString() : null;
            var statusCode = executedContext?.Exception != null ? 500 : (executedContext?.HttpContext.Response.StatusCode ?? 200);

            // Correlate Auth login/registration events when context.User wasn't populated yet
            using var scope = _scopeFactory?.CreateScope();
            var db = scope?.ServiceProvider.GetRequiredService<AppDbContext>() ?? _directContext;
            if (db == null) return;

            if (string.IsNullOrEmpty(userEmail) && !string.IsNullOrEmpty(attemptedEmail))
            {
                userEmail = attemptedEmail;
                var dbUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == attemptedEmail);
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
                ["ipAddress"] = ipAddress,
                ["userAgent"] = userAgent,
                ["params"] = sanitizedArgs
            };

            if (executedContext?.Exception != null)
            {
                var ex = executedContext.Exception;
                detailsPayload["exception"] = ex.Message;
                var inners = new List<string>();
                var cur = ex.InnerException;
                while (cur != null)
                {
                    inners.Add(cur.Message);
                    cur = cur.InnerException;
                }
                if (inners.Count > 0)
                {
                    detailsPayload["innerException"] = string.Join(" --> ", inners);
                }
            }

            string details;
            try
            {
                details = JsonSerializer.Serialize(detailsPayload, new JsonSerializerOptions
                {
                    WriteIndented = false,
                    MaxDepth = 32,
                    ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
                });
            }
            catch (Exception exSerial)
            {
                _logger.LogWarning(exSerial, "Details payload serialization fallback triggered for {Path}", path);
                details = JsonSerializer.Serialize(new Dictionary<string, object?>
                {
                    ["module"] = module,
                    ["actionSummary"] = actionSummary,
                    ["ipAddress"] = ipAddress,
                    ["userAgent"] = userAgent,
                    ["params"] = "[Complex Data]"
                });
            }

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

            db.AuditLogs.Add(auditLog);
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist audit log entry for {Method} {Path}", httpMethod, path);
        }
    }

    private static bool ShouldAuditRequest(string httpMethod, string path)
    {
        if (string.Equals(httpMethod, "OPTIONS", StringComparison.OrdinalIgnoreCase)) return false;
        if (path.StartsWith("/health", StringComparison.OrdinalIgnoreCase)) return false;
        if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)) return false;
        if (path.StartsWith("/hubs", StringComparison.OrdinalIgnoreCase)) return false;
        if (path.EndsWith(".js") || path.EndsWith(".css") || path.EndsWith(".ico") || path.EndsWith(".map") ||
            path.EndsWith(".png") || path.EndsWith(".jpg") || path.EndsWith(".jpeg") || path.EndsWith(".svg") ||
            path.EndsWith(".woff") || path.EndsWith(".woff2")) return false;

        // Selalu catat setiap aksi mutasi (POST, PUT, DELETE, PATCH)
        if (MutatingMethods.Contains(httpMethod)) return true;

        // Catat akses dan pembacaan data di semua modul bisnis
        var lower = path.ToLowerInvariant();
        return lower.Contains("/api/tasks") ||
               lower.Contains("/api/projects") ||
               lower.Contains("/api/invoices") ||
               lower.Contains("/api/reports") ||
               lower.Contains("/api/issues") ||
               lower.Contains("/api/documents") ||
               lower.Contains("/api/companies") ||
               lower.Contains("/api/members") ||
               lower.Contains("/api/attendances") ||
               lower.Contains("/api/timesheets") ||
               lower.Contains("/api/gamification") ||
               lower.Contains("/api/notes") ||
               lower.Contains("/api/calendar") ||
               lower.Contains("/api/announcements") ||
               lower.Contains("/api/audit-logs") ||
               lower.Contains("/api/audittrail") ||
               lower.Contains("/api/dashboard") ||
               lower.Contains("/api/settings") ||
               lower.Contains("/api/profile") ||
               lower.Contains("/api/devtools") ||
               lower.Contains("/api/sync") ||
               lower.Contains("export") ||
               lower.Contains("import") ||
               lower.Contains("stats");
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
        "Invoices" => "Faktur & Invoicing",
        "Issues" => "Tiket & Bantuan",
        "Documents" => "Manajemen Dokumen (DMS)",
        "Reports" => "Laporan & Rekapitulasi",
        "Companies" => "Profil & Multi-Perusahaan",
        "CompanyTimesheetConfig" => "Konfigurasi Timesheet",
        "TimesheetPeriods" => "Periode Timesheet",
        "EmailConfig" => "Konfigurasi Email SMTP",
        "Notifications" => "Pemberitahuan Sistem",
        "Dashboard" => "Dashboard & Ringkasan",
        "Profile" => "Profil Pengguna",
        "SqlTools" => "SQL Tools",
        "SystemStatus" => "Status Sistem",
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

        // 12. Invoices Module
        if (controllerName.Equals("Invoices", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/status")) return "Mengubah status pembayaran invoice";
            if (httpMethod == "POST") return "Menerbitkan invoice baru";
            if (httpMethod == "PUT") return "Memperbarui detail invoice";
            if (httpMethod == "DELETE") return "Menghapus invoice";
            return "Melihat data invoice & penagihan";
        }

        // 13. Issues Module
        if (controllerName.Equals("Issues", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/comments")) return "Menambahkan komentar penanganan tiket";
            if (lowerPath.Contains("/status")) return "Mengubah status tiket issue";
            if (httpMethod == "POST") return "Membuat tiket bantuan baru";
            if (httpMethod == "PUT") return "Memperbarui detail tiket issue";
            if (httpMethod == "DELETE") return "Menghapus tiket issue";
            return "Melihat data tiket bantuan / issues";
        }

        // 14. Documents Module
        if (controllerName.Equals("Documents", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/download")) return "Mengunduh berkas dokumen korporat";
            if (httpMethod == "POST") return "Mengunggah dokumen korporat baru (DMS)";
            if (httpMethod == "PUT") return "Memperbarui metadata dokumen";
            if (httpMethod == "DELETE") return "Menghapus dokumen dari repository";
            return "Melihat repositori dokumen (DMS)";
        }

        // 15. Reports Module
        if (controllerName.Equals("Reports", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/export")) return "Mengekspor laporan ke format Excel (.xlsx)";
            if (lowerPath.Contains("/timesheet")) return "Melihat laporan rekapitulasi timesheet";
            if (lowerPath.Contains("/tasks")) return "Melihat laporan kemajuan tugas";
            if (lowerPath.Contains("/members")) return "Melihat laporan achievement staf";
            return "Membuka pusat pelaporan & rekapitulasi";
        }

        // 16. Companies Module
        if (controllerName.Equals("Companies", StringComparison.OrdinalIgnoreCase))
        {
            if (httpMethod == "POST") return "Menambahkan perusahaan korporat baru";
            if (httpMethod == "PUT") return "Memperbarui data profil & modul perusahaan";
            if (httpMethod == "DELETE") return "Menghapus entitas perusahaan";
            return "Melihat daftar korporat & perusahaan";
        }

        // 17. Notifications Module
        if (controllerName.Equals("Notifications", StringComparison.OrdinalIgnoreCase))
        {
            if (lowerPath.Contains("/mark-all-read")) return "Menandai seluruh notifikasi telah dibaca";
            if (lowerPath.Contains("/read")) return "Membaca notifikasi sistem";
            return "Melihat daftar notifikasi";
        }

        return $"{httpMethod} {actionName ?? path}";
    }

    private static string ResolveClientIpAddress(Microsoft.AspNetCore.Http.HttpContext httpContext)
    {
        var headers = httpContext.Request.Headers;

        // Check standard proxy, ingress & CDN client IP headers
        if (headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
        {
            var firstIp = forwardedFor.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(firstIp) && !firstIp.Equals("unknown", StringComparison.OrdinalIgnoreCase))
            {
                return firstIp;
            }
        }

        if (headers.TryGetValue("X-Real-IP", out var realIp) && !string.IsNullOrWhiteSpace(realIp))
        {
            var ip = realIp.ToString().Trim();
            if (!string.IsNullOrWhiteSpace(ip) && !ip.Equals("unknown", StringComparison.OrdinalIgnoreCase))
            {
                return ip;
            }
        }

        if (headers.TryGetValue("CF-Connecting-IP", out var cfIp) && !string.IsNullOrWhiteSpace(cfIp))
        {
            return cfIp.ToString().Trim();
        }

        if (headers.TryGetValue("X-Client-IP", out var clientIp) && !string.IsNullOrWhiteSpace(clientIp))
        {
            return clientIp.ToString().Trim();
        }

        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString();
        if (!string.IsNullOrWhiteSpace(remoteIp))
        {
            if (remoteIp == "::1") return "127.0.0.1";
            return remoteIp;
        }

        return "127.0.0.1";
    }
}



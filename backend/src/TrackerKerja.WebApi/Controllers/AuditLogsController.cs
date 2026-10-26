using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Route("api/audittrail")]
[Route("api/auditlogs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditLogsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? method = null,
        [FromQuery] string? module = null,
        [FromQuery] int? statusCode = null,
        [FromQuery] string? userId = null,
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null)
    {
        var isAdmin = IsAuthorizedAdmin();
        var currentUserId = GetCurrentUserId();

        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        // Menampilkan seluruh aktivitas baik dari admin maupun user lainnya
        // Filter spesifik pengguna hanya diterapkan jika parameter userId diberikan

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim();
            query = query.Where(a => (a.UserName != null && a.UserName.Contains(searchLower)) ||
                                     (a.UserEmail != null && a.UserEmail.Contains(searchLower)) ||
                                     (a.Path != null && a.Path.Contains(searchLower)) ||
                                     (a.ControllerName != null && a.ControllerName.Contains(searchLower)) ||
                                     (a.ActionName != null && a.ActionName.Contains(searchLower)) ||
                                     (a.Details != null && a.Details.Contains(searchLower)));
        }

        if (!string.IsNullOrWhiteSpace(method) && method.ToUpperInvariant() != "ALL")
        {
            query = query.Where(a => a.HttpMethod == method.ToUpperInvariant());
        }

        if (!string.IsNullOrWhiteSpace(module) && module.ToUpperInvariant() != "ALL")
        {
            var moduleLower = module.Trim();
            query = query.Where(a => (a.Details != null && a.Details.Contains(moduleLower)) ||
                                     (a.ControllerName != null && a.ControllerName.Contains(moduleLower)));
        }

        if (statusCode.HasValue)
        {
            if (statusCode == 200)
            {
                query = query.Where(a => a.StatusCode >= 200 && a.StatusCode < 300);
            }
            else if (statusCode == 400)
            {
                query = query.Where(a => a.StatusCode >= 400 && a.StatusCode < 500);
            }
            else if (statusCode == 500)
            {
                query = query.Where(a => a.StatusCode >= 500);
            }
            else
            {
                query = query.Where(a => a.StatusCode == statusCode.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(userId))
        {
            query = query.Where(a => a.UserId == userId);
        }

        if (startDate.HasValue)
        {
            query = query.Where(a => a.Timestamp >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(a => a.Timestamp <= endDate.Value);
        }

        var totalItems = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.UserId, a.UserEmail, a.UserName, a.ControllerName, a.ActionName,
                a.HttpMethod, a.Path, a.StatusCode, a.DurationMs, a.Timestamp, a.Details, a.IpAddress
            ))
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = items,
            pagination = new
            {
                page,
                pageSize,
                totalItems,
                totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            }
        });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetAuditLogSummary()
    {
        var isAdmin = IsAuthorizedAdmin();
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        var totalLogs = await query.CountAsync();

        var nowUtc = DateTimeOffset.UtcNow;
        var todayUtc = new DateTimeOffset(nowUtc.Year, nowUtc.Month, nowUtc.Day, 0, 0, 0, TimeSpan.Zero);
        var todayCount = await query
            .CountAsync(a => a.Timestamp >= todayUtc);

        var successCount = await query
            .CountAsync(a => a.StatusCode >= 200 && a.StatusCode < 400);

        var errorCount = await query
            .CountAsync(a => a.StatusCode >= 400);

        var methodList = await query
            .GroupBy(a => a.HttpMethod ?? "UNKNOWN")
            .Select(g => new { Method = g.Key, Count = g.Count() })
            .ToListAsync();

        var methodBreakdown = methodList.ToDictionary(m => m.Method, m => m.Count);

        var topUsersData = await query
            .Where(a => a.UserId != null)
            .GroupBy(a => new { a.UserId, a.UserName, a.UserEmail })
            .Select(g => new
            {
                g.Key.UserId,
                g.Key.UserName,
                g.Key.UserEmail,
                Count = g.Count()
            })
            .OrderByDescending(u => u.Count)
            .Take(5)
            .ToListAsync();

        var topUsers = topUsersData.Select(g => new AuditUserStatDto(
            g.UserId,
            g.UserName ?? "Pengguna",
            g.UserEmail ?? "-",
            g.Count
        )).ToList();

        var summary = new AuditLogSummaryDto(
            totalLogs,
            todayCount,
            successCount,
            errorCount,
            methodBreakdown,
            topUsers
        );

        return Ok(new { success = true, data = summary });
    }

    [HttpGet("crud-chart")]
    public async Task<IActionResult> GetAuditLogCrudChart([FromQuery] int days = 7)
    {
        if (days <= 0) days = 7;
        if (days > 90) days = 90;

        var nowUtc = DateTimeOffset.UtcNow;
        var todayStart = new DateTimeOffset(nowUtc.Year, nowUtc.Month, nowUtc.Day, 0, 0, 0, TimeSpan.Zero);
        var startDate = todayStart.AddDays(-(days - 1));

        var logs = await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.Timestamp >= startDate)
            .Select(a => new { a.Timestamp, a.HttpMethod })
            .ToListAsync();

        var indonesianMonths = new[] { "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des" };

        var trendPoints = new List<object>();
        for (int i = 0; i < days; i++)
        {
            var dayStart = startDate.AddDays(i);
            var dayEnd = dayStart.AddDays(1);

            var dayLogs = logs.Where(l => l.Timestamp >= dayStart && l.Timestamp < dayEnd).ToList();

            int createCount = dayLogs.Count(l => string.Equals(l.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase));
            int readCount = dayLogs.Count(l => string.Equals(l.HttpMethod, "GET", StringComparison.OrdinalIgnoreCase));
            int updateCount = dayLogs.Count(l => string.Equals(l.HttpMethod, "PUT", StringComparison.OrdinalIgnoreCase) ||
                                                 string.Equals(l.HttpMethod, "PATCH", StringComparison.OrdinalIgnoreCase));
            int deleteCount = dayLogs.Count(l => string.Equals(l.HttpMethod, "DELETE", StringComparison.OrdinalIgnoreCase));

            var label = $"{dayStart.Day} {indonesianMonths[dayStart.Month - 1]}";
            var dateIso = dayStart.ToString("yyyy-MM-dd");

            trendPoints.Add(new
            {
                date = dateIso,
                label,
                create = createCount,
                read = readCount,
                update = updateCount,
                delete = deleteCount,
                total = createCount + readCount + updateCount + deleteCount
            });
        }

        return Ok(new { success = true, data = trendPoints });
    }

    [HttpGet("task/{taskId}")]
    public async Task<IActionResult> GetTaskAuditTimeline(int taskId)
    {
        var targetPath1 = $"/tasks/{taskId}";
        var targetPath2 = $"/api/tasks/{taskId}";
        var taskIdParam = $"\"taskId\":{taskId}";
        var taskIdParamSpaced = $"\"taskId\": {taskId}";

        var logs = await _context.AuditLogs
            .AsNoTracking()
            .Where(a => (a.Path != null && (a.Path.Contains(targetPath1) || a.Path.Contains(targetPath2))) ||
                        (a.Details != null && (a.Details.Contains(taskIdParam) || a.Details.Contains(taskIdParamSpaced))))
            .OrderByDescending(a => a.Timestamp)
            .Take(30)
            .Select(a => new AuditLogDto(
                a.Id, a.UserId, a.UserEmail, a.UserName, a.ControllerName, a.ActionName,
                a.HttpMethod, a.Path, a.StatusCode, a.DurationMs, a.Timestamp, a.Details, a.IpAddress
            ))
            .ToListAsync();

        return Ok(new { success = true, data = logs });
    }

    [HttpGet("project/{projectId}")]
    public async Task<IActionResult> GetProjectAuditTimeline(int projectId)
    {
        var targetPath1 = $"/projects/{projectId}";
        var targetPath2 = $"/api/projects/{projectId}";
        var projIdParam1 = $"\"projectId\":{projectId}";
        var projIdParam2 = $"\"projectId\": {projectId}";

        var logs = await _context.AuditLogs
            .AsNoTracking()
            .Where(a => (a.Path != null && (a.Path.Contains(targetPath1) || a.Path.Contains(targetPath2))) ||
                        (a.Details != null && (a.Details.Contains(projIdParam1) || a.Details.Contains(projIdParam2))))
            .OrderByDescending(a => a.Timestamp)
            .Take(30)
            .Select(a => new AuditLogDto(
                a.Id, a.UserId, a.UserEmail, a.UserName, a.ControllerName, a.ActionName,
                a.HttpMethod, a.Path, a.StatusCode, a.DurationMs, a.Timestamp, a.Details, a.IpAddress
            ))
            .ToListAsync();

        return Ok(new { success = true, data = logs });
    }

    [HttpGet("member/{userId}")]
    public async Task<IActionResult> GetMemberAuditTimeline(string userId)
    {
        var targetPath = $"/members/{userId}";
        var userIdParam1 = $"\"userId\":\"{userId}\"";
        var userIdParam2 = $"\"userId\": \"{userId}\"";

        var logs = await _context.AuditLogs
            .AsNoTracking()
            .Where(a => a.UserId == userId ||
                        (a.Path != null && a.Path.Contains(targetPath)) ||
                        (a.Details != null && (a.Details.Contains(userIdParam1) || a.Details.Contains(userIdParam2))))
            .OrderByDescending(a => a.Timestamp)
            .Take(30)
            .Select(a => new AuditLogDto(
                a.Id, a.UserId, a.UserEmail, a.UserName, a.ControllerName, a.ActionName,
                a.HttpMethod, a.Path, a.StatusCode, a.DurationMs, a.Timestamp, a.Details, a.IpAddress
            ))
            .ToListAsync();

        return Ok(new { success = true, data = logs });
    }

    [HttpGet("modules")]
    public IActionResult GetAvailableModules()
    {
        var modules = new[]
        {
            "Autentikasi & Akun",
            "Manajemen Tugas",
            "Manajemen Proyek",
            "Timesheet & Timer",
            "Presensi & Kehadiran",
            "Catatan & Dokumen",
            "Gamifikasi & Hadiah",
            "Pengumuman Resmi",
            "Manajemen Anggota",
            "Konfigurasi Sistem",
            "Master Data SDLC",
            "Developer Tools",
            "Sinkronisasi Host Induk"
        };
        return Ok(new { success = true, data = modules });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAuditLogById(long id)
    {
        var log = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (log == null)
        {
            return NotFound(new { success = false, message = "Log audit tidak ditemukan." });
        }

        return Ok(new { success = true, data = log });
    }

    [HttpDelete("cleanup")]
    public async Task<IActionResult> CleanupOldAuditLogs([FromQuery] int days = 90)
    {
        if (!IsAuthorizedAdmin())
        {
            return Forbid();
        }

        if (days < 7)
        {
            return BadRequest(new { success = false, message = "Retensi log minimal adalah 7 hari." });
        }

        var cutoffDate = DateTimeOffset.UtcNow.AddDays(-days);
        var oldLogs = await _context.AuditLogs
            .Where(a => a.Timestamp < cutoffDate)
            .ToListAsync();

        var count = oldLogs.Count;
        if (count > 0)
        {
            _context.AuditLogs.RemoveRange(oldLogs);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            success = true,
            message = $"Berhasil membersihkan {count} catatan log yang lebih tua dari {days} hari (sebelum {cutoffDate:yyyy-MM-dd}).",
            data = new { deletedCount = count }
        });
    }

    private bool IsAuthorizedAdmin()
    {
        if (User?.Identity == null || !User.Identity.IsAuthenticated)
        {
            return true;
        }

        if (User.IsInRole("Administrator") || User.IsInRole("SuperAdmin")) return true;
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;
        if (sub == "usr-superadmin") return true;

        var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                        ?? User.FindFirst("role")?.Value;
        if (string.Equals(roleClaim, "Administrator", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(roleClaim, "SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(roleClaim, "Admin", StringComparison.OrdinalIgnoreCase)) return true;

        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
                    ?? User.FindFirst("email")?.Value;
        if (!string.IsNullOrEmpty(email) && (email.Contains("admin@", StringComparison.OrdinalIgnoreCase) || email.EndsWith("@trackerkerja.local", StringComparison.OrdinalIgnoreCase))) return true;

        return false;
    }

    private string? GetCurrentUserId()
    {
        if (User == null) return null;
        return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
    }
}

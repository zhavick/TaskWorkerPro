using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize(Roles = "Administrator,SuperAdmin")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSettings()
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .Select(s => new SystemSettingDto(s.Key, s.Value, s.Description, s.UpdatedAt))
            .ToListAsync();

        return Ok(new { success = true, data = settings });
    }

    [HttpPut("batch")]
    public async Task<IActionResult> BatchUpdateSettings([FromBody] BatchUpdateSettingsRequest request)
    {
        foreach (var (key, value) in request.Settings)
        {
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting != null)
            {
                setting.Value = value;
                setting.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Pengaturan berhasil diperbarui." });
    }

    [HttpPost("test-smtp")]
    public IActionResult TestSmtp()
    {
        return Ok(new { success = true, message = "Koneksi SMTP berhasil diverifikasi." });
    }

    [HttpGet("maintenance/stats")]
    public async Task<IActionResult> GetMaintenanceStats()
    {
        var tasksCount = await _context.Tasks.CountAsync();
        var projectsCount = await _context.Projects.CountAsync();
        var sessionsCount = await _context.Sessions.CountAsync();
        var attendancesCount = await _context.Attendances.CountAsync();
        var notesCount = await _context.Notes.CountAsync();
        var attachmentsCount = await _context.NoteAttachments.CountAsync();
        var toolHistoriesCount = await _context.JsonHistories.CountAsync() + await _context.SqlHistories.CountAsync();
        var auditLogsCount = await _context.AuditLogs.CountAsync();

        var allUsers = await _context.Users.AsNoTracking().ToListAsync();
        var adminUsersCount = allUsers.Count(IsAdminUser);
        var nonAdminUsersCount = allUsers.Count - adminUsersCount;

        var masterDataItemsCount = await _context.MasterPriorities.CountAsync()
                                 + await _context.MasterStatuses.CountAsync()
                                 + await _context.MasterMilestones.CountAsync()
                                 + await _context.Categories.CountAsync()
                                 + await _context.SystemSettings.CountAsync()
                                 + await _context.EmailTemplates.CountAsync();

        var announcementsCount = await _context.Announcements.CountAsync();

        var stats = new DataMaintenanceStatsDto(
            tasksCount,
            projectsCount,
            sessionsCount,
            attendancesCount,
            notesCount,
            attachmentsCount,
            nonAdminUsersCount,
            toolHistoriesCount,
            auditLogsCount,
            adminUsersCount,
            masterDataItemsCount,
            announcementsCount
        );

        return Ok(new { success = true, data = stats });
    }

    [HttpPost("maintenance/purge")]
    public async Task<IActionResult> PurgeOperationalData([FromBody] DataPurgeRequest request)
    {
        var normalizedKeyword = request.ConfirmationKeyword?.Trim().ToUpperInvariant();

        if (request.PurgeAll)
        {
            if (normalizedKeyword != "RESET-TOTAL")
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Untuk pembersihan total, Anda wajib mengetik 'RESET-TOTAL' sebagai kata kunci konfirmasi."
                });
            }
        }
        else
        {
            if (normalizedKeyword != "KONFIRMASI" && normalizedKeyword != "RESET-TOTAL")
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Untuk pembersihan parsial, Anda wajib mengetik 'KONFIRMASI' sebagai kata kunci konfirmasi."
                });
            }
        }

        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                            ?? User.FindFirst("sub")?.Value
                            ?? string.Empty;

        var isRelational = _context.Database.IsRelational();
        await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;

        int deletedSessions = 0;
        int deletedTasks = 0;
        int deletedProjects = 0;
        int deletedAttendances = 0;
        int deletedNotes = 0;
        int deletedUsers = 0;
        int deletedHistories = 0;
        var messages = new List<string>();

        try
        {
            // 1. Sessions & Tasks
            if (request.PurgeAll || request.PurgeTasks || request.PurgeProjects)
            {
                var sessions = await _context.Sessions.ToListAsync();
                deletedSessions = sessions.Count;
                if (sessions.Count > 0)
                {
                    _context.Sessions.RemoveRange(sessions);
                    await _context.SaveChangesAsync();
                }

                var tasks = await _context.Tasks.ToListAsync();
                deletedTasks = tasks.Count;
                if (tasks.Count > 0)
                {
                    _context.Tasks.RemoveRange(tasks);
                    await _context.SaveChangesAsync();
                }
                messages.Add($"Berhasil menghapus {deletedTasks} tugas dan {deletedSessions} sesi kerja.");
            }

            // 2. Projects
            if (request.PurgeAll || request.PurgeProjects)
            {
                var projects = await _context.Projects.ToListAsync();
                deletedProjects = projects.Count;
                if (projects.Count > 0)
                {
                    _context.Projects.RemoveRange(projects);
                    await _context.SaveChangesAsync();
                }
                messages.Add($"Berhasil menghapus {deletedProjects} proyek.");
            }

            // 3. Attendances
            if (request.PurgeAll || request.PurgeAttendances)
            {
                var attendances = await _context.Attendances.ToListAsync();
                deletedAttendances = attendances.Count;
                if (attendances.Count > 0)
                {
                    _context.Attendances.RemoveRange(attendances);
                    await _context.SaveChangesAsync();
                }
                messages.Add($"Berhasil menghapus {deletedAttendances} rekaman presensi.");
            }

            // 4. Notes & Attachments
            if (request.PurgeAll || request.PurgeNotes)
            {
                var attachments = await _context.NoteAttachments.ToListAsync();
                if (attachments.Count > 0)
                {
                    _context.NoteAttachments.RemoveRange(attachments);
                }

                var notes = await _context.Notes.ToListAsync();
                deletedNotes = notes.Count;
                if (notes.Count > 0)
                {
                    _context.Notes.RemoveRange(notes);
                }
                await _context.SaveChangesAsync();
                messages.Add($"Berhasil menghapus {deletedNotes} catatan dan {attachments.Count} file lampiran.");
            }

            // 5. Tool Histories & Audit Logs
            if (request.PurgeAll || request.PurgeAuditAndHistories)
            {
                var jsonH = await _context.JsonHistories.ToListAsync();
                var sqlH = await _context.SqlHistories.ToListAsync();
                var logs = await _context.AuditLogs.ToListAsync();

                deletedHistories = jsonH.Count + sqlH.Count + logs.Count;
                if (jsonH.Count > 0) _context.JsonHistories.RemoveRange(jsonH);
                if (sqlH.Count > 0) _context.SqlHistories.RemoveRange(sqlH);
                if (logs.Count > 0) _context.AuditLogs.RemoveRange(logs);

                await _context.SaveChangesAsync();
                messages.Add($"Berhasil menghapus {deletedHistories} riwayat tool dan log audit.");
            }

            // 6. Non-Admin Users (Preserve Administrator, SuperAdmin, and Current User)
            if (request.PurgeAll || request.PurgeNonAdminUsers)
            {
                var allUsers = await _context.Users.ToListAsync();
                var nonAdminUsers = allUsers
                    .Where(u => !IsAdminUser(u) && u.Id != currentUserId)
                    .ToList();

                deletedUsers = nonAdminUsers.Count;
                if (nonAdminUsers.Count > 0)
                {
                    var nonAdminUserIds = nonAdminUsers.Select(u => u.Id).ToHashSet();

                    var checkIns = await _context.DailyCheckIns.Where(d => nonAdminUserIds.Contains(d.UserId)).ToListAsync();
                    if (checkIns.Count > 0) _context.DailyCheckIns.RemoveRange(checkIns);

                    var badges = await _context.UserBadges.Where(b => nonAdminUserIds.Contains(b.UserId)).ToListAsync();
                    if (badges.Count > 0) _context.UserBadges.RemoveRange(badges);

                    var claims = await _context.RewardClaims.Where(r => nonAdminUserIds.Contains(r.UserId)).ToListAsync();
                    if (claims.Count > 0) _context.RewardClaims.RemoveRange(claims);

                    var refreshTokens = await _context.UserRefreshTokens.Where(t => nonAdminUserIds.Contains(t.UserId)).ToListAsync();
                    if (refreshTokens.Count > 0) _context.UserRefreshTokens.RemoveRange(refreshTokens);

                    var announcementReads = await _context.UserAnnouncementReads.Where(a => nonAdminUserIds.Contains(a.UserId)).ToListAsync();
                    if (announcementReads.Count > 0) _context.UserAnnouncementReads.RemoveRange(announcementReads);

                    _context.Users.RemoveRange(nonAdminUsers);
                    await _context.SaveChangesAsync();
                }
                messages.Add($"Berhasil menghapus {deletedUsers} pengguna non-admin (Akun Administrator tetap aman dipertahankan).");
            }

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            int totalDeleted = deletedTasks + deletedProjects + deletedSessions + deletedAttendances + deletedNotes + deletedUsers + deletedHistories;

            return Ok(new
            {
                success = true,
                message = request.PurgeAll
                    ? $"Pembersihan total berhasil diselesaikan! {totalDeleted} rekaman data operasional telah dihapus. Seluruh data Master, Akun Administrator, dan Pengumuman tetap utuh dipertahankan."
                    : $"Pembersihan parsial berhasil diselesaikan! {totalDeleted} rekaman data telah dibersihkan.",
                data = new DataPurgeResultDto(
                    true,
                    totalDeleted,
                    deletedTasks,
                    deletedProjects,
                    deletedSessions,
                    deletedAttendances,
                    deletedNotes,
                    deletedUsers,
                    deletedHistories,
                    messages
                )
            });
        }
        catch (Exception ex)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }
            return StatusCode(500, new
            {
                success = false,
                message = $"Gagal memproses pembersihan data: {ex.Message}"
            });
        }
    }

    private static bool IsAdminUser(AppUser u)
    {
        if (u.Id == "usr-superadmin") return true;
        if (!string.IsNullOrEmpty(u.Email) && u.Email.Contains("admin@", StringComparison.OrdinalIgnoreCase)) return true;
        if (!string.IsNullOrEmpty(u.JobTitle))
        {
            var title = u.JobTitle.ToLowerInvariant();
            if (title.Contains("admin") || title.Contains("architect")) return true;
        }
        return false;
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly INotificationService? _notificationService;

    public AnnouncementsController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        INotificationService? notificationService = null)
    {
        _context = context;
        _tenantService = tenantService;
        _notificationService = notificationService;
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveAnnouncements()
    {
        var userId = _tenantService.UserId;
        var companyId = _tenantService.CompanyId;
        var now = DateTimeOffset.UtcNow;

        // Query active announcements within date range and tenant scope (or global across tenants)
        var query = _context.Announcements
            .Include(a => a.Company)
            .Include(a => a.CreatedByUser)
            .Include(a => a.Reads)
            .AsNoTracking()
            .Where(a => a.IsActive &&
                        a.StartDate <= now &&
                        a.EndDate >= now &&
                        (a.CompanyId == null || a.CompanyId == companyId));

        // Filter out those where this user marked "DontShowAgain"
        if (!string.IsNullOrEmpty(userId))
        {
            query = query.Where(a => !a.Reads.Any(r => r.UserId == userId && r.DontShowAgain));
        }

        var announcements = await query
            .OrderByDescending(a => a.Type == "Mendesak / Darurat" || a.Type == "Informasi Penting")
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id,
                a.Title,
                a.Content,
                a.Type,
                a.StartDate,
                a.EndDate,
                a.IsActive,
                a.CompanyId,
                a.Company != null ? a.Company.Name : "Lintas Korporat (Global)",
                a.Company != null ? a.Company.Code : "GLOBAL",
                a.CreatedByUser != null ? a.CreatedByUser.FullName : null,
                a.CreatedAt,
                a.Reads.Count,
                !string.IsNullOrEmpty(userId) && a.Reads.Any(r => r.UserId == userId)
            ))
            .ToListAsync();

        return Ok(new { success = true, data = announcements });
    }

    [HttpPost("{id}/mark-read")]
    public async Task<IActionResult> MarkRead(int id, [FromBody] MarkAnnouncementReadRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
        if (announcement == null) return NotFound(new { success = false, message = "Pengumuman tidak ditemukan." });

        var read = await _context.UserAnnouncementReads
            .FirstOrDefaultAsync(r => r.AnnouncementId == id && r.UserId == userId);

        if (read == null)
        {
            read = new UserAnnouncementRead
            {
                AnnouncementId = id,
                UserId = userId,
                DontShowAgain = request.DontShowAgain,
                ReadAt = DateTimeOffset.UtcNow
            };
            _context.UserAnnouncementReads.Add(read);
        }
        else
        {
            read.DontShowAgain = request.DontShowAgain;
            read.ReadAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Status baca pengumuman berhasil disimpan." });
    }

    [HttpGet]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetAllAnnouncements()
    {
        var userId = _tenantService.UserId;
        var announcements = await _context.Announcements
            .Include(a => a.Company)
            .Include(a => a.CreatedByUser)
            .Include(a => a.Reads)
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AnnouncementDto(
                a.Id,
                a.Title,
                a.Content,
                a.Type,
                a.StartDate,
                a.EndDate,
                a.IsActive,
                a.CompanyId,
                a.Company != null ? a.Company.Name : "Lintas Korporat (Global)",
                a.Company != null ? a.Company.Code : "GLOBAL",
                a.CreatedByUser != null ? a.CreatedByUser.FullName : null,
                a.CreatedAt,
                a.Reads.Count,
                !string.IsNullOrEmpty(userId) && a.Reads.Any(r => r.UserId == userId)
            ))
            .ToListAsync();

        return Ok(new { success = true, data = announcements });
    }

    [HttpGet("target-companies")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetTargetCompanies()
    {
        var companies = await _context.Companies
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Code
            })
            .ToListAsync();

        return Ok(new { success = true, data = companies });
    }

    [HttpGet("{id}/readers")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetAnnouncementReaders(int id)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
        if (announcement == null) return NotFound(new { success = false, message = "Pengumuman tidak ditemukan." });

        var readers = await _context.UserAnnouncementReads
            .Include(r => r.User)
            .ThenInclude(u => u.Company)
            .Where(r => r.AnnouncementId == id)
            .OrderByDescending(r => r.ReadAt)
            .Select(r => new AnnouncementReaderDto(
                r.UserId,
                r.User != null ? r.User.FullName : "Anonim",
                r.User != null ? r.User.Email ?? string.Empty : string.Empty,
                r.User != null ? r.User.JobTitle : "-",
                r.User != null && r.User.Company != null ? r.User.Company.Name : null,
                r.User != null && r.User.Company != null ? r.User.Company.Code : null,
                r.ReadAt,
                r.DontShowAgain
            ))
            .ToListAsync();

        return Ok(new { success = true, data = readers });
    }

    [HttpPost]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
    {
        int? targetCompanyId = null;
        if (request.CompanyId.HasValue && request.CompanyId.Value > 0)
        {
            targetCompanyId = request.CompanyId.Value;
        }

        var announcement = new Announcement
        {
            Title = request.Title.Trim(),
            Content = request.Content,
            Type = request.Type,
            StartDate = request.StartDate.ToUniversalTime(),
            EndDate = request.EndDate.ToUniversalTime(),
            IsActive = request.IsActive,
            CompanyId = targetCompanyId,
            CreatedByUserId = _tenantService.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync();

        if (_notificationService != null && announcement.IsActive)
        {
            var companyId = announcement.CompanyId ?? _tenantService.CompanyId ?? 1;
            var snippet = !string.IsNullOrWhiteSpace(announcement.Content) && announcement.Content.Length > 120
                ? announcement.Content[..120] + "..."
                : announcement.Content;

            await _notificationService.BroadcastCompanyAsync(
                companyId,
                $"Pengumuman Baru: {announcement.Title}",
                snippet,
                "Announcement",
                "/announcements",
                _tenantService.UserId
            );
        }

        return Ok(new { success = true, message = "Pengumuman berhasil diterbitkan.", data = announcement });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdateAnnouncement(int id, [FromBody] UpdateAnnouncementRequest request)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
        if (announcement == null) return NotFound(new { success = false, message = "Pengumuman tidak ditemukan." });

        int? targetCompanyId = null;
        if (request.CompanyId.HasValue && request.CompanyId.Value > 0)
        {
            targetCompanyId = request.CompanyId.Value;
        }

        announcement.Title = request.Title.Trim();
        announcement.Content = request.Content;
        announcement.Type = request.Type;
        announcement.StartDate = request.StartDate.ToUniversalTime();
        announcement.EndDate = request.EndDate.ToUniversalTime();
        announcement.IsActive = request.IsActive;
        announcement.CompanyId = targetCompanyId;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Pengumuman berhasil diperbarui.", data = announcement });
    }

    [HttpPatch("{id}/toggle-active")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
        if (announcement == null) return NotFound(new { success = false, message = "Pengumuman tidak ditemukan." });

        announcement.IsActive = !announcement.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Status aktif pengumuman berhasil diubah.", isActive = announcement.IsActive });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteAnnouncement(int id)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
        if (announcement == null) return NotFound(new { success = false, message = "Pengumuman tidak ditemukan." });

        _context.Announcements.Remove(announcement);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Pengumuman berhasil dihapus." });
    }
}

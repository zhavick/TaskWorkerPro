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

    public AnnouncementsController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveAnnouncements()
    {
        var userId = _tenantService.UserId;
        var companyId = _tenantService.CompanyId;
        var now = DateTimeOffset.UtcNow;

        // Query active announcements within date range and tenant scope
        var query = _context.Announcements
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
            .OrderByDescending(a => a.Type == "Informasi Penting")
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
                a.CreatedByUser != null ? a.CreatedByUser.FullName : null,
                a.CreatedAt,
                a.Reads.Count
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
        var announcements = await _context.Announcements
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
                a.CreatedByUser != null ? a.CreatedByUser.FullName : null,
                a.CreatedAt,
                a.Reads.Count
            ))
            .ToListAsync();

        return Ok(new { success = true, data = announcements });
    }

    [HttpPost]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
    {
        var announcement = new Announcement
        {
            Title = request.Title.Trim(),
            Content = request.Content,
            Type = request.Type,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = request.IsActive,
            CompanyId = _tenantService.CompanyId,
            CreatedByUserId = _tenantService.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Pengumuman berhasil dibuat.", data = announcement });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdateAnnouncement(int id, [FromBody] UpdateAnnouncementRequest request)
    {
        var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
        if (announcement == null) return NotFound(new { success = false, message = "Pengumuman tidak ditemukan." });

        announcement.Title = request.Title.Trim();
        announcement.Content = request.Content;
        announcement.Type = request.Type;
        announcement.StartDate = request.StartDate;
        announcement.EndDate = request.EndDate;
        announcement.IsActive = request.IsActive;

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

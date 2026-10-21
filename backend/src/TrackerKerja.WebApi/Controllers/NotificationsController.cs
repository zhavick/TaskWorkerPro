using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly INotificationService _notificationService;

    public NotificationsController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        INotificationService notificationService)
    {
        _context = context;
        _tenantService = tenantService;
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] NotificationFilterRequest filter)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Sesi tidak valid." });
        }

        var query = _context.UserNotifications
            .AsNoTracking()
            .Where(n => n.UserId == currentUserId);

        if (filter.OnlyUnread == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        if (!string.IsNullOrWhiteSpace(filter.Category) && filter.Category != "Semua")
        {
            query = query.Where(n => n.Category == filter.Category.Trim());
        }

        var total = await query.CountAsync();
        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 20 : filter.PageSize;

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto(
                n.Id,
                n.UserId,
                n.CompanyId,
                n.Title,
                n.Message,
                n.Category,
                n.ActionUrl,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt,
                n.CreatedByUser != null ? n.CreatedByUser.FullName : null
            ))
            .ToListAsync();

        return Ok(new
        {
            success = true,
            total,
            page,
            pageSize,
            data = items
        });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Sesi tidak valid." });
        }

        var count = await _context.UserNotifications
            .AsNoTracking()
            .Where(n => n.UserId == currentUserId && !n.IsRead)
            .CountAsync();

        return Ok(new
        {
            success = true,
            data = new NotificationUnreadCountDto(count)
        });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var currentUserId = _tenantService.UserId;
        var notification = await _context.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == currentUserId);

        if (notification == null)
        {
            return NotFound(new { success = false, message = "Notifikasi tidak ditemukan." });
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            success = true,
            message = "Notifikasi ditandai sebagai dibaca."
        });
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var currentUserId = _tenantService.UserId;
        var unreadNotifications = await _context.UserNotifications
            .Where(n => n.UserId == currentUserId && !n.IsRead)
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        foreach (var item in unreadNotifications)
        {
            item.IsRead = true;
            item.ReadAt = now;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Semua notifikasi ({unreadNotifications.Count}) telah ditandai sebagai dibaca."
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var currentUserId = _tenantService.UserId;
        var notification = await _context.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == currentUserId);

        if (notification == null)
        {
            return NotFound(new { success = false, message = "Notifikasi tidak ditemukan." });
        }

        _context.UserNotifications.Remove(notification);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Notifikasi berhasil dihapus."
        });
    }

    [HttpPost("broadcast")]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastNotificationRequest request)
    {
        if (!_tenantService.IsAdmin)
        {
            return StatusCode(403, new { success = false, message = "Hanya Administrator yang dapat mengirimkan siaran notifikasi." });
        }

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { success = false, message = "Judul dan pesan siaran harus diisi." });
        }

        var companyId = _tenantService.CompanyId ?? 1;
        var currentUserId = _tenantService.UserId;

        if (!string.IsNullOrEmpty(request.TargetUserId))
        {
            await _notificationService.SendNotificationAsync(
                request.TargetUserId,
                companyId,
                request.Title,
                request.Message,
                request.Category,
                request.ActionUrl,
                currentUserId
            );

            return Ok(new
            {
                success = true,
                message = "Notifikasi berhasil dikirimkan ke pengguna tujuan."
            });
        }

        var sentCount = await _notificationService.BroadcastCompanyAsync(
            companyId,
            request.Title,
            request.Message,
            request.Category,
            request.ActionUrl,
            currentUserId
        );

        return Ok(new
        {
            success = true,
            message = $"Siaran notifikasi berhasil dikirimkan ke {sentCount} staf perusahaan.",
            sentCount
        });
    }
}

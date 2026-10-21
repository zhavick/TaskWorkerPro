using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Hubs;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(AppDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task<NotificationDto> SendNotificationAsync(
        string userId,
        int companyId,
        string title,
        string message,
        string category = "Task",
        string? actionUrl = null,
        string? createdByUserId = null)
    {
        var notification = new UserNotification
        {
            UserId = userId,
            CompanyId = companyId,
            Title = title.Trim(),
            Message = message.Trim(),
            Category = string.IsNullOrWhiteSpace(category) ? "Task" : category.Trim(),
            ActionUrl = actionUrl,
            IsRead = false,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = createdByUserId
        };

        _context.UserNotifications.Add(notification);
        await _context.SaveChangesAsync();

        string? creatorName = null;
        if (!string.IsNullOrEmpty(createdByUserId))
        {
            var creator = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == createdByUserId);
            creatorName = creator?.FullName ?? creator?.UserName;
        }

        var dto = new NotificationDto(
            notification.Id,
            notification.UserId,
            notification.CompanyId,
            notification.Title,
            notification.Message,
            notification.Category,
            notification.ActionUrl,
            notification.IsRead,
            notification.ReadAt,
            notification.CreatedAt,
            creatorName
        );

        // Push real-time event to user
        await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", dto);

        return dto;
    }

    public async Task<int> BroadcastCompanyAsync(
        int companyId,
        string title,
        string message,
        string category = "Broadcast",
        string? actionUrl = null,
        string? createdByUserId = null)
    {
        var activeUsers = await _context.Users
            .AsNoTracking()
            .Where(u => u.CompanyId == companyId && u.IsApproved)
            .ToListAsync();

        if (activeUsers.Count == 0) return 0;

        string? creatorName = null;
        if (!string.IsNullOrEmpty(createdByUserId))
        {
            var creator = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == createdByUserId);
            creatorName = creator?.FullName ?? creator?.UserName;
        }

        var now = DateTimeOffset.UtcNow;
        var cleanCategory = string.IsNullOrWhiteSpace(category) ? "Broadcast" : category.Trim();
        var cleanTitle = title.Trim();
        var cleanMessage = message.Trim();

        var notifications = activeUsers.Select(u => new UserNotification
        {
            UserId = u.Id,
            CompanyId = companyId,
            Title = cleanTitle,
            Message = cleanMessage,
            Category = cleanCategory,
            ActionUrl = actionUrl,
            IsRead = false,
            CreatedAt = now,
            CreatedByUserId = createdByUserId
        }).ToList();

        _context.UserNotifications.AddRange(notifications);
        await _context.SaveChangesAsync();

        // Broadcast to company group
        var sampleDto = new NotificationDto(
            0,
            string.Empty,
            companyId,
            cleanTitle,
            cleanMessage,
            cleanCategory,
            actionUrl,
            false,
            null,
            now,
            creatorName
        );

        await _hubContext.Clients.Group($"company_{companyId}").SendAsync("ReceiveNotification", sampleDto);

        return notifications.Count;
    }
}

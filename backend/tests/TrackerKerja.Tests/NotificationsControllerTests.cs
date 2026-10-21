using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class NotificationsControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _userTenant;
    private readonly FakeTenantService _adminTenant;
    private readonly FakeNotificationService _notificationService;

    public NotificationsControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _userTenant = new FakeTenantService(1, "WCH", "usr-1", false);
        _adminTenant = new FakeTenantService(1, "WCH", "usr-admin", true);
        _context = new AppDbContext(options, _userTenant);
        _notificationService = new FakeNotificationService();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetNotifications_ReturnsOnlyCurrentUserNotifications()
    {
        // Arrange
        _context.UserNotifications.AddRange(
            new UserNotification
            {
                Id = 1,
                UserId = "usr-1",
                CompanyId = 1,
                Title = "Tugas 1",
                Message = "Pesan 1",
                Category = "Task",
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-5)
            },
            new UserNotification
            {
                Id = 2,
                UserId = "usr-1",
                CompanyId = 1,
                Title = "Tugas 2",
                Message = "Pesan 2",
                Category = "Task",
                IsRead = true,
                CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10)
            },
            new UserNotification
            {
                Id = 3,
                UserId = "usr-other",
                CompanyId = 1,
                Title = "Tugas Lain",
                Message = "Pesan Lain",
                Category = "Task",
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        var controller = new NotificationsController(_context, _userTenant, _notificationService);

        // Act
        var result = await controller.GetNotifications(new NotificationFilterRequest()) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
        var total = result.Value?.GetType().GetProperty("total")?.GetValue(result.Value);
        Assert.Equal(2, total);
    }

    [Fact]
    public async Task GetUnreadCount_ReturnsAccurateCount()
    {
        // Arrange
        _context.UserNotifications.AddRange(
            new UserNotification { Id = 10, UserId = "usr-1", CompanyId = 1, Title = "N1", Message = "M1", IsRead = false },
            new UserNotification { Id = 11, UserId = "usr-1", CompanyId = 1, Title = "N2", Message = "M2", IsRead = true },
            new UserNotification { Id = 12, UserId = "usr-1", CompanyId = 1, Title = "N3", Message = "M3", IsRead = false }
        );
        await _context.SaveChangesAsync();

        var controller = new NotificationsController(_context, _userTenant, _notificationService);

        // Act
        var result = await controller.GetUnreadCount() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
        var dataProp = result.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as NotificationUnreadCountDto;
        Assert.NotNull(dataProp);
        Assert.Equal(2, dataProp.UnreadCount);
    }

    [Fact]
    public async Task MarkAsRead_MarksNotificationAsRead()
    {
        // Arrange
        var notif = new UserNotification
        {
            Id = 20,
            UserId = "usr-1",
            CompanyId = 1,
            Title = "Notif Test",
            Message = "Pesan",
            IsRead = false
        };
        _context.UserNotifications.Add(notif);
        await _context.SaveChangesAsync();

        var controller = new NotificationsController(_context, _userTenant, _notificationService);

        // Act
        var result = await controller.MarkAsRead(20) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        var updated = await _context.UserNotifications.FindAsync(20);
        Assert.NotNull(updated);
        Assert.True(updated.IsRead);
        Assert.NotNull(updated.ReadAt);
    }

    [Fact]
    public async Task MarkAsRead_OtherUserNotification_ReturnsNotFound()
    {
        // Arrange
        var notif = new UserNotification
        {
            Id = 30,
            UserId = "usr-other",
            CompanyId = 1,
            Title = "Notif Lain",
            Message = "Pesan",
            IsRead = false
        };
        _context.UserNotifications.Add(notif);
        await _context.SaveChangesAsync();

        var controller = new NotificationsController(_context, _userTenant, _notificationService);

        // Act
        var result = await controller.MarkAsRead(30) as NotFoundObjectResult;

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task MarkAllAsRead_MarksAllUserNotificationsAsRead()
    {
        // Arrange
        _context.UserNotifications.AddRange(
            new UserNotification { Id = 40, UserId = "usr-1", CompanyId = 1, Title = "N1", Message = "M1", IsRead = false },
            new UserNotification { Id = 41, UserId = "usr-1", CompanyId = 1, Title = "N2", Message = "M2", IsRead = false }
        );
        await _context.SaveChangesAsync();

        var controller = new NotificationsController(_context, _userTenant, _notificationService);

        // Act
        var result = await controller.MarkAllAsRead() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        var unread = await _context.UserNotifications.Where(n => n.UserId == "usr-1" && !n.IsRead).CountAsync();
        Assert.Equal(0, unread);
    }

    [Fact]
    public async Task DeleteNotification_DeletesUserOwnNotification()
    {
        // Arrange
        var notif = new UserNotification
        {
            Id = 50,
            UserId = "usr-1",
            CompanyId = 1,
            Title = "N1",
            Message = "M1",
            IsRead = false
        };
        _context.UserNotifications.Add(notif);
        await _context.SaveChangesAsync();

        var controller = new NotificationsController(_context, _userTenant, _notificationService);

        // Act
        var result = await controller.DeleteNotification(50) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        var deleted = await _context.UserNotifications.FindAsync(50);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task Broadcast_NonAdmin_ReturnsForbidden()
    {
        // Arrange
        var controller = new NotificationsController(_context, _userTenant, _notificationService);
        var request = new BroadcastNotificationRequest("Siaran", "Pesan Siaran");

        // Act
        var result = await controller.Broadcast(request) as ObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(403, result.StatusCode);
    }

    [Fact]
    public async Task Broadcast_Admin_CreatesBroadcastSuccessfully()
    {
        // Arrange
        var controller = new NotificationsController(_context, _adminTenant, _notificationService);
        var request = new BroadcastNotificationRequest("Siaran Resmi", "Pesan Siaran Penting", "Broadcast", "/announcements");

        // Act
        var result = await controller.Broadcast(request) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal(1, _notificationService.BroadcastCalls);
    }
}

public class FakeNotificationService : INotificationService
{
    public int SendCalls { get; private set; }
    public int BroadcastCalls { get; private set; }

    public Task<NotificationDto> SendNotificationAsync(
        string userId,
        int companyId,
        string title,
        string message,
        string category = "Task",
        string? actionUrl = null,
        string? createdByUserId = null)
    {
        SendCalls++;
        return Task.FromResult(new NotificationDto(
            1,
            userId,
            companyId,
            title,
            message,
            category,
            actionUrl,
            false,
            null,
            DateTimeOffset.UtcNow,
            null
        ));
    }

    public Task<int> BroadcastCompanyAsync(
        int companyId,
        string title,
        string message,
        string category = "Broadcast",
        string? actionUrl = null,
        string? createdByUserId = null)
    {
        BroadcastCalls++;
        return Task.FromResult(5);
    }
}

public class FakeTenantService : ICurrentTenantService
{
    public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin)
    {
        CompanyId = companyId;
        CompanyCode = companyCode;
        UserId = userId;
        IsAdmin = isAdmin;
    }

    public int? CompanyId { get; set; }
    public string? CompanyCode { get; set; }
    public string? UserId { get; set; }
    public bool IsAdmin { get; set; }
}

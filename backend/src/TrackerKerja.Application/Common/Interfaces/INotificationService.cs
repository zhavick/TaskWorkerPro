using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface INotificationService
{
    Task<NotificationDto> SendNotificationAsync(
        string userId,
        int companyId,
        string title,
        string message,
        string category = "Task",
        string? actionUrl = null,
        string? createdByUserId = null
    );

    Task<int> BroadcastCompanyAsync(
        int companyId,
        string title,
        string message,
        string category = "Broadcast",
        string? actionUrl = null,
        string? createdByUserId = null
    );
}

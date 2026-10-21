namespace TrackerKerja.Application.DTOs;

public record NotificationDto(
    int Id,
    string UserId,
    int CompanyId,
    string Title,
    string Message,
    string Category,
    string? ActionUrl,
    bool IsRead,
    DateTimeOffset? ReadAt,
    DateTimeOffset CreatedAt,
    string? CreatedByUserName
);

public record BroadcastNotificationRequest(
    string Title,
    string Message,
    string Category = "Broadcast",
    string? ActionUrl = null,
    string? TargetUserId = null
);

public record NotificationFilterRequest(
    bool? OnlyUnread = null,
    string? Category = null,
    int Page = 1,
    int PageSize = 20
);

public record NotificationUnreadCountDto(
    int UnreadCount
);

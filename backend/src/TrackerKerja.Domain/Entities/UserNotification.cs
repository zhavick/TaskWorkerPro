namespace TrackerKerja.Domain.Entities;

public class UserNotification
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = "Task"; // "Task", "Announcement", "Attendance", "System", "Broadcast"
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedByUserId { get; set; }

    public AppUser? User { get; set; }
    public Company? Company { get; set; }
    public AppUser? CreatedByUser { get; set; }
}

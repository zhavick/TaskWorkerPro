namespace TrackerKerja.Domain.Entities;

public class Announcement
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Type { get; set; } = "Pengumuman Umum"; // "Informasi Penting" / "Pengumuman Umum"
    public DateTimeOffset StartDate { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public int? CompanyId { get; set; } // Null = Global
    public string? CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company? Company { get; set; }
    public AppUser? CreatedByUser { get; set; }
    public ICollection<UserAnnouncementRead> Reads { get; set; } = new List<UserAnnouncementRead>();
}

public class UserAnnouncementRead
{
    public int Id { get; set; }
    public int AnnouncementId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public bool DontShowAgain { get; set; }
    public DateTimeOffset ReadAt { get; set; } = DateTimeOffset.UtcNow;

    public Announcement Announcement { get; set; } = null!;
    public AppUser User { get; set; } = null!;
}

public class AuditLog
{
    public long Id { get; set; }
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? UserName { get; set; }
    public string? ControllerName { get; set; }
    public string? ActionName { get; set; }
    public string? HttpMethod { get; set; }
    public string? Path { get; set; }
    public string? QueryString { get; set; }
    public string? IpAddress { get; set; }
    public int StatusCode { get; set; }
    public int DurationMs { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public string? Details { get; set; } // Json payload / details
}

public class JsonHistory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int? TaskId { get; set; }
    public string? UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public WorkTask? Task { get; set; }
    public AppUser? User { get; set; }
}

public class SqlHistory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Dialect { get; set; } = "PostgreSQL";
    public int? TaskId { get; set; }
    public string? UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public WorkTask? Task { get; set; }
    public AppUser? User { get; set; }
}

public class ImportLog
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailedRows { get; set; }
    public string? Errors { get; set; }
    public DateTimeOffset ImportedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? ImportedBy { get; set; }
}

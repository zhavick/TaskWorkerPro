using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Domain.Entities;

public class Attendance
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public AttendanceType Type { get; set; } = AttendanceType.Present;
    public WorkLocation WorkLocation { get; set; } = WorkLocation.WFO;
    public DateTimeOffset? ClockIn { get; set; }
    public DateTimeOffset? ClockOut { get; set; }
    public double TotalHours { get; set; } = 0.0;
    public string? LeaveReason { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public AppUser User { get; set; } = null!;
}

public class WorkNote
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string ContentHtml { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Color { get; set; } = "#6366F1";
    public bool IsPinned { get; set; }
    public string? AuthorUserId { get; set; }
    public int? TaskId { get; set; }
    public int? CompanyId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public AppUser? AuthorUser { get; set; }
    public WorkTask? Task { get; set; }
    public Company? Company { get; set; }
    public ICollection<NoteAttachment> Attachments { get; set; } = new List<NoteAttachment>();
}

public class NoteAttachment
{
    public int Id { get; set; }
    public int NoteId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? ContentType { get; set; }
    public string? FileExtension { get; set; }
    public string? UploadedByUserId { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    public WorkNote Note { get; set; } = null!;
    public AppUser? UploadedByUser { get; set; }
}

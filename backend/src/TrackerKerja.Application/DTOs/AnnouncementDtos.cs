namespace TrackerKerja.Application.DTOs;

public record AnnouncementDto(
    int Id,
    string Title,
    string Content,
    string Type, // "Informasi Penting" / "Pengumuman Umum"
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    bool IsActive,
    int? CompanyId,
    string? CreatedByUserName,
    DateTimeOffset CreatedAt,
    int ReadCount
);

public record CreateAnnouncementRequest(
    string Title,
    string Content,
    string Type,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    bool IsActive
);

public record UpdateAnnouncementRequest(
    string Title,
    string Content,
    string Type,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    bool IsActive
);

public record MarkAnnouncementReadRequest(
    bool DontShowAgain
);

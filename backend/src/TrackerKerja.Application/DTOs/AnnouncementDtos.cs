namespace TrackerKerja.Application.DTOs;

public record AnnouncementDto(
    int Id,
    string Title,
    string Content,
    string Type, // "Mendesak / Darurat", "Penting", "Informasi Umum", "Pemeliharaan Sistem"
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    bool IsActive,
    int? CompanyId,
    string? CompanyName,
    string? CompanyCode,
    string? CreatedByUserName,
    DateTimeOffset CreatedAt,
    int ReadCount,
    bool HasRead
);

public record CreateAnnouncementRequest(
    string Title,
    string Content,
    string Type,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    bool IsActive,
    int? CompanyId = null
);

public record UpdateAnnouncementRequest(
    string Title,
    string Content,
    string Type,
    DateTimeOffset StartDate,
    DateTimeOffset EndDate,
    bool IsActive,
    int? CompanyId = null
);

public record MarkAnnouncementReadRequest(
    bool DontShowAgain
);

public record AnnouncementReaderDto(
    string UserId,
    string FullName,
    string Email,
    string JobTitle,
    string? CompanyName,
    string? CompanyCode,
    DateTimeOffset ReadAt,
    bool DontShowAgain
);

namespace TrackerKerja.Application.DTOs;

public record MasterPriorityDto(
    int Id,
    string Name,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record CreatePriorityRequest(
    string Name,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record UpdatePriorityRequest(
    string Name,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record MasterStatusDto(
    int Id,
    string Name,
    string Color,
    bool IsDoneState,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record CreateStatusRequest(
    string Name,
    string Color,
    bool IsDoneState,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record UpdateStatusRequest(
    string Name,
    string Color,
    bool IsDoneState,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record MasterMilestoneDto(
    int Id,
    string Name,
    string Phase,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record CreateMilestoneRequest(
    string Name,
    string Phase,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record UpdateMilestoneRequest(
    string Name,
    string Phase,
    string Color,
    string Icon,
    int OrderIndex,
    string? Description,
    bool IsDefault
);

public record CategoryDto(
    int Id,
    string Name,
    string Color,
    string? Description
);

public record CreateCategoryRequest(
    string Name,
    string Color,
    string? Description
);

public record UpdateCategoryRequest(
    string Name,
    string Color,
    string? Description
);

public record SystemSettingDto(
    string Key,
    string Value,
    string? Description,
    DateTimeOffset UpdatedAt
);

public record BatchUpdateSettingsRequest(
    Dictionary<string, string> Settings
);

public record EmailTemplateDto(
    int Id,
    string EventCode,
    string EventName,
    string? Category,
    string Subject,
    string BodyHtml,
    string? AvailableVariables,
    bool IsActive
);

public record AuditLogDto(
    long Id,
    string? UserId,
    string? UserEmail,
    string? UserName,
    string? ControllerName,
    string? ActionName,
    string? HttpMethod,
    string? Path,
    int StatusCode,
    int DurationMs,
    DateTimeOffset Timestamp,
    string? Details,
    string? IpAddress = null
);

public record AuditUserStatDto(
    string? UserId,
    string? UserName,
    string? UserEmail,
    int Count
);

public record AuditLogSummaryDto(
    int TotalLogs,
    int TodayCount,
    int SuccessCount,
    int ErrorCount,
    Dictionary<string, int> MethodBreakdown,
    List<AuditUserStatDto> TopUsers
);

public record JsonFormatRequest(
    string? JsonString = null,
    string? Name = null,
    int? TaskId = null,
    string? RawJson = null
)
{
    public string ResolvedJson => !string.IsNullOrEmpty(JsonString) ? JsonString : (RawJson ?? string.Empty);
}


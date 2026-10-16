using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Application.DTOs;

public enum TaskImportValidationStatus
{
    Valid,
    Warning,
    Error
}

public record TaskImportRowDto(
    int RowIndex,
    string? TaskCode,
    string? ParentTaskCode,
    string Title,
    string? Description,
    string? ProjectName,
    int? MatchedProjectId,
    string? PicIdentifier,
    string? MatchedUserId,
    string? MatchedUserName,
    TaskPriority Priority,
    Domain.Enums.TaskStatus Status,
    int Progress,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    string? Milestone,
    string? Obstacle,
    string? Solution,
    TaskImportValidationStatus ValidationStatus,
    List<string> ValidationMessages,
    bool IsUpdate = false,
    int? ExistingTaskId = null
);

public record TaskImportPreviewDto(
    string FileName,
    int TotalRows,
    int ValidCount,
    int WarningCount,
    int ErrorCount,
    List<TaskImportRowDto> Rows
);

public record TaskImportCommitRequest(
    int? DefaultProjectId,
    string? BulkAssignUserId,
    List<int>? SelectedRowIndexes,
    List<TaskImportRowDto> Rows,
    bool AutoCreateMissingUsers = true,
    string? DefaultJobTitle = null,
    string? DefaultPassword = null,
    string? EmailDomain = null,
    bool AutoApproveNewUsers = true
);

public record TaskImportResultDto(
    int TotalProcessed,
    int TotalImported,
    int TotalProjectsCreated,
    List<string> Messages,
    int TotalUsersCreated = 0,
    int TotalUpdated = 0
);

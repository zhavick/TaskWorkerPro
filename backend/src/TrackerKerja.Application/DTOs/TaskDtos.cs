using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Application.DTOs;

public record TaskItemDto(
    int Id,
    string Title,
    string? Description,
    TaskPriority Priority,
    Domain.Enums.TaskStatus Status,
    int Progress,
    string? Milestone,
    string? Obstacle,
    string? Solution,
    int? ProjectId,
    string? ProjectName,
    string? ProjectColor,
    int? CategoryId,
    string? CategoryName,
    string? AssignedToUserId,
    string? AssignedToUserName,
    string? AssignedToAvatar,
    int? ParentTaskId,
    int SubtasksCount,
    int CompletedSubtasksCount,
    long TotalDurationSeconds,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record SubtaskDto(
    int Id,
    string Title,
    Domain.Enums.TaskStatus Status,
    TaskPriority Priority,
    int Progress,
    string? AssignedToUserId,
    string? AssignedToUserName,
    DateTimeOffset? DueDate,
    DateTimeOffset CreatedAt
);

public record TaskSessionDto(
    int Id,
    string UserId,
    string UserName,
    DateTimeOffset StartTime,
    DateTimeOffset? EndTime,
    long Duration,
    string? Notes,
    DateTimeOffset CreatedAt
);

public record TaskDetailDto(
    TaskItemDto Task,
    List<SubtaskDto> Subtasks,
    List<TaskSessionDto> RecentSessions
);

public record CreateTaskRequest(
    string Title,
    string? Description,
    TaskPriority Priority,
    Domain.Enums.TaskStatus Status,
    int Progress,
    string? Milestone,
    string? Obstacle,
    string? Solution,
    int? ProjectId,
    int? CategoryId,
    string? AssignedToUserId,
    int? ParentTaskId,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate
);

public record UpdateTaskRequest(
    string Title,
    string? Description,
    TaskPriority Priority,
    Domain.Enums.TaskStatus Status,
    int Progress,
    string? Milestone,
    string? Obstacle,
    string? Solution,
    int? ProjectId,
    int? CategoryId,
    string? AssignedToUserId,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate
);

public record UnifiedSaveTaskRequest(
    string Title,
    string? Description,
    TaskPriority Priority,
    Domain.Enums.TaskStatus Status,
    int Progress,
    string? Milestone,
    string? Obstacle,
    string? Solution,
    int? ProjectId,
    int? CategoryId,
    string? AssignedToUserId,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    // Optional Manual Work Session Parameter
    bool LogManualSession,
    DateTimeOffset? ManualSessionStartTime,
    DateTimeOffset? ManualSessionEndTime,
    string? ManualSessionNotes
);

public record UpdateTaskStatusRequest(
    Domain.Enums.TaskStatus Status
);

public record UpdateTaskProgressRequest(
    int Progress
);

public record CreateSubtaskRequest(
    string Title,
    TaskPriority Priority,
    string? AssignedToUserId,
    DateTimeOffset? DueDate
);

public record TaskExportFilterDto
{
    public string Format { get; init; } = "standard"; // "standard" | "arms"
    public DateTimeOffset? StartDate { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? ProjectId { get; init; }
    public int? Status { get; init; }
    public string Scope { get; init; } = "mine"; // "mine" | "all"
}

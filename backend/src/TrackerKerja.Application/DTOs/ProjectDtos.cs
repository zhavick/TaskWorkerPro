using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Application.DTOs;

public record ProjectListDto(
    int Id,
    string Name,
    string? Description,
    string Color,
    ProjectStatus Status,
    string? ClientName,
    string? ProjectManagerId,
    string? ProjectManagerName,
    decimal Budget,
    decimal ActualCost,
    double BurnRatePercent,
    string BurnRateStatus, // "Safe", "Warning", "Overbudget"
    int TotalTasks,
    int CompletedTasks,
    int ProgressPercent,
    DateTimeOffset? Deadline,
    DateTimeOffset CreatedAt
);

public record CreateProjectRequest(
    string Name,
    string? Description,
    string Color,
    ProjectStatus Status,
    string? ClientName,
    string? ProjectManagerId,
    decimal Budget,
    decimal ActualCost,
    DateTimeOffset? Deadline
);

public record UpdateProjectRequest(
    string Name,
    string? Description,
    string Color,
    ProjectStatus Status,
    string? ClientName,
    string? ProjectManagerId,
    decimal Budget,
    decimal ActualCost,
    DateTimeOffset? Deadline
);

public record BulkAssignTasksRequest(
    List<int> TaskIds
);

public record ProjectTaskItemDto(
    int Id,
    string TaskCode,
    string Title,
    string? Description,
    Domain.Enums.TaskStatus Status,
    TaskPriority Priority,
    int Progress,
    string? Milestone,
    string? CategoryName,
    string? AssignedToUserId,
    string? AssignedToUserName,
    string? AssignedToUserAvatarColor,
    DateTimeOffset? DueDate,
    long TotalDurationSeconds
);

public record ProjectDetailDto(
    int Id,
    string Name,
    string? Description,
    string Color,
    ProjectStatus Status,
    string? ClientName,
    string? ProjectManagerId,
    string? ProjectManagerName,
    string? ProjectManagerEmail,
    string? ProjectManagerAvatarColor,
    decimal Budget,
    decimal ActualCost,
    double BurnRatePercent,
    string BurnRateStatus, // "Safe", "Warning", "Overbudget"
    int TotalTasks,
    int CompletedTasks,
    int ProgressPercent,
    long TotalWorkDurationSeconds,
    DateTimeOffset? Deadline,
    DateTimeOffset CreatedAt,
    List<ProjectTaskItemDto> Tasks
);

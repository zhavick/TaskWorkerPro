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

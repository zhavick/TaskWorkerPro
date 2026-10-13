namespace TrackerKerja.Application.DTOs;

public record CalendarEventDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset? Start { get; init; }
    public DateTimeOffset? End { get; init; }
    public string Priority { get; init; } = "Medium";
    public string PriorityColor { get; init; } = "#3B82F6";
    public string Status { get; init; } = "Todo";
    public string StatusColor { get; init; } = "#6366F1";
    public int Progress { get; init; }
    public string? ProjectName { get; init; }
    public string ProjectColor { get; init; } = "#6366F1";
    public int? ProjectId { get; init; }
    public string? CategoryName { get; init; }
    public string? AssignedToUserId { get; init; }
    public string? AssignedToUserName { get; init; }
    public string? AssignedToUserAvatarColor { get; init; }
    public string? Milestone { get; init; }
    public string? Obstacle { get; init; }
    public string? Solution { get; init; }
    public bool IsOverdue { get; init; }
    public bool AllDay { get; init; } = true;
}

public record QuickUpdateTaskStatusRequest(
    Domain.Enums.TaskStatus Status,
    int? Progress
);

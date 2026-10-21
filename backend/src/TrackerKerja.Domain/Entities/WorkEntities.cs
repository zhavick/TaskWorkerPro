using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Domain.Entities;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#6366F1";
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
    public int? CompanyId { get; set; }
    public string? ClientName { get; set; }
    public string? ProjectManagerId { get; set; }
    public decimal Budget { get; set; } = 0.00m;
    public decimal ActualCost { get; set; } = 0.00m;
    public string? Tags { get; set; }
    public bool UseBudget { get; set; } = false;
    public DateTimeOffset? Deadline { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Company? Company { get; set; }
    public AppUser? ProjectManager { get; set; }
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
}

public class WorkTask
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public Enums.TaskStatus Status { get; set; } = Enums.TaskStatus.Todo;
    public int Progress { get; set; } = 0; // 0 - 100
    public string? Milestone { get; set; }
    public string? Obstacle { get; set; }
    public string? Solution { get; set; }
    public string? Tags { get; set; }
    public int? ProjectId { get; set; }
    public int? CategoryId { get; set; }
    public string? AssignedToUserId { get; set; }
    public string? CreatedByUserId { get; set; }
    public int? ParentTaskId { get; set; }
    public int? CompanyId { get; set; }
    public DateTimeOffset? StartDate { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Project? Project { get; set; }
    public Category? Category { get; set; }
    public AppUser? AssignedToUser { get; set; }
    public AppUser? CreatedByUser { get; set; }
    public WorkTask? ParentTask { get; set; }
    public Company? Company { get; set; }
    public ICollection<WorkTask> Subtasks { get; set; } = new List<WorkTask>();
    public ICollection<WorkSession> Sessions { get; set; } = new List<WorkSession>();
    public ICollection<WorkNote> Notes { get; set; } = new List<WorkNote>();
}

public class WorkSession
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; } // Null jika timer sedang aktif
    public long Duration { get; set; } // Detik
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public WorkTask Task { get; set; } = null!;
    public AppUser User { get; set; } = null!;
}

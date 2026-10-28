namespace TrackerKerja.Domain.Entities;

public class MasterPriority
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366F1";
    public string Icon { get; set; } = "flag";
    public int OrderIndex { get; set; }
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
}

public class MasterStatus
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366F1";
    public bool IsDoneState { get; set; }
    public int OrderIndex { get; set; }
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
}

public class MasterMilestone
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phase { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366F1";
    public string Icon { get; set; } = "milestone";
    public int OrderIndex { get; set; }
    public string? Description { get; set; }
    public bool IsDefault { get; set; }
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6366F1";
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
}

public class SystemSetting
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class EmailTemplate
{
    public int Id { get; set; }
    public string EventCode { get; set; } = string.Empty;
    public string EventName { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string? AvailableVariables { get; set; }
    public bool IsActive { get; set; } = true;
    public string? UpdatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Holiday
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsNational { get; set; } = true;
    public int? CompanyId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company? Company { get; set; }
}

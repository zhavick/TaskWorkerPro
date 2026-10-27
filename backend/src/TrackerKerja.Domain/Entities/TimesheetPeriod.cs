namespace TrackerKerja.Domain.Entities;

public class TimesheetPeriod
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public string PeriodCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int WorkingDaysCount { get; set; }
    public bool IsClosed { get; set; } = false;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company Company { get; set; } = null!;
}

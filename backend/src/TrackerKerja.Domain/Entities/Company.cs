namespace TrackerKerja.Domain.Entities;

public class Company
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Address { get; set; }
    public string? ContactEmail { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
    public ICollection<WorkNote> Notes { get; set; } = new List<WorkNote>();
    public ICollection<TimesheetPeriod> TimesheetPeriods { get; set; } = new List<TimesheetPeriod>();
    public CompanyTimesheetConfig? TimesheetConfig { get; set; }
}

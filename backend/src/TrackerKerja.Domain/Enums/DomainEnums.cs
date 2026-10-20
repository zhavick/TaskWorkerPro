namespace TrackerKerja.Domain.Enums;

public enum TaskStatus
{
    Todo = 0,
    InProgress = 1,
    Done = 2,
    Overdue = 3,
    Review = 4
}

public enum TaskPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum ProjectStatus
{
    Active = 0,
    Completed = 1,
    Archived = 2
}

public enum AttendanceType
{
    Present = 1,
    Leave = 2,
    Sick = 3,
    Permission = 4,
    BusinessTrip = 5,
    Holiday = 6
}

public enum WorkLocation
{
    WFO = 1,
    WFH = 2,
    Dinas = 3,
    Remote = 4
}

public enum BadgeRarity
{
    Common = 1,
    Rare = 2,
    Epic = 3,
    Legendary = 4
}

public enum ClaimStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

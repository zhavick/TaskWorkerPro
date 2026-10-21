namespace TrackerKerja.Domain.Entities;

public class AppUser
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? UserName { get; set; }
    public string? NormalizedUserName { get; set; }
    public string? Email { get; set; }
    public string? NormalizedEmail { get; set; }
    public bool EmailConfirmed { get; set; }
    public string? PasswordHash { get; set; }
    public string? SecurityStamp { get; set; }
    public string? ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();
    public string? PhoneNumber { get; set; }
    public bool PhoneNumberConfirmed { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public bool LockoutEnabled { get; set; } = true;
    public int AccessFailedCount { get; set; }

    // Profil TrackerKerja
    public string FullName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = "Member";
    public string AvatarColor { get; set; } = "#6366F1";
    public string? ProfilePictureUrl { get; set; }
    public string? CoverPictureUrl { get; set; }
    public int? CompanyId { get; set; }
    public bool IsApproved { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public string? ApprovedByUserId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Company? Company { get; set; }
    public ICollection<WorkTask> AssignedTasks { get; set; } = new List<WorkTask>();
    public ICollection<WorkSession> WorkSessions { get; set; } = new List<WorkSession>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    public ICollection<WorkNote> Notes { get; set; } = new List<WorkNote>();
    public ICollection<UserBadge> Badges { get; set; } = new List<UserBadge>();
    public ICollection<DailyCheckIn> DailyCheckIns { get; set; } = new List<DailyCheckIn>();
    public ICollection<RewardClaim> RewardClaims { get; set; } = new List<RewardClaim>();
}

public class UserRefreshToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string JwtId { get; set; } = string.Empty;
    public bool IsUsed { get; set; }
    public bool IsRevoked { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }

    public AppUser User { get; set; } = null!;
}

public class AppRole
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string? ConcurrencyStamp { get; set; } = Guid.NewGuid().ToString();
}

public class AppUserRole
{
    public string UserId { get; set; } = string.Empty;
    public string RoleId { get; set; } = string.Empty;
}

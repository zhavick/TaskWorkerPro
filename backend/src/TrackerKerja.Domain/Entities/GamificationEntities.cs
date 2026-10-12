using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Domain.Entities;

public class MasterBadge
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string Icon { get; set; } = "award";
    public string Color { get; set; } = "#10B981";
    public int Points { get; set; } = 0;
    public BadgeRarity Rarity { get; set; } = BadgeRarity.Common;
    public int TriggerType { get; set; } = 0;
    public int TriggerThreshold { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public int OrderIndex { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class UserBadge
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int BadgeId { get; set; }
    public DateTimeOffset UnlockedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsFeatured { get; set; }
    public string? AwardedBy { get; set; }

    public AppUser User { get; set; } = null!;
    public MasterBadge Badge { get; set; } = null!;
}

public class DailyCheckIn
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateOnly CheckInDate { get; set; }
    public DateTimeOffset CheckInTime { get; set; } = DateTimeOffset.UtcNow;
    public int PointsEarned { get; set; } = 10;
    public int StreakDay { get; set; } = 1;
    public bool IsMonthlyMilestone { get; set; }
    public string? Notes { get; set; }

    public AppUser User { get; set; } = null!;
}

public class RewardItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int PointCost { get; set; }
    public int Stock { get; set; } = 10;
    public string Category { get; set; } = "Voucher";
    public string Icon { get; set; } = "gift";
    public string Color { get; set; } = "indigo";
    public bool IsActive { get; set; } = true;
    public bool IsMonthlyMilestoneReward { get; set; }
    public int OrderIndex { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class RewardClaim
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int RewardItemId { get; set; }
    public int PointsSpent { get; set; }
    public decimal PointValueSnapshot { get; set; } = 100.00m;
    public decimal RupiahEquivalent { get; set; }
    public ClaimStatus Status { get; set; } = ClaimStatus.Pending;
    public string? UserNotes { get; set; }
    public string? AdminNotes { get; set; }
    public DateTimeOffset ClaimedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ProcessedAt { get; set; }
    public string? ProcessedByUserId { get; set; }

    public AppUser User { get; set; } = null!;
    public RewardItem RewardItem { get; set; } = null!;
    public AppUser? ProcessedByUser { get; set; }
}

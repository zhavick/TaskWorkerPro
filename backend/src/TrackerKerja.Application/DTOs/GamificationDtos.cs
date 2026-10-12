using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Application.DTOs;

public record GamificationSummaryDto(
    int TotalCurrentPoints,
    int MonthlyCheckInPoints,
    int BadgePoints,
    int CurrentStreakDays,
    bool HasCheckedInToday,
    int DaysCheckedInThisMonth,
    bool Reached15DaysMilestone,
    bool Reached30DaysMilestone,
    int TotalBadgesUnlocked
);

public record LeaderboardItemDto(
    string UserId,
    string UserName,
    string? UserAvatar,
    int Points,
    int StreakDays,
    int Rank
);

public record BadgeItemDto(
    int Id,
    string Code,
    string Name,
    string? Description,
    string? Category,
    string Icon,
    string Color,
    int Points,
    BadgeRarity Rarity,
    bool IsUnlocked,
    DateTimeOffset? UnlockedAt
);

public record RewardItemDto(
    int Id,
    string Name,
    string? Description,
    int PointCost,
    decimal RupiahEquivalent,
    int Stock,
    string Category,
    string Icon,
    string Color,
    bool IsActive
);

public record ClaimRewardRequest(
    int RewardItemId,
    string? UserNotes
);

public record ProcessRewardClaimRequest(
    bool IsApproved,
    string? AdminNotes
);

public record RewardClaimDto(
    int Id,
    string UserId,
    string UserName,
    int RewardItemId,
    string RewardItemName,
    int PointsSpent,
    decimal RupiahEquivalent,
    ClaimStatus Status,
    string? UserNotes,
    string? AdminNotes,
    DateTimeOffset ClaimedAt,
    DateTimeOffset? ProcessedAt,
    string? ProcessedByUserName
);

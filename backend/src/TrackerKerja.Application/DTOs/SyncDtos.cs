using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Application.DTOs;

public record SyncPingResponse
{
    public string InstanceName { get; init; } = "TrackerKerja-Node";
    public string Version { get; init; } = "1.0.0";
    public DateTimeOffset ServerTime { get; init; } = DateTimeOffset.UtcNow;
    public int TotalCompanies { get; init; }
    public int TotalUsers { get; init; }
    public int TotalProjects { get; init; }
    public int TotalTasks { get; init; }
    public int TotalNotes { get; init; }
    public int TotalAttachments { get; init; }
    public int TotalSessions { get; init; }
    public int TotalAttendances { get; init; }
    public int TotalBadges { get; init; }
    public long TotalUploadsSizeBytes { get; init; }
    public bool Ready { get; init; } = true;
    public long ResponseLatencyMs { get; init; }
}

public record SyncPushRequest
{
    public string HostUrl { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public bool IncludeFiles { get; init; } = true;
    public bool AllowUntrustedSsl { get; init; } = false;
}

public record SyncPullRequest
{
    public string HostUrl { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public bool IncludeFiles { get; init; } = true;
    public bool AllowUntrustedSsl { get; init; } = false;
}

public record SyncManifest
{
    public string SourceInstance { get; init; } = "TrackerKerja-Node";
    public string Version { get; init; } = "1.0.0";
    public DateTimeOffset ExportedAt { get; init; } = DateTimeOffset.UtcNow;
    public bool IncludesFiles { get; init; }
    public int EntityCount { get; init; }
    public long UploadsSizeBytes { get; init; }
    public List<string> IncludedTables { get; init; } = new();
}

public record CompanySyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Address { get; init; }
    public string? ContactEmail { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record UserSyncDto
{
    public string Id { get; init; } = string.Empty;
    public string? UserName { get; init; }
    public string? NormalizedUserName { get; init; }
    public string? Email { get; init; }
    public string? NormalizedEmail { get; init; }
    public bool EmailConfirmed { get; init; }
    public string? PasswordHash { get; init; }
    public string? SecurityStamp { get; init; }
    public string? ConcurrencyStamp { get; init; }
    public string? PhoneNumber { get; init; }
    public string FullName { get; init; } = string.Empty;
    public string JobTitle { get; init; } = "Member";
    public string AvatarColor { get; init; } = "#6366F1";
    public string? ProfilePictureUrl { get; init; }
    public string? CoverPictureUrl { get; init; }
    public int? CompanyId { get; init; }
    public bool IsApproved { get; init; }
    public DateTimeOffset? ApprovedAt { get; init; }
    public string? ApprovedByUserId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record CategorySyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = "#6366F1";
    public string? Description { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record MasterPrioritySyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = "#6366F1";
    public string Icon { get; init; } = "flag";
    public int OrderIndex { get; init; }
    public string? Description { get; init; }
    public bool IsDefault { get; init; }
}

public record MasterStatusSyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Color { get; init; } = "#6366F1";
    public bool IsDoneState { get; init; }
    public int OrderIndex { get; init; }
    public string? Description { get; init; }
    public bool IsDefault { get; init; }
}

public record MasterMilestoneSyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Phase { get; init; } = string.Empty;
    public string Color { get; init; } = "#6366F1";
    public string Icon { get; init; } = "milestone";
    public int OrderIndex { get; init; }
    public string? Description { get; init; }
    public bool IsDefault { get; init; }
}

public record ProjectSyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Color { get; init; } = "#6366F1";
    public ProjectStatus Status { get; init; } = ProjectStatus.Active;
    public int? CompanyId { get; init; }
    public string? ClientName { get; init; }
    public string? ProjectManagerId { get; init; }
    public decimal Budget { get; init; }
    public decimal ActualCost { get; init; }
    public bool UseBudget { get; init; }
    public string? Tags { get; init; }
    public DateTimeOffset? Deadline { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record TaskSyncDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public TaskPriority Priority { get; init; } = TaskPriority.Medium;
    public Domain.Enums.TaskStatus Status { get; init; } = Domain.Enums.TaskStatus.Todo;
    public int Progress { get; init; }
    public string? Milestone { get; init; }
    public string? Obstacle { get; init; }
    public string? Solution { get; init; }
    public string? Tags { get; init; }
    public int? ProjectId { get; init; }
    public int? CategoryId { get; init; }
    public string? AssignedToUserId { get; init; }
    public int? ParentTaskId { get; init; }
    public int? CompanyId { get; init; }
    public DateTimeOffset? StartDate { get; init; }
    public DateTimeOffset? DueDate { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record SessionSyncDto
{
    public int Id { get; init; }
    public int TaskId { get; init; }
    public string UserId { get; init; } = string.Empty;
    public DateTimeOffset StartTime { get; init; }
    public DateTimeOffset? EndTime { get; init; }
    public long Duration { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record AttendanceSyncDto
{
    public int Id { get; init; }
    public string UserId { get; init; } = string.Empty;
    public DateOnly Date { get; init; }
    public AttendanceType Type { get; init; } = AttendanceType.Present;
    public WorkLocation WorkLocation { get; init; } = WorkLocation.WFO;
    public int Status { get; init; } = 1;
    public string? ApprovedByUserId { get; init; }
    public DateTimeOffset? ClockIn { get; init; }
    public DateTimeOffset? ClockOut { get; init; }
    public double TotalHours { get; init; }
    public string? LeaveReason { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record WorkNoteSyncDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string ContentHtml { get; init; } = string.Empty;
    public string Category { get; init; } = "General";
    public string Color { get; init; } = "#6366F1";
    public bool IsPinned { get; init; }
    public string? AuthorUserId { get; init; }
    public int? TaskId { get; init; }
    public int? CompanyId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record NoteAttachmentSyncDto
{
    public int Id { get; init; }
    public int NoteId { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string FilePath { get; init; } = string.Empty;
    public long FileSize { get; init; }
    public string? ContentType { get; init; }
    public string? FileExtension { get; init; }
    public string? UploadedByUserId { get; init; }
    public DateTimeOffset UploadedAt { get; init; }
}

public record MasterBadgeSyncDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Category { get; init; }
    public string Icon { get; init; } = "award";
    public string Color { get; init; } = "#10B981";
    public int Points { get; init; } = 0;
    public BadgeRarity Rarity { get; init; } = BadgeRarity.Common;
    public int TriggerType { get; init; } = 0;
    public int TriggerThreshold { get; init; } = 1;
    public bool IsActive { get; init; } = true;
    public int OrderIndex { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record RewardItemSyncDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int PointCost { get; init; }
    public int Stock { get; init; } = 10;
    public string Category { get; init; } = "Voucher";
    public string? ImageUrl { get; init; }
    public string Icon { get; init; } = "gift";
    public string Color { get; init; } = "indigo";
    public bool IsActive { get; init; } = true;
    public bool IsMonthlyMilestoneReward { get; init; }
    public int OrderIndex { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record EmailTemplateSyncDto
{
    public int Id { get; init; }
    public string EventCode { get; init; } = string.Empty;
    public string EventName { get; init; } = string.Empty;
    public string? Category { get; init; }
    public string Subject { get; init; } = string.Empty;
    public string BodyHtml { get; init; } = string.Empty;
    public string? AvailableVariables { get; set; }
    public bool IsActive { get; init; } = true;
    public string? UpdatedByUserId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record SystemSettingSyncDto
{
    public string Key { get; init; } = string.Empty;
    public string Value { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record UserBadgeSyncDto
{
    public int Id { get; init; }
    public string UserId { get; init; } = string.Empty;
    public int BadgeId { get; init; }
    public string? BadgeCode { get; init; }
    public DateTimeOffset UnlockedAt { get; init; }
    public bool IsFeatured { get; init; }
    public string? AwardedBy { get; init; }
}

public record DailyCheckInSyncDto
{
    public int Id { get; init; }
    public string UserId { get; init; } = string.Empty;
    public DateOnly CheckInDate { get; init; }
    public DateTimeOffset CheckInTime { get; init; }
    public int PointsEarned { get; init; }
    public int StreakDay { get; init; }
    public bool IsMonthlyMilestone { get; init; }
    public string? Notes { get; init; }
}

public record RewardClaimSyncDto
{
    public int Id { get; init; }
    public string UserId { get; init; } = string.Empty;
    public int RewardItemId { get; init; }
    public string? RewardItemName { get; init; }
    public int PointsSpent { get; init; }
    public ClaimStatus Status { get; init; }
    public DateTimeOffset ClaimedAt { get; init; }
    public DateTimeOffset? ProcessedAt { get; init; }
    public string? ProcessedByUserId { get; init; }
    public string? AdminNotes { get; init; }
}

public record AnnouncementSyncDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string Type { get; init; } = "Pengumuman Umum";
    public DateTimeOffset StartDate { get; init; }
    public DateTimeOffset EndDate { get; init; }
    public bool IsActive { get; init; } = true;
    public int? CompanyId { get; init; }
    public string? CreatedByUserId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record SyncDatabaseData
{
    public List<CompanySyncDto> Companies { get; init; } = new();
    public List<UserSyncDto> Users { get; init; } = new();
    public List<CategorySyncDto> Categories { get; init; } = new();
    public List<MasterPrioritySyncDto> MasterPriorities { get; init; } = new();
    public List<MasterStatusSyncDto> MasterStatuses { get; init; } = new();
    public List<MasterMilestoneSyncDto> MasterMilestones { get; init; } = new();
    public List<MasterBadgeSyncDto> MasterBadges { get; init; } = new();
    public List<UserBadgeSyncDto> UserBadges { get; init; } = new();
    public List<DailyCheckInSyncDto> DailyCheckIns { get; init; } = new();
    public List<RewardItemSyncDto> RewardItems { get; init; } = new();
    public List<RewardClaimSyncDto> RewardClaims { get; init; } = new();
    public List<EmailTemplateSyncDto> EmailTemplates { get; init; } = new();
    public List<SystemSettingSyncDto> SystemSettings { get; init; } = new();
    public List<AnnouncementSyncDto> Announcements { get; init; } = new();
    public List<ProjectSyncDto> Projects { get; init; } = new();
    public List<TaskSyncDto> Tasks { get; init; } = new();
    public List<SessionSyncDto> Sessions { get; init; } = new();
    public List<AttendanceSyncDto> Attendances { get; init; } = new();
    public List<WorkNoteSyncDto> Notes { get; init; } = new();
    public List<NoteAttachmentSyncDto> NoteAttachments { get; init; } = new();
}

public record SyncPayload
{
    public SyncManifest Manifest { get; init; } = new();
    public SyncDatabaseData Data { get; init; } = new();
    public string? FilesZipBase64 { get; init; }
}

public record SyncOperationResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public int RecordsProcessed { get; init; }
    public long FileSizeBytes { get; init; }
    public SyncStatus Status { get; init; } = SyncStatus.Success;
    public List<string> Details { get; init; } = new();
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;
}

public record SyncHistoryDto(
    int Id,
    string Direction,
    string Status,
    string TargetHost,
    int TotalRecordsSynced,
    long FileSizeBytes,
    string? SummaryJson,
    string? ErrorMessage,
    DateTimeOffset CreatedAt,
    string? TriggeredByUserId
);

namespace TrackerKerja.Application.DTOs;

public record UserProfileDto(
    string Id,
    string FullName,
    string Email,
    string JobTitle,
    string AvatarColor,
    string? ProfilePictureUrl,
    string? CoverPictureUrl,
    int? CompanyId,
    string? CompanyName,
    string? CompanyCode,
    bool IsApproved,
    IList<string> Roles,
    string? PhoneNumber = null,
    DateTimeOffset? CreatedAt = null
);

public record MemberListItemDto(
    string Id,
    string FullName,
    string Email,
    string JobTitle,
    string AvatarColor,
    string? ProfilePictureUrl,
    int? CompanyId,
    string? CompanyName,
    string? CompanyCode,
    bool IsApproved,
    DateTimeOffset? ApprovedAt,
    DateTimeOffset CreatedAt,
    IList<string> Roles,
    bool IsLockedOut = false,
    int TotalTasks = 0,
    int CompletedTasks = 0,
    double TotalHours = 0.0,
    string? PhoneNumber = null,
    List<string>? Projects = null,
    string? CoverPictureUrl = null,
    bool CanPurgeData = false
);

public record UpdateMemberRequest(
    string FullName,
    string JobTitle,
    string? PhoneNumber = null,
    string? AvatarColor = null,
    int? CompanyId = null,
    string? Email = null,
    string? Role = null,
    bool? CanPurgeData = null
);

public record BulkChangeCompanyRequest(
    List<string> UserIds,
    int TargetCompanyId
);

public record CompanyMemberGroupDto(
    int? CompanyId,
    string CompanyName,
    string CompanyCode,
    int TotalMembers,
    int TotalTasks,
    int CompletedTasks,
    double TotalHours,
    List<MemberListItemDto> Members
);

public record AdminResetPasswordRequest(
    string NewPassword
);

public record DeleteMemberConfirmationRequest(
    string? TargetFullName,
    string? AdminPassword
);

public record ApproveMemberRequest(
    string? AdminNotes
);

public record RejectMemberRequest(
    string RejectionReason
);

public record UpdateProfileRequest(
    string FullName,
    string JobTitle,
    string AvatarColor,
    string? PhoneNumber = null,
    string? ProfilePictureUrl = null,
    string? CoverPictureUrl = null
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

public record AdminGroupEmailRequest(
    string Email
);

public record AdminGroupMemberDto(
    string UserId,
    string FullName,
    string Email,
    string JobTitle,
    string AvatarColor,
    DateTimeOffset AddedAt
);

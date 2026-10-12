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
    IList<string> Roles
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
    IList<string> Roles
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
    string AvatarColor
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

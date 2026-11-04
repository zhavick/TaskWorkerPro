namespace TrackerKerja.Application.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string JobTitle,
    string CompanyOption, // "existing" atau "new"
    string? ExistingCompanyCode,
    string? NewCompanyName,
    string? NewCompanyCode,
    string? CompanyCode = null
)
{
    public string? ResolvedCompanyCode => !string.IsNullOrWhiteSpace(ExistingCompanyCode)
        ? ExistingCompanyCode
        : CompanyCode;
}

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    bool Success,
    string Message,
    string? AccessToken,
    UserProfileDto? User
);

public record RefreshTokenRequest(
    string? RefreshToken
);

public record ForgotPasswordRequest(
    string Email
);

public record ResetPasswordRequest(
    string Email,
    string Token,
    string NewPassword
);

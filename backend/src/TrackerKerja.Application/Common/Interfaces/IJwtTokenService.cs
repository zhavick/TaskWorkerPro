using TrackerKerja.Domain.Entities;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string GenerateAccessToken(AppUser user, IList<string> roles, string? companyCode);
    string GenerateRefreshToken();
    string GetJwtIdFromToken(string token);
}

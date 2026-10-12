using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;

namespace TrackerKerja.Infrastructure.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAccessToken(AppUser user, IList<string> roles, string? companyCode)
    {
        var secretKey = _configuration["JwtSettings:SecretKey"] ?? "SUPER_SECRET_KEY_FOR_TRACKER_KERJA_2026_MINIMUM_32_BYTES_STRONG!";
        var issuer = _configuration["JwtSettings:Issuer"] ?? "https://api.trackerkerja.local";
        var audience = _configuration["JwtSettings:Audience"] ?? "https://app.trackerkerja.local";
        var expirationMinutes = int.TryParse(_configuration["JwtSettings:AccessTokenExpirationMinutes"], out var exp) ? exp : 60;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.FullName),
            new("jobTitle", user.JobTitle),
            new("avatarColor", user.AvatarColor)
        };

        if (user.CompanyId.HasValue)
        {
            claims.Add(new Claim("companyId", user.CompanyId.Value.ToString()));
        }

        if (!string.IsNullOrEmpty(companyCode))
        {
            claims.Add(new Claim("companyCode", companyCode));
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public string GetJwtIdFromToken(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);
        return jwtToken.Id;
    }
}

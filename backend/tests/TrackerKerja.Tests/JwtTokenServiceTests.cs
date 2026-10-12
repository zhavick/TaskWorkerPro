using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _jwtTokenService;

    public JwtTokenServiceTests()
    {
        var configDictionary = new Dictionary<string, string?>
        {
            { "JwtSettings:SecretKey", "A_VERY_SECRET_KEY_FOR_TESTING_PURPOSES_MINIMUM_32_BYTES!" },
            { "JwtSettings:Issuer", "https://api.test.local" },
            { "JwtSettings:Audience", "https://app.test.local" },
            { "JwtSettings:AccessTokenExpirationMinutes", "60" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configDictionary)
            .Build();

        _jwtTokenService = new JwtTokenService(configuration);
    }

    [Fact]
    public void GenerateAccessToken_ShouldIncludeCorrectClaims()
    {
        // Arrange
        var user = new AppUser
        {
            Id = "usr-12345",
            Email = "john@example.com",
            FullName = "John Doe",
            JobTitle = "Senior Engineer",
            CompanyId = 42
        };
        var roles = new List<string> { "Administrator", "Developer" };
        var companyCode = "WCH";

        // Act
        var tokenString = _jwtTokenService.GenerateAccessToken(user, roles, companyCode);

        // Assert
        tokenString.Should().NotBeNullOrWhiteSpace();

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(tokenString);

        jwtToken.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == "usr-12345");
        jwtToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Email && c.Value == "john@example.com");
        jwtToken.Claims.Should().Contain(c => c.Type == "companyId" && c.Value == "42");
        jwtToken.Claims.Should().Contain(c => c.Type == "companyCode" && c.Value == "WCH");
        jwtToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == "Administrator");
        jwtToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Role && c.Value == "Developer");
    }

    [Fact]
    public void GenerateRefreshToken_ShouldReturnValidBase64String()
    {
        // Act
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        // Assert
        refreshToken.Should().NotBeNullOrWhiteSpace();
        var bytes = Convert.FromBase64String(refreshToken);
        bytes.Length.Should().Be(64);
    }

    [Fact]
    public void GetJwtIdFromToken_ShouldExtractJtiSuccessfully()
    {
        // Arrange
        var user = new AppUser { Id = "u-1", FullName = "Test User" };
        var token = _jwtTokenService.GenerateAccessToken(user, new List<string>(), null);

        // Act
        var jti = _jwtTokenService.GetJwtIdFromToken(token);

        // Assert
        jti.Should().NotBeNullOrWhiteSpace();
        Guid.TryParse(jti, out _).Should().BeTrue();
    }
}

using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class ProfileControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;
    private readonly ProfileController _controller;

    public ProfileControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(1, "TEST", "test-user-id", false);
        _context = new AppDbContext(options, _tenantService);
        _controller = new ProfileController(_context, _tenantService);

        // Seed initial company and user
        var company = new Company
        {
            Id = 1,
            Name = "PT Wahana Digital",
            Code = "WAHANA",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Companies.Add(company);

        var user = new AppUser
        {
            Id = "test-user-id",
            FullName = "Ahmad Developer",
            Email = "ahmad@wahana.com",
            JobTitle = "Senior Frontend Engineer",
            AvatarColor = "#6366F1",
            PhoneNumber = "+6281234567890",
            CompanyId = 1,
            IsApproved = true,
            PasswordHash = PasswordHasher.HashPassword("OldSecretPass123!"),
            ProfilePictureUrl = "/images/avatars/avatar1.png",
            CoverPictureUrl = "/images/covers/cover1.jpg",
            CreatedAt = DateTimeOffset.UtcNow.AddMonths(-3)
        };
        _context.Users.Add(user);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private static JsonElement ToJsonElement(object? value)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(value, options);
        return JsonDocument.Parse(json).RootElement;
    }

    [Fact]
    public async Task GetProfile_ReturnsCurrentLoggedInUserProfileWithPhoneAndDates()
    {
        // Act
        var result = await _controller.GetProfile();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        Assert.True(json.GetProperty("success").GetBoolean());

        var data = json.GetProperty("data");
        Assert.Equal("test-user-id", data.GetProperty("id").GetString());
        Assert.Equal("Ahmad Developer", data.GetProperty("fullName").GetString());
        Assert.Equal("ahmad@wahana.com", data.GetProperty("email").GetString());
        Assert.Equal("Senior Frontend Engineer", data.GetProperty("jobTitle").GetString());
        Assert.Equal("#6366F1", data.GetProperty("avatarColor").GetString());
        Assert.Equal("+6281234567890", data.GetProperty("phoneNumber").GetString());
        Assert.Equal("PT Wahana Digital", data.GetProperty("companyName").GetString());
        Assert.Equal("WAHANA", data.GetProperty("companyCode").GetString());
    }

    [Fact]
    public async Task UpdateProfile_UpdatesAllFieldsCorrectly()
    {
        // Arrange
        var request = new UpdateProfileRequest(
            FullName: "Ahmad Maulana",
            JobTitle: "Lead Fullstack Architect",
            AvatarColor: "#10B981",
            PhoneNumber: "+628999888777",
            ProfilePictureUrl: "/images/avatars/new-avatar.png",
            CoverPictureUrl: "/images/covers/nebula.jpg"
        );

        // Act
        var result = await _controller.UpdateProfile(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        Assert.True(json.GetProperty("success").GetBoolean());

        var updatedUser = await _context.Users.FindAsync("test-user-id");
        Assert.NotNull(updatedUser);
        Assert.Equal("Ahmad Maulana", updatedUser.FullName);
        Assert.Equal("Lead Fullstack Architect", updatedUser.JobTitle);
        Assert.Equal("#10B981", updatedUser.AvatarColor);
        Assert.Equal("+628999888777", updatedUser.PhoneNumber);
        Assert.Equal("/images/avatars/new-avatar.png", updatedUser.ProfilePictureUrl);
        Assert.Equal("/images/covers/nebula.jpg", updatedUser.CoverPictureUrl);
    }

    [Fact]
    public async Task ChangePassword_ValidCurrentPassword_ChangesPasswordSuccessfully()
    {
        // Arrange
        var request = new ChangePasswordRequest(
            CurrentPassword: "OldSecretPass123!",
            NewPassword: "BrandNewSecurePass456!"
        );

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        Assert.True(json.GetProperty("success").GetBoolean());

        var user = await _context.Users.FindAsync("test-user-id");
        Assert.NotNull(user);
        Assert.True(PasswordHasher.VerifyPassword("BrandNewSecurePass456!", user.PasswordHash!));
        Assert.False(PasswordHasher.VerifyPassword("OldSecretPass123!", user.PasswordHash!));
    }

    [Fact]
    public async Task ChangePassword_InvalidCurrentPassword_ReturnsBadRequest()
    {
        // Arrange
        var request = new ChangePasswordRequest(
            CurrentPassword: "WrongCurrentPassword!",
            NewPassword: "BrandNewSecurePass456!"
        );

        // Act
        var result = await _controller.ChangePassword(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var json = ToJsonElement(badRequestResult.Value);
        Assert.False(json.GetProperty("success").GetBoolean());
    }

    private class FakeTenantService : ICurrentTenantService
    {
        public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin)
        {
            CompanyId = companyId;
            CompanyCode = companyCode;
            UserId = userId;
            IsAdmin = isAdmin;
        }

        public int? CompanyId { get; }
        public string? CompanyCode { get; }
        public string? UserId { get; }
        public bool IsAdmin { get; }
    }
}

using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class AuthControllerTests
{
    private readonly AppDbContext _context;
    private readonly IJwtTokenService _jwtService;

    public AuthControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        // Seed Company
        _context.Companies.Add(new Company { Id = 10, Name = "Wahana Holding", Code = "WCH" });
        _context.SaveChanges();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "JwtSettings:SecretKey", "ANOTHER_SUPER_SECRET_KEY_MINIMUM_32_BYTES_FOR_AUTH!" },
                { "JwtSettings:Issuer", "https://api.test.local" },
                { "JwtSettings:Audience", "https://app.test.local" },
                { "JwtSettings:AccessTokenExpirationMinutes", "60" }
            })
            .Build();

        _jwtService = new JwtTokenService(config);
    }

    [Fact]
    public async Task Register_WithInvalidCompanyCode_ShouldReturnBadRequest()
    {
        // Arrange
        var controller = new AuthController(_context, _jwtService);
        var request = new RegisterRequest(
            "user1@test.com", "Password123!", "User Satu", "Developer",
            "existing", "INVALID_CODE", null, null
        );

        // Act
        var result = await controller.Register(request) as BadRequestObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task Register_WithValidCompanyCode_ShouldCreateUserWaitingForApproval()
    {
        // Arrange
        var controller = new AuthController(_context, _jwtService);
        var request = new RegisterRequest(
            "user2@test.com", "Password123!", "User Dua", "Analyst",
            "existing", "WCH", null, null
        );

        // Act
        var result = await controller.Register(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "user2@test.com");
        user.Should().NotBeNull();
        user!.IsApproved.Should().BeFalse();
        user.CompanyId.Should().Be(10);
    }

    [Fact]
    public async Task Login_WhenUserNotApproved_ShouldReturnForbidden403()
    {
        // Arrange
        var controller = new AuthController(_context, _jwtService);
        var regRequest = new RegisterRequest(
            "user3@test.com", "SecretPass123!", "User Tiga", "Tester",
            "existing", "WCH", null, null
        );
        await controller.Register(regRequest);

        var loginRequest = new LoginRequest("user3@test.com", "SecretPass123!");

        // Act
        var loginResult = await controller.Login(loginRequest) as ObjectResult;

        // Assert
        loginResult.Should().NotBeNull();
        loginResult!.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task ApproveMember_ShouldEnableUserLogin()
    {
        // Arrange
        var authController = new AuthController(_context, _jwtService);
        authController.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var regRequest = new RegisterRequest(
            "user4@test.com", "SecretPass123!", "User Empat", "Writer",
            "existing", "WCH", null, null
        );
        await authController.Register(regRequest);

        var user = await _context.Users.FirstAsync(u => u.Email == "user4@test.com");

        var tenantService = new FakeAdminTenantService();
        var membersController = new MembersController(_context, tenantService);

        // Act - Admin approves user
        var approveResult = await membersController.ApproveMember(user.Id, new ApproveMemberRequest("Approved by Admin"));
        approveResult.Should().BeOfType<OkObjectResult>();

        // Act - User logs in
        var loginResult = await authController.Login(new LoginRequest("user4@test.com", "SecretPass123!")) as OkObjectResult;

        // Assert
        loginResult.Should().NotBeNull();
        loginResult!.StatusCode.Should().Be(200);
        var authResponse = loginResult.Value as AuthResponse;
        authResponse.Should().NotBeNull();
        authResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResponse.User!.IsApproved.Should().BeTrue();
    }

    [Fact]
    public async Task AdminResetPassword_ShouldUpdateUserPasswordHashAndAllowLogin()
    {
        // Arrange
        var user = new AppUser
        {
            Id = "usr-reset-test",
            Email = "resetuser@test.com",
            UserName = "resetuser@test.com",
            FullName = "Reset Test User",
            PasswordHash = TrackerKerja.Infrastructure.Services.PasswordHasher.HashPassword("OldPass123!"),
            CompanyId = 10,
            IsApproved = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var tenantService = new FakeAdminTenantService();
        var membersController = new MembersController(_context, tenantService);
        var authController = new AuthController(_context, _jwtService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        // Act - Admin resets password to NewSecret2026!
        var resetResult = await membersController.ResetPassword(user.Id, new AdminResetPasswordRequest("NewSecret2026!")) as OkObjectResult;

        // Assert
        resetResult.Should().NotBeNull();
        resetResult!.StatusCode.Should().Be(200);

        // User should now be able to login with the new password
        var loginResult = await authController.Login(new LoginRequest("resetuser@test.com", "NewSecret2026!")) as OkObjectResult;
        loginResult.Should().NotBeNull();
        loginResult!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task DeleteMemberPermanently_WhenSuperadmin_ShouldReturnBadRequest()
    {
        // Arrange
        var superadmin = new AppUser
        {
            Id = "usr-superadmin",
            Email = "admin@trackerkerja.local",
            UserName = "admin@trackerkerja.local",
            FullName = "Super Administrator",
            CompanyId = 10,
            IsApproved = true
        };
        _context.Users.Add(superadmin);
        await _context.SaveChangesAsync();

        var tenantService = new FakeAdminTenantService();
        var membersController = new MembersController(_context, tenantService);

        // Act - Attempt to delete superadmin
        var deleteResult = await membersController.DeleteMemberPermanently("usr-superadmin", new DeleteMemberConfirmationRequest("Super Administrator", null)) as BadRequestObjectResult;

        // Assert
        deleteResult.Should().NotBeNull();
        deleteResult!.StatusCode.Should().Be(400);
    }

    private class FakeAdminTenantService : ICurrentTenantService
    {
        public int? CompanyId => 10;
        public string? CompanyCode => "WCH";
        public string? UserId => "admin-1";
        public bool IsAdmin => true;
    }
}

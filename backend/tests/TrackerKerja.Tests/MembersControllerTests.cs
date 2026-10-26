using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class MembersControllerTests : IDisposable
{
    private readonly AppDbContext _context;

    public MembersControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        // Seed Companies
        _context.Companies.AddRange(
            new Company { Id = 1, Name = "PT Wahana Central Holding", Code = "WCH", CreatedAt = DateTimeOffset.UtcNow },
            new Company { Id = 2, Name = "PT Nusantara Tech", Code = "TECH", CreatedAt = DateTimeOffset.UtcNow }
        );

        // Seed Users
        _context.Users.AddRange(
            new AppUser
            {
                Id = "usr-admin",
                FullName = "Admin Utama",
                Email = "admin@wahana.com",
                JobTitle = "System Administrator",
                AvatarColor = "#4F46E5",
                PhoneNumber = "+628111222333",
                CompanyId = 1,
                IsApproved = true,
                CreatedAt = DateTimeOffset.UtcNow.AddMonths(-6)
            },
            new AppUser
            {
                Id = "usr-member-1",
                FullName = "Budi Programmer",
                Email = "budi@wahana.com",
                JobTitle = "Backend Engineer",
                AvatarColor = "#10B981",
                PhoneNumber = "+6281234567890",
                CompanyId = 1,
                IsApproved = true,
                CreatedAt = DateTimeOffset.UtcNow.AddMonths(-2)
            },
            new AppUser
            {
                Id = "usr-member-2",
                FullName = "Citra Designer",
                Email = "citra@nusantara.com",
                JobTitle = "UI/UX Designer",
                AvatarColor = "#EC4899",
                PhoneNumber = "+6289876543210",
                CompanyId = 2,
                IsApproved = false,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-5)
            }
        );

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
    public async Task GetMembers_AsAdmin_ReturnsAllMembersWithPhoneNumbers()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-admin", isAdmin: true);
        var controller = new MembersController(_context, tenant);

        // Act
        var result = await controller.GetMembers();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var members = json.GetProperty("data");
        members.GetArrayLength().Should().Be(3);

        // Check that phone numbers are present
        var budi = members.EnumerateArray().FirstOrDefault(m => m.GetProperty("id").GetString() == "usr-member-1");
        budi.GetProperty("phoneNumber").GetString().Should().Be("+6281234567890");
    }

    [Fact]
    public async Task GetMembers_AsNonAdmin_ReturnsOnlyOwnTenantMembers()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-member-1", isAdmin: false);
        var controller = new MembersController(_context, tenant);

        // Act
        var result = await controller.GetMembers();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        var members = json.GetProperty("data");
        members.GetArrayLength().Should().Be(2); // Only company 1 users (admin & budi)
    }

    [Fact]
    public async Task GetMemberById_ReturnsFullProfileDetails_IncludingPhoneAndCreatedAt()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-member-1", isAdmin: false);
        var controller = new MembersController(_context, tenant);

        // Act
        var result = await controller.GetMemberById("usr-member-1");

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        var data = json.GetProperty("data");

        data.GetProperty("id").GetString().Should().Be("usr-member-1");
        data.GetProperty("fullName").GetString().Should().Be("Budi Programmer");
        data.GetProperty("phoneNumber").GetString().Should().Be("+6281234567890");
        data.GetProperty("createdAt").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task UpdateMember_SelfUpdate_UpdatesDataSuccessfully()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-member-1", isAdmin: false);
        var controller = new MembersController(_context, tenant);
        var request = new UpdateMemberRequest(
            FullName: "Budi Santoso Programmer",
            JobTitle: "Lead Backend Architect",
            PhoneNumber: "+6281999888777",
            AvatarColor: "#3B82F6"
        );

        // Act
        var result = await controller.UpdateMember("usr-member-1", request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        json.GetProperty("success").GetBoolean().Should().BeTrue();

        var user = await _context.Users.FindAsync("usr-member-1");
        user.Should().NotBeNull();
        user!.FullName.Should().Be("Budi Santoso Programmer");
        user.JobTitle.Should().Be("Lead Backend Architect");
        user.PhoneNumber.Should().Be("+6281999888777");
        user.AvatarColor.Should().Be("#3B82F6");
    }

    [Fact]
    public async Task UpdateMember_NonAdmin_AttemptingToUpdateOtherUser_ReturnsForbid()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-member-1", isAdmin: false);
        var controller = new MembersController(_context, tenant);
        var request = new UpdateMemberRequest(
            FullName: "Hacked Admin",
            JobTitle: "Hacker"
        );

        // Act
        var result = await controller.UpdateMember("usr-admin", request);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task UpdateMember_Admin_CanUpdateCompanyId()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-admin", isAdmin: true);
        var controller = new MembersController(_context, tenant);
        var request = new UpdateMemberRequest(
            FullName: "Citra Designer Super",
            JobTitle: "Senior Product Designer",
            CompanyId: 1 // Move from Company 2 to Company 1
        );

        // Act
        var result = await controller.UpdateMember("usr-member-2", request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var user = await _context.Users.FindAsync("usr-member-2");
        user.Should().NotBeNull();
        user!.CompanyId.Should().Be(1);
        user.FullName.Should().Be("Citra Designer Super");
    }

    [Fact]
    public async Task ApproveMember_Admin_ApprovesUser()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-admin", isAdmin: true);
        var controller = new MembersController(_context, tenant);

        // Act
        var result = await controller.ApproveMember("usr-member-2", new ApproveMemberRequest("Approved"));

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var user = await _context.Users.FindAsync("usr-member-2");
        user!.IsApproved.Should().BeTrue();
        user.ApprovedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateMember_Admin_CanUpdateEmailAndGrantDataPurgeAdminRole()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-admin", isAdmin: true);
        var controller = new MembersController(_context, tenant);
        var request = new UpdateMemberRequest(
            FullName: "Budi Santoso Purger",
            JobTitle: "Data Maintenance Specialist",
            Email: "budi.purger@trackerkerja.local",
            Role: "DataPurgeAdmin"
        );

        // Act
        var result = await controller.UpdateMember("usr-member-1", request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var user = await _context.Users.FindAsync("usr-member-1");
        user.Should().NotBeNull();
        user!.Email.Should().Be("budi.purger@trackerkerja.local");
        user.FullName.Should().Be("Budi Santoso Purger");

        var isPurgeAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == "usr-member-1" && (ur.RoleId == "r-purge-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "DataPurgeAdmin")));
        isPurgeAdmin.Should().BeTrue();

        var isAdminRole = await _context.UserRoles.AnyAsync(ur => ur.UserId == "usr-member-1" && (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator")));
        isAdminRole.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateMember_Admin_CanRevokeDataPurgeAdminRole()
    {
        // Arrange
        var tenant = new FakeTenantService(1, "WCH", "usr-admin", isAdmin: true);
        var controller = new MembersController(_context, tenant);

        // Grant first
        await controller.UpdateMember("usr-member-1", new UpdateMemberRequest(
            FullName: "Budi Santoso",
            JobTitle: "Backend Dev",
            Role: "DataPurgeAdmin"
        ));

        // Act: Revoke to Member
        var revokeResult = await controller.UpdateMember("usr-member-1", new UpdateMemberRequest(
            FullName: "Budi Santoso",
            JobTitle: "Backend Dev",
            Role: "Member"
        ));

        // Assert
        Assert.IsType<OkObjectResult>(revokeResult);
        var isPurgeAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == "usr-member-1" && (ur.RoleId == "r-purge-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "DataPurgeAdmin")));
        isPurgeAdmin.Should().BeFalse();
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

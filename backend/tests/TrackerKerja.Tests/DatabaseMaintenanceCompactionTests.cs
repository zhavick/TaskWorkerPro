using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class DatabaseMaintenanceCompactionTests
{
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

    private readonly AppDbContext _context;

    public DatabaseMaintenanceCompactionTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantService = new FakeTenantService(1, "CORP-ALPHA", "usr-admin-1", true);
        _context = new AppDbContext(options, tenantService);

        _context.Companies.Add(new Company { Id = 1, Name = "Alpha Corp", Code = "CORP-ALPHA" });
        _context.Users.Add(new AppUser
        {
            Id = "usr-admin-1",
            Email = "admin@alphacorp.com",
            FullName = "Super Admin",
            CompanyId = 1,
            IsApproved = true
        });

        _context.SaveChanges();
    }

    [Fact]
    public async Task ShrinkDatabase_WhenInvoked_ShouldReturnSuccessWithCompactionStats()
    {
        // Arrange
        var controller = new SettingsController(_context);

        // Act
        var result = await controller.ShrinkDatabase() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var json = result.Value;
        json.Should().NotBeNull();
        var messageProp = json!.GetType().GetProperty("message")?.GetValue(json) as string;
        messageProp.Should().NotBeNullOrEmpty();
        messageProp.Should().Contain("berhasil");
    }
}

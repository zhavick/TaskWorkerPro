using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class CompaniesControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _adminTenant;
    private readonly FakeTenantService _memberTenant;

    public CompaniesControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _adminTenant = new FakeTenantService(1, "WCH", "usr-admin", true);
        _memberTenant = new FakeTenantService(1, "WCH", "usr-member", false);
        _context = new AppDbContext(options, _adminTenant);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetCompanies_ReturnsListOfCompanies()
    {
        // Arrange
        _context.Companies.AddRange(
            new Company { Id = 10, Name = "PT Nusantara Satu", Code = "NUSA", CreatedAt = DateTimeOffset.UtcNow },
            new Company { Id = 20, Name = "PT Samudra Dua", Code = "SMDR", CreatedAt = DateTimeOffset.UtcNow }
        );
        await _context.SaveChangesAsync();

        var controller = new CompaniesController(_context, _memberTenant);

        // Act
        var result = await controller.GetCompanies() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task CreateCompany_Admin_CreatesSuccessfully()
    {
        // Arrange
        var controller = new CompaniesController(_context, _adminTenant);
        var request = new CreateCompanyRequest(
            Name: "PT Teknologi Hebat",
            Code: "TEKNO",
            Description: "Perusahaan IT",
            Address: "Jakarta",
            ContactEmail: "contact@tekno.id"
        );

        // Act
        var result = await controller.CreateCompany(request) as CreatedAtActionResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(201, result.StatusCode);

        var saved = await _context.Companies.FirstOrDefaultAsync(c => c.Code == "TEKNO");
        Assert.NotNull(saved);
        Assert.Equal("PT Teknologi Hebat", saved.Name);
    }

    [Fact]
    public async Task CreateCompany_NonAdmin_ReturnsForbid()
    {
        // Arrange
        var controller = new CompaniesController(_context, _memberTenant);
        var request = new CreateCompanyRequest(
            Name: "PT Terlarang",
            Code: "FORBID"
        );

        // Act
        var result = await controller.CreateCompany(request);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task UpdateCompany_Admin_UpdatesSuccessfully()
    {
        // Arrange
        var comp = new Company { Id = 50, Name = "Nama Lama", Code = "LAMA", CreatedAt = DateTimeOffset.UtcNow };
        _context.Companies.Add(comp);
        await _context.SaveChangesAsync();

        var controller = new CompaniesController(_context, _adminTenant);
        var request = new UpdateCompanyRequest(
            Name: "Nama Baru Terverifikasi",
            Code: "BARU",
            Description: "Deskripsi Baru"
        );

        // Act
        var result = await controller.UpdateCompany(50, request) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);

        var updated = await _context.Companies.FindAsync(50);
        Assert.NotNull(updated);
        Assert.Equal("Nama Baru Terverifikasi", updated.Name);
        Assert.Equal("BARU", updated.Code);
    }

    [Fact]
    public async Task DeleteCompany_WithActiveMembers_ReturnsBadRequest()
    {
        // Arrange
        var comp = new Company { Id = 60, Name = "Perusahaan Ada User", Code = "USERED", CreatedAt = DateTimeOffset.UtcNow };
        var user = new AppUser { Id = "usr-in-comp", FullName = "Staff Comp", UserName = "staffcomp", CompanyId = 60 };
        _context.Companies.Add(comp);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var controller = new CompaniesController(_context, _adminTenant);

        // Act
        var result = await controller.DeleteCompany(60) as BadRequestObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task DeleteCompany_Empty_DeletesSuccessfully()
    {
        // Arrange
        var comp = new Company { Id = 70, Name = "Perusahaan Kosong", Code = "EMPTY", CreatedAt = DateTimeOffset.UtcNow };
        _context.Companies.Add(comp);
        await _context.SaveChangesAsync();

        var controller = new CompaniesController(_context, _adminTenant);

        // Act
        var result = await controller.DeleteCompany(70) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);

        var exists = await _context.Companies.AnyAsync(c => c.Id == 70);
        Assert.False(exists);
    }

    private class FakeTenantService : TrackerKerja.Application.Common.Interfaces.ICurrentTenantService
    {
        public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin)
        {
            CompanyId = companyId;
            CompanyCode = companyCode;
            UserId = userId;
            IsAdmin = isAdmin;
        }

        public int? CompanyId { get; set; }
        public string? CompanyCode { get; set; }
        public string? UserId { get; set; }
        public bool IsAdmin { get; set; }
    }
}

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

public class CompanyTimesheetConfigControllerTests
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public CompanyTimesheetConfigControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "ELISTEC", "admin-1", true);
        _context = new AppDbContext(options, _tenantService);
        _context.Companies.Add(new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" });
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetConfig_WhenNotConfigured_ShouldReturnElistecDefaults()
    {
        var controller = new CompanyTimesheetConfigController(_context, _tenantService);

        var result = await controller.GetConfig(10) as OkObjectResult;
        result.Should().NotBeNull();
        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as CompanyTimesheetConfigDto;
        data.Should().NotBeNull();
        data!.HeaderTitle.Should().Be("ELISTEC - Timesheet");
        data.ColumnsMapping.Should().HaveCount(14);
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

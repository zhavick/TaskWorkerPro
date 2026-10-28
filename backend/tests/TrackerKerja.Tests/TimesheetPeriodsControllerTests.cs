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

public class TimesheetPeriodsControllerTests
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public TimesheetPeriodsControllerTests()
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
    public async Task CreateAndGetPeriods_ShouldCalculateWorkingDaysAutomatically()
    {
        var controller = new TimesheetPeriodsController(_context, _tenantService);

        var request = new CreateTimesheetPeriodRequest(
            PeriodCode: "09/26",
            Name: "September 2026",
            StartDate: new DateOnly(2026, 9, 3),
            EndDate: new DateOnly(2026, 10, 2),
            WorkingDaysCount: null, // Auto calculate
            Notes: "Periode Cut-Off September ELISTEC"
        );

        var createResult = await controller.CreatePeriod(10, request) as OkObjectResult;
        createResult.Should().NotBeNull();
        createResult!.StatusCode.Should().Be(200);

        var listResult = await controller.GetPeriods(10) as OkObjectResult;
        listResult.Should().NotBeNull();
        var data = listResult!.Value?.GetType().GetProperty("data")?.GetValue(listResult.Value) as List<TimesheetPeriodDto>;
        data.Should().NotBeNull();
        data!.Count.Should().Be(1);
        data[0].PeriodCode.Should().Be("09/26");
        data[0].WorkingDaysCount.Should().Be(22); // Auto working days (non sat/sun)
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

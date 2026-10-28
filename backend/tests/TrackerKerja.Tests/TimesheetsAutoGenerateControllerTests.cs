using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class TimesheetsAutoGenerateControllerTests
{
    private readonly AppDbContext _context;

    public TimesheetsAutoGenerateControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        // Seed
        _context.Companies.Add(new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" });
        _context.Users.Add(new AppUser { Id = "user-1", FullName = "User Satu", CompanyId = 10, IsApproved = true });
        _context.TimesheetPeriods.Add(new TimesheetPeriod
        {
            Id = 1,
            CompanyId = 10,
            PeriodCode = "09/26",
            Name = "September 2026",
            StartDate = new DateOnly(2026, 9, 3),
            EndDate = new DateOnly(2026, 9, 4),
            WorkingDaysCount = 2
        });
        _context.Tasks.Add(new WorkTask
        {
            Id = 10,
            Title = "Task A",
            CompanyId = 10,
            AssignedToUserId = "user-1"
        });
        _context.SaveChanges();
    }

    [Fact]
    public async Task AutoGenerateTimesheets_WhenNotAdmin_ShouldReturnForbid()
    {
        var nonAdminTenant = new FakeTenantService(10, "ELISTEC", "user-1", isAdmin: false);
        var excelService = new ClosedXmlExportService(_context);
        var autoGenService = new AutomatedTimesheetGeneratorService(_context);
        var controller = new TimesheetsController(_context, nonAdminTenant, excelService, null, autoGenService);

        var request = new AutoGenerateTimesheetRequest(10, 1, "all", "Overwrite");
        var result = await controller.AutoGenerateTimesheets(request, default);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task AutoGenerateTimesheets_WhenAdmin_ShouldReturnOkWithResult()
    {
        var adminTenant = new FakeTenantService(10, "ELISTEC", "admin-user", isAdmin: true);
        var excelService = new ClosedXmlExportService(_context);
        var autoGenService = new AutomatedTimesheetGeneratorService(_context);
        var controller = new TimesheetsController(_context, adminTenant, excelService, null, autoGenService);

        var request = new AutoGenerateTimesheetRequest(10, 1, "all", "Overwrite");
        var result = await controller.AutoGenerateTimesheets(request, default);

        var okResult = result as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.StatusCode.Should().Be(200);

        var dto = okResult.Value as AutoGenerateTimesheetResultDto;
        dto.Should().NotBeNull();
        dto!.Success.Should().BeTrue();
        dto.UsersProcessedCount.Should().Be(1);
    }
}

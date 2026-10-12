using ClosedXML.Excel;
using FluentAssertions;
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

public class TimesheetsControllerTests
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;
    private readonly IExcelExportService _excelService;

    public TimesheetsControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "WCH", "user-1", true);
        _context = new AppDbContext(options, _tenantService);
        _excelService = new ClosedXmlExportService(_context);

        // Seed Company and Users
        _context.Companies.Add(new Company { Id = 10, Name = "Wahana Holding", Code = "WCH" });
        _context.Users.AddRange(
            new AppUser { Id = "user-1", Email = "u1@wahana.com", FullName = "User Satu", CompanyId = 10, IsApproved = true },
            new AppUser { Id = "user-2", Email = "u2@wahana.com", FullName = "User Dua", CompanyId = 10, IsApproved = true }
        );

        // Seed Project & Tasks
        _context.Projects.Add(new Project { Id = 1, Name = "Platform Core", CompanyId = 10 });
        _context.Tasks.AddRange(
            new WorkTask { Id = 10, Title = "API Optimization", CompanyId = 10, ProjectId = 1 },
            new WorkTask { Id = 20, Title = "Database Indexing", CompanyId = 10, ProjectId = 1 }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task StartAndGetActiveTimers_ShouldSupportConcurrentTimers()
    {
        // Arrange
        var controller = new TimesheetsController(_context, _tenantService, _excelService);

        // Act - Start timer for Task 10
        var start1 = await controller.StartTimer(new StartTimerRequest(10, "Working on API")) as OkObjectResult;
        start1.Should().NotBeNull();

        // Act - Start timer concurrently for Task 20
        var start2 = await controller.StartTimer(new StartTimerRequest(20, "Working on DB")) as OkObjectResult;
        start2.Should().NotBeNull();

        // Act - Query active timers
        var result = await controller.GetActiveTimers() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<ActiveTimerDto>;
        data.Should().NotBeNull();
        data!.Count.Should().Be(2);
        data.Any(t => t.TaskId == 10).Should().BeTrue();
        data.Any(t => t.TaskId == 20).Should().BeTrue();
    }

    [Fact]
    public async Task StopTimer_ShouldCalculateDurationAndCloseSession()
    {
        // Arrange
        var controller = new TimesheetsController(_context, _tenantService, _excelService);
        var session = new WorkSession
        {
            Id = 55,
            TaskId = 10,
            UserId = "user-1",
            StartTime = DateTimeOffset.UtcNow.AddMinutes(-30),
            EndTime = null,
            Duration = 0
        };
        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await controller.StopTimer(55) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var updated = await _context.Sessions.FindAsync(55);
        updated!.EndTime.Should().NotBeNull();
        updated.Duration.Should().BeGreaterThan(1700); // ~1800 seconds
    }

    [Fact]
    public async Task ClosedXmlExportService_ShouldGenerateValid3SheetWorkbook()
    {
        // Arrange - Seed past completed sessions
        _context.Sessions.AddRange(
            new WorkSession
            {
                Id = 101,
                TaskId = 10,
                UserId = "user-1",
                StartTime = DateTimeOffset.UtcNow.AddDays(-1),
                EndTime = DateTimeOffset.UtcNow.AddDays(-1).AddHours(4),
                Duration = 14400, // 4 hours
                Notes = "Sesi 1"
            },
            new WorkSession
            {
                Id = 102,
                TaskId = 20,
                UserId = "user-2",
                StartTime = DateTimeOffset.UtcNow.AddDays(-1),
                EndTime = DateTimeOffset.UtcNow.AddDays(-1).AddHours(8),
                Duration = 28800, // 8 hours (1 Man-Day)
                Notes = "Sesi 2"
            }
        );
        await _context.SaveChangesAsync();

        var filter = new TimesheetExportFilter(null, null, null, null);

        // Act
        var excelBytes = await _excelService.GenerateTimesheetExcelAsync(filter, 10);

        // Assert
        excelBytes.Should().NotBeNull();
        excelBytes.Length.Should().BeGreaterThan(0);

        using var ms = new MemoryStream(excelBytes);
        using var workbook = new XLWorkbook(ms);

        workbook.Worksheets.Count.Should().Be(3);
        workbook.Worksheets.Contains("Rincian Sesi Harian").Should().BeTrue();
        workbook.Worksheets.Contains("Rekapitulasi Proyek").Should().BeTrue();
        workbook.Worksheets.Contains("Kontribusi Anggota").Should().BeTrue();

        var wsDaily = workbook.Worksheet("Rincian Sesi Harian");
        wsDaily.Cell(3, 1).GetString().Should().Be("No");
        wsDaily.Cell(3, 3).GetString().Should().Be("Tugas");
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

using ClosedXML.Excel;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class CompanyTimesheetExportServiceTests
{
    private readonly AppDbContext _context;
    private readonly ClosedXmlCompanyTimesheetExportService _service;

    public CompanyTimesheetExportServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        // Seed Company, Users, Tasks, Sessions, Attendance
        var company = new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" };
        _context.Companies.Add(company);

        var user = new AppUser { Id = "syafix", Email = "syafix@elistec.com", FullName = "Syafix Said", UserName = "Syafix", CompanyId = 10, IsApproved = true };
        _context.Users.Add(user);

        var period = new TimesheetPeriod
        {
            Id = 1,
            CompanyId = 10,
            PeriodCode = "09/26",
            Name = "September 2026",
            StartDate = new DateOnly(2026, 9, 3),
            EndDate = new DateOnly(2026, 9, 7),
            WorkingDaysCount = 3
        };
        _context.TimesheetPeriods.Add(period);

        var project = new Project { Id = 1, Name = "Integrasi TCES TICS", CompanyId = 10 };
        _context.Projects.Add(project);

        var task = new WorkTask { Id = 836, Title = "Update Draft BRD (BA) - Update", ProjectId = 1, CompanyId = 10 };
        _context.Tasks.Add(task);

        // Friday 2026-09-04
        _context.Sessions.Add(new WorkSession
        {
            Id = 1,
            TaskId = 836,
            UserId = "syafix",
            StartTime = new DateTimeOffset(2026, 9, 4, 8, 0, 0, TimeSpan.FromHours(7)),
            EndTime = new DateTimeOffset(2026, 9, 4, 10, 0, 0, TimeSpan.FromHours(7)),
            Duration = 7200
        });

        // Attendance on 2026-09-04
        _context.Attendances.Add(new Attendance
        {
            UserId = "syafix",
            Date = new DateOnly(2026, 9, 4),
            ClockIn = new DateTimeOffset(2026, 9, 4, 8, 0, 0, TimeSpan.FromHours(7)),
            ClockOut = new DateTimeOffset(2026, 9, 4, 17, 10, 0, TimeSpan.FromHours(7)),
            WorkLocation = Domain.Enums.WorkLocation.WFO
        });

        _context.SaveChanges();

        _service = new ClosedXmlCompanyTimesheetExportService(_context);
    }

    [Fact]
    public async Task ExportUserTimesheet_ShouldGenerateValidExcel_WithMetadataAndFormulas()
    {
        var bytes = await _service.ExportUserTimesheetAsync(10, 1, "syafix");
        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(0);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        var ws = workbook.Worksheet(1);
        ws.Cell("B4").GetString().Should().Contain("3 DAYS");
        ws.Cell("B5").GetString().Should().Be("Syafix Said");

        // Verify task row on row 8
        ws.Cell("A8").GetString().Should().Be("TSK-0836");
        ws.Cell("C8").GetDouble().Should().Be(2.0);
        ws.Cell("D8").FormulaA1.Should().Be("IF(C8=\"\",\"\",C8/8)");

        // Verify weekend row (Saturday 2026-09-05) exists
        var foundWeekend = false;
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 8;
        for (int r = 8; r <= lastRow; r++)
        {
            if (ws.Cell(r, 2).GetString().Contains("Hari Libur Akhir Pekan (Sabtu)"))
            {
                foundWeekend = true;
                ws.Cell(r, 3).GetDouble().Should().Be(0.0);
                ws.Cell(r, 6).GetString().Should().Be("-");
                break;
            }
        }
        foundWeekend.Should().BeTrue();
    }

    [Fact]
    public async Task ExportBulkCompanyTimesheetsZip_ShouldProduceZipWithEntries()
    {
        var zipBytes = await _service.ExportBulkCompanyTimesheetsZipAsync(10, 1);
        zipBytes.Should().NotBeNull();
        zipBytes.Length.Should().BeGreaterThan(0);

        using var ms = new MemoryStream(zipBytes);
        using var archive = new System.IO.Compression.ZipArchive(ms);
        archive.Entries.Should().HaveCount(1);
        archive.Entries[0].Name.Should().Contain("Syafix Said");
    }
}

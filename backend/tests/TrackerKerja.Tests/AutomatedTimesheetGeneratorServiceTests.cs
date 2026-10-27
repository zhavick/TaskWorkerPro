using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class AutomatedTimesheetGeneratorServiceTests
{
    private readonly AppDbContext _context;
    private readonly AutomatedTimesheetGeneratorService _service;

    public AutomatedTimesheetGeneratorServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        // Seed Company, Users, Tasks, Period
        var company = new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" };
        _context.Companies.Add(company);

        var user = new AppUser
        {
            Id = "syafix",
            Email = "syafix@elistec.com",
            FullName = "Syafix Said",
            UserName = "Syafix",
            CompanyId = 10,
            IsApproved = true
        };
        _context.Users.Add(user);

        // Period from Thursday 2026-09-03 to Monday 2026-09-07 (3 working days: Thu, Fri, Mon)
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

        _context.SaveChanges();

        _service = new AutomatedTimesheetGeneratorService(_context);
    }

    [Fact]
    public async Task GenerateTimesheets_WithSingleTask_ShouldAllocate8Hours_AndCreateAttendance()
    {
        var task = new WorkTask
        {
            Id = 101,
            Title = "Task Tunggal",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Medium,
            StartDate = new DateTimeOffset(2026, 9, 3, 0, 0, 0, TimeSpan.Zero),
            DueDate = new DateTimeOffset(2026, 9, 7, 0, 0, 0, TimeSpan.Zero)
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(
            CompanyId: 10,
            PeriodId: 1,
            UserId: "syafix",
            Mode: "Overwrite"
        );

        var result = await _service.GenerateTimesheetsAsync(request, 10);

        result.Success.Should().BeTrue();
        result.WorkingDaysCount.Should().Be(3); // Thu, Fri, Mon
        result.UsersProcessedCount.Should().Be(1);

        // Verify sessions per working day
        var sessions = await _context.Sessions.Where(s => s.UserId == "syafix").ToListAsync();
        sessions.Should().NotBeEmpty();

        // Group by Date: Thu 3, Fri 4, Mon 7
        var dates = sessions.Select(s => DateOnly.FromDateTime(s.StartTime.Date)).Distinct().OrderBy(d => d).ToList();
        dates.Should().Equal(new DateOnly(2026, 9, 3), new DateOnly(2026, 9, 4), new DateOnly(2026, 9, 7));

        // Each working day must have exactly 28,800 seconds (8.0 hours)
        foreach (var d in dates)
        {
            var daySecs = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.Date) == d).Sum(s => s.Duration);
            daySecs.Should().Be(28800);
        }

        // Attendance records created for all 3 working days
        var attendances = await _context.Attendances.Where(a => a.UserId == "syafix").ToListAsync();
        attendances.Should().HaveCount(3);
        attendances.All(a => a.WorkLocation == WorkLocation.WFO).Should().BeTrue();
    }

    [Fact]
    public async Task GenerateTimesheets_WithMultipleTasks_ShouldAllocateProportionallyByPriority_SummingTo8Hours()
    {
        // 2 tasks: Critical (weight 4) and Low (weight 1)
        var taskCritical = new WorkTask
        {
            Id = 201,
            Title = "Task Critical",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Critical,
            StartDate = new DateTimeOffset(2026, 9, 3, 0, 0, 0, TimeSpan.Zero),
            DueDate = new DateTimeOffset(2026, 9, 7, 0, 0, 0, TimeSpan.Zero)
        };
        var taskLow = new WorkTask
        {
            Id = 202,
            Title = "Task Low",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Low,
            StartDate = new DateTimeOffset(2026, 9, 3, 0, 0, 0, TimeSpan.Zero),
            DueDate = new DateTimeOffset(2026, 9, 7, 0, 0, 0, TimeSpan.Zero)
        };
        _context.Tasks.AddRange(taskCritical, taskLow);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(
            CompanyId: 10,
            PeriodId: 1,
            UserId: "syafix",
            Mode: "Overwrite"
        );

        var result = await _service.GenerateTimesheetsAsync(request, 10);
        result.Success.Should().BeTrue();

        var sessions = await _context.Sessions.Where(s => s.UserId == "syafix").ToListAsync();

        // Check for Thursday 2026-09-03
        var thuSessions = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.Date) == new DateOnly(2026, 9, 3)).ToList();
        thuSessions.Sum(s => s.Duration).Should().Be(28800);

        // Urgent task should have greater duration than Low task
        var urgentDuration = thuSessions.Where(s => s.TaskId == 201).Sum(s => s.Duration);
        var lowDuration = thuSessions.Where(s => s.TaskId == 202).Sum(s => s.Duration);

        urgentDuration.Should().BeGreaterThan(lowDuration);
    }

    [Fact]
    public async Task GenerateTimesheets_ShouldSkipWeekends()
    {
        var task = new WorkTask
        {
            Id = 301,
            Title = "Tugas Harian",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Medium,
            StartDate = new DateOnly(2026, 9, 1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 9, 30).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(
            CompanyId: 10,
            PeriodId: 1,
            UserId: "syafix",
            Mode: "Overwrite"
        );

        await _service.GenerateTimesheetsAsync(request, 10);

        var sessions = await _context.Sessions.Where(s => s.UserId == "syafix").ToListAsync();
        // Saturday 2026-09-05 and Sunday 2026-09-06 should NOT have sessions
        sessions.Any(s => s.StartTime.DayOfWeek == DayOfWeek.Saturday).Should().BeFalse();
        sessions.Any(s => s.StartTime.DayOfWeek == DayOfWeek.Sunday).Should().BeFalse();
    }

    [Fact]
    public async Task GenerateTimesheets_EndToEnd_ShouldExportToValidElistecExcel()
    {
        // 1. Setup Tasks
        var task1 = new WorkTask
        {
            Id = 501,
            Title = "Implementasi Backend API",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.High,
            StartDate = new DateOnly(2026, 9, 3).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 9, 4).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        var task2 = new WorkTask
        {
            Id = 502,
            Title = "Review Security & Auth",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Medium,
            StartDate = new DateOnly(2026, 9, 3).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 9, 4).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        _context.Tasks.AddRange(task1, task2);
        await _context.SaveChangesAsync();

        // 2. Auto Generate
        var request = new AutoGenerateTimesheetRequest(10, 1, "syafix", "Overwrite");
        var genResult = await _service.GenerateTimesheetsAsync(request, 10);
        genResult.Success.Should().BeTrue();

        // 3. Export to Excel using ClosedXmlCompanyTimesheetExportService
        var exportService = new ClosedXmlCompanyTimesheetExportService(_context);
        var bytes = await exportService.ExportUserTimesheetAsync(10, 1, "syafix");
        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(0);

        // 4. Save and inspect
        Directory.CreateDirectory("test-results");
        var outputPath = Path.Combine("test-results", "auto_generated_elistec_timesheet.xlsx");
        await File.WriteAllBytesAsync(outputPath, bytes);

        using var ms = new MemoryStream(bytes);
        using var workbook = new ClosedXML.Excel.XLWorkbook(ms);
        var ws = workbook.Worksheet(1);

        ws.Cell("B4").GetString().Should().Contain("3 DAYS");
        ws.Cell("B5").GetString().Should().Be("Syafix Said");

        // Verify that there are sessions generated
        var row8 = ws.Cell("A8").GetString();
        row8.Should().StartWith("TSK-");
    }

    [Fact]
    public async Task GenerateTimesheets_WithEmptyTimesheetTasks_ShouldTakeAndGenerateAllEmptyTasks()
    {
        // 3 tasks with empty timesheet (no sessions) and past dates
        var emptyTask1 = new WorkTask
        {
            Id = 601,
            Title = "Task Kosong 1",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.High,
            StartDate = new DateOnly(2026, 8, 1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 8, 5).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        var emptyTask2 = new WorkTask
        {
            Id = 602,
            Title = "Task Kosong 2",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Medium,
            StartDate = new DateOnly(2026, 8, 6).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 8, 10).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        var emptyTask3 = new WorkTask
        {
            Id = 603,
            Title = "Task Kosong 3",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Low,
            StartDate = new DateOnly(2026, 8, 11).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 8, 15).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        _context.Tasks.AddRange(emptyTask1, emptyTask2, emptyTask3);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(10, 1, "syafix", "Overwrite");
        var result = await _service.GenerateTimesheetsAsync(request, 10);

        result.Success.Should().BeTrue();

        // Verify that all 3 empty tasks now have generated sessions
        var taskIdsWithSessions = await _context.Sessions
            .Where(s => s.UserId == "syafix")
            .Select(s => s.TaskId)
            .Distinct()
            .ToListAsync();

        taskIdsWithSessions.Should().Contain(601);
        taskIdsWithSessions.Should().Contain(602);
        taskIdsWithSessions.Should().Contain(603);
    }

    [Fact]
    public async Task GenerateTimesheets_WithCrossCompanyTasksAssignedToUser_ShouldSynchronizeAndGenerate()
    {
        // Task assigned to user in company 10, but task's CompanyId is 99
        var crossTask = new WorkTask
        {
            Id = 701,
            Title = "Task Cross Company",
            CompanyId = 99,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.High,
            StartDate = new DateOnly(2026, 9, 3).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            DueDate = new DateOnly(2026, 9, 7).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc)
        };
        _context.Tasks.Add(crossTask);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(10, 1, "syafix", "Overwrite");
        var result = await _service.GenerateTimesheetsAsync(request, 10);

        result.Success.Should().BeTrue();

        // Check task CompanyId was synced to 10
        var updatedTask = await _context.Tasks.FindAsync(701);
        updatedTask!.CompanyId.Should().Be(10);

        // Check sessions generated for this task
        var sessions = await _context.Sessions.Where(s => s.TaskId == 701).ToListAsync();
        sessions.Should().NotBeEmpty();
    }
}

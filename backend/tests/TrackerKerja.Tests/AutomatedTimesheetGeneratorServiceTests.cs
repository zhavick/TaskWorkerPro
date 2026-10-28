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
    public async Task GenerateTimesheets_WithSingleTask_ShouldAllocate8Hours_ForSingleDayOnly_AndSingleSession()
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
        result.UsersProcessedCount.Should().Be(1);
        result.TotalHoursGenerated.Should().Be(8.0); // Only 1 task = 1 day = 8 hours

        // Verify sessions: exactly 1 day and 1 session (not split into morning/afternoon)
        var sessions = await _context.Sessions.Where(s => s.UserId == "syafix").ToListAsync();
        sessions.Should().HaveCount(1);
        sessions[0].Duration.Should().Be(28800);
        sessions[0].TaskId.Should().Be(101);

        // Group by Date: only 1 day (Thu 2026-09-03)
        var dates = sessions.Select(s => DateOnly.FromDateTime(s.StartTime.Date)).Distinct().ToList();
        dates.Should().Equal(new DateOnly(2026, 9, 3));

        // Attendance records created for only that 1 working day
        var attendances = await _context.Attendances.Where(a => a.UserId == "syafix").ToListAsync();
        attendances.Should().HaveCount(1);
        attendances[0].Date.Should().Be(new DateOnly(2026, 9, 3));
        attendances[0].WorkLocation.Should().Be(WorkLocation.WFO);
    }

    [Fact]
    public async Task GenerateTimesheets_WithTwoTasks_ShouldGenerateTwoDaysOnly_WithoutArtificialRepetition()
    {
        var task1 = new WorkTask
        {
            Id = 102,
            Title = "Task Pertama",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.High,
            StartDate = new DateTimeOffset(2026, 9, 3, 0, 0, 0, TimeSpan.Zero),
            DueDate = new DateTimeOffset(2026, 9, 7, 0, 0, 0, TimeSpan.Zero)
        };
        var task2 = new WorkTask
        {
            Id = 103,
            Title = "Task Kedua",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Medium,
            StartDate = new DateTimeOffset(2026, 9, 4, 0, 0, 0, TimeSpan.Zero),
            DueDate = new DateTimeOffset(2026, 9, 7, 0, 0, 0, TimeSpan.Zero)
        };
        _context.Tasks.AddRange(task1, task2);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(10, 1, "syafix", "Overwrite");
        var result = await _service.GenerateTimesheetsAsync(request, 10);

        result.Success.Should().BeTrue();
        result.TotalHoursGenerated.Should().Be(16.0); // 2 tasks = 2 days = 16 hours

        var sessions = await _context.Sessions.Where(s => s.UserId == "syafix").ToListAsync();
        sessions.Should().HaveCount(2); // 1 session per task per day
        sessions.All(s => s.Duration == 28800).Should().BeTrue();

        var dates = sessions.Select(s => DateOnly.FromDateTime(s.StartTime.Date)).Distinct().OrderBy(d => d).ToList();
        dates.Should().Equal(new DateOnly(2026, 9, 3), new DateOnly(2026, 9, 4));

        // Monday 2026-09-07 should NOT have any sessions or attendances
        dates.Should().NotContain(new DateOnly(2026, 9, 7));

        var attendances = await _context.Attendances.Where(a => a.UserId == "syafix").ToListAsync();
        attendances.Should().HaveCount(2);
    }

    [Fact]
    public async Task GenerateTimesheets_WithMultipleTasks_ShouldAllocateOneDayPerTask_SummingTo8HoursEach()
    {
        // 2 tasks: Critical and Low
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
            StartDate = new DateTimeOffset(2026, 9, 4, 0, 0, 0, TimeSpan.Zero),
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
        result.TotalHoursGenerated.Should().Be(16.0);

        var sessions = await _context.Sessions.Where(s => s.UserId == "syafix").ToListAsync();
        sessions.Should().HaveCount(2);

        // Check for Thursday 2026-09-03
        var thuSessions = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.Date) == new DateOnly(2026, 9, 3)).ToList();
        thuSessions.Should().HaveCount(1);
        thuSessions[0].Duration.Should().Be(28800);
        thuSessions[0].TaskId.Should().Be(201);

        // Check for Friday 2026-09-04
        var friSessions = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.Date) == new DateOnly(2026, 9, 4)).ToList();
        friSessions.Should().HaveCount(1);
        friSessions[0].Duration.Should().Be(28800);
        friSessions[0].TaskId.Should().Be(202);
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
            StartDate = new DateOnly(2026, 9, 4).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
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

    [Fact]
    public async Task GenerateTimesheets_TasksShouldMatchTheirExactDates_AndConsolidateMultipleOccurrencesInDay()
    {
        // 3 tasks with distinct specific dates in September 2026:
        // Task A on 2026-09-03 (Thu)
        // Task B on 2026-09-04 (Fri)
        // Task C on 2026-09-07 (Mon)
        var taskA1 = new WorkTask
        {
            Id = 801,
            Title = "Task A Pertemuan Kickoff",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.High,
            StartDate = new DateTimeOffset(2026, 9, 3, 8, 0, 0, TimeSpan.FromHours(7)),
            DueDate = new DateTimeOffset(2026, 9, 3, 17, 0, 0, TimeSpan.FromHours(7))
        };
        // Duplicate Task A on same day 2026-09-03
        var taskA2 = new WorkTask
        {
            Id = 802,
            Title = "Task A Pertemuan Kickoff",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.High,
            StartDate = new DateTimeOffset(2026, 9, 3, 10, 0, 0, TimeSpan.FromHours(7)),
            DueDate = new DateTimeOffset(2026, 9, 3, 15, 0, 0, TimeSpan.FromHours(7))
        };
        var taskB = new WorkTask
        {
            Id = 803,
            Title = "Task B Konfigurasi Router",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "syafix",
            Priority = TaskPriority.Medium,
            StartDate = new DateTimeOffset(2026, 9, 7, 8, 0, 0, TimeSpan.FromHours(7)), // Scheduled for Monday Sep 7, NOT Sep 4!
            DueDate = new DateTimeOffset(2026, 9, 7, 17, 0, 0, TimeSpan.FromHours(7))
        };

        _context.Tasks.AddRange(taskA1, taskA2, taskB);
        await _context.SaveChangesAsync();

        var request = new AutoGenerateTimesheetRequest(10, 1, "syafix", "Overwrite");
        var result = await _service.GenerateTimesheetsAsync(request, 10);

        result.Success.Should().BeTrue();

        var sessions = await _context.Sessions
            .Include(s => s.Task)
            .Where(s => s.UserId == "syafix" && (s.TaskId == 801 || s.TaskId == 802 || s.TaskId == 803))
            .ToListAsync();

        // Task A was scheduled on Sep 3
        var sep3Sessions = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.ToOffset(TimeSpan.FromHours(7)).DateTime) == new DateOnly(2026, 9, 3)).ToList();
        sep3Sessions.Should().NotBeEmpty();
        sep3Sessions.Sum(s => s.Duration).Should().Be(28800); // exactly 8 hours on Sep 3

        // Task B was scheduled on Sep 7, so it MUST be on Sep 7, NOT Sep 4!
        var sep7Sessions = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.ToOffset(TimeSpan.FromHours(7)).DateTime) == new DateOnly(2026, 9, 7)).ToList();
        sep7Sessions.Should().HaveCount(1);
        sep7Sessions[0].Task.Title.Should().Be("Task B Konfigurasi Router");
        sep7Sessions[0].Duration.Should().Be(28800);

        // Friday Sep 4 should NOT have Task B mistakenly placed on it
        var sep4Sessions = sessions.Where(s => DateOnly.FromDateTime(s.StartTime.ToOffset(TimeSpan.FromHours(7)).DateTime) == new DateOnly(2026, 9, 4)).ToList();
        sep4Sessions.Should().BeEmpty();
    }
}

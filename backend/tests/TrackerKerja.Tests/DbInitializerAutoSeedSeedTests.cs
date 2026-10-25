using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.Tests;

public class DbInitializerAutoSeedSeedTests
{
    [Fact]
    public async Task SeedAsync_WhenDatabaseIsEmpty_ShouldSeedTasksAndAttendances()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new AppDbContext(options);

        var importService = new TaskExcelImportService(context);

        // Run SeedAsync
        await DbInitializer.SeedAsync(context, importService);

        // Verify Users
        var users = await context.Users.ToListAsync();
        Assert.True(users.Count >= 8, $"Expected at least 8 users, but found {users.Count}");
        Assert.Contains(users, u => u.Email == "admin@trackerkerja.local");
        Assert.Contains(users, u => u.Email == "syafix.said@elistec.com");

        // Verify Projects
        var projects = await context.Projects.ToListAsync();
        Assert.True(projects.Count >= 10, $"Expected >= 10 projects, but found {projects.Count}");

        // Verify Tasks
        var tasks = await context.Tasks.ToListAsync();
        Assert.True(tasks.Count >= 400, $"Expected >= 400 tasks, but found {tasks.Count}");

        // Verify Attendances
        var attendances = await context.Attendances.ToListAsync();
        Assert.True(attendances.Count >= 400, $"Expected >= 400 attendances, but found {attendances.Count}");

        // Verify Attendance date range & time constraints
        foreach (var att in attendances)
        {
            // Must be between Aug 1, 2026 and Oct 25, 2026
            Assert.True(att.Date >= new DateOnly(2026, 8, 1));
            Assert.True(att.Date <= new DateOnly(2026, 10, 25));

            // Must NOT be weekend
            Assert.NotEqual(DayOfWeek.Saturday, att.Date.DayOfWeek);
            Assert.NotEqual(DayOfWeek.Sunday, att.Date.DayOfWeek);

            // ClockIn must be between 07:30 and 08:30 (time of day)
            Assert.NotNull(att.ClockIn);
            var inTime = att.ClockIn.Value.TimeOfDay;
            Assert.True(inTime >= new TimeSpan(7, 30, 0) && inTime <= new TimeSpan(8, 30, 59),
                $"ClockIn {inTime} outside 07:30 - 08:30");

            // ClockOut must be between 17:00 and 17:55 (time of day)
            Assert.NotNull(att.ClockOut);
            var outTime = att.ClockOut.Value.TimeOfDay;
            Assert.True(outTime >= new TimeSpan(17, 0, 0) && outTime <= new TimeSpan(17, 55, 59),
                $"ClockOut {outTime} outside 17:00 - 17:55");

            // Total hours must be positive and >= 8 hours
            Assert.True(att.TotalHours >= 8.0 && att.TotalHours <= 11.0,
                $"TotalHours {att.TotalHours} unexpected");

            // Work location must be WFO or WFH
            Assert.True(att.WorkLocation == WorkLocation.WFO || att.WorkLocation == WorkLocation.WFH);
        }

        // Idempotency check: running SeedAsync again should not duplicate tasks or attendances
        int initialTaskCount = tasks.Count;
        int initialAttendanceCount = attendances.Count;

        await DbInitializer.SeedAsync(context, importService);

        int postTaskCount = await context.Tasks.CountAsync();
        int postAttendanceCount = await context.Attendances.CountAsync();

        Assert.Equal(initialTaskCount, postTaskCount);
        Assert.Equal(initialAttendanceCount, postAttendanceCount);
    }
}

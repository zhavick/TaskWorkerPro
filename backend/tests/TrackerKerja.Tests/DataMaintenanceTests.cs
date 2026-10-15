using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class DataMaintenanceTests
{
    private AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);

        // 1. Users: 2 Admins, 2 Non-Admins
        var admin1 = new AppUser { Id = "admin-1", FullName = "Admin Wahana", Email = "admin@trackerkerja.local", JobTitle = "System Administrator" };
        var admin2 = new AppUser { Id = "admin-2", FullName = "Lead Architect", Email = "arch@trackerkerja.local", JobTitle = "Enterprise Architect" };
        var member1 = new AppUser { Id = "member-1", FullName = "Budi Staff", Email = "budi@staff.com", JobTitle = "Frontend Developer" };
        var member2 = new AppUser { Id = "member-2", FullName = "Dewi QA", Email = "dewi@staff.com", JobTitle = "Quality Assurance" };
        context.Users.AddRange(admin1, admin2, member1, member2);

        // 2. Master Data (Should be preserved)
        context.MasterPriorities.Add(new MasterPriority { Id = 1, Name = "Tinggi", Color = "#EF4444" });
        context.MasterStatuses.Add(new MasterStatus { Id = 1, Name = "Todo", Color = "#6366F1" });
        context.Announcements.Add(new Announcement { Id = 1, Title = "Pengumuman Kantor", Content = "Libur Nasional" });

        // 3. Operational Data (Should be purged)
        var proj = new Project { Id = 10, Name = "Proyek Mobile Apps" };
        context.Projects.Add(proj);

        var task1 = new WorkTask { Id = 101, Title = "Tugas 1", ProjectId = 10, AssignedToUserId = "member-1" };
        var task2 = new WorkTask { Id = 102, Title = "Tugas 2", ProjectId = 10, AssignedToUserId = "member-2" };
        context.Tasks.AddRange(task1, task2);

        var session1 = new WorkSession { Id = 501, TaskId = 101, UserId = "member-1", Duration = 3600 };
        context.Sessions.Add(session1);

        var note1 = new WorkNote { Id = 701, Title = "Catatan Sprint", ContentHtml = "<p>Catatan...</p>", AuthorUserId = "member-1" };
        context.Notes.Add(note1);

        var att1 = new Attendance { Id = 801, UserId = "member-1", Date = DateOnly.FromDateTime(DateTime.UtcNow) };
        context.Attendances.Add(att1);

        context.SaveChanges();
        return context;
    }

    private static SettingsController CreateController(AppDbContext context, string currentUserId = "admin-1")
    {
        var controller = new SettingsController(context);
        var httpContext = new DefaultHttpContext();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, currentUserId),
            new Claim(ClaimTypes.Role, "Administrator"),
            new Claim(ClaimTypes.Email, "admin@trackerkerja.local")
        };
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        return controller;
    }

    private static JsonElement ToJsonElement(object? value)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(value, options);
        return JsonDocument.Parse(json).RootElement;
    }

    [Fact]
    public async Task GetMaintenanceStats_ReturnsAccurateCounts()
    {
        using var context = CreateInMemoryContext();
        var controller = CreateController(context);

        var result = await controller.GetMaintenanceStats();
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");

        Assert.Equal(2, data.GetProperty("tasksCount").GetInt32());
        Assert.Equal(1, data.GetProperty("projectsCount").GetInt32());
        Assert.Equal(1, data.GetProperty("sessionsCount").GetInt32());
        Assert.Equal(1, data.GetProperty("attendancesCount").GetInt32());
        Assert.Equal(1, data.GetProperty("notesCount").GetInt32());
        Assert.Equal(2, data.GetProperty("nonAdminUsersCount").GetInt32());
        Assert.Equal(2, data.GetProperty("adminUsersCount").GetInt32());
        Assert.Equal(1, data.GetProperty("announcementsCount").GetInt32());
        Assert.True(data.GetProperty("masterDataItemsCount").GetInt32() >= 2);
    }

    [Fact]
    public async Task PurgeOperationalData_FullReset_WipesOperationalDataAndPreservesAdminsMasterDataAnnouncements()
    {
        using var context = CreateInMemoryContext();
        var controller = CreateController(context);

        var request = new DataPurgeRequest(
            PurgeAll: true,
            PurgeTasks: false,
            PurgeProjects: false,
            PurgeAttendances: false,
            PurgeNotes: false,
            PurgeNonAdminUsers: false,
            PurgeAuditAndHistories: false,
            ConfirmationKeyword: "RESET-TOTAL"
        );

        var result = await controller.PurgeOperationalData(request);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());

        // Verify Operational Data is purged
        Assert.Equal(0, await context.Tasks.CountAsync());
        Assert.Equal(0, await context.Projects.CountAsync());
        Assert.Equal(0, await context.Sessions.CountAsync());
        Assert.Equal(0, await context.Attendances.CountAsync());
        Assert.Equal(0, await context.Notes.CountAsync());

        // Verify Non-Admins are purged
        var remainingUsers = await context.Users.ToListAsync();
        Assert.Equal(2, remainingUsers.Count);
        Assert.All(remainingUsers, u => Assert.Contains("admin", u.Id));

        // Verify Master Data & Announcements are preserved!
        Assert.Equal(1, await context.MasterPriorities.CountAsync());
        Assert.Equal(1, await context.MasterStatuses.CountAsync());
        Assert.Equal(1, await context.Announcements.CountAsync());
    }

    [Fact]
    public async Task PurgeOperationalData_InvalidKeyword_RejectsRequest()
    {
        using var context = CreateInMemoryContext();
        var controller = CreateController(context);

        var request = new DataPurgeRequest(
            PurgeAll: true,
            PurgeTasks: false,
            PurgeProjects: false,
            PurgeAttendances: false,
            PurgeNotes: false,
            PurgeNonAdminUsers: false,
            PurgeAuditAndHistories: false,
            ConfirmationKeyword: "WRONG-KEYWORD"
        );

        var result = await controller.PurgeOperationalData(request);
        var badResult = Assert.IsType<BadRequestObjectResult>(result);

        var root = ToJsonElement(badResult.Value);
        Assert.False(root.GetProperty("success").GetBoolean());

        // Ensure no data was deleted
        Assert.Equal(2, await context.Tasks.CountAsync());
    }

    [Fact]
    public async Task PurgeOperationalData_SelectivePurge_OnlyDeletesSelectedDomain()
    {
        using var context = CreateInMemoryContext();
        var controller = CreateController(context);

        var request = new DataPurgeRequest(
            PurgeAll: false,
            PurgeTasks: true,
            PurgeProjects: false,
            PurgeAttendances: false,
            PurgeNotes: false,
            PurgeNonAdminUsers: false,
            PurgeAuditAndHistories: false,
            ConfirmationKeyword: "KONFIRMASI"
        );

        var result = await controller.PurgeOperationalData(request);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());

        // Tasks and sessions are deleted
        Assert.Equal(0, await context.Tasks.CountAsync());
        Assert.Equal(0, await context.Sessions.CountAsync());

        // Projects, Notes, Users are still preserved
        Assert.Equal(1, await context.Projects.CountAsync());
        Assert.Equal(1, await context.Notes.CountAsync());
        Assert.Equal(4, await context.Users.CountAsync());
    }

    [Fact]
    public async Task PurgeOperationalData_FullResetWithComplexRelations_CleansUpSuccessfullyWithoutFKViolations()
    {
        using var context = CreateInMemoryContext();
        var controller = CreateController(context, currentUserId: "admin-1");

        // Add complex relational data
        var subtask = new WorkTask
        {
            Id = 103,
            Title = "Subtask 1",
            ProjectId = 10,
            ParentTaskId = 101,
            AssignedToUserId = "member-1"
        };
        context.Tasks.Add(subtask);

        var noteWithTask = await context.Notes.FirstAsync(n => n.Id == 701);
        noteWithTask.TaskId = 101;

        context.JsonHistories.Add(new JsonHistory { Id = 1, Name = "Test JSON", Content = "{}", TaskId = 101 });
        context.SqlHistories.Add(new SqlHistory { Id = 1, Name = "Test SQL", Content = "SELECT 1;", TaskId = 101 });
        context.DailyCheckIns.Add(new DailyCheckIn { Id = 1, UserId = "member-1", CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow) });
        context.MasterBadges.Add(new MasterBadge { Id = 1, Code = "FIRST_TASK", Name = "First Task" });
        context.UserBadges.Add(new UserBadge { Id = 1, UserId = "member-1", BadgeId = 1 });

        // Non-admin created announcement
        var announcement = await context.Announcements.FirstAsync(a => a.Id == 1);
        announcement.CreatedByUserId = "member-1";

        await context.SaveChangesAsync();

        var request = new DataPurgeRequest(
            PurgeAll: false,
            PurgeTasks: false,
            PurgeProjects: false,
            PurgeAttendances: false,
            PurgeNotes: false,
            PurgeNonAdminUsers: false,
            PurgeAuditAndHistories: false,
            ConfirmationKeyword: "RESET-TOTAL",
            PurgeAllOperational: true // Sent by frontend for full reset
        );

        var result = await controller.PurgeOperationalData(request);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());

        // Tasks, Subtasks, Sessions, Notes, Histories, Check-ins are deleted
        Assert.Equal(0, await context.Tasks.CountAsync());
        Assert.Equal(0, await context.Sessions.CountAsync());
        Assert.Equal(0, await context.Notes.CountAsync());
        Assert.Equal(0, await context.JsonHistories.CountAsync());
        Assert.Equal(0, await context.SqlHistories.CountAsync());
        Assert.Equal(0, await context.DailyCheckIns.CountAsync());
        Assert.Equal(0, await context.UserBadges.CountAsync());

        // Non-admin users are deleted
        var remainingUsers = await context.Users.ToListAsync();
        Assert.Equal(2, remainingUsers.Count);
        Assert.All(remainingUsers, u => Assert.Contains("admin", u.Id));

        // Announcement is preserved AND reassigned to administrator
        var preservedAnnouncement = await context.Announcements.FirstOrDefaultAsync(a => a.Id == 1);
        Assert.NotNull(preservedAnnouncement);
        Assert.Equal("admin-1", preservedAnnouncement.CreatedByUserId);

        // Master badge is preserved
        Assert.Equal(1, await context.MasterBadges.CountAsync());
    }

    [Fact]
    public async Task GetMaintenanceStats_ReturnsFrontendFormattedPropertyNames()
    {
        using var context = CreateInMemoryContext();
        var controller = CreateController(context);

        // Add a subtask and gamification record
        context.Tasks.Add(new WorkTask { Id = 103, Title = "Subtask", ParentTaskId = 101 });
        context.DailyCheckIns.Add(new DailyCheckIn { Id = 1, UserId = "member-1", CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow) });
        await context.SaveChangesAsync();

        var result = await controller.GetMaintenanceStats();
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");

        // Check new frontend property names
        Assert.Equal(2, data.GetProperty("totalTasks").GetInt32());
        Assert.Equal(1, data.GetProperty("totalSubtasks").GetInt32());
        Assert.Equal(1, data.GetProperty("totalProjects").GetInt32());
        Assert.Equal(1, data.GetProperty("totalWorkSessions").GetInt32());
        Assert.Equal(1, data.GetProperty("totalAttendances").GetInt32());
        Assert.Equal(1, data.GetProperty("totalNotes").GetInt32());
        Assert.Equal(2, data.GetProperty("totalNonAdminUsers").GetInt32());
        Assert.Equal(1, data.GetProperty("totalGamificationRecords").GetInt32());
        Assert.Equal(2, data.GetProperty("protectedAdminUsers").GetInt32());
        Assert.Equal(1, data.GetProperty("protectedAnnouncements").GetInt32());
        Assert.True(data.GetProperty("protectedMasterDataItems").GetInt32() >= 2);
    }
}


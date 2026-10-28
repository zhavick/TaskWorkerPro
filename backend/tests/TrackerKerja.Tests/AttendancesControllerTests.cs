using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class AttendancesControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;
    private readonly AttendancesController _controller;

    public AttendancesControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(1, "TEST", "user-1", true);
        _context = new AppDbContext(options, _tenantService);
        _controller = new AttendancesController(_context, _tenantService);

        var company = new Company
        {
            Id = 1,
            Name = "PT Wahana Digital",
            Code = "WAHANA",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Companies.Add(company);

        var user1 = new AppUser
        {
            Id = "user-1",
            FullName = "Ahmad Developer",
            Email = "ahmad@wahana.com",
            JobTitle = "Tech Lead",
            CompanyId = 1,
            IsApproved = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        var user2 = new AppUser
        {
            Id = "user-2",
            FullName = "Budi QA",
            Email = "budi@wahana.com",
            JobTitle = "QA Specialist",
            CompanyId = 1,
            IsApproved = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Users.AddRange(user1, user2);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    private static JsonElement ToJsonElement(object? value)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles
        };
        var json = JsonSerializer.Serialize(value, options);
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    [Fact]
    public async Task GetTodayStatus_WhenNoRecord_ReturnsNotClockedIn()
    {
        var result = await _controller.GetTodayStatus();
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.False(data.GetProperty("hasClockedIn").GetBoolean());
        Assert.False(data.GetProperty("hasClockedOut").GetBoolean());
    }

    [Fact]
    public async Task ClockIn_And_ClockOut_WorksSuccessfully()
    {
        // 1. Clock In
        var clockInResult = await _controller.ClockIn(new ClockInRequest(WorkLocation.WFH, "Working remotely"));
        var okClockIn = Assert.IsType<OkObjectResult>(clockInResult);
        var inJson = ToJsonElement(okClockIn.Value);
        Assert.True(inJson.GetProperty("success").GetBoolean());

        // 2. Verify status
        var statusResult = await _controller.GetTodayStatus();
        var okStatus = Assert.IsType<OkObjectResult>(statusResult);
        var stJson = ToJsonElement(okStatus.Value);
        var statusData = stJson.GetProperty("data");
        Assert.True(statusData.GetProperty("hasClockedIn").GetBoolean());
        Assert.False(statusData.GetProperty("hasClockedOut").GetBoolean());
        Assert.Equal((int)WorkLocation.WFH, statusData.GetProperty("workLocation").GetInt32());

        // 3. Clock Out
        var clockOutResult = await _controller.ClockOut(new ClockOutRequest("Finished all sprints"));
        var okClockOut = Assert.IsType<OkObjectResult>(clockOutResult);
        var outJson = ToJsonElement(okClockOut.Value);
        Assert.True(outJson.GetProperty("success").GetBoolean());

        // 4. Verify status after clock out
        var finalStatusResult = await _controller.GetTodayStatus();
        var okFinal = Assert.IsType<OkObjectResult>(finalStatusResult);
        var finalJson = ToJsonElement(okFinal.Value);
        var finalStatus = finalJson.GetProperty("data");
        Assert.True(finalStatus.GetProperty("hasClockedIn").GetBoolean());
        Assert.True(finalStatus.GetProperty("hasClockedOut").GetBoolean());
        Assert.True(finalStatus.GetProperty("totalHours").GetDouble() >= 0.1);
    }

    [Fact]
    public async Task SubmitLeave_RecordsLeaveProperly()
    {
        var targetDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var result = await _controller.SubmitLeave(new SubmitLeaveRequest(targetDate, AttendanceType.Leave, "Cuti Tahunan", "Liburan keluarga"));
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        Assert.True(json.GetProperty("success").GetBoolean());

        var saved = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == "user-1" && a.Date == targetDate);
        Assert.NotNull(saved);
        Assert.Equal(AttendanceType.Leave, saved.Type);
        Assert.Equal("Cuti Tahunan", saved.LeaveReason);
    }

    [Fact]
    public async Task GetMonthlyTeamReconciliation_ReturnsAllTeamDataAndDailyMatrix()
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        // Seed an attendance for user-1 and user-2
        _context.Attendances.AddRange(
            new Attendance
            {
                UserId = "user-1",
                Date = today,
                Type = AttendanceType.Present,
                WorkLocation = WorkLocation.WFO,
                ClockIn = DateTimeOffset.UtcNow.AddHours(-8),
                ClockOut = DateTimeOffset.UtcNow,
                TotalHours = 8.0,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            },
            new Attendance
            {
                UserId = "user-2",
                Date = today,
                Type = AttendanceType.Sick,
                WorkLocation = WorkLocation.WFO,
                LeaveReason = "Demam tinggi",
                TotalHours = 0.0,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        var result = await _controller.GetMonthlyTeamReconciliation(now.Month, now.Year, 1);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var json = ToJsonElement(okResult.Value);
        Assert.True(json.GetProperty("success").GetBoolean());

        var report = json.GetProperty("data");
        Assert.Equal(now.Month, report.GetProperty("month").GetInt32());
        Assert.Equal(now.Year, report.GetProperty("year").GetInt32());
        Assert.Equal(2, report.GetProperty("totalTeamMembers").GetInt32());
        Assert.Equal(8.0, report.GetProperty("teamTotalHours").GetDouble());

        var members = report.GetProperty("members");
        Assert.Equal(2, members.GetArrayLength());
    }

    [Fact]
    public async Task ReconcileAttendance_And_CreateManualEntry_WorkProperly()
    {
        var targetDate = new DateOnly(2026, 10, 10);
        // 1. Manual Entry
        var manualRes = await _controller.CreateManualEntry(new ManualAttendanceEntryRequest(
            "user-2",
            targetDate,
            AttendanceType.Present,
            WorkLocation.WFO,
            new DateTimeOffset(2026, 10, 10, 8, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 10, 17, 0, 0, TimeSpan.Zero),
            null,
            "Manual input HR"
        ));
        var okManual = Assert.IsType<OkObjectResult>(manualRes);
        var manJson = ToJsonElement(okManual.Value);
        Assert.True(manJson.GetProperty("success").GetBoolean());

        var record = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == "user-2" && a.Date == targetDate);
        Assert.NotNull(record);
        Assert.Equal(9.0, record.TotalHours);

        // 2. Reconcile
        var reconcileRes = await _controller.ReconcileAttendance(record.Id, new ReconcileAttendanceRequest(
            record.Id,
            AttendanceType.Present,
            WorkLocation.WFH,
            new DateTimeOffset(2026, 10, 10, 8, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 10, 16, 30, 0, TimeSpan.Zero),
            null,
            "Koreksi jam pulang"
        ));
        var okReconcile = Assert.IsType<OkObjectResult>(reconcileRes);
        var recJson = ToJsonElement(okReconcile.Value);
        Assert.True(recJson.GetProperty("success").GetBoolean());

        var updated = await _context.Attendances.FindAsync(record.Id);
        Assert.NotNull(updated);
        Assert.Equal(WorkLocation.WFH, updated.WorkLocation);
        Assert.Equal(8.5, updated.TotalHours);
    }

    [Fact]
    public async Task CreateManualEntry_NonAdmin_EnforcesSelfOnly()
    {
        // Setup controller as non-admin regular user "user-1"
        var nonAdminTenant = new FakeTenantService(1, "TEST", "user-1", false);
        var nonAdminController = new AttendancesController(_context, nonAdminTenant);

        var targetDate = new DateOnly(2026, 11, 5);

        // Even if non-admin submits "user-2" in request body, it MUST be forced to "user-1"
        var manualRes = await nonAdminController.CreateManualEntry(new ManualAttendanceEntryRequest(
            "user-2",
            targetDate,
            AttendanceType.Present,
            WorkLocation.WFO,
            new DateTimeOffset(2026, 11, 5, 8, 30, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 5, 17, 30, 0, TimeSpan.Zero),
            null,
            "Non-admin manual entry"
        ));

        var okManual = Assert.IsType<OkObjectResult>(manualRes);
        var json = ToJsonElement(okManual.Value);
        Assert.True(json.GetProperty("success").GetBoolean());

        // Verify that record was created for "user-1" (self), NOT "user-2"
        var recordUser1 = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == "user-1" && a.Date == targetDate);
        Assert.NotNull(recordUser1);
        Assert.Equal(9.0, recordUser1.TotalHours);

        var recordUser2 = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == "user-2" && a.Date == targetDate);
        Assert.Null(recordUser2);
    }

    [Fact]
    public async Task GetReconciliation_NonAdmin_CanViewCompanyRecords()
    {
        // Arrange: non-admin controller
        var nonAdminTenant = new FakeTenantService(1, "TEST", "user-1", false);
        var nonAdminController = new AttendancesController(_context, nonAdminTenant);

        // Act: Non-admin calls reconciliation for team
        var result = await nonAdminController.GetReconciliation(date: new DateOnly(2026, 10, 20)) as OkObjectResult;

        // Assert: 200 OK
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task ReconcileAttendance_NonAdmin_UpdatingOtherUser_Returns403()
    {
        // Seed attendance for user-2
        var targetDate = new DateOnly(2026, 11, 10);
        var record = new Attendance
        {
            UserId = "user-2",
            Date = targetDate,
            Type = AttendanceType.Present,
            WorkLocation = WorkLocation.WFO,
            TotalHours = 7.0
        };
        _context.Attendances.Add(record);
        await _context.SaveChangesAsync();

        // Arrange: non-admin controller as "user-1"
        var nonAdminTenant = new FakeTenantService(1, "TEST", "user-1", false);
        var nonAdminController = new AttendancesController(_context, nonAdminTenant);

        // Act: tries to edit user-2's attendance
        var result = await nonAdminController.ReconcileAttendance(record.Id, new ReconcileAttendanceRequest(
            record.Id,
            AttendanceType.Leave,
            WorkLocation.WFH,
            null,
            null,
            "Cuti tahunan",
            "Catatan"
        )) as ObjectResult;

        // Assert: 403 Forbidden
        Assert.NotNull(result);
        Assert.Equal(403, result.StatusCode);
    }

    [Fact]
    public async Task ReconcileAttendance_NonAdmin_UpdatingOwnRecord_Returns200()
    {
        // Seed attendance for user-1
        var targetDate = new DateOnly(2026, 11, 11);
        var record = new Attendance
        {
            UserId = "user-1",
            Date = targetDate,
            Type = AttendanceType.Present,
            WorkLocation = WorkLocation.WFO,
            TotalHours = 7.0
        };
        _context.Attendances.Add(record);
        await _context.SaveChangesAsync();

        // Arrange: non-admin controller as "user-1"
        var nonAdminTenant = new FakeTenantService(1, "TEST", "user-1", false);
        var nonAdminController = new AttendancesController(_context, nonAdminTenant);

        // Act: edits own attendance
        var result = await nonAdminController.ReconcileAttendance(record.Id, new ReconcileAttendanceRequest(
            record.Id,
            AttendanceType.Leave,
            WorkLocation.WFH,
            null,
            null,
            "Izin keperluan keluarga",
            "Catatan pribadi"
        )) as OkObjectResult;

        // Assert: 200 OK
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task SyncFromTasks_WhenTasksExist_ShouldGenerateApprovedEightHoursAttendance()
    {
        // Arrange: User has active task
        var tzOffset = TimeSpan.FromHours(7);
        var targetDate = new DateOnly(2026, 9, 3); // Thursday
        var task = new WorkTask
        {
            Id = 555,
            Title = "Task Implementasi Dashboard",
            CompanyId = 1,
            AssignedToUserId = "user-1",
            StartDate = new DateTimeOffset(2026, 9, 3, 8, 0, 0, tzOffset),
            DueDate = new DateTimeOffset(2026, 9, 3, 17, 0, 0, tzOffset),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.SyncFromTasks(companyId: 1, userId: "user-1", date: targetDate) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);

        var json = ToJsonElement(result.Value);
        Assert.True(json.GetProperty("success").GetBoolean());
        Assert.Equal(1, json.GetProperty("syncedCount").GetInt32());

        var att = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == "user-1" && a.Date == targetDate);
        Assert.NotNull(att);
        Assert.Equal(8.0, att!.TotalHours);
        Assert.Equal(2, att.Status);
        Assert.Equal(AttendanceType.Present, att.Type);
        Assert.Equal(WorkLocation.WFO, att.WorkLocation);
        Assert.Contains("Task Implementasi Dashboard", att.Notes);
    }

    [Fact]
    public async Task GetTodayStatus_WhenUserHasActiveTasksToday_ShouldAutoReflectEightHoursAttendance()
    {
        // Arrange
        var tzOffset = TimeSpan.FromHours(7);
        var nowTz = DateTimeOffset.UtcNow.ToOffset(tzOffset);
        var today = DateOnly.FromDateTime(nowTz.DateTime);

        var task = new WorkTask
        {
            Id = 556,
            Title = "Task Hari Ini Untuk Presensi",
            CompanyId = 1,
            AssignedToUserId = "user-1",
            StartDate = new DateTimeOffset(today.Year, today.Month, today.Day, 8, 0, 0, tzOffset),
            DueDate = new DateTimeOffset(today.Year, today.Month, today.Day, 17, 0, 0, tzOffset),
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetTodayStatus() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);

        var json = ToJsonElement(result.Value);
        Assert.True(json.GetProperty("success").GetBoolean());
        var data = json.GetProperty("data");
        Assert.True(data.GetProperty("hasClockedIn").GetBoolean());
        Assert.True(data.GetProperty("hasClockedOut").GetBoolean());
        Assert.Equal(8.0, data.GetProperty("totalHours").GetDouble());
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

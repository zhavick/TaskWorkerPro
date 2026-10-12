using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class EnterpriseModulesControllerTests
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;
    private readonly FakeWebHostEnvironment _env;

    public EnterpriseModulesControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "WCH", "user-1", true);
        _context = new AppDbContext(options, _tenantService);

        _env = new FakeWebHostEnvironment();

        // Seed Company and Users
        _context.Companies.Add(new Company { Id = 10, Name = "Wahana Holding", Code = "WCH" });
        _context.Users.Add(new AppUser
        {
            Id = "user-1",
            Email = "john@wahana.com",
            FullName = "John Doe",
            CompanyId = 10,
            IsApproved = true
        });

        // Seed Master Badges
        _context.MasterBadges.AddRange(
            new MasterBadge { Id = 1, Code = "FIRST_TASK", Name = "First Blood", Points = 50, Rarity = BadgeRarity.Common, IsActive = true, OrderIndex = 1 },
            new MasterBadge { Id = 2, Code = "STREAK_7", Name = "Week Warrior", Points = 100, Rarity = BadgeRarity.Rare, IsActive = true, OrderIndex = 2 }
        );

        // Seed Reward Item
        _context.RewardItems.Add(new RewardItem
        {
            Id = 1,
            Name = "Voucher GoPay Rp 50.000",
            PointCost = 500,
            Stock = 5,
            Category = "E-Wallet",
            IsActive = true
        });

        _context.SaveChanges();
    }

    [Fact]
    public async Task Attendance_ClockInAndClockOut_ShouldCalculateTotalHours()
    {
        // Arrange
        var controller = new AttendancesController(_context, _tenantService);

        // Act - Clock In
        var clockInResult = await controller.ClockIn(new ClockInRequest(WorkLocation.WFO, "Kantor lantai 2")) as OkObjectResult;
        clockInResult.Should().NotBeNull();
        clockInResult!.StatusCode.Should().Be(200);

        // Act - Duplicate Clock In should fail
        var dupResult = await controller.ClockIn(new ClockInRequest(WorkLocation.WFO, null)) as BadRequestObjectResult;
        dupResult.Should().NotBeNull();
        dupResult!.StatusCode.Should().Be(400);

        // Act - Clock Out
        var clockOutResult = await controller.ClockOut(new ClockOutRequest("Pulang kerja")) as OkObjectResult;
        clockOutResult.Should().NotBeNull();
        clockOutResult!.StatusCode.Should().Be(200);

        // Verify status
        var statusResult = await controller.GetTodayStatus() as OkObjectResult;
        statusResult.Should().NotBeNull();
        var data = statusResult!.Value?.GetType().GetProperty("data")?.GetValue(statusResult.Value) as TodayAttendanceStatusDto;
        data.Should().NotBeNull();
        data!.HasClockedIn.Should().BeTrue();
        data.HasClockedOut.Should().BeTrue();
        data.TotalHours.Should().BeGreaterThan(0.0);
    }

    [Fact]
    public async Task Notes_CreateAndTogglePin_ShouldOrderPinnedNotesFirst()
    {
        // Arrange
        var controller = new NotesController(_context, _tenantService, _env);

        // Act - Create 2 notes
        await controller.CreateNote(new CreateNoteRequest("Note A", "<p>Content A</p>", "General", "#6366F1", false, null));
        var resB = await controller.CreateNote(new CreateNoteRequest("Note B", "<p>Content B</p>", "General", "#10B981", false, null)) as OkObjectResult;

        var noteB = resB!.Value?.GetType().GetProperty("data")?.GetValue(resB.Value) as WorkNote;
        noteB.Should().NotBeNull();

        // Pin Note B
        await controller.TogglePin(noteB!.Id);

        // Get notes list
        var listResult = await controller.GetNotes() as OkObjectResult;
        listResult.Should().NotBeNull();
        var list = listResult!.Value?.GetType().GetProperty("data")?.GetValue(listResult.Value) as List<NoteItemDto>;
        list.Should().NotBeNull();
        list!.Count.Should().Be(2);

        // Note B should be first because it is pinned
        list[0].Id.Should().Be(noteB.Id);
        list[0].IsPinned.Should().BeTrue();
    }

    [Fact]
    public async Task Gamification_CheckInAndClaimReward_ShouldValidateSufficientPoints()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);

        // Act - Daily Check In
        var checkInRes = await controller.DailyCheckIn() as OkObjectResult;
        checkInRes.Should().NotBeNull();
        checkInRes!.StatusCode.Should().Be(200);

        // Second check-in today should fail
        var dupCheckIn = await controller.DailyCheckIn() as BadRequestObjectResult;
        dupCheckIn.Should().NotBeNull();
        dupCheckIn!.StatusCode.Should().Be(400);

        // Attempt to claim 500 pt reward with only 10 pts should fail
        var claimFail = await controller.ClaimReward(new ClaimRewardRequest(1, "Claim voucher")) as BadRequestObjectResult;
        claimFail.Should().NotBeNull();
        claimFail!.StatusCode.Should().Be(400);

        // Award badge with 600 pts to user
        _context.UserBadges.Add(new UserBadge
        {
            UserId = "user-1",
            BadgeId = 2, // 100 pts
            UnlockedAt = DateTimeOffset.UtcNow
        });
        // Give 500 more check-in points artificially
        _context.DailyCheckIns.Add(new DailyCheckIn
        {
            UserId = "user-1",
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-3),
            PointsEarned = 500,
            StreakDay = 2
        });
        await _context.SaveChangesAsync();

        // Now claim should succeed!
        var claimSuccess = await controller.ClaimReward(new ClaimRewardRequest(1, "Claim voucher")) as OkObjectResult;
        claimSuccess.Should().NotBeNull();
        claimSuccess!.StatusCode.Should().Be(200);

        var reward = await _context.RewardItems.FindAsync(1);
        reward!.Stock.Should().Be(4); // stock decremented
    }

    [Fact]
    public async Task Announcements_MarkReadWithDontShowAgain_ShouldHideFromActiveList()
    {
        // Arrange
        var controller = new AnnouncementsController(_context, _tenantService);
        var announcement = new Announcement
        {
            Id = 1,
            Title = "Server Maintenance Notice",
            Content = "Maintenance tonight at 23:00",
            Type = "Informasi Penting",
            StartDate = DateTimeOffset.UtcNow.AddHours(-1),
            EndDate = DateTimeOffset.UtcNow.AddDays(1),
            IsActive = true,
            CompanyId = 10
        };
        _context.Announcements.Add(announcement);
        await _context.SaveChangesAsync();

        // Act - Fetch active announcements
        var active1 = await controller.GetActiveAnnouncements() as OkObjectResult;
        var list1 = active1!.Value?.GetType().GetProperty("data")?.GetValue(active1.Value) as List<AnnouncementDto>;
        list1.Should().NotBeNull();
        list1!.Count.Should().Be(1);

        // Act - Mark read with DontShowAgain = true
        await controller.MarkRead(1, new MarkAnnouncementReadRequest(true));

        // Act - Fetch active announcements again
        var active2 = await controller.GetActiveAnnouncements() as OkObjectResult;
        var list2 = active2!.Value?.GetType().GetProperty("data")?.GetValue(active2.Value) as List<AnnouncementDto>;
        list2.Should().NotBeNull();
        list2!.Count.Should().Be(0); // Hidden!
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

    private class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ApplicationName { get; set; } = "TrackerKerja.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = "Development";
    }
}

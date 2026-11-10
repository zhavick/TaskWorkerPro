using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class GamificationMilestone30Tests
{
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

    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;
    private readonly BadgeEvaluationService _badgeService;
    private const string TargetUserId = "usr-streaker-30";

    public GamificationMilestone30Tests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(1, "CORP-ALPHA", TargetUserId, false);
        _context = new AppDbContext(options, _tenantService);
        _badgeService = new BadgeEvaluationService(_context);

        // Seed Company and User
        _context.Companies.Add(new Company { Id = 1, Name = "Alpha Corp", Code = "CORP-ALPHA" });
        _context.Users.Add(new AppUser
        {
            Id = TargetUserId,
            Email = "streaker@alphacorp.com",
            FullName = "Andi Wijaya",
            CompanyId = 1,
            IsApproved = true
        });

        // Seed Tasks on 2 consecutive days for TargetUserId so gamification check-ins & rewards are unlocked
        _context.Tasks.AddRange(
            new WorkTask
            {
                Id = 100,
                Title = "Day 1 Operational Task",
                CreatedByUserId = TargetUserId,
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
                Status = TrackerKerja.Domain.Enums.TaskStatus.Done
            },
            new WorkTask
            {
                Id = 101,
                Title = "Day 2 Operational Task",
                CreatedByUserId = TargetUserId,
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
                Status = TrackerKerja.Domain.Enums.TaskStatus.Done
            }
        );

        // Seed Milestone Badges & Rewards
        _context.MasterBadges.Add(new MasterBadge
        {
            Id = 30,
            Code = "STREAK_30",
            Name = "Legenda 30 Hari",
            Points = 100,
            Rarity = BadgeRarity.Legendary,
            IsActive = true
        });

        _context.RewardItems.AddRange(
            new RewardItem
            {
                Id = 1,
                Name = "Voucher Kopi Harian",
                Description = "Kopi gratis 1 cup",
                PointCost = 100,
                Stock = 10,
                Category = "F&B",
                IsActive = true,
                IsMonthlyMilestoneReward = false
            },
            new RewardItem
            {
                Id = 2,
                Name = "Mechanical Keyboard RGB Milestone",
                Description = "Hadiah eksklusif bagi pencapai streak 30 hari penuh",
                PointCost = 500,
                Stock = 5,
                Category = "Hardware",
                IsActive = true,
                IsMonthlyMilestoneReward = true
            }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task DailyCheckIn_WhenReaching30DaysStreak_ShouldAward500BonusPointsAndMilestone()
    {
        // Arrange: Last check-in was yesterday with Streak = 29
        var yesterday = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));
        _context.DailyCheckIns.Add(new DailyCheckIn
        {
            Id = 1,
            UserId = TargetUserId,
            CheckInDate = yesterday,
            CheckInTime = DateTimeOffset.UtcNow.AddDays(-1),
            StreakDay = 29,
            PointsEarned = 10,
            IsMonthlyMilestone = false
        });
        await _context.SaveChangesAsync();

        var controller = new GamificationController(_context, _tenantService, _badgeService);

        // Act: Check in today -> reaching 30 days
        var actionResult = await controller.DailyCheckIn() as OkObjectResult;

        // Assert
        actionResult.Should().NotBeNull();
        actionResult!.StatusCode.Should().Be(200);

        var todayCheckIn = await _context.DailyCheckIns
            .FirstOrDefaultAsync(c => c.UserId == TargetUserId && c.StreakDay == 30);
        
        todayCheckIn.Should().NotBeNull();
        todayCheckIn!.StreakDay.Should().Be(30);
        todayCheckIn.IsMonthlyMilestone.Should().BeTrue();
        todayCheckIn.PointsEarned.Should().Be(510); // 10 normal + 500 bonus
    }

    [Fact]
    public async Task DailyCheckIn_WhenStreakBreakGreaterThan2Days_ShouldResetToStreak1()
    {
        // Arrange: Last check-in was 3 days ago (gap >= 2 days)
        var threeDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3));
        _context.DailyCheckIns.Add(new DailyCheckIn
        {
            Id = 2,
            UserId = TargetUserId,
            CheckInDate = threeDaysAgo,
            CheckInTime = DateTimeOffset.UtcNow.AddDays(-3),
            StreakDay = 15,
            PointsEarned = 10,
            IsMonthlyMilestone = false
        });
        await _context.SaveChangesAsync();

        var controller = new GamificationController(_context, _tenantService, _badgeService);

        // Act: Check in today
        var actionResult = await controller.DailyCheckIn() as OkObjectResult;

        // Assert
        actionResult.Should().NotBeNull();
        
        var todayCheckIn = await _context.DailyCheckIns
            .OrderByDescending(c => c.Id)
            .FirstOrDefaultAsync(c => c.UserId == TargetUserId);

        todayCheckIn.Should().NotBeNull();
        todayCheckIn!.StreakDay.Should().Be(1); // Reset back to Day 1
        todayCheckIn.PointsEarned.Should().Be(10);
        todayCheckIn.IsMonthlyMilestone.Should().BeFalse();
    }

    [Fact]
    public async Task ClaimReward_WhenMilestoneRewardAndUserHasNotReached30Days_ShouldBeRejected()
    {
        // Arrange: Add regular check-ins with streak = 10 (not 30)
        _context.DailyCheckIns.Add(new DailyCheckIn
        {
            Id = 3,
            UserId = TargetUserId,
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CheckInTime = DateTimeOffset.UtcNow,
            StreakDay = 10,
            PointsEarned = 600, // plenty of points
            IsMonthlyMilestone = false
        });
        await _context.SaveChangesAsync();

        var controller = new GamificationController(_context, _tenantService, _badgeService);
        var claimReq = new ClaimRewardRequest(
            RewardItemId: 2, // Mechanical Keyboard RGB (IsMonthlyMilestoneReward = true)
            UserNotes: "Klaim keyboard"
        );

        // Act
        var result = await controller.ClaimReward(claimReq) as BadRequestObjectResult;

        // Assert: Must reject because 30-day streak milestone requirement is not met
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(400);
        result.Value.ToString().Should().Contain("Hadiah ini khusus untuk pengguna yang telah meraih Monthly Streak Milestone");
    }

    [Fact]
    public async Task DailyCheckIn_WhenUserHasNeverCreatedTask_ShouldReturnBadRequest()
    {
        var newUserId = "usr-brand-new";
        _context.Users.Add(new AppUser
        {
            Id = newUserId,
            Email = "brandnew@alphacorp.com",
            FullName = "User Baru",
            CompanyId = 1,
            IsApproved = true
        });
        await _context.SaveChangesAsync();

        var tenantService = new FakeTenantService(1, "CORP-ALPHA", newUserId, false);
        var controller = new GamificationController(_context, tenantService, _badgeService);

        var result = await controller.DailyCheckIn() as BadRequestObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(400);
        result.Value.ToString().Should().Contain("buat minimal 1 tugas");
    }

    [Fact]
    public async Task GetGamificationStatus_WhenUserHasNeverCreatedTask_ShouldReturnHasCreatedTaskFalseAndZeroPoints()
    {
        var newUserId = "usr-never-task";
        _context.Users.Add(new AppUser
        {
            Id = newUserId,
            Email = "nevertask@alphacorp.com",
            FullName = "User Belum Buat Task",
            CompanyId = 1,
            IsApproved = true
        });
        await _context.SaveChangesAsync();

        var tenantService = new FakeTenantService(1, "CORP-ALPHA", newUserId, false);
        var controller = new GamificationController(_context, tenantService, _badgeService);

        var result = await controller.GetGamificationStatus() as OkObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var dataProp = result.Value!.GetType().GetProperty("data")?.GetValue(result.Value) as GamificationSummaryDto;
        dataProp.Should().NotBeNull();
        dataProp!.HasCreatedTask.Should().BeFalse();
        dataProp.TotalCurrentPoints.Should().Be(0);
        dataProp.CurrentStreakDays.Should().Be(0);
    }

    [Fact]
    public async Task ClaimReward_WhenUserHasNeverCreatedTask_ShouldReturnBadRequest()
    {
        var newUserId = "usr-claim-notask";
        _context.Users.Add(new AppUser
        {
            Id = newUserId,
            Email = "claimnotask@alphacorp.com",
            FullName = "User Klaim Tanpa Task",
            CompanyId = 1,
            IsApproved = true
        });
        await _context.SaveChangesAsync();

        var tenantService = new FakeTenantService(1, "CORP-ALPHA", newUserId, false);
        var controller = new GamificationController(_context, tenantService, _badgeService);

        var claimReq = new ClaimRewardRequest(
            RewardItemId: 1,
            UserNotes: "Klaim reward"
        );

        var result = await controller.ClaimReward(claimReq) as BadRequestObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(400);
        result.Value.ToString().Should().Contain("2 hari berturut-turut");
    }

    [Fact]
    public async Task GetGamificationStatus_WhenUserFilledTasksOnly1Day_ShouldRemainLocked_AndUnlockAfter2ConsecutiveDays()
    {
        var memberId = "usr-two-day-rule";
        _context.Users.Add(new AppUser
        {
            Id = memberId,
            Email = "twoday@alphacorp.com",
            FullName = "Member Dua Hari",
            CompanyId = 1,
            IsApproved = true
        });

        // Day 1 task only -> should still be locked
        _context.Tasks.Add(new WorkTask
        {
            Id = 501,
            Title = "Task Hari Pertama",
            CreatedByUserId = memberId,
            AssignedToUserId = memberId,
            CompanyId = 1,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            Status = TrackerKerja.Domain.Enums.TaskStatus.InProgress
        });
        await _context.SaveChangesAsync();

        var tenantService = new FakeTenantService(1, "CORP-ALPHA", memberId, false);
        var controller = new GamificationController(_context, tenantService, _badgeService);

        var day1Result = await controller.GetGamificationStatus() as OkObjectResult;
        var day1Data = day1Result!.Value!.GetType().GetProperty("data")?.GetValue(day1Result.Value) as GamificationSummaryDto;
        day1Data.Should().NotBeNull();
        day1Data!.HasCreatedTask.Should().BeFalse();
        day1Data.ConsecutiveTaskDays.Should().Be(1);

        // Day 2 consecutive task -> should unlock gamification
        _context.Tasks.Add(new WorkTask
        {
            Id = 502,
            Title = "Task Hari Kedua Berturut-turut",
            CreatedByUserId = memberId,
            AssignedToUserId = memberId,
            CompanyId = 1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Status = TrackerKerja.Domain.Enums.TaskStatus.InProgress
        });
        await _context.SaveChangesAsync();

        var day2Result = await controller.GetGamificationStatus() as OkObjectResult;
        var day2Data = day2Result!.Value!.GetType().GetProperty("data")?.GetValue(day2Result.Value) as GamificationSummaryDto;
        day2Data.Should().NotBeNull();
        day2Data!.HasCreatedTask.Should().BeTrue();
        day2Data.ConsecutiveTaskDays.Should().BeGreaterOrEqualTo(2);
    }

    [Fact]
    public async Task CreateBadge_WhenPointsOutsideRange10To100_ShouldReturnBadRequest_AndSucceedWhenWithinRange()
    {
        var adminUserId = "usr-admin-badge";
        _context.Users.Add(new AppUser
        {
            Id = adminUserId,
            Email = "adminbadge@alphacorp.com",
            FullName = "Admin Gamifikasi",
            CompanyId = 1,
            IsApproved = true
        });
        await _context.SaveChangesAsync();

        var adminTenantService = new FakeTenantService(1, "CORP-ALPHA", adminUserId, true);
        var controller = new GamificationController(_context, adminTenantService, _badgeService);

        // Points < 10 -> BadRequest
        var lowPointsReq = new CreateOrUpdateMasterBadgeRequest(
            Code: "BADGE_LOW",
            Name: "Lencana Terlalu Kecil",
            Description: "Kurang dari 10 poin",
            Category: "Tugas",
            Icon: "award",
            Color: "#10B981",
            Points: 5,
            Rarity: BadgeRarity.Common
        );
        var lowResult = await controller.CreateBadge(lowPointsReq) as BadRequestObjectResult;
        lowResult.Should().NotBeNull();
        lowResult!.StatusCode.Should().Be(400);
        lowResult.Value!.ToString().Should().Contain("10 hingga 100");

        // Points > 100 -> BadRequest
        var highPointsReq = lowPointsReq with { Code = "BADGE_HIGH", Points = 150 };
        var highResult = await controller.CreateBadge(highPointsReq) as BadRequestObjectResult;
        highResult.Should().NotBeNull();
        highResult!.StatusCode.Should().Be(400);
        highResult.Value!.ToString().Should().Contain("10 hingga 100");

        // Points within 10..100 -> Ok
        var validPointsReq = lowPointsReq with { Code = "BADGE_VALID", Name = "Lencana Valid", Points = 75, Rarity = BadgeRarity.Epic };
        var okResult = await controller.CreateBadge(validPointsReq) as OkObjectResult;
        okResult.Should().NotBeNull();
        okResult!.StatusCode.Should().Be(200);
    }
}

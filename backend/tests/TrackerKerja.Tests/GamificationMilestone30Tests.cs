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

        // Seed Milestone Badges & Rewards
        _context.MasterBadges.Add(new MasterBadge
        {
            Id = 30,
            Code = "STREAK_30",
            Name = "Legenda 30 Hari",
            Points = 500,
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
}

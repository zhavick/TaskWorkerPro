using FluentAssertions;
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

public class GamificationAdminTests
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

    public GamificationAdminTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "WCH", "admin-1", true);
        _context = new AppDbContext(options, _tenantService);

        _context.Companies.Add(new Company { Id = 10, Name = "Wahana Holding", Code = "WCH" });
        _context.Users.AddRange(
            new AppUser { Id = "admin-1", Email = "admin@wahana.com", FullName = "Admin Master", CompanyId = 10, IsApproved = true, JobTitle = "System Architect" },
            new AppUser { Id = "user-staf", Email = "staf@wahana.com", FullName = "Budi Santoso", CompanyId = 10, IsApproved = true, JobTitle = "Developer" }
        );

        _context.MasterBadges.AddRange(
            new MasterBadge { Id = 101, Code = "BUG_HUNTER", Name = "Bug Hunter Expert", Points = 150, Rarity = BadgeRarity.Epic, IsActive = true, OrderIndex = 1 },
            new MasterBadge { Id = 102, Code = "SPEEDY", Name = "Speed Demon", Points = 80, Rarity = BadgeRarity.Rare, IsActive = true, OrderIndex = 2 }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task Admin_CreateReward_ShouldPersistAndReturnRewardItem()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);
        var request = new CreateOrUpdateRewardItemRequest(
            "Voucher Kopi Premium",
            "Voucher Rp 25.000 untuk kedai kopi rekanan",
            250,
            15,
            "F&B",
            "coffee",
            "amber",
            true,
            false,
            1
        );

        // Act
        var result = await controller.CreateReward(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var saved = await _context.RewardItems.FirstOrDefaultAsync(r => r.Name == "Voucher Kopi Premium");
        saved.Should().NotBeNull();
        saved!.PointCost.Should().Be(250);
        saved.Stock.Should().Be(15);
        saved.Category.Should().Be("F&B");
    }

    [Fact]
    public async Task Admin_UpdateReward_ShouldModifyExistingFields()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);
        var reward = new RewardItem
        {
            Name = "Voucher Pulsa 25k",
            PointCost = 250,
            Stock = 5,
            Category = "Pulsa",
            IsActive = true
        };
        _context.RewardItems.Add(reward);
        await _context.SaveChangesAsync();

        var updateReq = new CreateOrUpdateRewardItemRequest(
            "Voucher Pulsa 50k",
            "Upgrade ke 50k",
            500,
            20,
            "Pulsa",
            "smartphone",
            "blue",
            true
        );

        // Act
        var result = await controller.UpdateReward(reward.Id, updateReq) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var updated = await _context.RewardItems.FindAsync(reward.Id);
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Voucher Pulsa 50k");
        updated.PointCost.Should().Be(500);
        updated.Stock.Should().Be(20);
    }

    [Fact]
    public async Task Admin_DeleteReward_WithClaims_ShouldDeactivateRatherThanHardDelete()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);
        var reward = new RewardItem
        {
            Name = "Hadiah Khusus",
            PointCost = 100,
            Stock = 1,
            IsActive = true
        };
        _context.RewardItems.Add(reward);
        await _context.SaveChangesAsync();

        _context.RewardClaims.Add(new RewardClaim
        {
            UserId = "user-staf",
            RewardItemId = reward.Id,
            PointsSpent = 100,
            Status = ClaimStatus.Approved,
            ClaimedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await controller.DeleteReward(reward.Id) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var existing = await _context.RewardItems.FindAsync(reward.Id);
        existing.Should().NotBeNull();
        existing!.IsActive.Should().BeFalse(); // Soft-deactivated
    }

    [Fact]
    public async Task Admin_AwardBadge_ShouldAddUserBadge_AndRevokeBadge_ShouldRemove()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);
        var awardReq = new AwardBadgeRequest("user-staf", 101);

        // Act - Award badge
        var awardResult = await controller.AwardBadge(awardReq) as OkObjectResult;
        awardResult.Should().NotBeNull();
        awardResult!.StatusCode.Should().Be(200);

        var userBadge = await _context.UserBadges.FirstOrDefaultAsync(ub => ub.UserId == "user-staf" && ub.BadgeId == 101);
        userBadge.Should().NotBeNull();
        userBadge!.AwardedBy.Should().Be("admin-1");

        // Act - Duplicate award should be rejected
        var dupResult = await controller.AwardBadge(awardReq) as BadRequestObjectResult;
        dupResult.Should().NotBeNull();
        dupResult!.StatusCode.Should().Be(400);

        // Act - Revoke badge
        var revokeResult = await controller.RevokeBadge(101, "user-staf") as OkObjectResult;
        revokeResult.Should().NotBeNull();
        revokeResult!.StatusCode.Should().Be(200);

        var revokedBadge = await _context.UserBadges.FirstOrDefaultAsync(ub => ub.UserId == "user-staf" && ub.BadgeId == 101);
        revokedBadge.Should().BeNull();
    }

    [Fact]
    public async Task Admin_ResetPoints_ForSingleUser_ShouldRemoveOnlyThatUsersGamificationData()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        _context.DailyCheckIns.AddRange(
            new DailyCheckIn { UserId = "user-staf", CheckInDate = today, PointsEarned = 10, StreakDay = 5 },
            new DailyCheckIn { UserId = "admin-1", CheckInDate = today, PointsEarned = 10, StreakDay = 3 }
        );
        _context.UserBadges.AddRange(
            new UserBadge { UserId = "user-staf", BadgeId = 101 },
            new UserBadge { UserId = "admin-1", BadgeId = 101 }
        );
        _context.RewardClaims.Add(new RewardClaim { UserId = "user-staf", RewardItemId = 1, PointsSpent = 100 });
        await _context.SaveChangesAsync();

        var request = new ResetGamificationPointsRequest("user-staf", ResetCheckIns: true, ResetBadges: true, ResetClaims: true);

        // Act
        var result = await controller.ResetGamificationPoints(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        // user-staf data should be wiped
        var stafCheckIns = await _context.DailyCheckIns.Where(c => c.UserId == "user-staf").ToListAsync();
        stafCheckIns.Should().BeEmpty();

        var stafBadges = await _context.UserBadges.Where(b => b.UserId == "user-staf").ToListAsync();
        stafBadges.Should().BeEmpty();

        var stafClaims = await _context.RewardClaims.Where(c => c.UserId == "user-staf").ToListAsync();
        stafClaims.Should().BeEmpty();

        // admin-1 data should still exist untouched
        var adminCheckIns = await _context.DailyCheckIns.Where(c => c.UserId == "admin-1").ToListAsync();
        adminCheckIns.Should().HaveCount(1);
    }

    [Fact]
    public async Task Admin_ResetPoints_ForAllUsers_ShouldRemoveAllGamificationData()
    {
        // Arrange
        var controller = new GamificationController(_context, _tenantService);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        _context.DailyCheckIns.AddRange(
            new DailyCheckIn { UserId = "user-staf", CheckInDate = today, PointsEarned = 10, StreakDay = 2 },
            new DailyCheckIn { UserId = "admin-1", CheckInDate = today, PointsEarned = 10, StreakDay = 1 }
        );
        await _context.SaveChangesAsync();

        var request = new ResetGamificationPointsRequest(UserId: "all", ResetCheckIns: true, ResetBadges: false, ResetClaims: false);

        // Act
        var result = await controller.ResetGamificationPoints(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var allCheckIns = await _context.DailyCheckIns.ToListAsync();
        allCheckIns.Should().BeEmpty();
    }
}


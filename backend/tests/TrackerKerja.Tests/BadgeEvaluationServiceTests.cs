using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class BadgeEvaluationServiceTests
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
    private readonly BadgeEvaluationService _badgeService;
    private const string TargetUserId = "usr-developer-1";

    public BadgeEvaluationServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantService = new FakeTenantService(1, "CORP-ALPHA", TargetUserId, false);
        _context = new AppDbContext(options, tenantService);
        _badgeService = new BadgeEvaluationService(_context);

        // Seed Company and User
        _context.Companies.Add(new Company { Id = 1, Name = "Alpha Corp", Code = "CORP-ALPHA" });
        _context.Users.Add(new AppUser
        {
            Id = TargetUserId,
            Email = "dev@alphacorp.com",
            FullName = "Rian Pratama",
            CompanyId = 1,
            IsApproved = true
        });

        // Seed essential Master Badges Gaul matching exact codes in BadgeEvaluationService
        _context.MasterBadges.AddRange(
            new MasterBadge { Id = 1, Code = "FIRST_TASK", Name = "Langkah Perdana", Points = 20, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 2, Code = "TASK_10", Name = "Si Paling Sat-Set", Points = 50, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 3, Code = "TASK_50", Name = "Si Paling Eksekutor", Points = 150, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 4, Code = "HOURS_10", Name = "Kopi & Keringat", Points = 40, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 5, Code = "STREAK_7", Name = "Api Membara", Points = 100, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 6, Code = "STREAK_30", Name = "Legenda 30 Hari", Points = 500, Rarity = BadgeRarity.Legendary, IsActive = true },
            new MasterBadge { Id = 7, Code = "NOTE_5", Name = "Pujangga Dokumentasi", Points = 50, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 8, Code = "SI_SOLUTIF", Name = "Dokter Masalah", Points = 100, Rarity = BadgeRarity.Rare, IsActive = true }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task Evaluate_WhenUserCompletes1Task_ShouldUnlockFirstTaskBadge()
    {
        // Arrange
        _context.Tasks.Add(new WorkTask
        {
            Id = 101,
            Title = "Task Selesai 1",
            AssignedToUserId = TargetUserId,
            CompanyId = 1,
            Status = TrackerKerja.Domain.Enums.TaskStatus.Done
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Should().ContainSingle(b => b.Code == "FIRST_TASK");
        
        var userBadge = await _context.UserBadges.FirstOrDefaultAsync(ub => ub.UserId == TargetUserId && ub.Badge.Code == "FIRST_TASK");
        userBadge.Should().NotBeNull();
        userBadge!.Badge.Name.Should().Be("Langkah Perdana");
    }

    [Fact]
    public async Task Evaluate_WhenUserCompletes10Tasks_ShouldUnlockBothFirstTaskAndTask10()
    {
        // Arrange: Add 10 completed tasks
        for (int i = 1; i <= 10; i++)
        {
            _context.Tasks.Add(new WorkTask
            {
                Id = 200 + i,
                Title = $"Task Selesai {i}",
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                Status = TrackerKerja.Domain.Enums.TaskStatus.Done
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain(new[] { "FIRST_TASK", "TASK_10" });
    }

    [Fact]
    public async Task Evaluate_WhenCalledRepeatedly_ShouldBeIdempotentWithoutDuplicates()
    {
        // Arrange: Add 1 completed task
        _context.Tasks.Add(new WorkTask
        {
            Id = 301,
            Title = "Task Selesai Idempotent",
            AssignedToUserId = TargetUserId,
            CompanyId = 1,
            Status = TrackerKerja.Domain.Enums.TaskStatus.Done
        });
        await _context.SaveChangesAsync();

        // Act 1
        var firstRun = await _badgeService.EvaluateBadgesAsync(TargetUserId);
        firstRun.Should().ContainSingle(b => b.Code == "FIRST_TASK");

        // Act 2 (No new activity)
        var secondRun = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert: No new badges awarded on second run
        secondRun.Should().BeEmpty();

        var totalUserBadges = await _context.UserBadges.CountAsync(ub => ub.UserId == TargetUserId && ub.Badge.Code == "FIRST_TASK");
        totalUserBadges.Should().Be(1);
    }

    [Fact]
    public async Task Evaluate_WhenUserReachesStreak30_ShouldUnlockStreak30Badge()
    {
        // Arrange: Check-in records reaching 30 streak
        _context.DailyCheckIns.Add(new DailyCheckIn
        {
            Id = 501,
            UserId = TargetUserId,
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CheckInTime = DateTimeOffset.UtcNow,
            StreakDay = 30,
            PointsEarned = 510,
            IsMonthlyMilestone = true
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("STREAK_30");
        var badge = awarded.First(b => b.Code == "STREAK_30");
        badge.Name.Should().Be("Legenda 30 Hari");
        badge.Points.Should().Be(500);
    }

    [Fact]
    public async Task Evaluate_WhenUserWritesSolution_ShouldUnlockSiSolutifBadge()
    {
        // Arrange: Task with valid solution
        _context.Tasks.Add(new WorkTask
        {
            Id = 601,
            Title = "Task With Solution",
            AssignedToUserId = TargetUserId,
            CompanyId = 1,
            Obstacle = "Kendala teknis",
            Solution = "Solusi arsitektur dan mitigasi"
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("SI_SOLUTIF");
    }
}

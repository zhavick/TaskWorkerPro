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
            new MasterBadge { Id = 8, Code = "SI_SOLUTIF", Name = "Dokter Masalah", Points = 100, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 9, Code = "APP_HOURS_5", Name = "Kenalan Sama Sistem", Points = 50, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 10, Code = "MARATHON_FOKUS", Name = "Maraton Fokus Deep Work", Points = 200, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 11, Code = "TASK_CREATE_10", Name = "Perancang Solusi", Points = 100, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 12, Code = "TIMESHEET_LOG_3", Name = "Pencatat Konsisten", Points = 30, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 13, Code = "EARLY_BIRD", Name = "Burung Pagi (Early Bird)", Points = 75, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 14, Code = "NIGHT_OWL", Name = "Burung Hantu (Night Owl)", Points = 75, Rarity = BadgeRarity.Common, IsActive = true },
            new MasterBadge { Id = 15, Code = "SAME_DAY_FINISHER", Name = "Kilat Satu Hari (Same-Day Finisher)", Points = 100, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 16, Code = "BUG_EXTERMINATOR", Name = "Pembasmi Kutu (Bug Exterminator)", Points = 150, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 17, Code = "MULTI_PROJECT", Name = "Penjelajah Proyek", Points = 200, Rarity = BadgeRarity.Rare, IsActive = true },
            new MasterBadge { Id = 18, Code = "ZERO_OVERDUE", Name = "Pemberantas Tenggat (Zero Overdue)", Points = 350, Rarity = BadgeRarity.Epic, IsActive = true }
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

    [Fact]
    public async Task Evaluate_WhenUserWorks5Hours_ShouldUnlockAppHours5()
    {
        // Arrange: 5 hours of attendance
        _context.Attendances.Add(new Attendance
        {
            Id = 701,
            UserId = TargetUserId,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            TotalHours = 5.5,
            WorkLocation = WorkLocation.WFO
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("APP_HOURS_5");
    }

    [Fact]
    public async Task Evaluate_WhenUserDoes3HourFocusSession_ShouldUnlockMarathonFokus()
    {
        // Arrange: 3 hours focus session (10,800 seconds)
        var start = DateTimeOffset.UtcNow.AddHours(-3.5);
        _context.Sessions.Add(new WorkSession
        {
            Id = 801,
            UserId = TargetUserId,
            TaskId = 1,
            StartTime = start,
            EndTime = start.AddHours(3.2),
            Duration = 11520
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("MARATHON_FOKUS");
    }

    [Fact]
    public async Task Evaluate_WhenUserHas10TasksCreated_ShouldUnlockTaskCreate10()
    {
        // Arrange: Add 10 tasks assigned to user
        for (int i = 1; i <= 10; i++)
        {
            _context.Tasks.Add(new WorkTask
            {
                Id = 900 + i,
                Title = $"Task Inisiasi {i}",
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                Status = TrackerKerja.Domain.Enums.TaskStatus.InProgress
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("TASK_CREATE_10");
    }

    [Fact]
    public async Task Evaluate_WhenUserLogs3Timesheets_ShouldUnlockTimesheetLog3()
    {
        // Arrange: 3 work sessions
        for (int i = 1; i <= 3; i++)
        {
            _context.Sessions.Add(new WorkSession
            {
                Id = 1000 + i,
                UserId = TargetUserId,
                TaskId = 1,
                StartTime = DateTimeOffset.UtcNow.AddHours(-i),
                EndTime = DateTimeOffset.UtcNow.AddHours(-i).AddMinutes(30),
                Duration = 1800
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("TIMESHEET_LOG_3");
    }

    [Fact]
    public async Task Evaluate_WhenUserStartsBefore8AM_ShouldUnlockEarlyBird()
    {
        // Arrange: Clock-in at 07:15 AM WIB
        var earlyTime = new DateTimeOffset(2026, 10, 22, 7, 15, 0, TimeSpan.FromHours(7));
        _context.Attendances.Add(new Attendance
        {
            Id = 1101,
            UserId = TargetUserId,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            ClockIn = earlyTime,
            TotalHours = 8.0
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("EARLY_BIRD");
    }

    [Fact]
    public async Task Evaluate_WhenUserCompletesTaskSameDay_ShouldUnlockSameDayFinisher()
    {
        // Arrange: Task created and completed on the same date
        var now = DateTimeOffset.UtcNow;
        _context.Tasks.Add(new WorkTask
        {
            Id = 1201,
            Title = "Quick Fix Express",
            AssignedToUserId = TargetUserId,
            CompanyId = 1,
            Status = TrackerKerja.Domain.Enums.TaskStatus.Done,
            CreatedAt = now.AddHours(-2),
            UpdatedAt = now
        });
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("SAME_DAY_FINISHER");
    }

    [Fact]
    public async Task Evaluate_WhenUserFixes5Bugs_ShouldUnlockBugExterminator()
    {
        // Arrange: 5 completed bug tasks
        for (int i = 1; i <= 5; i++)
        {
            _context.Tasks.Add(new WorkTask
            {
                Id = 1300 + i,
                Title = $"Fix critical memory issue {i}",
                Milestone = "Bugfix Sprint 4",
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                Status = TrackerKerja.Domain.Enums.TaskStatus.Done
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("BUG_EXTERMINATOR");
    }

    [Fact]
    public async Task Evaluate_WhenUserCompletesTasksIn3Projects_ShouldUnlockMultiProject()
    {
        // Arrange: 3 completed tasks in 3 distinct projects
        for (int i = 1; i <= 3; i++)
        {
            _context.Tasks.Add(new WorkTask
            {
                Id = 1400 + i,
                Title = $"Project Milestone {i}",
                ProjectId = 100 + i,
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                Status = TrackerKerja.Domain.Enums.TaskStatus.Done
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("MULTI_PROJECT");
    }

    [Fact]
    public async Task Evaluate_WhenUserCompletes20TasksWithZeroOverdue_ShouldUnlockZeroOverdue()
    {
        // Arrange: 20 completed tasks, none overdue
        var future = DateTimeOffset.UtcNow.AddDays(5);
        for (int i = 1; i <= 20; i++)
        {
            _context.Tasks.Add(new WorkTask
            {
                Id = 1500 + i,
                Title = $"On-time task {i}",
                AssignedToUserId = TargetUserId,
                CompanyId = 1,
                DueDate = future,
                Status = TrackerKerja.Domain.Enums.TaskStatus.Done
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var awarded = await _badgeService.EvaluateBadgesAsync(TargetUserId);

        // Assert
        awarded.Select(b => b.Code).Should().Contain("ZERO_OVERDUE");
    }
}

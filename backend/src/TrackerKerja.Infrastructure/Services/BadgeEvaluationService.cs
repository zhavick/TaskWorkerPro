using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class BadgeEvaluationService : IBadgeEvaluationService
{
    private readonly AppDbContext _context;

    public BadgeEvaluationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<MasterBadge>> EvaluateBadgesAsync(string userId)
    {
        if (string.IsNullOrEmpty(userId)) return new List<MasterBadge>();

        // 1. Get already unlocked badge IDs
        var existingBadgeIds = await _context.UserBadges
            .Where(ub => ub.UserId == userId)
            .Select(ub => ub.BadgeId)
            .ToListAsync();

        var existingSet = new HashSet<int>(existingBadgeIds);

        // 2. Load all active master badges
        var masterBadges = await _context.MasterBadges
            .Where(b => b.IsActive)
            .ToListAsync();

        if (masterBadges.Count == 0) return new List<MasterBadge>();

        // 3. Query user activity metrics
        var completedTasks = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && t.Status == Domain.Enums.TaskStatus.Done);

        var totalWorkSeconds = await _context.Sessions
            .Where(s => s.UserId == userId && s.EndTime != null)
            .SumAsync(s => (s.EndTime!.Value - s.StartTime).TotalSeconds);
        var totalHours = totalWorkSeconds / 3600.0;

        var attendances = await _context.Attendances
            .Where(a => a.UserId == userId)
            .ToListAsync();
        var totalAttendances = attendances.Count;
        var wfoCount = attendances.Count(a => a.WorkLocation == WorkLocation.WFO);
        var wfhCount = attendances.Count(a => a.WorkLocation == WorkLocation.WFH);

        var checkIns = await _context.DailyCheckIns
            .Where(c => c.UserId == userId)
            .ToListAsync();
        var totalCheckIns = checkIns.Count;
        var maxStreak = checkIns.Count > 0 ? checkIns.Max(c => c.StreakDay) : 0;

        var totalNotes = await _context.Notes
            .CountAsync(n => n.AuthorUserId == userId);

        var tasksWithObstacle = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && !string.IsNullOrEmpty(t.Obstacle));

        var tasksWithSolution = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && !string.IsNullOrEmpty(t.Solution));

        var totalSubtasks = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && t.ParentTaskId != null);

        var totalClaims = await _context.RewardClaims
            .CountAsync(c => c.UserId == userId && c.Status != ClaimStatus.Rejected);

        // 4. Evaluate each master badge
        var newlyUnlocked = new List<MasterBadge>();

        foreach (var badge in masterBadges)
        {
            if (existingSet.Contains(badge.Id)) continue;

            bool isEarned = badge.Code switch
            {
                "FIRST_TASK" => completedTasks >= 1,
                "TASK_5" => completedTasks >= 5,
                "TASK_10" => completedTasks >= 10,
                "TASK_25" => completedTasks >= 25,
                "TASK_50" => completedTasks >= 50,
                "TASK_100" => completedTasks >= 100,

                "HOURS_1" => totalHours >= 1.0,
                "HOURS_10" => totalHours >= 10.0,
                "HOURS_40" => totalHours >= 40.0,
                "HOURS_100" => totalHours >= 100.0,
                "HOURS_200" => totalHours >= 200.0,
                "HOURS_500" => totalHours >= 500.0,

                "ATTEND_1" => totalAttendances >= 1,
                "ATTEND_10" => totalAttendances >= 10,
                "ATTEND_25" => totalAttendances >= 25,
                "WFO_HERO" => wfoCount >= 5,
                "WFH_HERO" => wfhCount >= 5,

                "CHECKIN_1" => totalCheckIns >= 1,
                "CHECKIN_7" => totalCheckIns >= 7,
                "CHECKIN_15" => totalCheckIns >= 15,
                "CHECKIN_30" => totalCheckIns >= 30,

                "STREAK_3" => maxStreak >= 3,
                "STREAK_7" => maxStreak >= 7,
                "STREAK_14" => maxStreak >= 14,
                "STREAK_30" => maxStreak >= 30,

                "NOTE_1" => totalNotes >= 1,
                "NOTE_5" => totalNotes >= 5,

                "SI_CURHAT" => tasksWithObstacle >= 1,
                "SI_SOLUTIF" => tasksWithSolution >= 1,
                "PEMBABAT_SUBTASK" => totalSubtasks >= 1,
                "PEMBURU_REWARD" => totalClaims >= 1,

                _ => false
            };

            if (isEarned)
            {
                newlyUnlocked.Add(badge);
                _context.UserBadges.Add(new UserBadge
                {
                    UserId = userId,
                    BadgeId = badge.Id,
                    UnlockedAt = DateTimeOffset.UtcNow,
                    AwardedBy = "System Evaluator"
                });
            }
        }

        if (newlyUnlocked.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return newlyUnlocked;
    }
}

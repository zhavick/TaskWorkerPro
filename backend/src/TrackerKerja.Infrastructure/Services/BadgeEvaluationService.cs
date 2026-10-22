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

        var totalSessionsCount = await _context.Sessions
            .CountAsync(s => s.UserId == userId);

        var hasNightSession = await _context.Sessions
            .AnyAsync(s => s.UserId == userId && (s.StartTime.Hour >= 21 || s.StartTime.Hour < 4));

        var hasEarlyAttendance = attendances.Any(a => a.ClockIn.HasValue &&
            (a.ClockIn.Value.ToOffset(TimeSpan.FromHours(7)).Hour < 7 ||
             (a.ClockIn.Value.ToOffset(TimeSpan.FromHours(7)).Hour == 7 && a.ClockIn.Value.ToOffset(TimeSpan.FromHours(7)).Minute <= 30)));

        var hasSprintChampion = await _context.Tasks
            .Where(t => t.AssignedToUserId == userId && t.Status == Domain.Enums.TaskStatus.Done)
            .GroupBy(t => t.UpdatedAt.Date)
            .AnyAsync(g => g.Count() >= 3);

        var bugTasksCount = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && t.Status == Domain.Enums.TaskStatus.Done &&
                (t.Title.ToLower().Contains("bug") || t.Title.ToLower().Contains("fix") || t.Title.ToLower().Contains("error") || t.Title.ToLower().Contains("kendala")));

        var hasCleanSweeper = totalSubtasks >= 3 && await _context.Tasks
            .Where(t => t.AssignedToUserId == userId && t.ParentTaskId != null)
            .AllAsync(t => t.Status == Domain.Enums.TaskStatus.Done);

        var notesWithAttachments = await _context.Notes
            .CountAsync(n => n.AuthorUserId == userId && n.Attachments.Count > 0);

        var hasMarathonSession = await _context.Sessions
            .AnyAsync(s => s.UserId == userId && s.Duration >= 10800);

        var approvedAttendances = attendances.Count(a => a.Status == 1 || a.Type == AttendanceType.Present);

        var highPriorityTasks = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && t.Status == Domain.Enums.TaskStatus.Done &&
                (t.Priority == TaskPriority.Critical || t.Priority == TaskPriority.High));

        var distinctProjectsCount = await _context.Tasks
            .Where(t => t.AssignedToUserId == userId && t.Status == Domain.Enums.TaskStatus.Done && t.ProjectId.HasValue)
            .Select(t => t.ProjectId!.Value)
            .Distinct()
            .CountAsync();

        var milestoneTasks = await _context.Tasks
            .CountAsync(t => t.AssignedToUserId == userId && t.Status == Domain.Enums.TaskStatus.Done && !string.IsNullOrEmpty(t.Milestone));

        var learningNotes = await _context.Notes
            .CountAsync(n => n.AuthorUserId == userId &&
                (n.Title.ToLower().Contains("sop") || n.Title.ToLower().Contains("panduan") || n.Title.ToLower().Contains("guide") || n.Title.ToLower().Contains("catatan") || n.Title.ToLower().Contains("riset") || n.Title.ToLower().Contains("arsitektur")));

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

                // 15 Lencana Baru Super Kreatif & Gaul
                "NIGHT_OWL" => hasNightSession,
                "EARLY_BIRD" => hasEarlyAttendance,
                "TIME_LORD" => totalSessionsCount >= 15,
                "SPRINT_CHAMPION" => hasSprintChampion,
                "BUG_HUNTER" => bugTasksCount >= 1,
                "CLEAN_SWEEPER" => hasCleanSweeper,
                "DOCUMENTATION_GURU" => notesWithAttachments >= 1,
                "MARATHONER" => hasMarathonSession,
                "PERFECT_ATTENDANCE" => approvedAttendances >= 20,
                "TASK_CRUSHER" => highPriorityTasks >= 1,
                "TEAM_CATALYST" => distinctProjectsCount >= 2,
                "CONSISTENCY_KING" => maxStreak >= 21,
                "MILESTONE_MASTER" => milestoneTasks >= 1,
                "ZEN_WORKER" => completedTasks >= 10,
                "LIFELONG_LEARNER" => learningNotes >= 1,

                "PEJUANG_LEMBUR" => hasNightSession || totalHours >= 10.0,
                "SQUAD_LEADER" => completedTasks >= 15,
                "ULTIMATE_LEGEND" => (completedTasks * 50 + (int)totalHours * 10 + totalCheckIns * 10) >= 2000,

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

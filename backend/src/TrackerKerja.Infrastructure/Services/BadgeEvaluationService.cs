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
        var userTasks = await _context.Tasks
            .Where(t => t.AssignedToUserId == userId)
            .ToListAsync();

        var completedTasks = userTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        var tasksWithObstacle = userTasks.Count(t => !string.IsNullOrEmpty(t.Obstacle));
        var tasksWithSolution = userTasks.Count(t => !string.IsNullOrEmpty(t.Solution));
        var totalSubtasks = userTasks.Count(t => t.ParentTaskId != null);

        var userSessions = await _context.Sessions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        var totalWorkSeconds = userSessions
            .Where(s => s.EndTime != null)
            .Sum(s => (s.EndTime!.Value - s.StartTime).TotalSeconds);
        var totalHours = totalWorkSeconds / 3600.0;
        var totalTimesheetSessions = userSessions.Count;

        var attendances = await _context.Attendances
            .Where(a => a.UserId == userId)
            .ToListAsync();
        var totalAttendances = attendances.Count;
        var wfoCount = attendances.Count(a => a.WorkLocation == WorkLocation.WFO);
        var wfhCount = attendances.Count(a => a.WorkLocation == WorkLocation.WFH);
        var attendanceHours = attendances.Sum(a => a.TotalHours);

        var combinedActiveHours = Math.Max(totalHours, attendanceHours);

        var checkIns = await _context.DailyCheckIns
            .Where(c => c.UserId == userId)
            .ToListAsync();
        var totalCheckIns = checkIns.Count;
        var maxStreak = checkIns.Count > 0 ? checkIns.Max(c => c.StreakDay) : 0;

        var totalNotes = await _context.Notes
            .CountAsync(n => n.AuthorUserId == userId);

        var totalClaims = await _context.RewardClaims
            .CountAsync(c => c.UserId == userId && c.Status != ClaimStatus.Rejected);

        var auditLogTaskCreates = await _context.AuditLogs
            .CountAsync(a => a.UserId == userId && a.ControllerName == "Tasks" && a.HttpMethod == "POST");
        var tasksCreatedCount = Math.Max(auditLogTaskCreates, userTasks.Count);

        var has3HourSession = userSessions.Any(s => s.Duration >= 10800 || (s.EndTime.HasValue && (s.EndTime.Value - s.StartTime).TotalHours >= 3.0));

        var isEarlyBird = userSessions.Any(s => s.StartTime.Hour < 8 || s.StartTime.ToOffset(TimeSpan.FromHours(7)).Hour < 8) ||
                          attendances.Any(a => a.ClockIn.HasValue && (a.ClockIn.Value.Hour < 8 || a.ClockIn.Value.ToOffset(TimeSpan.FromHours(7)).Hour < 8));

        var isNightOwl = userSessions.Any(s => (s.EndTime.HasValue && (s.EndTime.Value.Hour >= 21 || s.EndTime.Value.ToOffset(TimeSpan.FromHours(7)).Hour >= 21)) ||
                                               (s.StartTime.Hour >= 21 || s.StartTime.ToOffset(TimeSpan.FromHours(7)).Hour >= 21)) ||
                         userTasks.Any(t => t.Status == Domain.Enums.TaskStatus.Done && (t.UpdatedAt.Hour >= 21 || t.UpdatedAt.ToOffset(TimeSpan.FromHours(7)).Hour >= 21));

        var isLembur = userSessions.Any(s => (s.EndTime.HasValue && (s.EndTime.Value.Hour >= 18 || s.EndTime.Value.ToOffset(TimeSpan.FromHours(7)).Hour >= 18)) ||
                                             (s.StartTime.Hour >= 18 || s.StartTime.ToOffset(TimeSpan.FromHours(7)).Hour >= 18));

        var hasSameDayFinisher = userTasks.Any(t => t.Status == Domain.Enums.TaskStatus.Done && t.CreatedAt.Date == t.UpdatedAt.Date);

        var hasSprintChampion = userTasks
            .Where(t => t.Status == Domain.Enums.TaskStatus.Done)
            .GroupBy(t => t.UpdatedAt.Date)
            .Any(g => g.Count() >= 3);

        var bugTasksCount = userTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done && (
            (t.Milestone != null && (t.Milestone.Contains("bug", StringComparison.OrdinalIgnoreCase) || t.Milestone.Contains("fix", StringComparison.OrdinalIgnoreCase))) ||
            (t.Title != null && (t.Title.Contains("bug", StringComparison.OrdinalIgnoreCase) || t.Title.Contains("fix", StringComparison.OrdinalIgnoreCase) || t.Title.Contains("perbaikan", StringComparison.OrdinalIgnoreCase) || t.Title.Contains("error", StringComparison.OrdinalIgnoreCase) || t.Title.Contains("kendala", StringComparison.OrdinalIgnoreCase))) ||
            (t.Tags != null && (t.Tags.Contains("bug", StringComparison.OrdinalIgnoreCase) || t.Tags.Contains("fix", StringComparison.OrdinalIgnoreCase)))
        ));

        var hasCleanSweeper = totalSubtasks >= 3 && userTasks
            .Where(t => t.ParentTaskId != null)
            .All(t => t.Status == Domain.Enums.TaskStatus.Done);

        var notesWithAttachments = await _context.Notes
            .CountAsync(n => n.AuthorUserId == userId && n.Attachments.Count > 0);

        var approvedAttendances = attendances.Count(a => a.Status == 1 || a.Type == AttendanceType.Present);

        var highPriorityTasks = userTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done &&
            (t.Priority == TaskPriority.Critical || t.Priority == TaskPriority.High));

        var distinctProjectsCount = userTasks.Where(t => t.Status == Domain.Enums.TaskStatus.Done && t.ProjectId.HasValue).Select(t => t.ProjectId!.Value).Distinct().Count();

        var milestoneTasks = userTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done && !string.IsNullOrEmpty(t.Milestone));

        var learningNotes = await _context.Notes
            .CountAsync(n => n.AuthorUserId == userId &&
                (n.Title.ToLower().Contains("sop") || n.Title.ToLower().Contains("panduan") || n.Title.ToLower().Contains("guide") || n.Title.ToLower().Contains("catatan") || n.Title.ToLower().Contains("riset") || n.Title.ToLower().Contains("arsitektur")));

        var nowUtc = DateTimeOffset.UtcNow;
        var overdueTasksCount = userTasks.Count(t => t.Status != Domain.Enums.TaskStatus.Done && t.DueDate.HasValue && t.DueDate.Value < nowUtc);
        var isZeroOverdue = completedTasks >= 20 && overdueTasksCount == 0;

        // 4. Evaluate each master badge
        var newlyUnlocked = new List<MasterBadge>();

        foreach (var badge in masterBadges)
        {
            if (existingSet.Contains(badge.Id)) continue;

            bool isEarned = badge.Code switch
            {
                "FIRST_TASK" or "BADGE_FIRST_TASK" => completedTasks >= 1,
                "TASK_5" => completedTasks >= 5,
                "TASK_10" => completedTasks >= 10,
                "TASK_25" => completedTasks >= 25,
                "TASK_50" => completedTasks >= 50,
                "TASK_100" => completedTasks >= 100,

                "HOURS_1" => totalHours >= 1.0,
                "HOURS_10" => totalHours >= 10.0,
                "HOURS_40" => totalHours >= 40.0,
                "HOURS_100" or "BADGE_TIME_100H" => totalHours >= 100.0,
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
                "STREAK_7" or "BADGE_STREAK_7" => maxStreak >= 7,
                "STREAK_14" => maxStreak >= 14,
                "STREAK_30" or "BADGE_STREAK_30" => maxStreak >= 30,

                "NOTE_1" => totalNotes >= 1,
                "NOTE_5" => totalNotes >= 5,

                "SI_CURHAT" => tasksWithObstacle >= 1,
                "SI_SOLUTIF" => tasksWithSolution >= 1,
                "PEMBABAT_SUBTASK" => totalSubtasks >= 1,
                "PEMBURU_REWARD" => totalClaims >= 1,
                "PEJUANG_LEMBUR" => isLembur || totalHours >= 10.0,
                "SQUAD_LEADER" => completedTasks >= 15,
                "ULTIMATE_LEGEND" => (completedTasks * 50 + (int)totalHours * 10 + totalCheckIns * 10) >= 2000,

                // Screen Time & Waktu Aplikasi
                "APP_HOURS_5" => combinedActiveHours >= 5.0,
                "APP_HOURS_25" => combinedActiveHours >= 25.0,
                "APP_HOURS_100" => combinedActiveHours >= 100.0,
                "APP_HOURS_250" => combinedActiveHours >= 250.0,
                "MARATHON_FOKUS" or "MARATHONER" => has3HourSession,

                // Pembuatan Tugas & Inisiatif
                "TASK_CREATE_1" => tasksCreatedCount >= 1,
                "TASK_CREATE_10" => tasksCreatedCount >= 10,
                "TASK_CREATE_25" => tasksCreatedCount >= 25,
                "TASK_CREATE_50" => tasksCreatedCount >= 50,
                "TASK_CREATE_100" => tasksCreatedCount >= 100,

                // Frekuensi & Kedisiplinan Timesheet
                "TIMESHEET_LOG_3" => totalTimesheetSessions >= 3,
                "TIMESHEET_LOG_15" or "TIME_LORD" => totalTimesheetSessions >= 15,
                "TIMESHEET_LOG_50" => totalTimesheetSessions >= 50,
                "TIMESHEET_LOG_100" => totalTimesheetSessions >= 100,
                "TIMESHEET_LOG_250" => totalTimesheetSessions >= 250,

                // Prestasi Kreatif & Gaya Kerja
                "EARLY_BIRD" => isEarlyBird,
                "NIGHT_OWL" => isNightOwl,
                "SAME_DAY_FINISHER" => hasSameDayFinisher,
                "BUG_EXTERMINATOR" => bugTasksCount >= 5,
                "BUG_HUNTER" => bugTasksCount >= 1,
                "MULTI_PROJECT" => distinctProjectsCount >= 3,
                "TEAM_CATALYST" => distinctProjectsCount >= 2,
                "ZERO_OVERDUE" => isZeroOverdue,
                "SPRINT_CHAMPION" => hasSprintChampion,
                "CLEAN_SWEEPER" => hasCleanSweeper,
                "DOCUMENTATION_GURU" => notesWithAttachments >= 1,
                "PERFECT_ATTENDANCE" => approvedAttendances >= 20,
                "TASK_CRUSHER" => highPriorityTasks >= 1,
                "CONSISTENCY_KING" => maxStreak >= 21,
                "MILESTONE_MASTER" => milestoneTasks >= 1,
                "ZEN_WORKER" => completedTasks >= 10,
                "LIFELONG_LEARNER" => learningNotes >= 1,

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

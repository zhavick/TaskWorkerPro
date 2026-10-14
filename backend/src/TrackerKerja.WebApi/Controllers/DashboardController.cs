using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public DashboardController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));
        var now = DateTimeOffset.UtcNow;

        // Scoping: User only counts their assigned tasks unless Administrator
        var tasksQuery = _context.Tasks.AsNoTracking().AsQueryable();
        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == currentUserId);
        }

        var totalTasks = await tasksQuery.CountAsync();
        var inProgressTasks = await tasksQuery.CountAsync(t => t.Status == Domain.Enums.TaskStatus.InProgress);
        var doneTasks = await tasksQuery.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Done);
        var todoTasks = await tasksQuery.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Todo);
        var overdueTasks = await tasksQuery.CountAsync(t => t.DueDate.HasValue && t.DueDate.Value < now && t.Status != Domain.Enums.TaskStatus.Done);

        var completionRate = totalTasks > 0 ? (int)Math.Round((double)doneTasks / totalTasks * 100) : 0;

        // Work sessions today for current user
        var todayStart = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var todayEnd = todayStart.AddDays(1);

        var todaySessions = await _context.Sessions
            .AsNoTracking()
            .Where(s => s.UserId == currentUserId && s.StartTime >= todayStart && s.StartTime < todayEnd)
            .ToListAsync();

        long todayWorkSeconds = todaySessions.Sum(s =>
        {
            if (s.EndTime.HasValue) return s.Duration;
            return Math.Max(0, (long)(now - s.StartTime).TotalSeconds);
        });
        double todayWorkHours = Math.Round((double)todayWorkSeconds / 3600.0, 1);

        // Projects & Members count
        var totalProjects = await _context.Projects.AsNoTracking().CountAsync();
        var activeProjects = await _context.Projects.AsNoTracking().CountAsync(p => p.Status == ProjectStatus.Active);
        var totalMembers = await _context.Users.AsNoTracking().CountAsync(u => u.IsApproved && (_tenantService.CompanyId == null || u.CompanyId == _tenantService.CompanyId));

        // Gamification status
        var todayDateOnly = DateOnly.FromDateTime(now.UtcDateTime);
        var todayCheckIn = await _context.DailyCheckIns
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == currentUserId && c.CheckInDate == todayDateOnly);

        var userCheckIns = await _context.DailyCheckIns
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId && c.CheckInDate.Month == now.Month && c.CheckInDate.Year == now.Year)
            .ToListAsync();

        int monthlyPoints = userCheckIns.Sum(c => c.PointsEarned);
        int daysCheckedIn = userCheckIns.Count;
        int milestoneBonus = (daysCheckedIn >= 15 ? 100 : 0) + (daysCheckedIn >= 30 ? 200 : 0);

        var userBadges = await _context.UserBadges
            .Include(ub => ub.Badge)
            .Where(ub => ub.UserId == currentUserId)
            .ToListAsync();
        int badgePoints = userBadges.Sum(ub => ub.Badge.Points);

        var pointsSpent = await _context.RewardClaims
            .Where(rc => rc.UserId == currentUserId && rc.Status != ClaimStatus.Rejected)
            .SumAsync(rc => (int?)rc.PointsSpent) ?? 0;

        int totalCurrentPoints = Math.Max(0, (monthlyPoints + milestoneBonus + badgePoints) - pointsSpent);

        // Calculate streak
        int currentStreakDays = 0;
        var lastCheckIn = await _context.DailyCheckIns
            .AsNoTracking()
            .Where(c => c.UserId == currentUserId)
            .OrderByDescending(c => c.CheckInDate)
            .FirstOrDefaultAsync();

        if (lastCheckIn != null)
        {
            var dayDiff = todayDateOnly.DayNumber - lastCheckIn.CheckInDate.DayNumber;
            currentStreakDays = (dayDiff <= 2) ? lastCheckIn.StreakDay : 0;
        }

        // Attendance status today
        var attendanceToday = await _context.Attendances
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == currentUserId && a.Date == todayDateOnly);

        return Ok(new
        {
            success = true,
            data = new
            {
                tasks = new
                {
                    total = totalTasks,
                    inProgress = inProgressTasks,
                    done = doneTasks,
                    todo = todoTasks,
                    overdue = overdueTasks,
                    completionRate
                },
                workHours = new
                {
                    todaySeconds = todayWorkSeconds,
                    todayHours = todayWorkHours,
                },
                projects = new
                {
                    total = totalProjects,
                    active = activeProjects
                },
                members = new
                {
                    total = totalMembers
                },
                gamification = new
                {
                    totalCurrentPoints,
                    currentStreakDays,
                    hasCheckedInToday = todayCheckIn != null
                },
                attendance = new
                {
                    hasClockedIn = attendanceToday?.ClockIn != null,
                    hasClockedOut = attendanceToday?.ClockOut != null,
                    clockInTime = attendanceToday?.ClockIn,
                    clockOutTime = attendanceToday?.ClockOut,
                    totalHours = attendanceToday?.TotalHours ?? 0.0
                }
            }
        });
    }

    [HttpGet("productivity")]
    public async Task<IActionResult> GetProductivityChart([FromQuery] int days = 7)
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));
        var now = DateTimeOffset.UtcNow;
        var startDate = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero).AddDays(-(days - 1));

        // Fetch sessions in range
        var sessionsQuery = _context.Sessions
            .AsNoTracking()
            .Where(s => s.StartTime >= startDate);

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            sessionsQuery = sessionsQuery.Where(s => s.UserId == currentUserId);
        }

        var sessions = await sessionsQuery.ToListAsync();

        // Fetch tasks in range
        var tasksQuery = _context.Tasks
            .AsNoTracking()
            .Where(t => t.UpdatedAt >= startDate && t.Status == Domain.Enums.TaskStatus.Done);

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == currentUserId);
        }

        var doneTasks = await tasksQuery.ToListAsync();

        var dayNames = new Dictionary<DayOfWeek, string>
        {
            { DayOfWeek.Sunday, "Min" },
            { DayOfWeek.Monday, "Sen" },
            { DayOfWeek.Tuesday, "Sel" },
            { DayOfWeek.Wednesday, "Rab" },
            { DayOfWeek.Thursday, "Kam" },
            { DayOfWeek.Friday, "Jum" },
            { DayOfWeek.Saturday, "Sab" }
        };

        var result = new List<object>();
        for (int i = 0; i < days; i++)
        {
            var dayStart = startDate.AddDays(i);
            var dayEnd = dayStart.AddDays(1);

            var daySessions = sessions.Where(s => s.StartTime >= dayStart && s.StartTime < dayEnd).ToList();
            long totalSeconds = daySessions.Sum(s => s.EndTime.HasValue ? s.Duration : Math.Max(0, (long)(now - s.StartTime).TotalSeconds));
            double hours = Math.Round((double)totalSeconds / 3600.0, 1);

            int tasksCount = doneTasks.Count(t => t.UpdatedAt >= dayStart && t.UpdatedAt < dayEnd);

            result.Add(new
            {
                date = dayStart.ToString("yyyy-MM-dd"),
                day = dayNames[dayStart.DayOfWeek],
                hours,
                tasks = tasksCount
            });
        }

        return Ok(new { success = true, data = result });
    }

    [HttpGet("distribution")]
    public async Task<IActionResult> GetDistribution()
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));

        var tasksQuery = _context.Tasks
            .Include(t => t.Project)
            .AsNoTracking()
            .AsQueryable();

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == currentUserId);
        }

        var allTasks = await tasksQuery.ToListAsync();
        var totalCount = allTasks.Count;

        // 1. By Project
        var byProject = allTasks
            .GroupBy(t => t.Project?.Name ?? "Tanpa Proyek")
            .Select(g =>
            {
                var sample = g.First();
                var count = g.Count();
                var done = g.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
                var pct = totalCount > 0 ? Math.Round((double)count / totalCount * 100, 1) : 0;
                return new
                {
                    name = g.Key,
                    color = sample.Project?.Color ?? "#6366F1",
                    value = count,
                    percentage = pct,
                    doneCount = done
                };
            })
            .OrderByDescending(p => p.value)
            .Take(6)
            .ToList();

        // 2. By Status
        var byStatus = new List<object>
        {
            new { name = "To Do", value = allTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Todo), color = "#6366F1" },
            new { name = "In Progress", value = allTasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress), color = "#3B82F6" },
            new { name = "Done", value = allTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done), color = "#10B981" },
            new { name = "Overdue", value = allTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Overdue || (t.DueDate.HasValue && t.DueDate.Value < DateTimeOffset.UtcNow && t.Status != Domain.Enums.TaskStatus.Done)), color = "#EF4444" }
        };

        // 3. By Priority
        var byPriority = new List<object>
        {
            new { name = "Low", value = allTasks.Count(t => t.Priority == TaskPriority.Low), color = "#10B981" },
            new { name = "Medium", value = allTasks.Count(t => t.Priority == TaskPriority.Medium), color = "#3B82F6" },
            new { name = "High", value = allTasks.Count(t => t.Priority == TaskPriority.High), color = "#F59E0B" },
            new { name = "Critical", value = allTasks.Count(t => t.Priority == TaskPriority.Critical), color = "#EF4444" }
        };

        return Ok(new
        {
            success = true,
            data = new
            {
                totalTasks = totalCount,
                byProject,
                byStatus,
                byPriority
            }
        });
    }

    [HttpGet("activities")]
    public async Task<IActionResult> GetRecentActivities([FromQuery] int limit = 10)
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));

        // Recent Work Sessions
        var sessionsQuery = _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .Include(s => s.User)
            .AsNoTracking()
            .AsQueryable();

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            sessionsQuery = sessionsQuery.Where(s => s.UserId == currentUserId);
        }

        var recentSessions = await sessionsQuery
            .OrderByDescending(s => s.StartTime)
            .Take(limit)
            .Select(s => new
            {
                id = $"session-{s.Id}",
                type = "timesheet",
                title = s.Task.Title,
                projectName = s.Task.Project != null ? s.Task.Project.Name : "Umum",
                projectColor = s.Task.Project != null ? s.Task.Project.Color : "#6366F1",
                userName = s.User.FullName ?? s.User.UserName,
                duration = s.Duration,
                timestamp = s.EndTime ?? s.StartTime,
                isOngoing = s.EndTime == null
            })
            .ToListAsync();

        // Recent Tasks
        var tasksQuery = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .AsNoTracking()
            .AsQueryable();

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == currentUserId);
        }

        var recentTasks = await tasksQuery
            .OrderByDescending(t => t.UpdatedAt)
            .Take(limit)
            .Select(t => new
            {
                id = $"task-{t.Id}",
                type = "task",
                title = t.Title,
                projectName = t.Project != null ? t.Project.Name : "Umum",
                projectColor = t.Project != null ? t.Project.Color : "#6366F1",
                userName = t.AssignedToUser != null ? (t.AssignedToUser.FullName ?? t.AssignedToUser.UserName) : "Belum Ditugaskan",
                status = t.Status.ToString(),
                progress = t.Progress,
                timestamp = t.UpdatedAt
            })
            .ToListAsync();

        // Combine and sort
        var combined = recentSessions.Cast<object>()
            .Concat(recentTasks.Cast<object>())
            .OrderByDescending(a => ((dynamic)a).timestamp)
            .Take(limit)
            .ToList();

        return Ok(new { success = true, data = combined });
    }
}

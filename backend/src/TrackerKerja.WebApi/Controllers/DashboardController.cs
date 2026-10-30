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

    private int? ResolveTargetCompanyId(int? requestCompanyId, bool isAdmin, string currentUserId)
    {
        if (requestCompanyId.HasValue && requestCompanyId.Value > 0)
        {
            return requestCompanyId.Value;
        }

        if (!isAdmin)
        {
            return _tenantService.CompanyId;
        }

        // For Administrator:
        // 1. If explicit requestCompanyId is passed, it is used.
        // 2. If null, check if _tenantService.CompanyId has tasks.
        // 3. If _tenantService.CompanyId has no tasks, default to primary operational company with tasks!
        if (_tenantService.CompanyId.HasValue && _context.Tasks.Any(t => t.CompanyId == _tenantService.CompanyId.Value))
        {
            return _tenantService.CompanyId.Value;
        }

        var primaryCompanyId = _context.Tasks
            .Where(t => t.CompanyId.HasValue)
            .Select(t => t.CompanyId!.Value)
            .FirstOrDefault();

        return primaryCompanyId > 0 ? primaryCompanyId : _tenantService.CompanyId;
    }

    private async Task<HashSet<string>> GetImportedUserIdsAsync()
    {
        // 1. Pengguna yang memiliki penugasan tugas hasil import Excel
        var userIdsWithImportedTasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => !string.IsNullOrEmpty(t.AssignedToUserId) &&
                        t.Tags != null &&
                        (t.Tags.Contains("code:") || t.Tags.Contains("import") || t.Tags.Contains("excel") || t.Tags.Contains("TK-")))
            .Select(t => t.AssignedToUserId!)
            .Distinct()
            .ToListAsync();

        // 2. Pengguna yang dibuat atau ditandai dari proses import Excel
        var importedUsersFromDb = await _context.Users
            .AsNoTracking()
            .Where(u => u.PhoneNumber == "IMPORTED_EXCEL" ||
                        u.RejectionReason == "FROM_EXCEL_IMPORT" ||
                        (u.Id.StartsWith("usr-") && u.Id != "usr-superadmin" && u.Id.Length <= 14))
            .Select(u => u.Id)
            .ToListAsync();

        var set = new HashSet<string>(userIdsWithImportedTasks, StringComparer.OrdinalIgnoreCase);
        foreach (var id in importedUsersFromDb)
        {
            set.Add(id);
        }
        return set;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int? companyId = null)
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User?.Identity?.IsAuthenticated == true && (User?.IsInRole("Administrator") ?? false));
        var now = DateTimeOffset.UtcNow;
        var targetCompanyId = ResolveTargetCompanyId(companyId, isAdmin, currentUserId);

        // Scoping: User only counts their assigned tasks unless Administrator
        var tasksQuery = _context.Tasks.AsNoTracking().AsQueryable();
        if (targetCompanyId.HasValue)
        {
            tasksQuery = tasksQuery.Where(t => t.CompanyId == targetCompanyId.Value);
        }
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

        // Work sessions today for current user or team
        var todayStart = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var todayEnd = todayStart.AddDays(1);

        var todaySessionsQuery = _context.Sessions
            .AsNoTracking()
            .Where(s => s.StartTime >= todayStart && s.StartTime < todayEnd);

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            todaySessionsQuery = todaySessionsQuery.Where(s => s.UserId == currentUserId);
        }
        else if (targetCompanyId.HasValue)
        {
            todaySessionsQuery = todaySessionsQuery.Where(s => s.User.CompanyId == targetCompanyId.Value || s.Task.CompanyId == targetCompanyId.Value);
        }

        var todaySessions = await todaySessionsQuery.ToListAsync();

        long todayWorkSeconds = todaySessions.Sum(s =>
        {
            if (s.EndTime.HasValue) return s.Duration;
            return Math.Max(0, (long)(now - s.StartTime).TotalSeconds);
        });
        double todayWorkHours = Math.Round((double)todayWorkSeconds / 3600.0, 1);

        // Projects & Members count
        var projectsQuery = _context.Projects.AsNoTracking().AsQueryable();
        if (targetCompanyId.HasValue)
        {
            projectsQuery = projectsQuery.Where(p => p.CompanyId == targetCompanyId.Value || p.Tasks.Any(t => t.CompanyId == targetCompanyId.Value));
        }
        var totalProjects = await projectsQuery.CountAsync();
        var activeProjects = await projectsQuery.CountAsync(p => p.Status == ProjectStatus.Active);

        var membersQuery = _context.Users.AsNoTracking().Where(u => u.IsApproved);
        if (targetCompanyId.HasValue)
        {
            membersQuery = membersQuery.Where(u => u.CompanyId == targetCompanyId.Value);
        }
        var totalMembers = await membersQuery.CountAsync();

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

        // Operational integrity checks: Tasks without projects & Empty projects
        var tasksWithoutProjectQuery = _context.Tasks.AsNoTracking().Where(t => t.ProjectId == null);
        if (targetCompanyId.HasValue)
        {
            tasksWithoutProjectQuery = tasksWithoutProjectQuery.Where(t => t.CompanyId == targetCompanyId.Value);
        }
        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            tasksWithoutProjectQuery = tasksWithoutProjectQuery.Where(t => t.AssignedToUserId == currentUserId);
        }
        var tasksWithoutProjectCount = await tasksWithoutProjectQuery.CountAsync();
        var tasksWithoutProjectSample = await tasksWithoutProjectQuery
            .OrderByDescending(t => t.CreatedAt)
            .Take(5)
            .Select(t => new { t.Id, t.Title, Status = (int)t.Status })
            .ToListAsync();

        var projectsWithTaskQuery = _context.Projects.AsNoTracking().AsQueryable();
        if (targetCompanyId.HasValue)
        {
            projectsWithTaskQuery = projectsWithTaskQuery.Where(p => p.CompanyId == targetCompanyId.Value || p.Tasks.Any(t => t.CompanyId == targetCompanyId.Value));
        }
        var projectsWithTaskCount = await projectsWithTaskQuery
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Status,
                TaskCount = p.Tasks.Count(t => !targetCompanyId.HasValue || t.CompanyId == targetCompanyId.Value)
            })
            .ToListAsync();

        var emptyProjects = projectsWithTaskCount.Where(p => p.TaskCount == 0).ToList();
        var emptyProjectsCount = emptyProjects.Count;
        var emptyProjectsSample = emptyProjects.Take(5).Select(p => new { p.Id, p.Name }).ToList();

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
                },
                integrity = new
                {
                    tasksWithoutProjectCount,
                    tasksWithoutProjectSample,
                    emptyProjectsCount,
                    emptyProjectsSample
                }
            }
        });
    }

    [HttpGet("productivity")]
    public async Task<IActionResult> GetProductivityChart([FromQuery] int days = 7, [FromQuery] int? companyId = null)
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));
        var now = DateTimeOffset.UtcNow;
        var startDate = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero).AddDays(-(days - 1));
        var targetCompanyId = ResolveTargetCompanyId(companyId, isAdmin, currentUserId);

        // Fetch sessions in range
        var sessionsQuery = _context.Sessions
            .AsNoTracking()
            .Where(s => s.StartTime >= startDate);

        var adminUserIds = await _context.UserRoles
            .AsNoTracking()
            .Where(ur => ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Administrator" || r.Name == "Admin" || r.Name == "SuperAdmin")))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var adminDirectUsers = await _context.Users
            .AsNoTracking()
            .Where(u => (u.UserName != null && (u.UserName.ToLower() == "admin" || u.UserName.ToLower() == "administrator")) ||
                        (u.Email != null && u.Email.ToLower().Contains("admin@")) ||
                        (u.JobTitle != null && u.JobTitle.ToLower().Contains("administrator")))
            .Select(u => u.Id)
            .ToListAsync();
        adminUserIds.AddRange(adminDirectUsers);

        var importedUserIds = await GetImportedUserIdsAsync();
        // Administrator murni (bukan dari hasil import Excel) tidak diikutsertakan dalam chart
        var excludedAdminIds = adminUserIds.Where(id => !importedUserIds.Contains(id)).Distinct().ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            sessionsQuery = sessionsQuery.Where(s => s.UserId == currentUserId);
        }
        else
        {
            // Administrator murni tidak diikutsertakan dalam chart, tapi admin dari hasil import Excel tetap disertakan
            sessionsQuery = sessionsQuery.Where(s => !excludedAdminIds.Contains(s.UserId));
            if (targetCompanyId.HasValue)
            {
                sessionsQuery = sessionsQuery.Where(s => s.User.CompanyId == targetCompanyId.Value || s.Task.CompanyId == targetCompanyId.Value);
            }
        }

        var sessions = await sessionsQuery.ToListAsync();

        // Fetch tasks in range
        var tasksQuery = _context.Tasks
            .AsNoTracking()
            .Where(t => t.Status == Domain.Enums.TaskStatus.Done && ((t.DueDate.HasValue && t.DueDate >= startDate) || t.UpdatedAt >= startDate));

        if (targetCompanyId.HasValue)
        {
            tasksQuery = tasksQuery.Where(t => t.CompanyId == targetCompanyId.Value);
        }

        if (!isAdmin && !string.IsNullOrEmpty(currentUserId))
        {
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == currentUserId);
        }
        else
        {
            // Administrator murni tidak diikutsertakan dalam chart, tapi admin dari hasil import Excel tetap disertakan
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == null || !excludedAdminIds.Contains(t.AssignedToUserId));
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

            int tasksCount = doneTasks.Count(t =>
                (t.DueDate.HasValue && t.DueDate >= dayStart && t.DueDate < dayEnd) ||
                (t.UpdatedAt >= dayStart && t.UpdatedAt < dayEnd));

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
    public async Task<IActionResult> GetDistribution([FromQuery] int? companyId = null)
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User?.Identity?.IsAuthenticated == true && (User?.IsInRole("Administrator") ?? false));
        var targetCompanyId = ResolveTargetCompanyId(companyId, isAdmin, currentUserId);

        var tasksQuery = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .AsNoTracking()
            .AsQueryable();

        if (targetCompanyId.HasValue)
        {
            tasksQuery = tasksQuery.Where(t =>
                t.CompanyId == targetCompanyId.Value ||
                (t.Project != null && t.Project.CompanyId == targetCompanyId.Value) ||
                (t.AssignedToUser != null && t.AssignedToUser.CompanyId == targetCompanyId.Value));
        }

        var allTasks = await tasksQuery.ToListAsync();
        var totalCount = allTasks.Count;

        // 1. By Project (Top 5 + Proyek Lainnya jika ada)
        var allProjectGroups = allTasks
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
            .ToList();

        var byProject = new List<object>();
        if (allProjectGroups.Count <= 6)
        {
            byProject.AddRange(allProjectGroups);
        }
        else
        {
            byProject.AddRange(allProjectGroups.Take(5));
            var remaining = allProjectGroups.Skip(5).ToList();
            var remainingCount = remaining.Sum(r => r.value);
            var remainingDone = remaining.Sum(r => r.doneCount);
            var remainingPct = totalCount > 0 ? Math.Round((double)remainingCount / totalCount * 100, 1) : 0;
            byProject.Add(new
            {
                name = "Proyek Lainnya",
                color = "#8B5CF6",
                value = remainingCount,
                percentage = remainingPct,
                doneCount = remainingDone
            });
        }

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

        // 4. By Member (Team Workload Distribution)
        var memberColors = new[]
        {
            "#6366F1", "#10B981", "#F59E0B", "#EC4899", "#3B82F6",
            "#8B5CF6", "#06B6D4", "#F43F5E", "#14B8A6", "#84CC16"
        };

        var assignedUserIds = allTasks
            .Where(t => !string.IsNullOrEmpty(t.AssignedToUserId))
            .Select(t => t.AssignedToUserId!)
            .Distinct()
            .ToList();

        var usersQuery = _context.Users.AsNoTracking().Where(u => u.IsApproved);
        if (targetCompanyId.HasValue)
        {
            usersQuery = usersQuery.Where(u => u.CompanyId == targetCompanyId.Value || u.CompanyId == null || assignedUserIds.Contains(u.Id));
        }
        var companyUsers = await usersQuery.ToListAsync();

        var adminRoleUserIds = await _context.UserRoles
            .AsNoTracking()
            .Where(ur => ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Administrator" || r.Name == "Admin" || r.Name == "SuperAdmin")))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var importedUserIds = await GetImportedUserIdsAsync();

        // Aturan:
        // 1. Jika role = "admin" (murni), maka tidak perlu ditampilkan di dashboard tentang datanya.
        // 2. Jika role = "admin" dan datang dari hasil import data excel, maka ia tetap bisa menjadi admin dan ditampilkan data chart di dashboard nya!
        var dashboardMembers = companyUsers.Where(u =>
        {
            var isImported = importedUserIds.Contains(u.Id);
            if (isImported)
            {
                // Pengguna dari hasil import Excel SELALU ditampilkan di chart dashboard (meskipun ber-role admin)
                return true;
            }

            // Jika bukan dari import, sembunyikan jika ber-role admin murni sistem
            var isAdminRole = adminRoleUserIds.Contains(u.Id);
            var isAdminByName = (u.UserName != null && (u.UserName.Equals("admin", StringComparison.OrdinalIgnoreCase) || u.UserName.Equals("administrator", StringComparison.OrdinalIgnoreCase))) ||
                                (u.Email != null && u.Email.Contains("admin@", StringComparison.OrdinalIgnoreCase)) ||
                                (u.JobTitle != null && (u.JobTitle.Contains("Administrator", StringComparison.OrdinalIgnoreCase) || u.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase))) ||
                                (u.FullName != null && (u.FullName.Contains("Administrator", StringComparison.OrdinalIgnoreCase) || u.FullName.StartsWith("Admin ", StringComparison.OrdinalIgnoreCase)));

            return !isAdminRole && !isAdminByName;
        }).ToList();

        var byMember = dashboardMembers
            .Select((u, idx) =>
            {
                var userTasks = allTasks.Where(t => t.AssignedToUserId == u.Id).ToList();
                var count = userTasks.Count;
                var inProgress = userTasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
                var done = userTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
                var pct = totalCount > 0 ? Math.Round((double)count / totalCount * 100, 1) : 0;
                var memberProjects = userTasks
                    .Where(t => t.Project != null)
                    .Select(t => t.Project!.Name)
                    .Distinct()
                    .ToList();

                var projectBreakdown = userTasks
                    .GroupBy(t => t.Project != null ? t.Project.Name : "Tanpa Proyek")
                    .Select(g => new
                    {
                        projectName = g.Key,
                        count = g.Count(),
                        color = g.First().Project?.Color ?? "#94A3B8"
                    })
                    .OrderByDescending(p => p.count)
                    .ToList();

                var displayName = !string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : (u.UserName ?? "Anggota");

                return new
                {
                    userId = u.Id,
                    name = displayName,
                    userName = u.UserName,
                    jobTitle = u.JobTitle ?? "Anggota Tim",
                    avatarUrl = u.ProfilePictureUrl,
                    color = !string.IsNullOrWhiteSpace(u.AvatarColor) ? u.AvatarColor : memberColors[idx % memberColors.Length],
                    value = count,
                    inProgressCount = inProgress,
                    doneCount = done,
                    percentage = pct,
                    projects = memberProjects,
                    projectBreakdown
                };
            })
            .OrderByDescending(m => m.value)
            .ThenBy(m => m.name)
            .ToList();

        // Include unassigned tasks if any
        var unassignedTasks = allTasks.Where(t => string.IsNullOrEmpty(t.AssignedToUserId)).ToList();
        if (unassignedTasks.Count > 0)
        {
            var unassignedCount = unassignedTasks.Count;
            var unassignedDone = unassignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
            var unassignedInProgress = unassignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
            var unassignedPct = totalCount > 0 ? Math.Round((double)unassignedCount / totalCount * 100, 1) : 0;
            var unassignedProjects = unassignedTasks
                .Where(t => t.Project != null)
                .Select(t => t.Project!.Name)
                .Distinct()
                .ToList();

            var unassignedProjectBreakdown = unassignedTasks
                .GroupBy(t => t.Project != null ? t.Project.Name : "Tanpa Proyek")
                .Select(g => new
                {
                    projectName = g.Key,
                    count = g.Count(),
                    color = g.First().Project?.Color ?? "#94A3B8"
                })
                .OrderByDescending(p => p.count)
                .ToList();

            byMember.Add(new
            {
                userId = "unassigned",
                name = "Belum Ditugaskan",
                userName = (string?)null,
                jobTitle = "Pending Alokasi",
                avatarUrl = (string?)null,
                color = "#94A3B8",
                value = unassignedCount,
                inProgressCount = unassignedInProgress,
                doneCount = unassignedDone,
                percentage = unassignedPct,
                projects = unassignedProjects,
                projectBreakdown = unassignedProjectBreakdown
            });
        }

        // Include other tasks assigned to excluded users (e.g., pure system admin) if any, to keep total in sync
        var coveredMemberIds = dashboardMembers.Select(m => m.Id).ToHashSet();
        var otherAssignedTasks = allTasks
            .Where(t => !string.IsNullOrEmpty(t.AssignedToUserId) && !coveredMemberIds.Contains(t.AssignedToUserId!))
            .ToList();

        if (otherAssignedTasks.Count > 0)
        {
            var otherCount = otherAssignedTasks.Count;
            var otherDone = otherAssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
            var otherInProgress = otherAssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
            var otherPct = totalCount > 0 ? Math.Round((double)otherCount / totalCount * 100, 1) : 0;
            var otherProjects = otherAssignedTasks
                .Where(t => t.Project != null)
                .Select(t => t.Project!.Name)
                .Distinct()
                .ToList();

            var otherProjectBreakdown = otherAssignedTasks
                .GroupBy(t => t.Project != null ? t.Project.Name : "Tanpa Proyek")
                .Select(g => new
                {
                    projectName = g.Key,
                    count = g.Count(),
                    color = g.First().Project?.Color ?? "#64748B"
                })
                .OrderByDescending(p => p.count)
                .ToList();

            byMember.Add(new
            {
                userId = "other-admins",
                name = "Admin / Lainnya",
                userName = (string?)null,
                jobTitle = "Administrator Sistem",
                avatarUrl = (string?)null,
                color = "#64748B",
                value = otherCount,
                inProgressCount = otherInProgress,
                doneCount = otherDone,
                percentage = otherPct,
                projects = otherProjects,
                projectBreakdown = otherProjectBreakdown
            });
        }

        // Top 5 projects for member vs project workload matrix
        var topProjectsList = allTasks
            .Where(t => t.Project != null)
            .GroupBy(t => t.Project!.Name)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => g.Key)
            .ToList();

        var byMemberProject = dashboardMembers
            .Where(u => allTasks.Any(t => t.AssignedToUserId == u.Id))
            .Select(u =>
            {
                var userTasks = allTasks.Where(t => t.AssignedToUserId == u.Id).ToList();
                var row = new Dictionary<string, object>
                {
                    ["userId"] = u.Id,
                    ["name"] = !string.IsNullOrWhiteSpace(u.FullName) ? u.FullName : (u.UserName ?? "Anggota"),
                    ["total"] = userTasks.Count
                };
                foreach (var proj in topProjectsList)
                {
                    row[proj] = userTasks.Count(t => t.Project?.Name == proj);
                }
                var otherProjCount = userTasks.Count(t => t.Project != null && !topProjectsList.Contains(t.Project.Name));
                if (otherProjCount > 0) row["Proyek Lainnya"] = otherProjCount;

                var noProjCount = userTasks.Count(t => t.Project == null);
                if (noProjCount > 0) row["Tanpa Proyek"] = noProjCount;

                return row;
            })
            .OrderByDescending(r => (int)r["total"])
            .ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                totalTasks = totalCount,
                byProject,
                byStatus,
                byPriority,
                byMember,
                byMemberProject,
                topProjects = topProjectsList
            }
        });
    }

    [HttpGet("activities")]
    public async Task<IActionResult> GetRecentActivities([FromQuery] int limit = 10, [FromQuery] int? companyId = null)
    {
        var currentUserId = _tenantService.UserId ?? string.Empty;
        var isAdmin = _tenantService.IsAdmin || (User?.Identity?.IsAuthenticated == true && (User?.IsInRole("Administrator") ?? false));
        var targetCompanyId = ResolveTargetCompanyId(companyId, isAdmin, currentUserId);

        // Recent Work Sessions
        var sessionsQuery = _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .Include(s => s.User)
            .AsNoTracking()
            .AsQueryable();

        if (targetCompanyId.HasValue)
        {
            sessionsQuery = sessionsQuery.Where(s => s.User.CompanyId == targetCompanyId.Value || s.Task.CompanyId == targetCompanyId.Value);
        }

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

        if (targetCompanyId.HasValue)
        {
            tasksQuery = tasksQuery.Where(t => t.CompanyId == targetCompanyId.Value);
        }

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

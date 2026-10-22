using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using DomainTaskStatus = TrackerKerja.Domain.Enums.TaskStatus;

namespace TrackerKerja.Infrastructure.Services;

/// <summary>
/// Layanan pelaporan: laporan timesheet &amp; tugas (grouping Project → Milestone),
/// serta achievement anggota (tugas + jam kerja). Mendukung ekspor Excel.
/// </summary>
public class ReportService : IReportService
{
    private const string NoMilestone = "Tanpa Milestone";
    private const string NoProject = "Tanpa Proyek";
    private const string DefaultColor = "#6366F1";

    private static readonly string[] AvatarPalette =
    {
        "#6366F1", "#10B981", "#F59E0B", "#EC4899", "#3B82F6",
        "#8B5CF6", "#06B6D4", "#F43F5E", "#14B8A6", "#84CC16"
    };

    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    // =========================================================================
    // Helpers
    // =========================================================================
    private static bool IsDone(WorkTask t) => t.Status == DomainTaskStatus.Done || t.Progress >= 100;

    private static bool IsOverdue(WorkTask t, DateTimeOffset now) =>
        !IsDone(t) && t.DueDate.HasValue && t.DueDate.Value < now;

    private static string MilestoneOf(WorkTask t) =>
        string.IsNullOrWhiteSpace(t.Milestone) ? NoMilestone : t.Milestone.Trim();

    private static long SessionSeconds(WorkSession s, DateTimeOffset now) =>
        s.EndTime.HasValue ? s.Duration : Math.Max(0, (long)(now - s.StartTime).TotalSeconds);

    private static double ToHours(long seconds) => Math.Round(seconds / 3600.0, 2);

    private static string DisplayName(AppUser? u, string fallback) =>
        !string.IsNullOrWhiteSpace(u?.FullName) ? u!.FullName! : (u?.UserName ?? fallback);

    private static bool TaskInDateRange(WorkTask t, ReportFilter f)
    {
        var anchor = t.DueDate ?? t.StartDate ?? t.CreatedAt;
        if (f.StartDate.HasValue && anchor < f.StartDate.Value) return false;
        if (f.EndDate.HasValue && anchor > f.EndDate.Value) return false;
        return true;
    }

    private static bool MilestoneMatches(WorkTask t, ReportFilter f) =>
        string.IsNullOrWhiteSpace(f.Milestone) ||
        string.Equals(MilestoneOf(t), f.Milestone.Trim(), StringComparison.OrdinalIgnoreCase);

    private async Task<List<WorkTask>> LoadTasksAsync(
        ReportFilter filter, int? companyId, string currentUserId, bool isAdmin,
        bool applyUserFilter, CancellationToken ct)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedToUser)
            .AsNoTracking()
            .AsQueryable();

        if (companyId.HasValue)
        {
            var cid = companyId.Value;
            query = query.Where(t =>
                t.CompanyId == cid ||
                (t.Project != null && t.Project.CompanyId == cid) ||
                (t.AssignedToUser != null && t.AssignedToUser.CompanyId == cid));
        }

        if (!isAdmin)
        {
            query = query.Where(t => t.AssignedToUserId == currentUserId);
        }
        else if (applyUserFilter && !string.IsNullOrWhiteSpace(filter.UserId))
        {
            query = query.Where(t => t.AssignedToUserId == filter.UserId);
        }

        if (filter.ProjectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == filter.ProjectId.Value);
        }

        var list = await query.ToListAsync(ct);
        return list.Where(t => MilestoneMatches(t, filter) && TaskInDateRange(t, filter)).ToList();
    }

    private async Task<List<WorkSession>> LoadSessionsAsync(
        ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct)
    {
        var query = _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .Include(s => s.User)
            .AsNoTracking()
            .AsQueryable();

        if (companyId.HasValue)
        {
            var cid = companyId.Value;
            query = query.Where(s =>
                s.Task.CompanyId == cid ||
                (s.Task.Project != null && s.Task.Project.CompanyId == cid) ||
                (s.User != null && s.User.CompanyId == cid));
        }

        if (!isAdmin)
        {
            query = query.Where(s => s.UserId == currentUserId);
        }
        else if (!string.IsNullOrWhiteSpace(filter.UserId))
        {
            query = query.Where(s => s.UserId == filter.UserId);
        }

        if (filter.ProjectId.HasValue)
        {
            query = query.Where(s => s.Task.ProjectId == filter.ProjectId.Value);
        }

        var list = await query.ToListAsync(ct);
        return list.Where(s =>
            MilestoneMatches(s.Task, filter) &&
            (!filter.StartDate.HasValue || s.StartTime >= filter.StartDate.Value) &&
            (!filter.EndDate.HasValue || s.StartTime <= filter.EndDate.Value)).ToList();
    }

    // =========================================================================
    // Laporan Timesheet
    // =========================================================================
    public async Task<TimesheetReportDto> GetTimesheetReportAsync(
        ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var sessions = await LoadSessionsAsync(filter, companyId, currentUserId, isAdmin, ct);

        var projects = sessions
            .GroupBy(s => s.Task.ProjectId)
            .Select(pg =>
            {
                var first = pg.First().Task.Project;
                var milestones = pg
                    .GroupBy(s => MilestoneOf(s.Task))
                    .Select(mg =>
                    {
                        var tasks = mg
                            .GroupBy(s => s.TaskId)
                            .Select(tg =>
                            {
                                var task = tg.First().Task;
                                var members = tg
                                    .GroupBy(s => s.UserId)
                                    .Select(ug =>
                                    {
                                        var secs = ug.Sum(x => SessionSeconds(x, now));
                                        return new ReportMemberHoursDto(
                                            ug.Key, DisplayName(ug.First().User, ug.Key), secs, ToHours(secs));
                                    })
                                    .OrderByDescending(m => m.Seconds)
                                    .ToList();

                                var secsTask = tg.Sum(x => SessionSeconds(x, now));
                                return new TimesheetTaskRowDto(
                                    task.Id, task.Title, task.Status.ToString(), task.Progress,
                                    tg.Count(), secsTask, ToHours(secsTask), members);
                            })
                            .OrderByDescending(t => t.Seconds)
                            .ToList();

                        var secsM = tasks.Sum(t => t.Seconds);
                        return new TimesheetMilestoneGroupDto(
                            mg.Key, tasks.Count, mg.Count(), secsM, ToHours(secsM), tasks);
                    })
                    .OrderByDescending(m => m.Seconds)
                    .ToList();

                var secsP = milestones.Sum(m => m.Seconds);
                return new TimesheetProjectGroupDto(
                    pg.Key,
                    first?.Name ?? NoProject,
                    first?.Color ?? DefaultColor,
                    milestones.Sum(m => m.TaskCount),
                    pg.Count(),
                    secsP,
                    ToHours(secsP),
                    Math.Round(secsP / 3600.0 / 8.0, 2),
                    milestones);
            })
            .OrderByDescending(p => p.Seconds)
            .ToList();

        var total = projects.Sum(p => p.Seconds);
        return new TimesheetReportDto(
            total, ToHours(total), Math.Round(total / 3600.0 / 8.0, 2),
            sessions.Count, projects.Sum(p => p.TaskCount), projects);
    }

    // =========================================================================
    // Laporan Tugas
    // =========================================================================
    public async Task<TaskReportDto> GetTaskReportAsync(
        ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var tasks = await LoadTasksAsync(filter, companyId, currentUserId, isAdmin, true, ct);
        var taskIds = tasks.Select(t => t.Id).ToList();

        var hoursByTask = (await _context.Sessions
                .AsNoTracking()
                .Where(s => taskIds.Contains(s.TaskId))
                .ToListAsync(ct))
            .GroupBy(s => s.TaskId)
            .ToDictionary(g => g.Key, g => g.Sum(x => SessionSeconds(x, now)));

        double HoursOf(WorkTask t) => hoursByTask.TryGetValue(t.Id, out var s) ? ToHours(s) : 0;

        var projects = tasks
            .GroupBy(t => t.ProjectId)
            .Select(pg =>
            {
                var first = pg.First().Project;
                var milestones = pg
                    .GroupBy(MilestoneOf)
                    .Select(mg =>
                    {
                        var rows = mg
                            .OrderBy(t => t.DueDate ?? t.CreatedAt)
                            .Select(t => new TaskReportRowDto(
                                t.Id, t.Title, t.Priority.ToString(), t.Status.ToString(), t.Progress,
                                t.AssignedToUserId,
                                t.AssignedToUser != null ? DisplayName(t.AssignedToUser, "-") : "Belum Ditugaskan",
                                t.StartDate, t.DueDate, IsOverdue(t, now), HoursOf(t)))
                            .ToList();

                        return new TaskMilestoneGroupDto(
                            mg.Key, rows.Count, mg.Count(IsDone), mg.Count(t => IsOverdue(t, now)),
                            Math.Round(mg.Average(t => (double)t.Progress), 1),
                            Math.Round(rows.Sum(r => r.LoggedHours), 2), rows);
                    })
                    .OrderBy(m => m.Milestone == NoMilestone ? 1 : 0)
                    .ThenBy(m => m.Milestone)
                    .ToList();

                return new TaskProjectGroupDto(
                    pg.Key, first?.Name ?? NoProject, first?.Color ?? DefaultColor,
                    pg.Count(), pg.Count(IsDone), pg.Count(t => IsOverdue(t, now)),
                    Math.Round(pg.Average(t => (double)t.Progress), 1),
                    Math.Round(milestones.Sum(m => m.LoggedHours), 2), milestones);
            })
            .OrderBy(p => p.ProjectName)
            .ToList();

        var done = tasks.Count(IsDone);
        return new TaskReportDto(
            tasks.Count,
            done,
            tasks.Count(t => !IsDone(t) && t.Status == DomainTaskStatus.InProgress),
            tasks.Count(t => !IsDone(t) && t.Status == DomainTaskStatus.Todo),
            tasks.Count(t => IsOverdue(t, now)),
            tasks.Count > 0 ? Math.Round(done * 100.0 / tasks.Count, 1) : 0,
            tasks.Count > 0 ? Math.Round(tasks.Average(t => (double)t.Progress), 1) : 0,
            projects);
    }

    // =========================================================================
    // Achievement Anggota
    // =========================================================================
    public async Task<MemberReportDto> GetMemberReportAsync(
        ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default)
    {
        var now = DateTimeOffset.UtcNow;
        var tasks = await LoadTasksAsync(filter, companyId, currentUserId, isAdmin, true, ct);
        var sessions = await LoadSessionsAsync(filter, companyId, currentUserId, isAdmin, ct);

        var userIds = tasks.Where(t => t.AssignedToUserId != null).Select(t => t.AssignedToUserId!)
            .Concat(sessions.Select(s => s.UserId))
            .Distinct()
            .ToList();

        var users = await _context.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var members = userIds
            .Select((uid, idx) =>
            {
                users.TryGetValue(uid, out var u);
                var myTasks = tasks.Where(t => t.AssignedToUserId == uid).ToList();
                var mySessions = sessions.Where(s => s.UserId == uid).ToList();
                var secs = mySessions.Sum(s => SessionSeconds(s, now));
                var done = myTasks.Count(IsDone);
                var doneOnTime = myTasks.Count(t => IsDone(t) && (!t.DueDate.HasValue || t.UpdatedAt <= t.DueDate.Value));

                return new MemberAchievementDto(
                    uid,
                    DisplayName(u, uid),
                    u?.JobTitle,
                    u?.ProfilePictureUrl,
                    !string.IsNullOrWhiteSpace(u?.AvatarColor) ? u!.AvatarColor! : AvatarPalette[idx % AvatarPalette.Length],
                    myTasks.Count,
                    done,
                    myTasks.Count(t => !IsDone(t) && t.Status == DomainTaskStatus.InProgress),
                    myTasks.Count(t => IsOverdue(t, now)),
                    doneOnTime,
                    myTasks.Count > 0 ? Math.Round(done * 100.0 / myTasks.Count, 1) : 0,
                    myTasks.Count > 0 ? Math.Round(myTasks.Average(t => (double)t.Progress), 1) : 0,
                    mySessions.Count,
                    secs,
                    ToHours(secs),
                    Math.Round(secs / 3600.0 / 8.0, 2),
                    myTasks.Where(t => t.ProjectId.HasValue).Select(t => t.ProjectId).Distinct().Count());
            })
            .OrderByDescending(m => m.CompletionRate)
            .ThenByDescending(m => m.DoneTasks)
            .ThenByDescending(m => m.Seconds)
            .ToList();

        return new MemberReportDto(
            members.Count,
            members.Sum(m => m.TotalTasks),
            members.Sum(m => m.DoneTasks),
            Math.Round(members.Sum(m => m.Hours), 2),
            members);
    }

    // =========================================================================
    // Opsi Filter
    // =========================================================================
    public async Task<ReportFilterOptionsDto> GetFilterOptionsAsync(
        int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default)
    {
        var projectsQuery = _context.Projects.AsNoTracking().AsQueryable();
        var usersQuery = _context.Users.AsNoTracking().Where(u => u.IsApproved);
        var tasksQuery = _context.Tasks.AsNoTracking().Where(t => t.Milestone != null && t.Milestone != "");

        if (companyId.HasValue)
        {
            var cid = companyId.Value;
            projectsQuery = projectsQuery.Where(p => p.CompanyId == cid);
            usersQuery = usersQuery.Where(u => u.CompanyId == cid);
            tasksQuery = tasksQuery.Where(t => t.CompanyId == cid);
        }

        if (!isAdmin)
        {
            usersQuery = usersQuery.Where(u => u.Id == currentUserId);
        }

        var projects = await projectsQuery.OrderBy(p => p.Name)
            .Select(p => new ReportOptionDto(p.Id.ToString(), p.Name)).ToListAsync(ct);

        var members = (await usersQuery.ToListAsync(ct))
            .Select(u => new ReportOptionDto(u.Id, DisplayName(u, u.Id)))
            .OrderBy(m => m.Name).ToList();

        var milestones = await tasksQuery.Select(t => t.Milestone!).Distinct().OrderBy(m => m).ToListAsync(ct);

        return new ReportFilterOptionsDto(projects, members, milestones);
    }

    // =========================================================================
    // Ekspor Excel
    // =========================================================================
    public async Task<byte[]> ExportExcelAsync(
        string type, ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default)
    {
        using var workbook = new XLWorkbook();

        switch (type.ToLowerInvariant())
        {
            case "tasks":
                BuildTaskSheet(workbook, await GetTaskReportAsync(filter, companyId, currentUserId, isAdmin, ct));
                break;
            case "members":
                BuildMemberSheet(workbook, await GetMemberReportAsync(filter, companyId, currentUserId, isAdmin, ct));
                break;
            default:
                BuildTimesheetSheet(workbook, await GetTimesheetReportAsync(filter, companyId, currentUserId, isAdmin, ct));
                break;
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void Title(IXLWorksheet ws, string title)
    {
        ws.Cell(1, 1).Value = title;
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#4F46E5");
        ws.Cell(2, 1).Value = $"Dibuat: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";
        ws.Cell(2, 1).Style.Font.Italic = true;
        ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#64748B");
    }

    private static void Header(IXLWorksheet ws, int row, string[] headers)
    {
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(row, i + 1);
            cell.Value = headers[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }
    }

    private static void SubtotalRow(IXLWorksheet ws, int row, int cols, string hex)
    {
        var range = ws.Range(row, 1, row, cols);
        range.Style.Font.Bold = true;
        range.Style.Fill.BackgroundColor = XLColor.FromHtml(hex);
    }

    private static void BuildTimesheetSheet(XLWorkbook wb, TimesheetReportDto report)
    {
        var ws = wb.Worksheets.Add("Laporan Timesheet");
        Title(ws, "LAPORAN TIMESHEET (PROYEK → MILESTONE → TUGAS)");
        Header(ws, 4, new[] { "Proyek", "Milestone", "Tugas", "Anggota", "Sesi", "Jam Kerja", "Man-Days" });

        int row = 5;
        foreach (var p in report.Projects)
        {
            foreach (var m in p.Milestones)
            {
                foreach (var t in m.Tasks)
                {
                    foreach (var mem in t.Members)
                    {
                        ws.Cell(row, 1).Value = p.ProjectName;
                        ws.Cell(row, 2).Value = m.Milestone;
                        ws.Cell(row, 3).Value = t.Title;
                        ws.Cell(row, 4).Value = mem.UserName;
                        ws.Cell(row, 5).Value = "";
                        ws.Cell(row, 6).Value = mem.Hours;
                        ws.Cell(row, 7).Value = Math.Round(mem.Hours / 8.0, 2);
                        row++;
                    }
                }

                ws.Cell(row, 1).Value = p.ProjectName;
                ws.Cell(row, 2).Value = $"Subtotal Milestone: {m.Milestone}";
                ws.Cell(row, 5).Value = m.SessionCount;
                ws.Cell(row, 6).Value = m.Hours;
                ws.Cell(row, 7).Value = Math.Round(m.Hours / 8.0, 2);
                SubtotalRow(ws, row, 7, "#EEF2FF");
                row++;
            }

            ws.Cell(row, 1).Value = $"TOTAL PROYEK: {p.ProjectName}";
            ws.Cell(row, 5).Value = p.SessionCount;
            ws.Cell(row, 6).Value = p.Hours;
            ws.Cell(row, 7).Value = p.ManDays;
            SubtotalRow(ws, row, 7, "#C7D2FE");
            row++;
        }

        ws.Cell(row, 1).Value = "TOTAL KESELURUHAN";
        ws.Cell(row, 5).Value = report.TotalSessions;
        ws.Cell(row, 6).Value = report.TotalHours;
        ws.Cell(row, 7).Value = report.TotalManDays;
        SubtotalRow(ws, row, 7, "#A5B4FC");

        ws.Columns().AdjustToContents();
    }

    private static void BuildTaskSheet(XLWorkbook wb, TaskReportDto report)
    {
        var ws = wb.Worksheets.Add("Laporan Tugas");
        Title(ws, "LAPORAN TUGAS (PROYEK → MILESTONE)");
        Header(ws, 4, new[] { "Proyek", "Milestone", "Tugas", "Prioritas", "Status", "Progres (%)", "PIC", "Tenggat", "Jam Kerja" });

        int row = 5;
        foreach (var p in report.Projects)
        {
            foreach (var m in p.Milestones)
            {
                foreach (var t in m.Tasks)
                {
                    ws.Cell(row, 1).Value = p.ProjectName;
                    ws.Cell(row, 2).Value = m.Milestone;
                    ws.Cell(row, 3).Value = t.Title;
                    ws.Cell(row, 4).Value = t.Priority;
                    ws.Cell(row, 5).Value = t.IsOverdue ? $"{t.Status} (Overdue)" : t.Status;
                    ws.Cell(row, 6).Value = t.Progress;
                    ws.Cell(row, 7).Value = t.AssigneeName;
                    ws.Cell(row, 8).Value = t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : "-";
                    ws.Cell(row, 9).Value = t.LoggedHours;
                    row++;
                }

                ws.Cell(row, 1).Value = p.ProjectName;
                ws.Cell(row, 2).Value = $"Subtotal: {m.Milestone} ({m.DoneTasks}/{m.TotalTasks} selesai)";
                ws.Cell(row, 6).Value = m.AvgProgress;
                ws.Cell(row, 9).Value = m.LoggedHours;
                SubtotalRow(ws, row, 9, "#EEF2FF");
                row++;
            }

            ws.Cell(row, 1).Value = $"TOTAL PROYEK: {p.ProjectName} ({p.DoneTasks}/{p.TotalTasks} selesai)";
            ws.Cell(row, 6).Value = p.AvgProgress;
            ws.Cell(row, 9).Value = p.LoggedHours;
            SubtotalRow(ws, row, 9, "#C7D2FE");
            row++;
        }

        ws.Columns().AdjustToContents();
    }

    private static void BuildMemberSheet(XLWorkbook wb, MemberReportDto report)
    {
        var ws = wb.Worksheets.Add("Achievement Anggota");
        Title(ws, "ACHIEVEMENT ANGGOTA (TUGAS & JAM KERJA)");
        Header(ws, 4, new[]
        {
            "No", "Anggota", "Jabatan", "Total Tugas", "Selesai", "Berjalan", "Overdue",
            "Selesai Tepat Waktu", "Pencapaian (%)", "Rata-rata Progres (%)", "Sesi", "Jam Kerja", "Man-Days"
        });

        int row = 5;
        foreach (var m in report.Members)
        {
            ws.Cell(row, 1).Value = row - 4;
            ws.Cell(row, 2).Value = m.UserName;
            ws.Cell(row, 3).Value = m.JobTitle ?? "-";
            ws.Cell(row, 4).Value = m.TotalTasks;
            ws.Cell(row, 5).Value = m.DoneTasks;
            ws.Cell(row, 6).Value = m.InProgressTasks;
            ws.Cell(row, 7).Value = m.OverdueTasks;
            ws.Cell(row, 8).Value = m.DoneOnTime;
            ws.Cell(row, 9).Value = m.CompletionRate;
            ws.Cell(row, 10).Value = m.AvgProgress;
            ws.Cell(row, 11).Value = m.SessionCount;
            ws.Cell(row, 12).Value = m.Hours;
            ws.Cell(row, 13).Value = m.ManDays;
            row++;
        }

        ws.Cell(row, 2).Value = "TOTAL";
        ws.Cell(row, 4).Value = report.TotalTasks;
        ws.Cell(row, 5).Value = report.DoneTasks;
        ws.Cell(row, 12).Value = report.TotalHours;
        SubtotalRow(ws, row, 13, "#C7D2FE");

        ws.Columns().AdjustToContents();
    }
}

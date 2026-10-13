using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class ClosedXmlExportService : IExcelExportService
{
    private readonly AppDbContext _context;

    public ClosedXmlExportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> GenerateTimesheetExcelAsync(TimesheetExportFilter filter, int? companyId)
    {
        var query = _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .Include(s => s.User)
            .AsNoTracking()
            .AsQueryable();

        if (companyId.HasValue)
        {
            query = query.Where(s => s.Task.CompanyId == companyId.Value);
        }

        if (filter.ProjectId.HasValue)
        {
            query = query.Where(s => s.Task.ProjectId == filter.ProjectId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.UserId))
        {
            query = query.Where(s => s.UserId == filter.UserId);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(s => s.StartTime >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(s => s.StartTime <= filter.EndDate.Value);
        }

        var sessions = await query.OrderByDescending(s => s.StartTime).ToListAsync();

        using var workbook = new XLWorkbook();

        // =========================================================================
        // SHEET 1: Rincian Sesi Harian
        // =========================================================================
        var wsDaily = workbook.Worksheets.Add("Rincian Sesi Harian");

        wsDaily.Cell(1, 1).Value = "LAPORAN RINCIAN TIMESHEET KERJA";
        wsDaily.Cell(1, 1).Style.Font.Bold = true;
        wsDaily.Cell(1, 1).Style.Font.FontSize = 14;
        wsDaily.Cell(1, 1).Style.Font.FontColor = XLColor.Indigo;

        string[] dailyHeaders = { "No", "Tanggal", "Tugas", "Proyek", "PIC", "Mulai", "Selesai", "Durasi (Jam)", "Catatan" };
        for (int i = 0; i < dailyHeaders.Length; i++)
        {
            var cell = wsDaily.Cell(3, i + 1);
            cell.Value = dailyHeaders[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int rowDaily = 4;
        foreach (var s in sessions)
        {
            double hours = Math.Round(s.Duration / 3600.0, 2);

            wsDaily.Cell(rowDaily, 1).Value = rowDaily - 3;
            wsDaily.Cell(rowDaily, 2).Value = s.StartTime.ToString("yyyy-MM-dd");
            wsDaily.Cell(rowDaily, 3).Value = s.Task.Title;
            wsDaily.Cell(rowDaily, 4).Value = s.Task.Project?.Name ?? "-";
            wsDaily.Cell(rowDaily, 5).Value = s.User?.FullName ?? s.UserId;
            wsDaily.Cell(rowDaily, 6).Value = s.StartTime.ToString("HH:mm");
            wsDaily.Cell(rowDaily, 7).Value = s.EndTime.HasValue ? s.EndTime.Value.ToString("HH:mm") : "Aktif";
            wsDaily.Cell(rowDaily, 8).Value = hours;
            wsDaily.Cell(rowDaily, 9).Value = s.Notes ?? "-";
            rowDaily++;
        }

        if (sessions.Count > 0)
        {
            wsDaily.Cell(rowDaily, 7).Value = "TOTAL JAM:";
            wsDaily.Cell(rowDaily, 7).Style.Font.Bold = true;
            wsDaily.Cell(rowDaily, 8).FormulaA1 = $"SUM(H4:H{rowDaily - 1})";
            wsDaily.Cell(rowDaily, 8).Style.Font.Bold = true;
            wsDaily.Cell(rowDaily, 8).Style.Fill.BackgroundColor = XLColor.FromHtml("#EEF2FF");
        }

        wsDaily.Columns().AdjustToContents();

        // =========================================================================
        // SHEET 2: Rekapitulasi Proyek & Man-Days
        // =========================================================================
        var wsProject = workbook.Worksheets.Add("Rekapitulasi Proyek");

        wsProject.Cell(1, 1).Value = "REKAPITULASI PROYEK & MAN-DAYS (MD)";
        wsProject.Cell(1, 1).Style.Font.Bold = true;
        wsProject.Cell(1, 1).Style.Font.FontSize = 14;
        wsProject.Cell(1, 1).Style.Font.FontColor = XLColor.Indigo;

        string[] projectHeaders = { "No", "Nama Proyek", "Total Sesi", "Total Jam Kerja", "Man-Days (8 Jam/Hari)" };
        for (int i = 0; i < projectHeaders.Length; i++)
        {
            var cell = wsProject.Cell(3, i + 1);
            cell.Value = projectHeaders[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        var projectGroups = sessions
            .GroupBy(s => s.Task.Project?.Name ?? "Tanpa Proyek")
            .OrderByDescending(g => g.Sum(x => x.Duration))
            .ToList();

        int rowProj = 4;
        foreach (var grp in projectGroups)
        {
            double totalHours = Math.Round(grp.Sum(x => x.Duration) / 3600.0, 2);
            double manDays = Math.Round(totalHours / 8.0, 2);

            wsProject.Cell(rowProj, 1).Value = rowProj - 3;
            wsProject.Cell(rowProj, 2).Value = grp.Key;
            wsProject.Cell(rowProj, 3).Value = grp.Count();
            wsProject.Cell(rowProj, 4).Value = totalHours;
            wsProject.Cell(rowProj, 5).Value = manDays;
            rowProj++;
        }

        if (projectGroups.Count > 0)
        {
            wsProject.Cell(rowProj, 2).Value = "TOTAL REKAP:";
            wsProject.Cell(rowProj, 2).Style.Font.Bold = true;
            wsProject.Cell(rowProj, 4).FormulaA1 = $"SUM(D4:D{rowProj - 1})";
            wsProject.Cell(rowProj, 4).Style.Font.Bold = true;
            wsProject.Cell(rowProj, 5).FormulaA1 = $"SUM(E4:E{rowProj - 1})";
            wsProject.Cell(rowProj, 5).Style.Font.Bold = true;
        }

        wsProject.Columns().AdjustToContents();

        // =========================================================================
        // SHEET 3: Kontribusi Anggota Tim
        // =========================================================================
        var wsMember = workbook.Worksheets.Add("Kontribusi Anggota");

        wsMember.Cell(1, 1).Value = "KONTRIBUSI JAM KERJA ANGGOTA TIM";
        wsMember.Cell(1, 1).Style.Font.Bold = true;
        wsMember.Cell(1, 1).Style.Font.FontSize = 14;
        wsMember.Cell(1, 1).Style.Font.FontColor = XLColor.Indigo;

        string[] memberHeaders = { "No", "Nama Personel", "Total Sesi", "Total Jam Kerja", "Rata-rata Jam/Sesi" };
        for (int i = 0; i < memberHeaders.Length; i++)
        {
            var cell = wsMember.Cell(3, i + 1);
            cell.Value = memberHeaders[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        var memberGroups = sessions
            .GroupBy(s => s.User?.FullName ?? s.UserId)
            .OrderByDescending(g => g.Sum(x => x.Duration))
            .ToList();

        int rowMem = 4;
        foreach (var grp in memberGroups)
        {
            double totalHours = Math.Round(grp.Sum(x => x.Duration) / 3600.0, 2);
            double avgHours = grp.Any() ? Math.Round(totalHours / grp.Count(), 2) : 0.0;

            wsMember.Cell(rowMem, 1).Value = rowMem - 3;
            wsMember.Cell(rowMem, 2).Value = grp.Key;
            wsMember.Cell(rowMem, 3).Value = grp.Count();
            wsMember.Cell(rowMem, 4).Value = totalHours;
            wsMember.Cell(rowMem, 5).Value = avgHours;
            rowMem++;
        }

        wsMember.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<byte[]> GenerateTasksExcelAsync(
        TaskExportFilterDto filter,
        int? companyId,
        string currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .Include(t => t.ParentTask)
            .Include(t => t.Sessions)
            .AsNoTracking()
            .AsQueryable();

        if (companyId.HasValue)
        {
            query = query.Where(t => t.CompanyId == companyId.Value);
        }

        // RBAC Scoping: non-admin or explicit "mine" filter is strictly scoped
        if (!isAdmin || filter.Scope?.ToLowerInvariant() == "mine")
        {
            query = query.Where(t => t.AssignedToUserId == currentUserId);
        }

        if (filter.ProjectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == filter.ProjectId.Value);
        }

        if (filter.Status.HasValue)
        {
            var targetStatus = (Domain.Enums.TaskStatus)filter.Status.Value;
            query = query.Where(t => t.Status == targetStatus);
        }

        if (filter.StartDate.HasValue)
        {
            query = query.Where(t => (t.DueDate ?? t.StartDate ?? t.CreatedAt) >= filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            query = query.Where(t => (t.DueDate ?? t.StartDate ?? t.CreatedAt) <= filter.EndDate.Value);
        }

        var tasks = await query.OrderBy(t => t.DueDate ?? t.CreatedAt).ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();

        var isArms = filter.Format?.ToLowerInvariant() == "arms";
        if (isArms)
        {
            BuildArmsWorkbook(workbook, tasks, filter, isAdmin);
        }
        else
        {
            BuildStandardWorkbook(workbook, tasks, filter);
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void BuildStandardWorkbook(XLWorkbook workbook, List<Domain.Entities.WorkTask> tasks, TaskExportFilterDto filter)
    {
        var ws = workbook.Worksheets.Add("Daftar Tugas");

        ws.Cell(1, 1).Value = "LAPORAN DAFTAR TUGAS OPERASIONAL";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#4F46E5");

        string[] headers = { "No", "Proyek", "Judul Tugas", "Prioritas", "Status", "Progres (%)", "PIC", "Tenggat Waktu", "Kendala & Solusi" };
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(3, i + 1);
            cell.Value = headers[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int row = 4;
        for (int i = 0; i < tasks.Count; i++)
        {
            var t = tasks[i];
            ws.Cell(row, 1).Value = i + 1;
            ws.Cell(row, 2).Value = t.Project?.Name ?? "General";
            ws.Cell(row, 3).Value = t.Title;
            ws.Cell(row, 4).Value = t.Priority.ToString();
            ws.Cell(row, 5).Value = t.Status.ToString();
            ws.Cell(row, 6).Value = t.Progress;
            ws.Cell(row, 7).Value = t.AssignedToUser?.FullName ?? "Belum Ditugaskan";
            ws.Cell(row, 8).Value = t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : "-";

            var obstacleSolution = "";
            if (!string.IsNullOrWhiteSpace(t.Obstacle))
            {
                obstacleSolution += $"[Kendala: {t.Obstacle}] ";
            }
            if (!string.IsNullOrWhiteSpace(t.Solution))
            {
                obstacleSolution += $"[Solusi: {t.Solution}]";
            }
            ws.Cell(row, 9).Value = string.IsNullOrWhiteSpace(obstacleSolution) ? "-" : obstacleSolution.Trim();

            if (row % 2 == 1)
            {
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            }

            row++;
        }

        ws.Columns().AdjustToContents();
    }

    private static void BuildArmsWorkbook(XLWorkbook workbook, List<Domain.Entities.WorkTask> tasks, TaskExportFilterDto filter, bool isAdmin)
    {
        // ----------------------------------------------------
        // SHEET 1: Ringkasan Eksekutif (Executive Summary)
        // ----------------------------------------------------
        var wsSummary = workbook.Worksheets.Add("Ringkasan Eksekutif");
        wsSummary.Cell(1, 1).Value = "RINGKASAN EKSEKUTIF PROYEK & SDLC (ARMS)";
        wsSummary.Cell(1, 1).Style.Font.Bold = true;
        wsSummary.Cell(1, 1).Style.Font.FontSize = 14;
        wsSummary.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#1E3A8A");

        wsSummary.Cell(2, 1).Value = $"Tanggal Ekspor: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC | Total Tugas: {tasks.Count}";
        wsSummary.Cell(2, 1).Style.Font.Italic = true;
        wsSummary.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#64748B");

        // KPI Box
        var doneCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done || t.Progress == 100);
        var inProgressCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
        var now = DateTimeOffset.UtcNow;
        var overdueCount = tasks.Count(t => t.Status != Domain.Enums.TaskStatus.Done && t.DueDate.HasValue && t.DueDate.Value < now);
        var totalHours = Math.Round(tasks.Sum(t => t.Sessions?.Sum(s => s.Duration) ?? 0) / 3600.0, 2);

        string[] kpiHeaders = { "Metrik", "Nilai", "Keterangan" };
        for (int i = 0; i < kpiHeaders.Length; i++)
        {
            var cell = wsSummary.Cell(4, i + 1);
            cell.Value = kpiHeaders[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
        }

        wsSummary.Cell(5, 1).Value = "Total Tugas";
        wsSummary.Cell(5, 2).Value = tasks.Count;
        wsSummary.Cell(5, 3).Value = "Seluruh tugas dalam cakupan filter";

        wsSummary.Cell(6, 1).Value = "Tugas Selesai (Done)";
        wsSummary.Cell(6, 2).Value = doneCount;
        wsSummary.Cell(6, 3).Value = $"Rasio: {(tasks.Count > 0 ? (doneCount * 100 / tasks.Count) : 0)}%";

        wsSummary.Cell(7, 1).Value = "Dalam Pengerjaan (In Progress)";
        wsSummary.Cell(7, 2).Value = inProgressCount;
        wsSummary.Cell(7, 3).Value = "Sedang dikerjakan tim";

        wsSummary.Cell(8, 1).Value = "Melewati Tenggat (Overdue)";
        wsSummary.Cell(8, 2).Value = overdueCount;
        wsSummary.Cell(8, 3).Value = "Perlu tindak lanjut / eskalasi";

        wsSummary.Cell(9, 1).Value = "Akumulasi Jam Kerja (Man-Hours)";
        wsSummary.Cell(9, 2).Value = totalHours;
        wsSummary.Cell(9, 3).Value = "Total jam kerja dari seluruh sesi kerja";

        // Table Project Distribution
        wsSummary.Cell(11, 1).Value = "DISTRIBUSI PER PROYEK";
        wsSummary.Cell(11, 1).Style.Font.Bold = true;
        wsSummary.Cell(11, 1).Style.Font.FontColor = XLColor.FromHtml("#1E3A8A");

        string[] projHeaders = { "No", "Nama Proyek", "Total Tugas", "Selesai", "Progres Rata-rata (%)" };
        for (int i = 0; i < projHeaders.Length; i++)
        {
            var cell = wsSummary.Cell(12, i + 1);
            cell.Value = projHeaders[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
        }

        var projGroups = tasks.GroupBy(t => t.Project?.Name ?? "General").OrderByDescending(g => g.Count()).ToList();
        int rowP = 13;
        for (int i = 0; i < projGroups.Count; i++)
        {
            var grp = projGroups[i];
            var pDone = grp.Count(t => t.Status == Domain.Enums.TaskStatus.Done || t.Progress == 100);
            var pAvgProg = grp.Any() ? Math.Round(grp.Average(t => t.Progress), 1) : 0;

            wsSummary.Cell(rowP, 1).Value = i + 1;
            wsSummary.Cell(rowP, 2).Value = grp.Key;
            wsSummary.Cell(rowP, 3).Value = grp.Count();
            wsSummary.Cell(rowP, 4).Value = pDone;
            wsSummary.Cell(rowP, 5).Value = pAvgProg;
            rowP++;
        }

        wsSummary.Columns().AdjustToContents();

        // ----------------------------------------------------
        // SHEET 2: Rincian Tugas ARMS (21 Kolom)
        // ----------------------------------------------------
        var wsDetail = workbook.Worksheets.Add("Rincian Tugas ARMS");

        wsDetail.Cell(1, 1).Value = "RINCIAN TUGAS REKAYASA SISTEM ARMS (SDLC WATERFALL)";
        wsDetail.Cell(1, 1).Style.Font.Bold = true;
        wsDetail.Cell(1, 1).Style.Font.FontSize = 14;
        wsDetail.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#1E3A8A");

        string[] armsHeaders = {
            "No",
            "Project Code",
            "Project Name",
            "Task Code",
            "Parent Task Code",
            "Task Title",
            "Description",
            "SDLC Milestone",
            "Category",
            "Priority",
            "Status",
            "Progress (%)",
            "PIC Name",
            "PIC Email",
            "Start Date",
            "Due Date",
            "Total Logged Hours",
            "Obstacle",
            "Solution",
            "Created At",
            "Updated At"
        };

        for (int i = 0; i < armsHeaders.Length; i++)
        {
            var cell = wsDetail.Cell(3, i + 1);
            cell.Value = armsHeaders[i];
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Font.Bold = true;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        int rowD = 4;
        for (int i = 0; i < tasks.Count; i++)
        {
            var t = tasks[i];
            var taskHours = Math.Round((t.Sessions?.Sum(s => s.Duration) ?? 0) / 3600.0, 2);

            wsDetail.Cell(rowD, 1).Value = i + 1;
            wsDetail.Cell(rowD, 2).Value = t.ProjectId.HasValue ? $"PRJ-{t.ProjectId.Value:D3}" : "PRJ-GEN";
            wsDetail.Cell(rowD, 3).Value = t.Project?.Name ?? "General";
            wsDetail.Cell(rowD, 4).Value = $"TSK-{t.Id:D4}";
            wsDetail.Cell(rowD, 5).Value = t.ParentTaskId.HasValue ? $"TSK-{t.ParentTaskId.Value:D4}" : "-";
            wsDetail.Cell(rowD, 6).Value = t.Title;
            wsDetail.Cell(rowD, 7).Value = string.IsNullOrWhiteSpace(t.Description) ? "-" : t.Description;
            wsDetail.Cell(rowD, 8).Value = string.IsNullOrWhiteSpace(t.Milestone) ? "Implementation" : t.Milestone;
            wsDetail.Cell(rowD, 9).Value = t.Category?.Name ?? "-";
            wsDetail.Cell(rowD, 10).Value = t.Priority.ToString();
            wsDetail.Cell(rowD, 11).Value = t.Status.ToString();
            wsDetail.Cell(rowD, 12).Value = t.Progress;
            wsDetail.Cell(rowD, 13).Value = t.AssignedToUser?.FullName ?? "Belum Ditugaskan";
            wsDetail.Cell(rowD, 14).Value = t.AssignedToUser?.Email ?? "-";
            wsDetail.Cell(rowD, 15).Value = t.StartDate.HasValue ? t.StartDate.Value.ToString("yyyy-MM-dd") : "-";
            wsDetail.Cell(rowD, 16).Value = t.DueDate.HasValue ? t.DueDate.Value.ToString("yyyy-MM-dd") : "-";
            wsDetail.Cell(rowD, 17).Value = taskHours;
            wsDetail.Cell(rowD, 18).Value = string.IsNullOrWhiteSpace(t.Obstacle) ? "-" : t.Obstacle;
            wsDetail.Cell(rowD, 19).Value = string.IsNullOrWhiteSpace(t.Solution) ? "-" : t.Solution;
            wsDetail.Cell(rowD, 20).Value = t.CreatedAt.ToString("yyyy-MM-dd HH:mm");
            wsDetail.Cell(rowD, 21).Value = t.UpdatedAt.ToString("yyyy-MM-dd HH:mm");

            if (rowD % 2 == 1)
            {
                wsDetail.Row(rowD).Style.Fill.BackgroundColor = XLColor.FromHtml("#F8FAFC");
            }

            rowD++;
        }

        wsDetail.Columns().AdjustToContents();
    }
}

using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
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

        if (filter.StartDate.HasValue && filter.EndDate.HasValue &&
            filter.StartDate.Value.Date == filter.EndDate.Value.Date)
        {
            var dayStart = new DateTimeOffset(filter.StartDate.Value.Year, filter.StartDate.Value.Month, filter.StartDate.Value.Day, 0, 0, 0, TimeSpan.Zero);
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);

            query = query.Where(t =>
                (t.StartDate.HasValue && t.StartDate.Value <= dayEnd && (t.DueDate == null || t.DueDate.Value >= dayStart)) ||
                (t.DueDate.HasValue && t.DueDate.Value >= dayStart && t.DueDate.Value <= dayEnd) ||
                (t.CreatedAt >= dayStart && t.CreatedAt <= dayEnd) ||
                (t.UpdatedAt >= dayStart && t.UpdatedAt <= dayEnd) ||
                t.Sessions.Any(s => s.StartTime >= dayStart && s.StartTime <= dayEnd)
            );
        }
        else
        {
            if (filter.StartDate.HasValue)
            {
                query = query.Where(t => (t.DueDate ?? t.StartDate ?? t.CreatedAt) >= filter.StartDate.Value);
            }

            if (filter.EndDate.HasValue)
            {
                query = query.Where(t => (t.DueDate ?? t.StartDate ?? t.CreatedAt) <= filter.EndDate.Value);
            }
        }

        var tasks = await query.OrderBy(t => t.DueDate ?? t.CreatedAt).ToListAsync(cancellationToken);

        var isArms = filter.Format?.ToLowerInvariant() == "arms";
        using var workbook = isArms ? LoadOrCreateArmsWorkbook() : new XLWorkbook();

        if (isArms)
        {
            await PopulateArmsWorkbookAsync(workbook, tasks, filter, companyId, cancellationToken);
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

    private static string? ResolveArmsTemplatePath()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "uploads", "templates", "task_tracker_company_export_template.xlsx"),
            Path.Combine(AppContext.BaseDirectory, "uploads", "templates", "task_tracker_company_export_template.xlsx"),
            Path.Combine(Directory.GetCurrentDirectory(), "Sample Source DB", "task_tracker_company_export_Start_2026-11-13 (2).xlsx"),
            Path.Combine(AppContext.BaseDirectory, "Sample Source DB", "task_tracker_company_export_Start_2026-11-13 (2).xlsx"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "Sample Source DB", "task_tracker_company_export_Start_2026-11-13 (2).xlsx"),
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Sample Source DB", "task_tracker_company_export_Start_2026-11-13 (2).xlsx"),
        };

        foreach (var c in candidates)
        {
            if (File.Exists(c)) return c;
        }

        return null;
    }

    private static XLWorkbook LoadOrCreateArmsWorkbook()
    {
        var templatePath = ResolveArmsTemplatePath();
        if (!string.IsNullOrEmpty(templatePath) && File.Exists(templatePath))
        {
            try
            {
                return new XLWorkbook(templatePath);
            }
            catch
            {
                // Fallback if template file is locked or corrupt
            }
        }

        return CreateFreshArmsWorkbook();
    }

    private static XLWorkbook CreateFreshArmsWorkbook()
    {
        var wb = new XLWorkbook();

        // 1. Template Sheet (23 Columns)
        var wsTemplate = wb.Worksheets.Add("Template");
        string[] headers =
        {
            "project_name", "requirement_code", "title", "status", "priority",
            "jenis_task", "module_name", "bug_type", "progress", "start_date",
            "due_date", "completed_date", "developer_emails", "ba_emails",
            "infra_emails", "master_data_emails", "tester_emails", "technical_writer_emails",
            "quality_assurance_emails", "system_analyst_emails", "kendala", "solusi", "task_code"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = wsTemplate.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontName = "Calibri";
            cell.Style.Font.FontSize = 11;
        }

        // 2. Lookup Sheet
        var wsLookup = wb.Worksheets.Add("Lookup");
        wsLookup.Cell(1, 1).Value = "project_name";
        wsLookup.Cell(1, 1).Style.Font.Bold = true;
        wsLookup.Cell(1, 2).Value = "requirement_code";
        wsLookup.Cell(1, 2).Style.Font.Bold = true;

        wsLookup.Cell(2, 1).Value = "General";
        wsLookup.Cell(2, 2).Value = "REQ-0001";

        // Setup Data Validations on wsTemplate
        wsTemplate.Range("A2:A500").CreateDataValidation().List(wsLookup.Range("A2:A500"));
        wsTemplate.Range("B2:B500").CreateDataValidation().List(wsLookup.Range("B2:B500"));
        wsTemplate.Range("D2:D500").CreateDataValidation().List("\"TODO,IN_PROGRESS,IN_REVIEW,DONE\"", true);
        wsTemplate.Range("E2:E500").CreateDataValidation().List("\"LOW,MEDIUM,HIGH,CRITICAL\"", true);
        wsTemplate.Range("F2:F500").CreateDataValidation().List("\"NEW_APPLICATION,ENHANCEMENT,BUG,MAINTENANCE,MIGRATION\"", true);
        wsTemplate.Range("H2:H500").CreateDataValidation().List("\"UI_BUG,FUNCTIONAL_BUG,INTEGRATION_BUG,DATA_BUG,PERFORMANCE_BUG,SECURITY_BUG,OTHER\"", true);

        return wb;
    }

    private async Task PopulateArmsWorkbookAsync(
        XLWorkbook workbook,
        List<WorkTask> tasks,
        TaskExportFilterDto filter,
        int? companyId,
        CancellationToken cancellationToken)
    {
        var wsTemplate = workbook.Worksheets.FirstOrDefault(w => w.Name == "Template")
                         ?? workbook.Worksheets.FirstOrDefault()
                         ?? workbook.Worksheets.Add("Template");

        var wsLookup = workbook.Worksheets.FirstOrDefault(w => w.Name == "Lookup")
                       ?? workbook.Worksheets.Add("Lookup");

        // Clear existing data rows (2..N) on Template
        var lastRow = wsTemplate.LastRowUsed()?.RowNumber() ?? 1;
        if (lastRow >= 2)
        {
            wsTemplate.Rows(2, Math.Max(lastRow, 500)).Clear(XLClearOptions.Contents);
        }

        // Build existing project -> requirement code map from Lookup
        var projectReqMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var lookupLastRow = wsLookup.LastRowUsed()?.RowNumber() ?? 1;
        for (int r = 2; r <= lookupLastRow; r++)
        {
            var pName = wsLookup.Cell(r, 1).GetString().Trim();
            var rCode = wsLookup.Cell(r, 2).GetString().Trim();
            if (!string.IsNullOrEmpty(pName) && !projectReqMap.ContainsKey(pName))
            {
                projectReqMap[pName] = rCode;
            }
        }

        // Fetch company projects from DB to guarantee Lookup has all current projects
        var dbProjectsQuery = _context.Projects.AsNoTracking().AsQueryable();
        if (companyId.HasValue)
        {
            dbProjectsQuery = dbProjectsQuery.Where(p => p.CompanyId == companyId.Value || p.CompanyId == null);
        }
        var dbProjects = await dbProjectsQuery.ToListAsync(cancellationToken);

        int nextLookupRow = lookupLastRow + 1;
        foreach (var p in dbProjects)
        {
            if (!projectReqMap.ContainsKey(p.Name))
            {
                string reqCode = "";
                if (!string.IsNullOrWhiteSpace(p.Tags) && Regex.IsMatch(p.Tags, @"(REQ|BRD|DC|FR)-[^\s,;]+", RegexOptions.IgnoreCase))
                {
                    reqCode = Regex.Match(p.Tags, @"(REQ|BRD|DC|FR)-[^\s,;]+", RegexOptions.IgnoreCase).Value;
                }
                else
                {
                    reqCode = $"REQ-{p.Id:D4}";
                }

                wsLookup.Cell(nextLookupRow, 1).SetValue(p.Name);
                wsLookup.Cell(nextLookupRow, 2).SetValue(reqCode);
                projectReqMap[p.Name] = reqCode;
                nextLookupRow++;
            }
        }

        // Populate task data rows (Row 2 onwards)
        int targetRow = 2;
        foreach (var t in tasks)
        {
            var projectName = t.Project?.Name ?? "General";
            string reqCode = "";
            if (projectReqMap.TryGetValue(projectName, out var code) && !string.IsNullOrWhiteSpace(code))
            {
                reqCode = code;
            }
            else if (!string.IsNullOrWhiteSpace(t.Tags) && Regex.IsMatch(t.Tags, @"(REQ|BRD|DC|FR)-[^\s,;]+", RegexOptions.IgnoreCase))
            {
                reqCode = Regex.Match(t.Tags, @"(REQ|BRD|DC|FR)-[^\s,;]+", RegexOptions.IgnoreCase).Value;
            }

            // Status: TODO, IN_PROGRESS, IN_REVIEW, DONE
            string status = t.Status switch
            {
                Domain.Enums.TaskStatus.Done => "DONE",
                Domain.Enums.TaskStatus.InProgress => "IN_PROGRESS",
                Domain.Enums.TaskStatus.Review => "IN_REVIEW",
                _ => "TODO"
            };

            // Priority: LOW, MEDIUM, HIGH, CRITICAL
            string priority = t.Priority switch
            {
                TaskPriority.Low => "LOW",
                TaskPriority.Medium => "MEDIUM",
                TaskPriority.High => "HIGH",
                _ => "CRITICAL"
            };

            // Jenis Task: NEW_APPLICATION, ENHANCEMENT, BUG, MAINTENANCE, MIGRATION
            string jenisTask = "ENHANCEMENT";
            var catName = (t.Category?.Name ?? "").ToLowerInvariant();
            var titleLower = t.Title.ToLowerInvariant();
            var tagsLower = (t.Tags ?? "").ToLowerInvariant();

            if (catName.Contains("new") || catName.Contains("baru") || tagsLower.Contains("new_application"))
            {
                jenisTask = "NEW_APPLICATION";
            }
            else if (catName.Contains("bug") || titleLower.Contains("bug") || titleLower.Contains("fix") || tagsLower.Contains("bug"))
            {
                jenisTask = "BUG";
            }
            else if (catName.Contains("maint") || catName.Contains("sla") || tagsLower.Contains("maintenance"))
            {
                jenisTask = "MAINTENANCE";
            }
            else if (catName.Contains("migrat") || tagsLower.Contains("migration"))
            {
                jenisTask = "MIGRATION";
            }

            // Module Name
            string moduleName = !string.IsNullOrWhiteSpace(t.Milestone)
                ? t.Milestone
                : (!string.IsNullOrWhiteSpace(t.Category?.Name) ? t.Category.Name : projectName);

            // Bug Type: UI_BUG, FUNCTIONAL_BUG, INTEGRATION_BUG, DATA_BUG, PERFORMANCE_BUG, SECURITY_BUG, OTHER
            string bugType = "";
            if (jenisTask == "BUG")
            {
                bugType = "FUNCTIONAL_BUG";
                if (tagsLower.Contains("ui_bug") || titleLower.Contains("ui")) bugType = "UI_BUG";
                else if (tagsLower.Contains("integration_bug") || titleLower.Contains("api")) bugType = "INTEGRATION_BUG";
                else if (tagsLower.Contains("data_bug") || titleLower.Contains("data")) bugType = "DATA_BUG";
                else if (tagsLower.Contains("performance_bug") || titleLower.Contains("perf")) bugType = "PERFORMANCE_BUG";
                else if (tagsLower.Contains("security_bug") || titleLower.Contains("security")) bugType = "SECURITY_BUG";
            }

            // Progress (0 - 100)
            int progress = status == "DONE" ? 100 : Math.Clamp(t.Progress, 0, 100);

            // Dates (yyyy-MM-dd)
            var startDateStr = (t.StartDate ?? t.CreatedAt).ToString("yyyy-MM-dd");
            var dueDateStr = (t.DueDate ?? t.StartDate ?? t.CreatedAt).ToString("yyyy-MM-dd");
            var completedDateStr = (status == "DONE" || progress == 100)
                ? (t.DueDate ?? t.UpdatedAt).ToString("yyyy-MM-dd")
                : "";

            // Personnel emails mapping across roles
            string devEmails = "";
            string baEmails = "";
            string infraEmails = "";
            string mdEmails = "";
            string testerEmails = "";
            string twEmails = "";
            string qaEmails = "";
            string saEmails = "";

            var assignedEmail = t.AssignedToUser?.Email?.Trim();
            var jobTitle = (t.AssignedToUser?.JobTitle ?? "").ToLowerInvariant();

            if (!string.IsNullOrEmpty(assignedEmail))
            {
                if (jobTitle.Contains("business analyst") || jobTitle.Contains("ba"))
                {
                    baEmails = assignedEmail;
                }
                else if (jobTitle.Contains("system analyst") || jobTitle.Contains("sa"))
                {
                    saEmails = assignedEmail;
                }
                else if (jobTitle.Contains("technical writer") || jobTitle.Contains("documentation") || jobTitle.Contains("tw"))
                {
                    twEmails = assignedEmail;
                }
                else if (jobTitle.Contains("quality") || jobTitle.Contains("qa"))
                {
                    qaEmails = assignedEmail;
                }
                else if (jobTitle.Contains("tester") || jobTitle.Contains("testing"))
                {
                    testerEmails = assignedEmail;
                }
                else if (jobTitle.Contains("infra") || jobTitle.Contains("devops") || jobTitle.Contains("cloud") || jobTitle.Contains("network"))
                {
                    infraEmails = assignedEmail;
                }
                else if (jobTitle.Contains("database") || jobTitle.Contains("master data") || jobTitle.Contains("dba"))
                {
                    mdEmails = assignedEmail;
                }
                else
                {
                    devEmails = assignedEmail;
                }
            }

            // Secondary role hints from Title (e.g. (BA), (TW), (QA))
            if (titleLower.Contains("(ba)") && string.IsNullOrEmpty(baEmails) && !string.IsNullOrEmpty(assignedEmail))
            {
                baEmails = assignedEmail;
            }
            if (titleLower.Contains("(tw)") && string.IsNullOrEmpty(twEmails) && !string.IsNullOrEmpty(assignedEmail))
            {
                twEmails = assignedEmail;
            }
            if (titleLower.Contains("(qa)") && string.IsNullOrEmpty(qaEmails) && !string.IsNullOrEmpty(assignedEmail))
            {
                qaEmails = assignedEmail;
            }

            // Fill row cells (Col 1 to 23)
            wsTemplate.Cell(targetRow, 1).SetValue(projectName);
            wsTemplate.Cell(targetRow, 2).SetValue(reqCode);
            wsTemplate.Cell(targetRow, 3).SetValue(t.Title);
            wsTemplate.Cell(targetRow, 4).SetValue(status);
            wsTemplate.Cell(targetRow, 5).SetValue(priority);
            wsTemplate.Cell(targetRow, 6).SetValue(jenisTask);
            wsTemplate.Cell(targetRow, 7).SetValue(moduleName);
            wsTemplate.Cell(targetRow, 8).SetValue(bugType);
            wsTemplate.Cell(targetRow, 9).SetValue(progress);
            wsTemplate.Cell(targetRow, 10).SetValue(startDateStr);
            wsTemplate.Cell(targetRow, 11).SetValue(dueDateStr);
            wsTemplate.Cell(targetRow, 12).SetValue(completedDateStr);
            wsTemplate.Cell(targetRow, 13).SetValue(devEmails);
            wsTemplate.Cell(targetRow, 14).SetValue(baEmails);
            wsTemplate.Cell(targetRow, 15).SetValue(infraEmails);
            wsTemplate.Cell(targetRow, 16).SetValue(mdEmails);
            wsTemplate.Cell(targetRow, 17).SetValue(testerEmails);
            wsTemplate.Cell(targetRow, 18).SetValue(twEmails);
            wsTemplate.Cell(targetRow, 19).SetValue(qaEmails);
            wsTemplate.Cell(targetRow, 20).SetValue(saEmails);
            wsTemplate.Cell(targetRow, 21).SetValue(t.Obstacle ?? "");
            wsTemplate.Cell(targetRow, 22).SetValue(t.Solution ?? "");
            wsTemplate.Cell(targetRow, 23).SetValue(!string.IsNullOrWhiteSpace(t.Tags) && t.Tags.Contains("code:") ? t.Tags : $"TK-{t.Id:D4}");

            wsTemplate.Row(targetRow).Style.Font.FontName = "Calibri";
            wsTemplate.Row(targetRow).Style.Font.FontSize = 11;

            targetRow++;
        }

        wsTemplate.Columns(1, 23).AdjustToContents();
    }
}

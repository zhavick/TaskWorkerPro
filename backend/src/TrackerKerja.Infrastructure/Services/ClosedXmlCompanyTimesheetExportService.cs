using System.IO.Compression;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class ClosedXmlCompanyTimesheetExportService : ICompanyTimesheetExportService
{
    private readonly AppDbContext _context;

    public ClosedXmlCompanyTimesheetExportService(AppDbContext context)
    {
        _context = context;
    }

    private static string? ResolveTemplatePath(string? customPath)
    {
        if (!string.IsNullOrEmpty(customPath) && File.Exists(customPath))
        {
            return customPath;
        }

        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "uploads", "templates", "timesheet_elistec_default.xlsx"),
            Path.Combine(AppContext.BaseDirectory, "uploads", "templates", "timesheet_elistec_default.xlsx"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "..", "uploads", "templates", "timesheet_elistec_default.xlsx"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", "uploads", "templates", "timesheet_elistec_default.xlsx")
        };

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }

    private static XLWorkbook LoadOrCreateWorkbook(string? templatePath)
    {
        if (!string.IsNullOrEmpty(templatePath) && File.Exists(templatePath))
        {
            return new XLWorkbook(templatePath);
        }

        // Fallback: create workbook with exact ELISTEC template structure
        var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Sheet1");

        ws.Cell("E2").Value = "ELISTEC - Timesheet";
        ws.Cell("E2").Style.Font.SetFontSize(14).Font.SetBold(true);

        ws.Cell("A4").Value = "Duration:";
        ws.Cell("A4").Style.Font.SetBold(true);
        ws.Cell("F4").Value = "Client Name:";
        ws.Cell("F4").Style.Font.SetBold(true);
        ws.Cell("K4").Value = "Client Name:";

        ws.Cell("A5").Value = "Name:";
        ws.Cell("A5").Style.Font.SetBold(true);
        ws.Cell("K5").Value = "SOW No.:";
        ws.Cell("K5").Style.Font.SetBold(true);

        string[] headers = {
            "Issue Key", "Issue Summary", "Hours", "MD", "Work Date", "Clock In", "Clock Out",
            "Username", "Full Name", "Period", "Project Name", "Activity Type", "Working Place", "Evidence"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(7, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.SetBold(true).Font.SetFontColor(XLColor.White);
            cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#1F4E78"));
            cell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            cell.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
        }

        return wb;
    }

    public async Task<byte[]> ExportUserTimesheetAsync(int companyId, int periodId, string userId)
    {
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new InvalidOperationException($"Pengguna dengan ID '{userId}' tidak ditemukan.");

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) throw new InvalidOperationException($"Periode dengan ID '{periodId}' tidak ditemukan.");

        var config = await _context.CompanyTimesheetConfigs.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        var templatePath = ResolveTemplatePath(config?.TemplateFilePath);

        using var workbook = LoadOrCreateWorkbook(templatePath);
        var ws = workbook.Worksheet(1);

        // 1. Populate Header Metadata
        ws.Cell("E2").Value = config?.HeaderTitle ?? "ELISTEC - Timesheet";
        ws.Cell("B4").Value = $"{period.WorkingDaysCount} DAYS";
        ws.Cell("G4").Value = config?.ClientName ?? "Tugu Insurance";
        ws.Cell("B5").Value = user.FullName;
        if (!string.IsNullOrWhiteSpace(config?.SowNumber))
        {
            ws.Cell("L5").Value = config.SowNumber;
        }

        // 2. Query Sessions & Attendance
        var tzOffset = TimeSpan.FromHours(7); // WIB (UTC+7)
        var startDateTime = new DateTimeOffset(period.StartDate.Year, period.StartDate.Month, period.StartDate.Day, 0, 0, 0, tzOffset).ToUniversalTime();
        var endDateTime = new DateTimeOffset(period.EndDate.Year, period.EndDate.Month, period.EndDate.Day, 23, 59, 59, tzOffset).ToUniversalTime();

        var sessions = await _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .Include(s => s.Task).ThenInclude(t => t.Category)
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.StartTime >= startDateTime && s.StartTime <= endDateTime)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        var userTasks = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .AsNoTracking()
            .Where(t => t.CompanyId == companyId && (t.AssignedToUserId == userId || t.AssignedToUserId == null))
            .ToListAsync();

        var attendances = await _context.Attendances
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Date >= period.StartDate && a.Date <= period.EndDate)
            .ToListAsync();

        var attendanceMap = attendances.ToDictionary(a => a.Date, a => a);

        // Clear existing template rows from row 8 downwards if it was loaded from prefilled template
        var maxRowUsed = ws.LastRowUsed()?.RowNumber() ?? 8;
        if (maxRowUsed >= 8)
        {
            ws.Range(8, 1, Math.Max(maxRowUsed, 200), 14).Clear();
        }

        int currentRow = 8;
        var includeWeekends = config?.IncludeWeekends ?? true;
        var weekendFormat = config?.WeekendTaskTextFormat ?? "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task";

        // 3. Populate Rows day by day
        for (var date = period.StartDate; date <= period.EndDate; date = date.AddDays(1))
        {
            var isWeekend = date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;

            if (isWeekend)
            {
                if (includeWeekends)
                {
                    var dayName = date.DayOfWeek == DayOfWeek.Saturday ? "Sabtu" : "Minggu";
                    var weekendText = weekendFormat.Replace("{DayName}", dayName);

                    ws.Cell(currentRow, 1).Value = "";
                    ws.Cell(currentRow, 2).Value = weekendText;
                    ws.Cell(currentRow, 3).Value = 0;
                    ws.Cell(currentRow, 4).FormulaA1 = $"IF(C{currentRow}=\"\",\"\",C{currentRow}/8)";
                    ws.Cell(currentRow, 5).Value = date.ToString("dd/MM/yyyy");
                    ws.Cell(currentRow, 6).Value = "-";
                    ws.Cell(currentRow, 7).Value = "-";
                    ws.Cell(currentRow, 8).Value = user.UserName ?? user.FullName;
                    ws.Cell(currentRow, 9).Value = user.FullName;
                    ws.Cell(currentRow, 10).Value = period.PeriodCode;
                    ws.Cell(currentRow, 11).Value = "-";
                    ws.Cell(currentRow, 12).Value = "-";
                    ws.Cell(currentRow, 13).Value = "";
                    ws.Cell(currentRow, 14).Value = "";

                    ApplyRowStyle(ws, currentRow);
                    currentRow++;
                }
            }
            else
            {
                var daySessions = sessions
                    .Where(s => DateOnly.FromDateTime(s.StartTime.ToOffset(tzOffset).DateTime) == date)
                    .Where(s =>
                    {
                        var tDue = s.Task.DueDate.HasValue ? DateOnly.FromDateTime(s.Task.DueDate.Value.ToOffset(tzOffset).DateTime) : (DateOnly?)null;
                        var tStart = s.Task.StartDate.HasValue ? DateOnly.FromDateTime(s.Task.StartDate.Value.ToOffset(tzOffset).DateTime) : (DateOnly?)null;
                        // Exclude tasks that were already completed/due before this period or start after this period
                        if (tDue.HasValue && tDue.Value < period.StartDate) return false;
                        if (tStart.HasValue && tStart.Value > period.EndDate) return false;
                        return true;
                    })
                    .ToList();
                attendanceMap.TryGetValue(date, out var att);

                string clockIn = "-";
                string clockOut = "-";
                string workPlace = att != null ? att.WorkLocation.ToString() : "WFO";

                if (att?.ClockIn.HasValue == true)
                {
                    clockIn = att.ClockIn.Value.ToOffset(tzOffset).ToString("h:mm tt");
                }
                else if (daySessions.Any())
                {
                    clockIn = daySessions.Min(s => s.StartTime).ToOffset(tzOffset).ToString("h:mm tt");
                }

                if (att?.ClockOut.HasValue == true)
                {
                    clockOut = att.ClockOut.Value.ToOffset(tzOffset).ToString("h:mm tt");
                }
                else if (daySessions.Any())
                {
                    clockOut = daySessions.Max(s => s.EndTime ?? s.StartTime).ToOffset(tzOffset).ToString("h:mm tt");
                }

                if (daySessions.Any())
                {
                    var groupedSessions = daySessions
                        .GroupBy(s => s.TaskId)
                        .Select(g => new
                        {
                            TaskId = g.Key,
                            FirstSession = g.First(),
                            TotalDuration = g.Sum(s => s.Duration),
                            Notes = string.Join("; ", g.Select(s => s.Notes).Where(n => !string.IsNullOrWhiteSpace(n)).Distinct())
                        })
                        .ToList();

                    foreach (var g in groupedSessions)
                    {
                        var taskKey = $"TSK-{g.TaskId:D4}";
                        double hours = Math.Round(g.TotalDuration / 3600.0, 1);

                        ws.Cell(currentRow, 1).Value = taskKey;
                        ws.Cell(currentRow, 2).Value = g.FirstSession.Task.Title;
                        ws.Cell(currentRow, 3).Value = hours;
                        ws.Cell(currentRow, 4).FormulaA1 = $"IF(C{currentRow}=\"\",\"\",C{currentRow}/8)";
                        ws.Cell(currentRow, 5).Value = date.ToString("dd/MM/yyyy");
                        ws.Cell(currentRow, 6).Value = clockIn;
                        ws.Cell(currentRow, 7).Value = clockOut;
                        ws.Cell(currentRow, 8).Value = user.UserName ?? user.FullName;
                        ws.Cell(currentRow, 9).Value = user.FullName;
                        ws.Cell(currentRow, 10).Value = period.PeriodCode;
                        ws.Cell(currentRow, 11).Value = g.FirstSession.Task.Project?.Name ?? "-";
                        ws.Cell(currentRow, 12).Value = g.FirstSession.Task.Category?.Name ?? "General";
                        ws.Cell(currentRow, 13).Value = workPlace;
                        ws.Cell(currentRow, 14).Value = g.Notes;

                        ApplyRowStyle(ws, currentRow);
                        currentRow++;
                    }
                }
                else
                {
                    // Fallback to tasks assigned to this user that overlap with this specific date
                    var matchingTasks = userTasks
                        .Where(t =>
                        {
                            var tStart = t.StartDate.HasValue ? DateOnly.FromDateTime(t.StartDate.Value.ToOffset(tzOffset).DateTime) : (DateOnly?)null;
                            var tDue = t.DueDate.HasValue ? DateOnly.FromDateTime(t.DueDate.Value.ToOffset(tzOffset).DateTime) : (DateOnly?)null;

                            // Exclude tasks completely outside this period
                            if (tDue.HasValue && tDue.Value < period.StartDate) return false;
                            if (tStart.HasValue && tStart.Value > period.EndDate) return false;

                            if (tStart.HasValue && tDue.HasValue)
                            {
                                return date >= tStart.Value && date <= tDue.Value;
                            }
                            if (tStart.HasValue) return tStart.Value == date;
                            if (tDue.HasValue) return tDue.Value == date;
                            return false;
                        })
                        .GroupBy(t => t.Id)
                        .Select(g => g.First())
                        .ToList();

                    if (matchingTasks.Any())
                    {
                        double hoursPerTask = Math.Round(8.0 / matchingTasks.Count, 1);
                        foreach (var task in matchingTasks)
                        {
                            var taskKey = $"TSK-{task.Id:D4}";
                            ws.Cell(currentRow, 1).Value = taskKey;
                            ws.Cell(currentRow, 2).Value = task.Title;
                            ws.Cell(currentRow, 3).Value = hoursPerTask;
                            ws.Cell(currentRow, 4).FormulaA1 = $"IF(C{currentRow}=\"\",\"\",C{currentRow}/8)";
                            ws.Cell(currentRow, 5).Value = date.ToString("dd/MM/yyyy");
                            ws.Cell(currentRow, 6).Value = clockIn != "-" ? clockIn : "8:00 AM";
                            ws.Cell(currentRow, 7).Value = clockOut != "-" ? clockOut : "5:10 PM";
                            ws.Cell(currentRow, 8).Value = user.UserName ?? user.FullName;
                            ws.Cell(currentRow, 9).Value = user.FullName;
                            ws.Cell(currentRow, 10).Value = period.PeriodCode;
                            ws.Cell(currentRow, 11).Value = task.Project?.Name ?? "-";
                            ws.Cell(currentRow, 12).Value = task.Category?.Name ?? "General";
                            ws.Cell(currentRow, 13).Value = workPlace;
                            ws.Cell(currentRow, 14).Value = "";

                            ApplyRowStyle(ws, currentRow);
                            currentRow++;
                        }
                    }
                    else if (att != null)
                    {
                        ws.Cell(currentRow, 1).Value = "";
                        ws.Cell(currentRow, 2).Value = "Standby / Koordinasi Teknis Proyek";
                        ws.Cell(currentRow, 3).Value = 8.0;
                        ws.Cell(currentRow, 4).FormulaA1 = $"IF(C{currentRow}=\"\",\"\",C{currentRow}/8)";
                        ws.Cell(currentRow, 5).Value = date.ToString("dd/MM/yyyy");
                        ws.Cell(currentRow, 6).Value = clockIn != "-" ? clockIn : "8:00 AM";
                        ws.Cell(currentRow, 7).Value = clockOut != "-" ? clockOut : "5:10 PM";
                        ws.Cell(currentRow, 8).Value = user.UserName ?? user.FullName;
                        ws.Cell(currentRow, 9).Value = user.FullName;
                        ws.Cell(currentRow, 10).Value = period.PeriodCode;
                        ws.Cell(currentRow, 11).Value = "-";
                        ws.Cell(currentRow, 12).Value = "General";
                        ws.Cell(currentRow, 13).Value = workPlace;
                        ws.Cell(currentRow, 14).Value = "";

                        ApplyRowStyle(ws, currentRow);
                        currentRow++;
                    }
                }
            }
        }

        int lastDataRow = Math.Max(8, currentRow - 1);

        // 4. Baris Total
        int totalRow = lastDataRow + 1;
        ws.Cell(totalRow, 2).Value = "Total ";
        ws.Cell(totalRow, 2).Style.Font.SetBold(true);
        ws.Cell(totalRow, 3).FormulaA1 = $"SUM(C8:C{lastDataRow})";
        ws.Cell(totalRow, 3).Style.Font.SetBold(true);
        ws.Cell(totalRow, 4).FormulaA1 = $"SUM(D8:D{lastDataRow})";
        ws.Cell(totalRow, 4).Style.Font.SetBold(true);

        // 5. Blok Tanda Tangan
        int sigRow1 = totalRow + 3;
        ws.Cell(sigRow1, 2).Value = config?.ResourceTitle ?? "Resource,";
        ws.Cell(sigRow1, 2).Style.Font.SetBold(true);
        ws.Cell(sigRow1, 7).Value = config?.ApproverTitle ?? "Mengetahui,";
        ws.Cell(sigRow1, 7).Style.Font.SetBold(true);

        int sigRowApprover = sigRow1 + 7;
        ws.Cell(sigRowApprover, 7).Value = config?.ApproverName ?? "xxxx";

        int sigRowUser = sigRowApprover + 2;
        ws.Cell(sigRowUser, 2).Value = user.FullName;
        ws.Cell(sigRowUser, 2).Style.Font.SetBold(true);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void ApplyRowStyle(IXLWorksheet ws, int row)
    {
        for (int c = 1; c <= 14; c++)
        {
            var cell = ws.Cell(row, c);
            cell.Style.Font.SetFontName("Calibri").Font.SetFontSize(10);
            cell.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
            cell.Style.Border.SetOutsideBorderColor(XLColor.FromHtml("#D3D3D3"));
        }

        ws.Cell(row, 1).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Cell(row, 3).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Right);
        ws.Cell(row, 4).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Right);
        ws.Cell(row, 4).Style.NumberFormat.Format = "0.00#";
        ws.Cell(row, 5).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Cell(row, 6).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Cell(row, 7).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Cell(row, 8).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Cell(row, 10).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        ws.Cell(row, 13).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
    }

    public async Task<byte[]> ExportBulkCompanyTimesheetsZipAsync(int companyId, int periodId)
    {
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId);
        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) throw new InvalidOperationException("Periode tidak ditemukan.");

        var users = await _context.Users
            .AsNoTracking()
            .Where(u => u.CompanyId == companyId && u.RejectionReason == null)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, true))
        {
            foreach (var user in users)
            {
                var excelBytes = await ExportUserTimesheetAsync(companyId, periodId, user.Id);
                var safePeriodName = period.Name.Replace("/", "-");
                var entryName = $"Timesheet {company?.Code ?? "ELISTEC"} - {safePeriodName} - {user.FullName}.xlsx";

                var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
                using var entryStream = entry.Open();
                await entryStream.WriteAsync(excelBytes, 0, excelBytes.Length);
            }
        }

        return zipStream.ToArray();
    }
}

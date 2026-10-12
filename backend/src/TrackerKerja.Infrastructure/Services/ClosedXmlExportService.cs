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
}

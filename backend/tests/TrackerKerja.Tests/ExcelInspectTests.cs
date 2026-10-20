using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using Xunit;
using Xunit.Abstractions;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.Tests;

public class ExcelInspectTests
{
    private readonly ITestOutputHelper _output;

    public ExcelInspectTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task TestParseTaskTrackerV2Excel()
    {
        var filePath = @"C:\TEMP\VSCODE\TrackerKerjaModern\backend\tests\temp_tracker.xlsx";
        if (!File.Exists(filePath)) return;

        using var stream = File.OpenRead(filePath);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new AppDbContext(options);

        var service = new TaskExcelImportService(context);

        var preview = await service.PreviewImportAsync(stream, "Task Tracker v2.xlsx", companyId: 1);

        _output.WriteLine($"Total rows imported: {preview.TotalRows}");
        _output.WriteLine($"Valid rows: {preview.ValidCount}");
        _output.WriteLine($"Warning rows: {preview.WarningCount}");
        _output.WriteLine($"Error rows: {preview.ErrorCount}");

        var userSummary = preview.Rows
            .GroupBy(r => new { r.MatchedUserName, r.PicEmail })
            .Select(g => $"{g.Key.MatchedUserName} ({g.Key.PicEmail}) -> {g.Count()} tasks")
            .ToList();

        foreach (var u in userSummary)
        {
            _output.WriteLine($"   User: {u}");
        }

        var sheetBreakdown = preview.Rows
            .GroupBy(r => new { r.PicIdentifier, r.MatchedUserName, r.PicEmail })
            .Select(g => $"{g.Key.PicIdentifier} / {g.Key.MatchedUserName} ({g.Key.PicEmail}) -> {g.Count()} tasks")
            .ToList();
        _output.WriteLine("Sheet breakdown:");
        foreach (var s in sheetBreakdown)
        {
            _output.WriteLine($"   {s}");
        }

        var projectSummary = preview.Rows
            .GroupBy(r => r.ProjectName)
            .Select(g => $"{g.Key} -> {g.Count()} tasks")
            .ToList();

        _output.WriteLine($"Projects found: {projectSummary.Count}");
        foreach (var p in projectSummary.Take(10))
        {
            _output.WriteLine($"   Project: {p}");
        }

        using var wb = new XLWorkbook(@"C:\TEMP\VSCODE\TrackerKerjaModern\backend\tests\temp_tracker.xlsx");
        foreach (var name in new[] { "Danang", "Syifa" })
        {
            var ws = wb.Worksheet(name);
            _output.WriteLine($"Detailed sheet '{name}':");
            for (int r = 1; r <= 5; r++)
            {
                var rowCells = Enumerable.Range(1, 26).Select(c => $"{c}:{ws.Cell(r, c).GetString().Trim()}").Where(s => !s.EndsWith(":")).ToList();
                _output.WriteLine($"  Row {r}: {string.Join(" | ", rowCells)}");
            }
        }
    }
}

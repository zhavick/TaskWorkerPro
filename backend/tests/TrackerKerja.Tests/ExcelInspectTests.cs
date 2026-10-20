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
        var filePath = @"C:\Users\WAHANA 24\Downloads\Task Tracker v2.xlsx";
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

        var maxTitle = preview.Rows.Max(r => r.Title?.Length ?? 0);
        var maxDesc = preview.Rows.Max(r => r.Description?.Length ?? 0);
        var maxProj = preview.Rows.Max(r => r.ProjectName?.Length ?? 0);
        var maxMilestone = preview.Rows.Max(r => r.Milestone?.Length ?? 0);
        var maxObstacle = preview.Rows.Max(r => r.Obstacle?.Length ?? 0);
        var maxSolution = preview.Rows.Max(r => r.Solution?.Length ?? 0);
        var maxPic = preview.Rows.Max(r => r.PicIdentifier?.Length ?? 0);
        var maxEmail = preview.Rows.Max(r => r.PicEmail?.Length ?? 0);

        _output.WriteLine($"MAX LENGTHS -> Title: {maxTitle}, Desc: {maxDesc}, Proj: {maxProj}, Milestone: {maxMilestone}, Obstacle: {maxObstacle}, Solution: {maxSolution}, Pic: {maxPic}, Email: {maxEmail}");

        var longTitles = preview.Rows.Where(r => (r.Title?.Length ?? 0) > 200).ToList();
        _output.WriteLine($"Long titles count (>200 chars): {longTitles.Count}");
        foreach (var lt in longTitles.Take(5))
        {
            _output.WriteLine($"Long title ({lt.Title.Length} chars): {lt.Title}");
        }

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

        using var wb = new XLWorkbook(filePath);
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

    [Fact]
    public async Task TestCommitTaskTrackerV2Excel()
    {
        var filePath = @"C:\Users\WAHANA 24\Downloads\Task Tracker v2.xlsx";
        if (!File.Exists(filePath))
        {
            filePath = @"C:\TEMP\VSCODE\TrackerKerjaModern\backend\tests\temp_tracker.xlsx";
        }
        if (!File.Exists(filePath)) return;

        using var stream = File.OpenRead(filePath);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new AppDbContext(options);

        // Seed a company
        context.Companies.Add(new Domain.Entities.Company
        {
            Id = 1,
            Name = "PT Elistec Test",
            Code = "ELISTEC"
        });
        await context.SaveChangesAsync();

        var service = new TaskExcelImportService(context);

        var preview = await service.PreviewImportAsync(stream, Path.GetFileName(filePath), companyId: 1);
        _output.WriteLine($"Preview rows: {preview.TotalRows}, Valid: {preview.ValidCount}, Errors: {preview.ErrorCount}");

        var commitReq = new Application.DTOs.TaskImportCommitRequest(
            DefaultProjectId: null,
            BulkAssignUserId: null,
            SelectedRowIndexes: null,
            Rows: preview.Rows,
            AutoCreateMissingUsers: true,
            DefaultJobTitle: "Staff Pelaksana",
            DefaultPassword: "TrackerKerja2026!",
            EmailDomain: "elistec.com",
            AutoApproveNewUsers: true
        );

        var result = await service.CommitImportAsync(commitReq, companyId: 1);
        _output.WriteLine($"Commit Result: Processed={result.TotalProcessed}, Imported={result.TotalImported}, Users={result.TotalUsersCreated}, Projects={result.TotalProjectsCreated}, Updated={result.TotalUpdated}");
        foreach (var msg in result.Messages)
        {
            _output.WriteLine($"Msg: {msg}");
        }

        // Verify users created
        var users = await context.Users.ToListAsync();
        _output.WriteLine($"Total Users in DB: {users.Count}");
        foreach (var u in users)
        {
            _output.WriteLine($"User: Id={u.Id}, Name={u.FullName}, Email={u.Email}, UserName={u.UserName}");
        }

        // Verify tasks created
        var tasks = await context.Tasks.Include(t => t.Project).ToListAsync();
        _output.WriteLine($"Total Tasks in DB: {tasks.Count}");
    }
}

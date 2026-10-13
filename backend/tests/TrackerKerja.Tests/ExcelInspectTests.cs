using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;
using Xunit;
using Xunit.Abstractions;

namespace TrackerKerja.Tests;

public class ExcelInspectTests
{
    private readonly ITestOutputHelper _output;

    public ExcelInspectTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public void TestParseTaskTrackerV2Excel()
    {
        var filePath = @"C:\Users\WAHANA 24\Downloads\Task Tracker v2.xlsx";
        Assert.True(File.Exists(filePath), "File must exist");

        using var workbook = new XLWorkbook(filePath);

        // Find ARMS sheets
        var armsSheets = workbook.Worksheets.Where(ws =>
        {
            var firstRow = ws.FirstRowUsed();
            if (firstRow == null) return false;
            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            var headers = Enumerable.Range(1, lastCol)
                .Select(c => ws.Cell(firstRow.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                .ToList();
            return headers.Contains("project_name") && headers.Contains("title");
        }).ToList();

        _output.WriteLine($"Found {armsSheets.Count} ARMS sheets: {string.Join(", ", armsSheets.Select(s => s.Name))}");
        Assert.True(armsSheets.Count > 0, "Should find ARMS sheets");

        int totalExtracted = 0;
        var projectsFound = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var ws in armsSheets)
        {
            var headerRow = ws.FirstRowUsed()!;
            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            var headers = Enumerable.Range(1, lastCol)
                .Select(c => ws.Cell(headerRow.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                .ToList();

            int projectCol = headers.IndexOf("project_name") + 1;
            int titleCol = headers.IndexOf("title") + 1;
            int statusCol = headers.IndexOf("status") + 1;
            int priorityCol = headers.IndexOf("priority") + 1;
            int kendalaCol = headers.IndexOf("kendala") + 1;
            int solusiCol = headers.IndexOf("solusi") + 1;
            int progressCol = headers.IndexOf("progress") + 1;

            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            for (int r = headerRow.RowNumber() + 1; r <= lastRow; r++)
            {
                var title = ws.Cell(r, titleCol).GetString().Trim();
                if (string.IsNullOrEmpty(title)) continue;

                var proj = ws.Cell(r, projectCol).GetString().Trim();
                if (!string.IsNullOrEmpty(proj)) projectsFound.Add(proj);

                totalExtracted++;
            }
        }

        _output.WriteLine($"Total tasks extracted from ARMS sheets: {totalExtracted}");
        _output.WriteLine($"Distinct projects found ({projectsFound.Count}): {string.Join(", ", projectsFound)}");

        Assert.True(totalExtracted > 50, "Should extract more than 50 tasks");
    }
}

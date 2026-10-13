using System.Globalization;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class TaskExcelImportService : ITaskExcelImportService
{
    private readonly AppDbContext _context;

    public TaskExcelImportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ExcelImportResultDto> ImportTasksFromExcelAsync(
        Stream fileStream,
        int? companyId,
        CancellationToken cancellationToken = default)
    {
        var messages = new List<string>();
        int totalProcessed = 0;
        int totalImported = 0;
        int totalProjectsCreated = 0;

        using var workbook = new XLWorkbook(fileStream);

        // Preload existing projects and users in tenant
        var existingProjects = await _context.Projects
            .Where(p => p.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        var existingUsers = await _context.Users
            .Where(u => u.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        // Find ARMS sheets (header row contains 'project_name' and 'title')
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

        // Determine sheets to process
        List<IXLWorksheet> sheetsToProcess;
        bool isArmsMode;

        if (armsSheets.Count > 0)
        {
            sheetsToProcess = armsSheets;
            isArmsMode = true;
            messages.Add($"Terdeteksi format multi-sheet ARMS ({armsSheets.Count} lembar personil): {string.Join(", ", armsSheets.Select(s => s.Name))}.");
        }
        else
        {
            // Fallback to Master_Data or generic sheets
            sheetsToProcess = workbook.Worksheets.Where(ws =>
            {
                var nameLower = ws.Name.ToLowerInvariant();
                if (nameLower.Contains("lookup") || nameLower.Contains("dashboard")) return false;
                var firstRow = ws.FirstRowUsed();
                if (firstRow == null) return false;
                var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
                var headers = Enumerable.Range(1, lastCol)
                    .Select(c => ws.Cell(firstRow.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                    .ToList();
                return headers.Any(h => h.Contains("title") || h.Contains("judul"));
            }).ToList();
            isArmsMode = false;
            messages.Add($"Memproses {sheetsToProcess.Count} lembar data standar.");
        }

        var tasksToAdd = new List<WorkTask>();
        var seenTaskKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var ws in sheetsToProcess)
        {
            var headerRow = ws.FirstRowUsed();
            if (headerRow == null) continue;

            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            var headers = Enumerable.Range(1, lastCol)
                .Select(c => ws.Cell(headerRow.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                .ToList();

            int projectCol = FindCol(headers, "project_name", "project", "proyek");
            int titleCol = FindCol(headers, "title", "judul", "task title");
            int statusCol = FindCol(headers, "status");
            int priorityCol = FindCol(headers, "priority", "prioritas");
            int progressCol = FindCol(headers, "progress", "progres");
            int milestoneCol = FindCol(headers, "milestone", "jenis_task", "jenis task");
            int obstacleCol = FindCol(headers, "kendala", "obstacle", "masalah");
            int solutionCol = FindCol(headers, "solusi", "solution");
            int startDateCol = FindCol(headers, "start_date", "start date", "mulai");
            int dueDateCol = FindCol(headers, "due_date", "due date", "completed_date", "selesai", "target", "deadline");
            int picCol = FindCol(headers, "developer_emails", "pic", "email", "person");
            int descCol = FindCol(headers, "description", "deskripsi", "module_name");

            if (titleCol == 0) continue;

            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;

            for (int r = headerRow.RowNumber() + 1; r <= lastRow; r++)
            {
                var title = ws.Cell(r, titleCol).GetString().Trim();
                if (string.IsNullOrWhiteSpace(title)) continue;

                totalProcessed++;

                // Deduplicate within this import session
                var projectName = projectCol > 0 ? ws.Cell(r, projectCol).GetString().Trim() : string.Empty;
                var dedupKey = $"{projectName}___{title}";
                if (seenTaskKeys.Contains(dedupKey)) continue;
                seenTaskKeys.Add(dedupKey);

                // Project resolution / auto-creation
                Project? project = null;
                if (!string.IsNullOrWhiteSpace(projectName))
                {
                    project = existingProjects.FirstOrDefault(p =>
                        p.Name.Equals(projectName, StringComparison.OrdinalIgnoreCase));

                    if (project == null)
                    {
                        project = new Project
                        {
                            Name = projectName,
                            CompanyId = companyId,
                            Color = PickColorForProject(projectName),
                            Status = ProjectStatus.Active,
                            CreatedAt = DateTimeOffset.UtcNow
                        };
                        _context.Projects.Add(project);
                        existingProjects.Add(project);
                        totalProjectsCreated++;
                    }
                }

                // Resolve PIC / Assigned User
                string? assignedUserId = null;
                if (picCol > 0)
                {
                    var picText = ws.Cell(r, picCol).GetString().Trim();
                    if (!string.IsNullOrWhiteSpace(picText))
                    {
                        var matchedUser = existingUsers.FirstOrDefault(u =>
                            (!string.IsNullOrEmpty(u.Email) && picText.Contains(u.Email, StringComparison.OrdinalIgnoreCase)) ||
                            (!string.IsNullOrEmpty(u.FullName) && (u.FullName.Contains(picText, StringComparison.OrdinalIgnoreCase) || picText.Contains(u.FullName, StringComparison.OrdinalIgnoreCase))));

                        if (matchedUser != null)
                        {
                            assignedUserId = matchedUser.Id;
                        }
                    }
                }

                // If PIC not found in cell, try using sheet name (e.g. 'Glenn', 'Heni')
                if (assignedUserId == null && isArmsMode)
                {
                    var sheetName = ws.Name.Trim();
                    var matchedBySheet = existingUsers.FirstOrDefault(u =>
                        u.FullName.Contains(sheetName, StringComparison.OrdinalIgnoreCase));
                    if (matchedBySheet != null)
                    {
                        assignedUserId = matchedBySheet.Id;
                    }
                }

                // Status & Priority
                var statusText = statusCol > 0 ? ws.Cell(r, statusCol).GetString().Trim() : null;
                var priorityText = priorityCol > 0 ? ws.Cell(r, priorityCol).GetString().Trim() : null;
                var status = ParseStatus(statusText);
                var priority = ParsePriority(priorityText);

                // Progress
                int progress = progressCol > 0 ? ParseProgress(ws.Cell(r, progressCol)) : 0;
                if (status == Domain.Enums.TaskStatus.Done && progress == 0)
                {
                    progress = 100;
                }

                // Dates
                DateTimeOffset? startDate = startDateCol > 0 ? ParseDate(ws.Cell(r, startDateCol)) : null;
                DateTimeOffset? dueDate = dueDateCol > 0 ? ParseDate(ws.Cell(r, dueDateCol)) : null;

                // Kendala & Solusi
                var obstacle = obstacleCol > 0 ? ws.Cell(r, obstacleCol).GetString().Trim() : null;
                var solution = solutionCol > 0 ? ws.Cell(r, solutionCol).GetString().Trim() : null;

                // Milestone / Module
                var milestone = milestoneCol > 0 ? ws.Cell(r, milestoneCol).GetString().Trim() : null;
                var desc = descCol > 0 ? ws.Cell(r, descCol).GetString().Trim() : null;

                var workTask = new WorkTask
                {
                    Title = title,
                    Description = string.IsNullOrWhiteSpace(desc) ? null : desc,
                    Priority = priority,
                    Status = status,
                    Progress = progress,
                    Milestone = string.IsNullOrWhiteSpace(milestone) ? null : milestone,
                    Obstacle = string.IsNullOrWhiteSpace(obstacle) ? null : obstacle,
                    Solution = string.IsNullOrWhiteSpace(solution) ? null : solution,
                    Project = project,
                    AssignedToUserId = assignedUserId,
                    CompanyId = companyId,
                    StartDate = startDate,
                    DueDate = dueDate,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                tasksToAdd.Add(workTask);
            }
        }

        if (tasksToAdd.Count > 0)
        {
            _context.Tasks.AddRange(tasksToAdd);
            await _context.SaveChangesAsync(cancellationToken);
            totalImported = tasksToAdd.Count;
        }

        messages.Add($"Berhasil memproses {totalProcessed} baris, mengimpor {totalImported} tugas unik, dan membuat {totalProjectsCreated} proyek baru.");

        return new ExcelImportResultDto(
            totalProcessed,
            totalImported,
            totalProjectsCreated,
            messages
        );
    }

    private static int FindCol(List<string> headers, params string[] candidates)
    {
        for (int i = 0; i < headers.Count; i++)
        {
            var h = headers[i];
            if (candidates.Any(c => h.Contains(c, StringComparison.OrdinalIgnoreCase)))
            {
                return i + 1; // 1-based ClosedXML index
            }
        }
        return 0;
    }

    private static Domain.Enums.TaskStatus ParseStatus(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return Domain.Enums.TaskStatus.Todo;
        var upper = text.Trim().ToUpperInvariant();
        if (upper.Contains("DONE") || upper.Contains("SELESAI") || upper == "2") return Domain.Enums.TaskStatus.Done;
        if (upper.Contains("PROGRESS") || upper.Contains("SEDANG") || upper == "1") return Domain.Enums.TaskStatus.InProgress;
        if (upper.Contains("OVERDUE") || upper.Contains("TERLAMBAT") || upper.Contains("KEDALUWARSA") || upper == "3") return Domain.Enums.TaskStatus.Overdue;
        return Domain.Enums.TaskStatus.Todo;
    }

    private static TaskPriority ParsePriority(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return TaskPriority.Medium;
        var upper = text.Trim().ToUpperInvariant();
        if (upper.Contains("CRITICAL") || upper.Contains("KRITIS") || upper == "3") return TaskPriority.Critical;
        if (upper.Contains("HIGH") || upper.Contains("TINGGI") || upper == "2") return TaskPriority.High;
        if (upper.Contains("LOW") || upper.Contains("RENDAH") || upper == "0") return TaskPriority.Low;
        return TaskPriority.Medium;
    }

    private static int ParseProgress(IXLCell cell)
    {
        if (cell.IsEmpty()) return 0;
        if (cell.DataType == XLDataType.Number)
        {
            var val = cell.GetDouble();
            if (val <= 1.0 && val > 0) return (int)Math.Round(val * 100);
            return (int)Math.Clamp(Math.Round(val), 0, 100);
        }
        var str = cell.GetString().Trim().Replace("%", "");
        if (double.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
        {
            if (d <= 1.0 && d > 0) return (int)Math.Round(d * 100);
            return (int)Math.Clamp(Math.Round(d), 0, 100);
        }
        return 0;
    }

    private static DateTimeOffset? ParseDate(IXLCell cell)
    {
        if (cell.IsEmpty()) return null;
        if (cell.DataType == XLDataType.DateTime)
        {
            try
            {
                return new DateTimeOffset(DateTime.SpecifyKind(cell.GetDateTime(), DateTimeKind.Utc));
            }
            catch
            {
                // ignore
            }
        }
        var str = cell.GetString().Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        if (DateTimeOffset.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto))
        {
            return dto;
        }
        if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
        {
            return new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
        }
        return null;
    }

    private static string PickColorForProject(string name)
    {
        var colors = new[] { "#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#3B82F6" };
        var hash = Math.Abs(name.GetHashCode());
        return colors[hash % colors.Length];
    }
}

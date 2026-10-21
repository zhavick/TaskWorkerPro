using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly ITaskExcelImportService _excelImportService;
    private readonly IExcelExportService _excelExportService;
    private readonly INotificationService? _notificationService;

    public TasksController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        ITaskExcelImportService? excelImportService = null,
        IExcelExportService? excelExportService = null,
        INotificationService? notificationService = null)
    {
        _context = context;
        _tenantService = tenantService;
        _excelImportService = excelImportService ?? new TaskExcelImportService(context);
        _excelExportService = excelExportService ?? new ClosedXmlExportService(context);
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks(
        [FromQuery] int? projectId = null,
        [FromQuery] Domain.Enums.TaskStatus? status = null,
        [FromQuery] TaskPriority? priority = null,
        [FromQuery] string? milestone = null,
        [FromQuery] string? assignedToUserId = null,
        [FromQuery] int? parentTaskId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null,
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] bool? allHierarchies = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] string? sortOrder = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .AsNoTracking()
            .AsQueryable();

        // RBAC Scoping (User Requirement 4): Show all company tasks; only filter by user if filter == "mine"
        if (string.Equals(filter, "mine", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(_tenantService.UserId))
        {
            query = query.Where(t => t.AssignedToUserId == _tenantService.UserId);
        }

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        if (priority.HasValue) query = query.Where(t => t.Priority == priority.Value);
        if (!string.IsNullOrWhiteSpace(milestone)) query = query.Where(t => t.Milestone == milestone);
        if (!string.IsNullOrWhiteSpace(assignedToUserId)) query = query.Where(t => t.AssignedToUserId == assignedToUserId);

        if (allHierarchies == true)
        {
            // Do not restrict ParentTaskId
        }
        else if (parentTaskId.HasValue)
        {
            query = query.Where(t => t.ParentTaskId == parentTaskId.Value);
        }
        else
        {
            // Default: get root tasks (ParentTaskId == null) unless specifically queried
            query = query.Where(t => t.ParentTaskId == null);
        }

        if (startDate.HasValue)
        {
            query = query.Where(t => (t.DueDate.HasValue && t.DueDate.Value >= startDate.Value) ||
                                     (t.StartDate.HasValue && t.StartDate.Value >= startDate.Value));
        }

        if (endDate.HasValue)
        {
            query = query.Where(t => (t.DueDate.HasValue && t.DueDate.Value <= endDate.Value) ||
                                     (t.StartDate.HasValue && t.StartDate.Value <= endDate.Value));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(searchLower) ||
                                     (t.Description != null && t.Description.ToLower().Contains(searchLower)) ||
                                     (t.Project != null && t.Project.Name.ToLower().Contains(searchLower)));
        }

        // Column Sorting
        var isAsc = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        query = (sortBy?.ToLower()) switch
        {
            "title" => isAsc ? query.OrderBy(t => t.Title) : query.OrderByDescending(t => t.Title),
            "project" => isAsc ? query.OrderBy(t => t.Project != null ? t.Project.Name : "") : query.OrderByDescending(t => t.Project != null ? t.Project.Name : ""),
            "priority" => isAsc ? query.OrderBy(t => t.Priority) : query.OrderByDescending(t => t.Priority),
            "status" => isAsc ? query.OrderBy(t => t.Status) : query.OrderByDescending(t => t.Status),
            "progress" => isAsc ? query.OrderBy(t => t.Progress) : query.OrderByDescending(t => t.Progress),
            "duedate" => isAsc ? query.OrderBy(t => t.DueDate) : query.OrderByDescending(t => t.DueDate),
            _ => isAsc ? query.OrderBy(t => t.CreatedAt) : query.OrderByDescending(t => t.CreatedAt)
        };

        var totalCount = await query.CountAsync();

        List<WorkTask> tasks;
        int currentPage = 1;
        int currentPageSize = totalCount;
        int totalPages = 1;

        if (page.HasValue && page.Value > 0)
        {
            currentPage = page.Value;
            currentPageSize = pageSize.HasValue && pageSize.Value > 0 ? Math.Clamp(pageSize.Value, 1, 500) : 20;
            totalPages = (int)Math.Ceiling(totalCount / (double)currentPageSize);
            tasks = await query.Skip((currentPage - 1) * currentPageSize).Take(currentPageSize).ToListAsync();
        }
        else
        {
            tasks = await query.ToListAsync();
            currentPageSize = tasks.Count > 0 ? tasks.Count : 20;
        }

        var result = tasks.Select(MapToItemDto).ToList();

        return Ok(new
        {
            success = true,
            data = result,
            totalCount,
            page = currentPage,
            pageSize = currentPageSize,
            totalPages
        });
    }

    [HttpGet("kanban")]
    public async Task<IActionResult> GetKanbanTasks(
        [FromQuery] int? projectId = null,
        [FromQuery] TaskPriority? priority = null,
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null,
        [FromQuery] string? assignedToUserId = null,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] DateTimeOffset? doneStartDate = null,
        [FromQuery] DateTimeOffset? doneEndDate = null,
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] bool includeSubtasks = true)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .AsNoTracking();

        if (!includeSubtasks)
        {
            query = query.Where(t => t.ParentTaskId == null);
        }

        // RBAC Scoping (User Requirement 4): Show all company tasks; only filter by user if filter == "mine"
        if (string.Equals(filter, "mine", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(_tenantService.UserId))
        {
            query = query.Where(t => t.AssignedToUserId == _tenantService.UserId);
        }
        else if (!string.IsNullOrEmpty(assignedToUserId))
        {
            query = query.Where(t => t.AssignedToUserId == assignedToUserId);
        }

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (priority.HasValue) query = query.Where(t => t.Priority == priority.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) ||
                                     (t.Description != null && t.Description.ToLower().Contains(s)));
        }

        // Done status filter: "done dapat di tampilkan hanya pada pada bulan aktif secara default, dan dapat di select berdasarkan rentang waktu"
        // Todo, InProgress, and Overdue tasks are active work items and must always match grid data without being hidden.
        DateTimeOffset? rangeStart = doneStartDate ?? startDate;
        DateTimeOffset? rangeEnd = doneEndDate ?? endDate;

        if (!rangeStart.HasValue && !rangeEnd.HasValue && month != 0)
        {
            var targetMonth = (month.HasValue && month.Value >= 1 && month.Value <= 12) ? month.Value : DateTime.UtcNow.Month;
            var targetYear = (year.HasValue && year.Value >= 2000 && year.Value <= 2100) ? year.Value : DateTime.UtcNow.Year;
            rangeStart = new DateTimeOffset(targetYear, targetMonth, 1, 0, 0, 0, TimeSpan.Zero);
            rangeEnd = rangeStart.Value.AddMonths(1).AddTicks(-1);
        }

        if (rangeStart.HasValue || rangeEnd.HasValue)
        {
            var rStart = rangeStart ?? DateTimeOffset.MinValue;
            var rEnd = rangeEnd ?? DateTimeOffset.MaxValue;

            // Filter Done tasks to the selected period/range, while keeping active tasks (Todo, InProgress, Overdue) visible
            query = query.Where(t =>
                t.Status != Domain.Enums.TaskStatus.Done ||
                (t.DueDate.HasValue && t.DueDate.Value >= rStart && t.DueDate.Value <= rEnd) ||
                (t.StartDate.HasValue && t.StartDate.Value >= rStart && t.StartDate.Value <= rEnd) ||
                (t.UpdatedAt >= rStart && t.UpdatedAt <= rEnd) ||
                (t.CreatedAt >= rStart && t.CreatedAt <= rEnd)
            );
        }

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var dtoList = tasks.Select(MapToItemDto).ToList();

        // Strict status grouping ("munculkan data di kanban berdasarkan status")
        var kanban = new
        {
            Todo = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Todo).ToList(),
            InProgress = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.InProgress).ToList(),
            Review = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Review).ToList(),
            Done = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Done).ToList(),
            Overdue = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Overdue).ToList()
        };

        return Ok(new { success = true, data = kanban });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? projectId = null,
        [FromQuery] string? assignedToUserId = null)
    {
        var query = _context.Tasks.AsNoTracking().AsQueryable();

        // RBAC Scoping
        if (!_tenantService.IsAdmin && !string.IsNullOrEmpty(_tenantService.UserId))
        {
            query = query.Where(t => t.AssignedToUserId == _tenantService.UserId);
        }
        else if (!string.IsNullOrEmpty(assignedToUserId))
        {
            query = query.Where(t => t.AssignedToUserId == assignedToUserId);
        }

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);

        var now = DateTimeOffset.UtcNow;
        var total = await query.CountAsync();
        var todo = await query.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Todo);
        var inProgress = await query.CountAsync(t => t.Status == Domain.Enums.TaskStatus.InProgress);
        var review = await query.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Review);
        var done = await query.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Done);
        var overdue = await query.CountAsync(t => t.Status == Domain.Enums.TaskStatus.Overdue || (t.DueDate.HasValue && t.DueDate.Value < now && t.Status != Domain.Enums.TaskStatus.Done));

        return Ok(new
        {
            success = true,
            data = new
            {
                total,
                todo,
                inProgress,
                review,
                done,
                overdue
            }
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetTaskById(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Subtasks).ThenInclude(s => s.AssignedToUser)
            .Include(t => t.Sessions).ThenInclude(s => s.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null)
        {
            return NotFound(new { success = false, message = "Tugas tidak ditemukan." });
        }

        var itemDto = MapToItemDto(task);
        var subtasks = task.Subtasks.Select(s => new SubtaskDto(
            s.Id,
            s.Title,
            s.Status,
            s.Priority,
            s.Progress,
            s.AssignedToUserId,
            s.AssignedToUser?.FullName,
            s.DueDate,
            s.CreatedAt
        )).ToList();

        var sessions = task.Sessions.OrderByDescending(s => s.StartTime).Select(s => new TaskSessionDto(
            s.Id,
            s.UserId,
            s.User?.FullName ?? "Unknown",
            s.StartTime,
            s.EndTime,
            s.Duration,
            s.Notes,
            s.CreatedAt
        )).ToList();

        var detail = new TaskDetailDto(itemDto, subtasks, sessions);

        return Ok(new { success = true, data = detail });
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
    {
        var task = new WorkTask
        {
            Title = request.Title.Trim(),
            Description = !string.IsNullOrWhiteSpace(request.Description) ? request.Description.Trim() : request.Title.Trim(),
            Priority = request.Priority,
            Status = request.Status,
            Progress = Math.Clamp(request.Progress, 0, 100),
            Milestone = request.Milestone,
            Obstacle = request.Obstacle,
            Solution = request.Solution,
            ProjectId = request.ProjectId,
            CategoryId = request.CategoryId,
            AssignedToUserId = request.AssignedToUserId,
            CreatedByUserId = _tenantService.UserId,
            ParentTaskId = request.ParentTaskId,
            CompanyId = _tenantService.CompanyId ?? 1,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        if (_notificationService != null && !string.IsNullOrEmpty(task.AssignedToUserId) && task.AssignedToUserId != _tenantService.UserId)
        {
            var companyId = task.CompanyId ?? _tenantService.CompanyId ?? 1;
            await _notificationService.SendNotificationAsync(
                task.AssignedToUserId,
                companyId,
                "Tugas Baru Ditugaskan",
                $"Anda ditugaskan pada tugas: {task.Title}",
                "Task",
                "/tasks",
                _tenantService.UserId
            );
        }

        return Ok(new { success = true, message = "Tugas berhasil dibuat.", data = task });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        if (!CanUserModifyTask(task))
        {
            return StatusCode(403, new { success = false, message = "Hanya pembuat tugas atau Administrator yang dapat mengubah data tugas ini." });
        }

        var previousAssignedUserId = task.AssignedToUserId;

        task.Title = request.Title.Trim();
        task.Description = !string.IsNullOrWhiteSpace(request.Description) ? request.Description.Trim() : request.Title.Trim();
        task.Priority = request.Priority;
        task.Status = request.Status;
        task.Progress = Math.Clamp(request.Progress, 0, 100);
        task.Milestone = request.Milestone;
        task.Obstacle = request.Obstacle;
        task.Solution = request.Solution;
        task.ProjectId = request.ProjectId;
        task.CategoryId = request.CategoryId;
        task.AssignedToUserId = request.AssignedToUserId;
        task.StartDate = request.StartDate;
        task.DueDate = request.DueDate;
        task.UpdatedAt = DateTimeOffset.UtcNow;
        if (task.CompanyId == null && _tenantService.CompanyId.HasValue)
        {
            task.CompanyId = _tenantService.CompanyId.Value;
        }

        await _context.SaveChangesAsync();

        if (_notificationService != null && !string.IsNullOrEmpty(task.AssignedToUserId) &&
            task.AssignedToUserId != previousAssignedUserId && task.AssignedToUserId != _tenantService.UserId)
        {
            var companyId = task.CompanyId ?? _tenantService.CompanyId ?? 1;
            await _notificationService.SendNotificationAsync(
                task.AssignedToUserId,
                companyId,
                "Penugasan Tugas Diperbarui",
                $"Anda ditugaskan pada tugas: {task.Title}",
                "Task",
                "/tasks",
                _tenantService.UserId
            );
        }

        return Ok(new { success = true, message = "Tugas berhasil diperbarui.", data = task });
    }

    [HttpPut("{id:int}/unified-save")]
    public async Task<IActionResult> UnifiedSave(int id, [FromBody] UnifiedSaveTaskRequest request)
    {
        var isRelational = _context.Database.IsRelational();
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync<IActionResult>(async () =>
        {
            await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
            try
            {
                var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
                if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

                if (!CanUserModifyTask(task))
                {
                    return StatusCode(403, new { success = false, message = "Hanya pembuat tugas atau Administrator yang dapat mengubah data tugas ini." });
                }

                var previousAssignedUserId = task.AssignedToUserId;
                var previousStatus = task.Status;

                // 1. Update task properties
                task.Title = request.Title.Trim();
                task.Description = !string.IsNullOrWhiteSpace(request.Description) ? request.Description.Trim() : request.Title.Trim();
                task.Priority = request.Priority;
                task.Status = request.Status;
                task.Progress = Math.Clamp(request.Progress, 0, 100);
                task.Milestone = request.Milestone;
                task.Obstacle = request.Obstacle;
                task.Solution = request.Solution;
                task.ProjectId = request.ProjectId;
                task.CategoryId = request.CategoryId;
                task.AssignedToUserId = request.AssignedToUserId;
                task.StartDate = request.StartDate;
                task.DueDate = request.DueDate;
                task.UpdatedAt = DateTimeOffset.UtcNow;
                if (task.CompanyId == null && _tenantService.CompanyId.HasValue)
                {
                    task.CompanyId = _tenantService.CompanyId.Value;
                }

                // 2. Add manual work session atomically if requested
                if (request.LogManualSession && request.ManualSessionStartTime.HasValue && request.ManualSessionEndTime.HasValue)
                {
                    var duration = (long)(request.ManualSessionEndTime.Value - request.ManualSessionStartTime.Value).TotalSeconds;
                    if (duration > 0)
                    {
                        var sessionUserId = _tenantService.UserId ?? task.AssignedToUserId ?? task.CreatedByUserId;
                        if (!string.IsNullOrEmpty(sessionUserId))
                        {
                            var session = new WorkSession
                            {
                                TaskId = task.Id,
                                UserId = sessionUserId,
                                StartTime = request.ManualSessionStartTime.Value,
                                EndTime = request.ManualSessionEndTime.Value,
                                Duration = duration,
                                Notes = string.IsNullOrWhiteSpace(request.ManualSessionNotes) ? "Dicatat via Unified Save Form" : request.ManualSessionNotes.Trim(),
                                CreatedAt = DateTimeOffset.UtcNow
                            };

                            _context.Sessions.Add(session);
                        }
                    }
                }

                await _context.SaveChangesAsync();
                if (transaction != null) await transaction.CommitAsync();

                // 3. Send notifications if relevant
                if (_notificationService != null)
                {
                    var companyId = task.CompanyId ?? _tenantService.CompanyId ?? 1;
                    if (!string.IsNullOrEmpty(task.AssignedToUserId) &&
                        task.AssignedToUserId != previousAssignedUserId && task.AssignedToUserId != _tenantService.UserId)
                    {
                        await _notificationService.SendNotificationAsync(
                            task.AssignedToUserId,
                            companyId,
                            "Penugasan Tugas Diperbarui",
                            $"Anda ditugaskan pada tugas: {task.Title}",
                            "Task",
                            "/tasks",
                            _tenantService.UserId
                        );
                    }

                    if (request.Status == Domain.Enums.TaskStatus.Done && previousStatus != Domain.Enums.TaskStatus.Done &&
                        !string.IsNullOrEmpty(task.AssignedToUserId) && task.AssignedToUserId != _tenantService.UserId)
                    {
                        await _notificationService.SendNotificationAsync(
                            task.AssignedToUserId,
                            companyId,
                            "Tugas Selesai",
                            $"Tugas '{task.Title}' telah diselesaikan.",
                            "Task",
                            "/tasks",
                            _tenantService.UserId
                        );
                    }
                }

                return Ok(new { success = true, message = "Tugas dan sesi jam kerja berhasil disimpan." });
            }
            catch (Exception ex)
            {
                if (transaction != null) await transaction.RollbackAsync();
                var innerMsg = ex.InnerException != null ? $" ({ex.InnerException.Message})" : "";
                return StatusCode(500, new { success = false, message = "Gagal menyimpan perubahan: " + ex.Message + innerMsg });
            }
        });
    }

    [HttpPut("{id:int}/status")]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTaskStatusRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        if (!CanUserModifyTask(task))
        {
            return StatusCode(403, new { success = false, message = "Hanya pembuat tugas atau Administrator yang dapat mengubah data tugas ini." });
        }

        task.Status = request.Status;
        if (request.Status == Domain.Enums.TaskStatus.Done && task.Progress < 100)
        {
            task.Progress = 100;
        }
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        if (_notificationService != null && request.Status == Domain.Enums.TaskStatus.Done)
        {
            var companyId = task.CompanyId ?? _tenantService.CompanyId ?? 1;
            if (!string.IsNullOrEmpty(task.AssignedToUserId) && task.AssignedToUserId != _tenantService.UserId)
            {
                await _notificationService.SendNotificationAsync(
                    task.AssignedToUserId,
                    companyId,
                    "Tugas Selesai",
                    $"Tugas '{task.Title}' telah diselesaikan.",
                    "Task",
                    "/tasks",
                    _tenantService.UserId
                );
            }
        }

        return Ok(new { success = true, message = "Status tugas berhasil diperbarui.", status = task.Status, progress = task.Progress });
    }

    [HttpPut("{id:int}/progress")]
    [HttpPatch("{id:int}/progress")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateTaskProgressRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        if (!CanUserModifyTask(task))
        {
            return StatusCode(403, new { success = false, message = "Hanya pembuat tugas atau Administrator yang dapat mengubah data tugas ini." });
        }

        task.Progress = Math.Clamp(request.Progress, 0, 100);
        if (task.Progress == 100)
        {
            task.Status = Domain.Enums.TaskStatus.Done;
        }
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Progres tugas berhasil diperbarui.", progress = task.Progress, status = task.Status });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        // Item 5: Protect Done tasks from past months from being deleted
        if (IsProtectedDoneTaskFromPastMonth(task))
        {
            return BadRequest(new { success = false, message = "Tugas yang sudah selesai pada bulan-bulan sebelumnya telah diarsipkan secara permanen dan tidak boleh dihapus." });
        }

        // Item 4: Only creator or admin can delete task
        if (!CanUserModifyTask(task))
        {
            return StatusCode(403, new { success = false, message = "Hanya pembuat tugas atau Administrator yang dapat menghapus tugas ini." });
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tugas berhasil dihapus." });
    }

    [HttpPost("bulk-status")]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkUpdateTaskStatusRequest request)
    {
        if (request.TaskIds == null || request.TaskIds.Count == 0)
        {
            return BadRequest(new { success = false, message = "Tidak ada tugas yang dipilih." });
        }

        var tasks = await _context.Tasks
            .Where(t => request.TaskIds.Contains(t.Id))
            .ToListAsync();

        if (tasks.Count == 0)
        {
            return NotFound(new { success = false, message = "Tugas yang dipilih tidak ditemukan." });
        }

        if (!_tenantService.IsAdmin)
        {
            var nonModifiable = tasks.Where(t => !CanUserModifyTask(t)).ToList();
            if (nonModifiable.Any())
            {
                return StatusCode(403, new { success = false, message = "Anda hanya dapat mengubah status tugas yang Anda buat sendiri." });
            }
        }

        foreach (var task in tasks)
        {
            task.Status = request.Status;
            if (request.Status == Domain.Enums.TaskStatus.Done && task.Progress < 100)
            {
                task.Progress = 100;
            }
            task.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"{tasks.Count} tugas berhasil diperbarui statusnya.",
            updatedCount = tasks.Count
        });
    }

    [HttpPost("bulk-priority")]
    public async Task<IActionResult> BulkUpdatePriority([FromBody] BulkUpdateTaskPriorityRequest request)
    {
        if (request.TaskIds == null || request.TaskIds.Count == 0)
        {
            return BadRequest(new { success = false, message = "Tidak ada tugas yang dipilih." });
        }

        var tasks = await _context.Tasks
            .Where(t => request.TaskIds.Contains(t.Id))
            .ToListAsync();

        if (tasks.Count == 0)
        {
            return NotFound(new { success = false, message = "Tugas yang dipilih tidak ditemukan." });
        }

        if (!_tenantService.IsAdmin)
        {
            var nonModifiable = tasks.Where(t => !CanUserModifyTask(t)).ToList();
            if (nonModifiable.Any())
            {
                return StatusCode(403, new { success = false, message = "Anda hanya dapat mengubah prioritas tugas yang Anda buat sendiri." });
            }
        }

        foreach (var task in tasks)
        {
            task.Priority = request.Priority;
            task.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"{tasks.Count} tugas berhasil diperbarui prioritasnya.",
            updatedCount = tasks.Count
        });
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDeleteTasks([FromBody] BulkDeleteTasksRequest request)
    {
        if (request.TaskIds == null || request.TaskIds.Count == 0)
        {
            return BadRequest(new { success = false, message = "Tidak ada tugas yang dipilih." });
        }

        var tasks = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .Where(t => request.TaskIds.Contains(t.Id))
            .ToListAsync();

        if (tasks.Count == 0)
        {
            return NotFound(new { success = false, message = "Tugas yang dipilih tidak ditemukan." });
        }

        // Item 5: Check if any tasks are protected past-month done tasks
        var protectedTasks = tasks.Where(IsProtectedDoneTaskFromPastMonth).ToList();
        if (protectedTasks.Any())
        {
            return BadRequest(new
            {
                success = false,
                message = $"Terdapat {protectedTasks.Count} tugas yang sudah selesai pada bulan-bulan sebelumnya dan tidak boleh dihapus."
            });
        }

        // Item 4: Check if non-admin is trying to delete others' tasks
        if (!_tenantService.IsAdmin)
        {
            var nonModifiable = tasks.Where(t => !CanUserModifyTask(t)).ToList();
            if (nonModifiable.Any())
            {
                return StatusCode(403, new { success = false, message = "Anda hanya dapat menghapus tugas yang Anda buat sendiri." });
            }
        }

        _context.Tasks.RemoveRange(tasks);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"{tasks.Count} tugas berhasil dihapus.",
            deletedCount = tasks.Count
        });
    }

    [HttpGet("{id:int}/subtasks")]
    public async Task<IActionResult> GetSubtasks(int id)
    {
        var subtasks = await _context.Tasks
            .Include(s => s.AssignedToUser)
            .AsNoTracking()
            .Where(s => s.ParentTaskId == id)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new SubtaskDto(
                s.Id,
                s.Title,
                s.Status,
                s.Priority,
                s.Progress,
                s.AssignedToUserId,
                s.AssignedToUser != null ? s.AssignedToUser.FullName : null,
                s.DueDate,
                s.CreatedAt
            ))
            .ToListAsync();

        return Ok(new { success = true, data = subtasks });
    }

    [HttpPost("{id:int}/subtasks")]
    public async Task<IActionResult> CreateSubtask(int id, [FromBody] CreateSubtaskRequest request)
    {
        var parentTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (parentTask == null) return NotFound(new { success = false, message = "Tugas induk tidak ditemukan." });

        var subtask = new WorkTask
        {
            Title = request.Title.Trim(),
            ParentTaskId = parentTask.Id,
            ProjectId = parentTask.ProjectId,
            CompanyId = parentTask.CompanyId,
            Priority = request.Priority,
            Status = Domain.Enums.TaskStatus.Todo,
            Progress = 0,
            AssignedToUserId = request.AssignedToUserId,
            DueDate = request.DueDate,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Tasks.Add(subtask);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Sub-tugas berhasil ditambahkan.", data = subtask });
    }

    [HttpGet("import/template")]
    [Authorize]
    public IActionResult DownloadTemplate([FromQuery] string format = "standard")
    {
        var bytes = _excelImportService.GenerateTemplate(format);
        var fileName = format.ToLowerInvariant() == "arms"
            ? "Template_Import_Tugas_ARMS.xlsx"
            : "Template_Import_Tugas_Standar.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpPost("import/preview")]
    [Authorize]
    public async Task<IActionResult> PreviewImport(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File Excel wajib diunggah." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
        {
            return BadRequest(new { success = false, message = "Hanya file format Excel (.xlsx / .xls) yang diperbolehkan." });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var preview = await _excelImportService.PreviewImportAsync(
                stream,
                file.FileName,
                _tenantService.CompanyId,
                cancellationToken
            );

            return Ok(new
            {
                success = true,
                message = $"Berhasil membaca {preview.TotalRows} baris dari file Excel.",
                data = preview
            });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException()?.Message ?? ex.Message;
            return BadRequest(new
            {
                success = false,
                message = $"Gagal memproses pratinjau file Excel: {msg}"
            });
        }
    }

    [HttpPost("import/commit")]
    [Authorize]
    public async Task<IActionResult> CommitImport([FromBody] TaskImportCommitRequest request, CancellationToken cancellationToken)
    {
        if (request == null || request.Rows == null || request.Rows.Count == 0)
        {
            return BadRequest(new { success = false, message = "Data baris tugas untuk diimpor tidak boleh kosong." });
        }

        try
        {
            var result = await _excelImportService.CommitImportAsync(
                request,
                _tenantService.CompanyId,
                cancellationToken
            );

            var successMessage = result.TotalUsersCreated > 0
                ? $"Berhasil mengimpor {result.TotalImported} tugas ({result.TotalUpdated} diperbarui, {result.TotalProjectsCreated} proyek baru, {result.TotalUsersCreated} akun personil baru dibuat)."
                : result.TotalUpdated > 0
                ? $"Berhasil mengimpor {result.TotalImported} tugas ({result.TotalUpdated} diperbarui, {result.TotalProjectsCreated} proyek baru dibuat)."
                : $"Berhasil mengimpor {result.TotalImported} tugas ({result.TotalProjectsCreated} proyek baru dibuat).";


            return Ok(new
            {
                success = true,
                message = successMessage,
                data = result
            });
        }
        catch (Exception ex)
        {
            var msg = ex.GetBaseException()?.Message ?? ex.Message;
            return BadRequest(new
            {
                success = false,
                message = $"Gagal menyimpan data impor: {msg}"
            });
        }
    }

    [HttpPost("import-excel")]
    public async Task<IActionResult> ImportExcel(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File Excel wajib diunggah." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls")
        {
            return BadRequest(new { success = false, message = "Hanya file format Excel (.xlsx / .xls) yang diperbolehkan." });
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _excelImportService.ImportTasksFromExcelAsync(
                stream,
                _tenantService.CompanyId,
                cancellationToken
            );

            return Ok(new
            {
                success = true,
                message = $"Berhasil mengimpor {result.TotalImported} tugas dari file Excel ({result.TotalProjectsCreated} proyek baru dibuat).",
                data = result
            });
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message} ({ex.InnerException.Message})" : ex.Message;
            return BadRequest(new
            {
                success = false,
                message = $"Gagal memproses file Excel: {msg}"
            });
        }
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportTasks([FromQuery] TaskExportFilterDto filter, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var isAdmin = User.IsInRole("Administrator") || User.IsInRole("SuperAdmin");

        var bytes = await _excelExportService.GenerateTasksExcelAsync(
            filter,
            _tenantService.CompanyId,
            currentUserId,
            isAdmin,
            cancellationToken);

        var prefix = filter.Format?.ToLowerInvariant() == "arms" ? "Laporan_ARMS_Enterprise" : "Laporan_Tugas";
        var fileName = $"{prefix}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";

        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    private static bool IsProtectedDoneTaskFromPastMonth(WorkTask task)
    {
        if (task.Status != Domain.Enums.TaskStatus.Done) return false;

        var now = DateTimeOffset.UtcNow;
        var startOfCurrentMonth = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var taskDate = task.DueDate ?? task.CreatedAt;
        return taskDate < startOfCurrentMonth;
    }

    private bool CanUserModifyTask(WorkTask task)
    {
        if (_tenantService.IsAdmin) return true;
        if (!string.IsNullOrEmpty(task.CreatedByUserId))
        {
            return task.CreatedByUserId == _tenantService.UserId;
        }
        // Fallback for legacy tasks
        return task.AssignedToUserId == _tenantService.UserId;
    }

    private static TaskItemDto MapToItemDto(WorkTask t)
    {
        var totalSecs = t.Sessions.Sum(s => s.Duration);
        var subCount = t.Subtasks.Count;
        var compSubCount = t.Subtasks.Count(s => s.Status == Domain.Enums.TaskStatus.Done);

        return new TaskItemDto(
            t.Id,
            t.Title,
            t.Description,
            t.Priority,
            t.Status,
            t.Progress,
            t.Milestone,
            t.Obstacle,
            t.Solution,
            t.ProjectId,
            t.Project?.Name,
            t.Project?.Color,
            t.CategoryId,
            t.Category?.Name,
            t.AssignedToUserId,
            t.AssignedToUser?.FullName,
            t.AssignedToUser?.ProfilePictureUrl,
            t.ParentTaskId,
            subCount,
            compSubCount,
            totalSecs,
            t.StartDate,
            t.DueDate,
            t.CreatedAt,
            t.UpdatedAt,
            t.CreatedByUserId,
            t.CreatedByUser?.FullName
        );
    }
}

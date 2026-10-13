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

    public TasksController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        ITaskExcelImportService? excelImportService = null)
    {
        _context = context;
        _tenantService = tenantService;
        _excelImportService = excelImportService ?? new TaskExcelImportService(context);
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks(
        [FromQuery] int? projectId = null,
        [FromQuery] Domain.Enums.TaskStatus? status = null,
        [FromQuery] TaskPriority? priority = null,
        [FromQuery] string? milestone = null,
        [FromQuery] string? assignedToUserId = null,
        [FromQuery] int? parentTaskId = null,
        [FromQuery] string? search = null)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .AsNoTracking()
            .AsQueryable();

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (status.HasValue) query = query.Where(t => t.Status == status.Value);
        if (priority.HasValue) query = query.Where(t => t.Priority == priority.Value);
        if (!string.IsNullOrWhiteSpace(milestone)) query = query.Where(t => t.Milestone == milestone);
        if (!string.IsNullOrWhiteSpace(assignedToUserId)) query = query.Where(t => t.AssignedToUserId == assignedToUserId);
        if (parentTaskId.HasValue)
        {
            query = query.Where(t => t.ParentTaskId == parentTaskId.Value);
        }
        else
        {
            // Default: get root tasks (ParentTaskId == null) unless specifically queried
            query = query.Where(t => t.ParentTaskId == null);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(searchLower) ||
                                     (t.Description != null && t.Description.ToLower().Contains(searchLower)));
        }

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var result = tasks.Select(MapToItemDto).ToList();

        return Ok(new { success = true, data = result });
    }

    [HttpGet("kanban")]
    public async Task<IActionResult> GetKanbanTasks([FromQuery] int? projectId = null)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .AsNoTracking()
            .Where(t => t.ParentTaskId == null);

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        var dtoList = tasks.Select(MapToItemDto).ToList();

        var kanban = new
        {
            Todo = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Todo).ToList(),
            InProgress = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.InProgress).ToList(),
            Done = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Done).ToList(),
            Overdue = dtoList.Where(t => t.Status == Domain.Enums.TaskStatus.Overdue ||
                                         (t.DueDate.HasValue && t.DueDate.Value < DateTimeOffset.UtcNow && t.Status != Domain.Enums.TaskStatus.Done)).ToList()
        };

        return Ok(new { success = true, data = kanban });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTaskById(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
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
            Description = request.Description,
            Priority = request.Priority,
            Status = request.Status,
            Progress = Math.Clamp(request.Progress, 0, 100),
            Milestone = request.Milestone,
            Obstacle = request.Obstacle,
            Solution = request.Solution,
            ProjectId = request.ProjectId,
            CategoryId = request.CategoryId,
            AssignedToUserId = request.AssignedToUserId,
            ParentTaskId = request.ParentTaskId,
            CompanyId = _tenantService.CompanyId,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tugas berhasil dibuat.", data = task });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        task.Title = request.Title.Trim();
        task.Description = request.Description;
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

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tugas berhasil diperbarui.", data = task });
    }

    [HttpPut("{id}/unified-save")]
    public async Task<IActionResult> UnifiedSave(int id, [FromBody] UnifiedSaveTaskRequest request)
    {
        var isRelational = _context.Database.IsRelational();
        await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync() : null;
        try
        {
            var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
            if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

            // 1. Update task properties
            task.Title = request.Title.Trim();
            task.Description = request.Description;
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

            // 2. Add manual work session atomically if requested
            if (request.LogManualSession && request.ManualSessionStartTime.HasValue && request.ManualSessionEndTime.HasValue)
            {
                var duration = (long)(request.ManualSessionEndTime.Value - request.ManualSessionStartTime.Value).TotalSeconds;
                if (duration > 0)
                {
                    var session = new WorkSession
                    {
                        TaskId = task.Id,
                        UserId = _tenantService.UserId ?? "anonymous",
                        StartTime = request.ManualSessionStartTime.Value,
                        EndTime = request.ManualSessionEndTime.Value,
                        Duration = duration,
                        Notes = string.IsNullOrWhiteSpace(request.ManualSessionNotes) ? "Dicatat via Unified Save Form" : request.ManualSessionNotes.Trim(),
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    _context.Sessions.Add(session);
                }
            }

            await _context.SaveChangesAsync();
            if (transaction != null) await transaction.CommitAsync();

            return Ok(new { success = true, message = "Tugas dan sesi jam kerja berhasil disimpan." });
        }
        catch (Exception ex)
        {
            if (transaction != null) await transaction.RollbackAsync();
            return StatusCode(500, new { success = false, message = "Gagal menyimpan perubahan: " + ex.Message });
        }
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTaskStatusRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        task.Status = request.Status;
        if (request.Status == Domain.Enums.TaskStatus.Done && task.Progress < 100)
        {
            task.Progress = 100;
        }
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Status tugas berhasil diperbarui.", status = task.Status, progress = task.Progress });
    }

    [HttpPatch("{id}/progress")]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateTaskProgressRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        task.Progress = Math.Clamp(request.Progress, 0, 100);
        if (task.Progress == 100)
        {
            task.Status = Domain.Enums.TaskStatus.Done;
        }
        task.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Progres tugas berhasil diperbarui.", progress = task.Progress, status = task.Status });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.Tasks
            .Include(t => t.Subtasks)
            .Include(t => t.Sessions)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tugas berhasil dihapus." });
    }

    [HttpGet("{id}/subtasks")]
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

    [HttpPost("{id}/subtasks")]
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
            return BadRequest(new
            {
                success = false,
                message = $"Gagal memproses file Excel: {ex.Message}"
            });
        }
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
            t.UpdatedAt
        );
    }
}

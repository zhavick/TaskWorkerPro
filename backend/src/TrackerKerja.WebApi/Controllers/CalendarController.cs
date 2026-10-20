using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/calendar")]
[Authorize]
public class CalendarController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    private record StyleInfo(string Name, string Color);

    private static readonly Dictionary<TaskPriority, StyleInfo> PriorityInfo = new()
    {
        { TaskPriority.Low, new StyleInfo("Low", "#10B981") },
        { TaskPriority.Medium, new StyleInfo("Medium", "#3B82F6") },
        { TaskPriority.High, new StyleInfo("High", "#F59E0B") },
        { TaskPriority.Critical, new StyleInfo("Critical", "#EF4444") }
    };

    private static readonly Dictionary<Domain.Enums.TaskStatus, StyleInfo> StatusInfo = new()
    {
        { Domain.Enums.TaskStatus.Todo, new StyleInfo("Todo", "#6366F1") },
        { Domain.Enums.TaskStatus.InProgress, new StyleInfo("In Progress", "#3B82F6") },
        { Domain.Enums.TaskStatus.Review, new StyleInfo("Review", "#8B5CF6") },
        { Domain.Enums.TaskStatus.Done, new StyleInfo("Done", "#10B981") },
        { Domain.Enums.TaskStatus.Overdue, new StyleInfo("Overdue", "#EF4444") }
    };

    public CalendarController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents(
        [FromQuery] DateTimeOffset? start = null,
        [FromQuery] DateTimeOffset? end = null,
        [FromQuery] string? filter = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? status = null)
    {
        var query = _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Category)
            .Include(t => t.AssignedToUser)
            .AsNoTracking();

        // RBAC Scoping: Non-admin is scoped to 'mine' (FSD 5.14)
        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && (User.IsInRole("Administrator") || User.IsInRole("SuperAdmin")));
        var activeFilter = isAdmin && string.Equals(filter, "all", StringComparison.OrdinalIgnoreCase) ? "all" : "mine";

        if (activeFilter == "mine")
        {
            var currentUserId = _tenantService.UserId ?? string.Empty;
            query = query.Where(t => t.AssignedToUserId == currentUserId);
        }

        // Date Range Filtering (integrate tasks with DueDate, StartDate, or CreatedAt fallback)
        if (start.HasValue && end.HasValue)
        {
            var s = start.Value;
            var e = end.Value;
            query = query.Where(t =>
                (t.DueDate.HasValue && t.DueDate.Value >= s && t.DueDate.Value <= e) ||
                (t.StartDate.HasValue && t.StartDate.Value <= e && ((t.DueDate.HasValue && t.DueDate.Value >= s) || (!t.DueDate.HasValue && t.StartDate.Value >= s))) ||
                (!t.DueDate.HasValue && !t.StartDate.HasValue && t.CreatedAt >= s && t.CreatedAt <= e));
        }
        else if (start.HasValue)
        {
            var s = start.Value;
            query = query.Where(t => 
                (t.DueDate.HasValue && t.DueDate.Value >= s) || 
                (t.StartDate.HasValue && t.StartDate.Value >= s) ||
                (!t.DueDate.HasValue && !t.StartDate.HasValue && t.CreatedAt >= s));
        }
        else if (end.HasValue)
        {
            var e = end.Value;
            query = query.Where(t => 
                (t.StartDate.HasValue && t.StartDate.Value <= e) || 
                (t.DueDate.HasValue && t.DueDate.Value <= e) ||
                (!t.DueDate.HasValue && !t.StartDate.HasValue && t.CreatedAt <= e));
        }

        // Project and Status filters
        if (projectId.HasValue)
        {
            query = query.Where(t => t.ProjectId == projectId.Value);
        }

        if (status.HasValue)
        {
            var targetStatus = (Domain.Enums.TaskStatus)status.Value;
            query = query.Where(t => t.Status == targetStatus);
        }

        var now = DateTimeOffset.UtcNow;
        var tasks = await query.ToListAsync();

        var events = tasks.Select(t =>
        {
            var pInfo = PriorityInfo.TryGetValue(t.Priority, out var prio)
                ? prio
                : new StyleInfo(t.Priority.ToString(), "#3B82F6");

            var sInfo = StatusInfo.TryGetValue(t.Status, out var st)
                ? st
                : new StyleInfo(t.Status.ToString(), "#6366F1");

            var isOverdue = t.DueDate.HasValue && t.DueDate.Value < now && t.Status != Domain.Enums.TaskStatus.Done;
            var effectiveStart = t.StartDate ?? t.DueDate ?? t.CreatedAt;
            var effectiveEnd = t.DueDate ?? t.StartDate ?? t.CreatedAt;

            return new CalendarEventDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Start = effectiveStart,
                End = effectiveEnd,
                Priority = pInfo.Name,
                PriorityColor = pInfo.Color,
                Status = sInfo.Name,
                StatusColor = sInfo.Color,
                Progress = t.Progress,
                ProjectName = t.Project?.Name,
                ProjectColor = t.Project?.Color ?? "#6366F1",
                ProjectId = t.ProjectId,
                CategoryName = t.Category?.Name,
                AssignedToUserId = t.AssignedToUserId,
                AssignedToUserName = t.AssignedToUser?.FullName ?? t.AssignedToUser?.UserName,
                AssignedToUserAvatarColor = t.AssignedToUser?.AvatarColor ?? "#6366F1",
                AssignedToUserProfilePictureUrl = t.AssignedToUser?.ProfilePictureUrl,
                Milestone = t.Milestone,
                Obstacle = t.Obstacle,
                Solution = t.Solution,
                IsOverdue = isOverdue,
                AllDay = true
            };
        })
        .OrderBy(ev => ev.End ?? ev.Start ?? DateTimeOffset.MaxValue)
        .ToList();

        return Ok(new { success = true, data = events });
    }

    [HttpPut("events/{id:int}/status")]
    [HttpPatch("events/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] QuickUpdateTaskStatusRequest request)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null)
        {
            return NotFound(new { success = false, message = "Tugas tidak ditemukan." });
        }

        var isAdmin = _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));
        var currentUserId = _tenantService.UserId ?? string.Empty;

        if (!isAdmin && !string.IsNullOrEmpty(task.AssignedToUserId) && task.AssignedToUserId != currentUserId)
        {
            return Forbid();
        }

        task.Status = request.Status;

        if (request.Progress.HasValue)
        {
            task.Progress = Math.Clamp(request.Progress.Value, 0, 100);
        }
        else if (request.Status == Domain.Enums.TaskStatus.Done)
        {
            task.Progress = 100;
        }
        else if (request.Status == Domain.Enums.TaskStatus.Todo && task.Progress == 100)
        {
            task.Progress = 0;
        }

        task.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Status tugas berhasil diperbarui.",
            data = new
            {
                task.Id,
                Status = task.Status.ToString(),
                task.Progress
            }
        });
    }
}

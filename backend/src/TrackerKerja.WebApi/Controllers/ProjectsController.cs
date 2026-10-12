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
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public ProjectsController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProjects(
        [FromQuery] int? companyId = null,
        [FromQuery] ProjectStatus? status = null,
        [FromQuery] string? search = null)
    {
        var query = _context.Projects
            .Include(p => p.ProjectManager)
            .Include(p => p.Tasks)
            .AsNoTracking()
            .AsQueryable();

        if (companyId.HasValue && _tenantService.IsAdmin)
        {
            query = query.Where(p => p.CompanyId == companyId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(searchLower) ||
                                     (p.ClientName != null && p.ClientName.ToLower().Contains(searchLower)));
        }

        var projects = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

        var result = projects.Select(p =>
        {
            var totalTasks = p.Tasks.Count;
            var completedTasks = p.Tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
            var progress = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;

            double burnRate = 0.0;
            if (p.Budget > 0)
            {
                burnRate = Math.Round((double)(p.ActualCost / p.Budget) * 100.0, 1);
            }

            var burnStatus = burnRate > 100 ? "Overbudget" : burnRate >= 80 ? "Warning" : "Safe";

            return new ProjectListDto(
                p.Id,
                p.Name,
                p.Description,
                p.Color,
                p.Status,
                p.ClientName,
                p.ProjectManagerId,
                p.ProjectManager?.FullName,
                p.Budget,
                p.ActualCost,
                burnRate,
                burnStatus,
                totalTasks,
                completedTasks,
                progress,
                p.Deadline,
                p.CreatedAt
            );
        }).ToList();

        return Ok(new { success = true, data = result });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProjectById(int id)
    {
        var project = await _context.Projects
            .Include(p => p.ProjectManager)
            .Include(p => p.Tasks)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
        {
            return NotFound(new { success = false, message = "Proyek tidak ditemukan." });
        }

        var totalTasks = project.Tasks.Count;
        var completedTasks = project.Tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        var progress = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;

        double burnRate = project.Budget > 0 ? Math.Round((double)(project.ActualCost / project.Budget) * 100.0, 1) : 0.0;
        var burnStatus = burnRate > 100 ? "Overbudget" : burnRate >= 80 ? "Warning" : "Safe";

        var dto = new ProjectListDto(
            project.Id,
            project.Name,
            project.Description,
            project.Color,
            project.Status,
            project.ClientName,
            project.ProjectManagerId,
            project.ProjectManager?.FullName,
            project.Budget,
            project.ActualCost,
            burnRate,
            burnStatus,
            totalTasks,
            completedTasks,
            progress,
            project.Deadline,
            project.CreatedAt
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        var project = new Project
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            Color = request.Color,
            Status = request.Status,
            CompanyId = _tenantService.CompanyId,
            ClientName = request.ClientName,
            ProjectManagerId = request.ProjectManagerId,
            Budget = request.Budget,
            ActualCost = request.ActualCost,
            Deadline = request.Deadline,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Proyek berhasil dibuat.", data = project });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        project.Name = request.Name.Trim();
        project.Description = request.Description;
        project.Color = request.Color;
        project.Status = request.Status;
        project.ClientName = request.ClientName;
        project.ProjectManagerId = request.ProjectManagerId;
        project.Budget = request.Budget;
        project.ActualCost = request.ActualCost;
        project.Deadline = request.Deadline;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Data proyek berhasil diperbarui.", data = project });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Proyek berhasil dihapus." });
    }

    [HttpGet("{id}/unassigned-tasks")]
    public async Task<IActionResult> GetUnassignedTasks(int id)
    {
        var tasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => t.ProjectId == null)
            .Select(t => new { t.Id, t.Title, t.Priority, t.Status, t.Progress, t.DueDate })
            .ToListAsync();

        return Ok(new { success = true, data = tasks });
    }

    [HttpPost("{id}/assign-tasks")]
    public async Task<IActionResult> AssignTasksToProject(int id, [FromBody] BulkAssignTasksRequest request)
    {
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        var tasksToAssign = await _context.Tasks
            .Where(t => request.TaskIds.Contains(t.Id))
            .ToListAsync();

        foreach (var task in tasksToAssign)
        {
            task.ProjectId = project.Id;
            task.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"{tasksToAssign.Count} tugas berhasil dialokasikan ke proyek {project.Name}."
        });
    }
}

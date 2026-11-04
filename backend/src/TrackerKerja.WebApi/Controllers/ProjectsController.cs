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
            .Include(p => p.Company)
            .Include(p => p.ProjectManager)
            .Include(p => p.Tasks)
            .AsNoTracking()
            .AsQueryable();

        if (_tenantService.IsSuperAdmin)
        {
            if (companyId.HasValue)
            {
                query = query.Where(p => p.CompanyId == companyId.Value);
            }
        }
        else if (_tenantService.CompanyId.HasValue)
        {
            query = query.Where(p => p.CompanyId == _tenantService.CompanyId.Value);
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
                p.CreatedAt,
                p.CompanyId,
                p.Company?.Name,
                p.Company?.Code
            );
        }).ToList();

        return Ok(new { success = true, data = result });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int? companyId = null)
    {
        var query = _context.Projects
            .Include(p => p.Tasks)
            .AsNoTracking()
            .AsQueryable();

        if (_tenantService.IsSuperAdmin)
        {
            if (companyId.HasValue)
            {
                query = query.Where(p => p.CompanyId == companyId.Value);
            }
        }
        else if (_tenantService.CompanyId.HasValue)
        {
            query = query.Where(p => p.CompanyId == _tenantService.CompanyId.Value);
        }

        var projects = await query.ToListAsync();
        var totalProjects = projects.Count;
        var activeProjects = projects.Count(p => p.Status == ProjectStatus.Active);
        var completedProjects = projects.Count(p => p.Status == ProjectStatus.Completed);
        var totalBudget = projects.Sum(p => p.Budget);
        var totalActualCost = projects.Sum(p => p.ActualCost);

        var taskIds = projects.SelectMany(p => p.Tasks).Select(t => t.Id).ToList();
        var totalTasks = taskIds.Count;
        var completedTasks = projects.SelectMany(p => p.Tasks).Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        var averageProgress = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;

        var totalDurationSeconds = await _context.Sessions
            .AsNoTracking()
            .Where(s => taskIds.Contains(s.TaskId) && s.EndTime != null)
            .SumAsync(s => s.Duration);

        var totalHours = Math.Round(totalDurationSeconds / 3600.0, 1);

        return Ok(new
        {
            success = true,
            data = new
            {
                totalProjects,
                activeProjects,
                completedProjects,
                totalBudget,
                totalActualCost,
                totalTasks,
                completedTasks,
                averageProgress,
                totalDurationSeconds,
                totalHours
            }
        });
    }

    [HttpGet("{id:int}/tasks")]
    public async Task<IActionResult> GetProjectTasks(int id)
    {
        var project = await _context.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
        {
            return NotFound(new { success = false, message = "Proyek tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && project.CompanyId.HasValue && project.CompanyId != _tenantService.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses proyek perusahaan lain." });
        }

        var tasks = await _context.Tasks
            .Include(t => t.AssignedToUser)
            .Include(t => t.Category)
            .Include(t => t.Sessions)
            .AsNoTracking()
            .Where(t => t.ProjectId == id)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var dtos = tasks.Select(t =>
        {
            var taskDuration = t.Sessions.Where(s => s.EndTime != null).Sum(s => s.Duration);
            return new ProjectTaskItemDto(
                t.Id,
                $"TK-{t.Id:D4}",
                t.Title,
                t.Description,
                t.Status,
                t.Priority,
                t.Progress,
                t.Milestone,
                t.Category?.Name,
                t.AssignedToUserId,
                t.AssignedToUser?.FullName,
                t.AssignedToUser?.AvatarColor,
                t.DueDate,
                taskDuration
            );
        }).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetProjectById(int id)
    {
        var project = await _context.Projects
            .Include(p => p.Company)
            .Include(p => p.ProjectManager)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.AssignedToUser)
            .Include(p => p.Tasks)
                .ThenInclude(t => t.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null)
        {
            return NotFound(new { success = false, message = "Proyek tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && project.CompanyId.HasValue && project.CompanyId != _tenantService.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses proyek perusahaan lain." });
        }

        var totalTasks = project.Tasks.Count;
        var completedTasks = project.Tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        var progress = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;

        double burnRate = project.Budget > 0 ? Math.Round((double)(project.ActualCost / project.Budget) * 100.0, 1) : 0.0;
        var burnStatus = burnRate > 100 ? "Overbudget" : burnRate >= 80 ? "Warning" : "Safe";

        // Query sessions for tasks in this project
        var taskIds = project.Tasks.Select(t => t.Id).ToList();
        var sessions = await _context.Sessions
            .AsNoTracking()
            .Where(s => taskIds.Contains(s.TaskId) && s.EndTime != null)
            .Select(s => new { s.TaskId, s.Duration })
            .ToListAsync();

        long totalDurationSeconds = sessions.Sum(s => s.Duration);

        var taskItems = project.Tasks
            .OrderBy(t => t.Status == Domain.Enums.TaskStatus.Done)
            .ThenByDescending(t => t.Priority)
            .Select(t =>
            {
                var taskDuration = sessions.Where(s => s.TaskId == t.Id).Sum(s => s.Duration);
                return new ProjectTaskItemDto(
                    t.Id,
                    $"TK-{t.Id:D4}",
                    t.Title,
                    t.Description,
                    t.Status,
                    t.Priority,
                    t.Progress,
                    t.Milestone,
                    t.Category?.Name,
                    t.AssignedToUserId,
                    t.AssignedToUser?.FullName,
                    t.AssignedToUser?.AvatarColor,
                    t.DueDate,
                    taskDuration
                );
            }).ToList();

        var dto = new ProjectDetailDto(
            project.Id,
            project.Name,
            project.Description,
            project.Color,
            project.Status,
            project.ClientName,
            project.ProjectManagerId,
            project.ProjectManager?.FullName,
            project.ProjectManager?.Email,
            project.ProjectManager?.AvatarColor,
            project.Budget,
            project.ActualCost,
            burnRate,
            burnStatus,
            totalTasks,
            completedTasks,
            progress,
            totalDurationSeconds,
            project.Deadline,
            project.CreatedAt,
            taskItems,
            project.CompanyId,
            project.Company?.Name,
            project.Company?.Code
        );

        return Ok(new { success = true, data = dto });
    }

    private async Task<bool> IsUserProjectManagerAsync(string? userId)
    {
        if (_tenantService.IsProjectManager) return true;
        if (string.IsNullOrEmpty(userId)) return false;

        var isDbPm = await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && 
            (ur.RoleId == "r-project-manager" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Project Manager" || r.Name == "ProjectManager" || r.Name == "PM"))));
        if (isDbPm) return true;

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null)
        {
            if (user.JobTitle.Contains("Project Manager", StringComparison.OrdinalIgnoreCase) || user.JobTitle.Equals("PM", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private async Task<bool> IsUserSystemAdminAsync(string? userId)
    {
        if (_tenantService.IsAdmin) return true;
        if (string.IsNullOrEmpty(userId)) return false;

        var isDbAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && 
            (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Administrator" || r.Name == "Admin" || r.Name == "SuperAdmin"))));
        if (isDbAdmin) return true;

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null)
        {
            if (user.Id == "usr-superadmin" ||
                user.Email?.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase) == true ||
                user.Email?.Equals("admin@trackerkerja.com", StringComparison.OrdinalIgnoreCase) == true ||
                user.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase) ||
                user.JobTitle.Contains("Architect", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateProject([FromBody] CreateProjectRequest request)
    {
        var currentUserId = _tenantService.UserId;
        var isPm = await IsUserProjectManagerAsync(currentUserId);
        var isSystemAdmin = await IsUserSystemAdminAsync(currentUserId);

        // Aturan 2: Admin sistem yang berfokus pada perawatan aplikasi tidak dapat membuat proyek
        if (isSystemAdmin && !isPm)
        {
            return StatusCode(403, new { success = false, message = "Administrator sistem berfokus pada perawatan aplikasi dan tidak dapat membuat proyek. Pembuatan proyek didelegasikan kepada Project Manager perusahaan." });
        }

        if (!isPm)
        {
            return StatusCode(403, new { success = false, message = "Hanya Project Manager perusahaan yang berwenang menambahkan proyek baru." });
        }

        // Tentukan target CompanyId
        int? targetCompanyId;
        if (!_tenantService.IsSuperAdmin)
        {
            var myComp = _tenantService.CompanyId;
            if (!myComp.HasValue && !string.IsNullOrEmpty(currentUserId))
            {
                var currentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
                myComp = currentUser?.CompanyId;
            }
            if (!myComp.HasValue)
            {
                return BadRequest(new { success = false, message = "Pengguna tidak terhubung dengan perusahaan manapun." });
            }
            if (request.CompanyId.HasValue && request.CompanyId.Value != myComp.Value)
            {
                return StatusCode(403, new { success = false, message = "Anda tidak diizinkan membuat proyek untuk perusahaan lain." });
            }
            targetCompanyId = myComp.Value;
        }
        else
        {
            targetCompanyId = request.CompanyId ?? _tenantService.CompanyId;
        }

        if (!targetCompanyId.HasValue)
        {
            return BadRequest(new { success = false, message = "Perusahaan wajib dipilih untuk membuat proyek." });
        }

        var companyExists = await _context.Companies.AnyAsync(c => c.Id == targetCompanyId.Value);
        if (!companyExists)
        {
            return BadRequest(new { success = false, message = "Perusahaan yang dipilih tidak valid." });
        }

        // Validasi ProjectManagerId: harus member dari perusahaan tersebut
        string? projectManagerId = request.ProjectManagerId;
        if (!string.IsNullOrEmpty(projectManagerId))
        {
            var pmUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == projectManagerId);
            if (pmUser == null)
            {
                return BadRequest(new { success = false, message = "Project Manager yang dipilih tidak ditemukan." });
            }
            if (pmUser.CompanyId != targetCompanyId.Value)
            {
                return BadRequest(new { success = false, message = "Project Manager harus merupakan anggota dari perusahaan proyek tersebut." });
            }
        }
        else
        {
            projectManagerId = currentUserId;
        }

        var project = new Project
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            Color = request.Color,
            Status = request.Status,
            CompanyId = targetCompanyId,
            ClientName = request.ClientName,
            ProjectManagerId = projectManagerId,
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
    [Authorize]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] UpdateProjectRequest request)
    {
        var currentUserId = _tenantService.UserId;
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        var isPm = await IsUserProjectManagerAsync(currentUserId);
        var isAuthorized = isPm || (currentUserId != null && project.ProjectManagerId == currentUserId);
        if (!isAuthorized)
        {
            return StatusCode(403, new { success = false, message = "Hanya Project Manager yang berwenang mengubah data proyek." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && project.CompanyId.HasValue && project.CompanyId != _tenantService.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengubah proyek perusahaan lain." });
        }

        if (!_tenantService.IsSuperAdmin && request.CompanyId.HasValue && request.CompanyId.Value != project.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak diizinkan memindahkan proyek ke perusahaan lain." });
        }

        int? targetCompanyId = request.CompanyId ?? project.CompanyId ?? _tenantService.CompanyId;
        if (targetCompanyId.HasValue)
        {
            var companyExists = await _context.Companies.AnyAsync(c => c.Id == targetCompanyId.Value);
            if (!companyExists)
            {
                return BadRequest(new { success = false, message = "Perusahaan yang dipilih tidak valid." });
            }
            project.CompanyId = targetCompanyId.Value;
        }

        // Validasi ProjectManagerId jika diubah
        if (!string.IsNullOrEmpty(request.ProjectManagerId))
        {
            var pmUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.ProjectManagerId);
            if (pmUser == null)
            {
                return BadRequest(new { success = false, message = "Project Manager yang dipilih tidak ditemukan." });
            }
            if (project.CompanyId.HasValue && pmUser.CompanyId != project.CompanyId.Value)
            {
                return BadRequest(new { success = false, message = "Project Manager harus merupakan anggota dari perusahaan proyek tersebut." });
            }
            project.ProjectManagerId = request.ProjectManagerId;
        }
        else
        {
            project.ProjectManagerId = null;
        }

        project.Name = request.Name.Trim();
        project.Description = request.Description;
        project.Color = request.Color;
        project.Status = request.Status;
        project.ClientName = request.ClientName;
        project.Budget = request.Budget;
        project.ActualCost = request.ActualCost;
        project.Deadline = request.Deadline;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Data proyek berhasil diperbarui.", data = project });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteProject(int id)
    {
        var currentUserId = _tenantService.UserId;
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        var isPm = await IsUserProjectManagerAsync(currentUserId);
        var isAuthorized = isPm || (currentUserId != null && project.ProjectManagerId == currentUserId);
        if (!isAuthorized)
        {
            return StatusCode(403, new { success = false, message = "Hanya Project Manager yang berwenang menghapus proyek." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && project.CompanyId.HasValue && project.CompanyId != _tenantService.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak menghapus proyek perusahaan lain." });
        }

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Proyek berhasil dihapus." });
    }

    [HttpGet("{id}/unassigned-tasks")]
    public async Task<IActionResult> GetUnassignedTasks(int id)
    {
        var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && project.CompanyId.HasValue && project.CompanyId != _tenantService.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses proyek perusahaan lain." });
        }

        var query = _context.Tasks
            .AsNoTracking()
            .Where(t => t.ProjectId == null);

        if (project.CompanyId.HasValue)
        {
            query = query.Where(t => t.CompanyId == project.CompanyId.Value);
        }

        var tasks = await query
            .Select(t => new { t.Id, t.Title, t.Priority, t.Status, t.Progress, t.DueDate })
            .ToListAsync();

        return Ok(new { success = true, data = tasks });
    }

    [HttpPost("{id}/assign-tasks")]
    public async Task<IActionResult> AssignTasksToProject(int id, [FromBody] BulkAssignTasksRequest request)
    {
        var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(new { success = false, message = "Proyek tidak ditemukan." });

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && project.CompanyId.HasValue && project.CompanyId != _tenantService.CompanyId)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses proyek perusahaan lain." });
        }

        var tasksToAssign = await _context.Tasks
            .Where(t => request.TaskIds.Contains(t.Id))
            .ToListAsync();

        foreach (var task in tasksToAssign)
        {
            if (project.CompanyId.HasValue && task.CompanyId.HasValue && task.CompanyId != project.CompanyId)
            {
                return BadRequest(new { success = false, message = $"Tugas \"{task.Title}\" tidak berasal dari perusahaan yang sama dengan proyek ini." });
            }
            task.ProjectId = project.Id;
            if (project.CompanyId.HasValue && !task.CompanyId.HasValue)
            {
                task.CompanyId = project.CompanyId;
            }
            task.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"{tasksToAssign.Count} tugas berhasil dialokasikan ke proyek {project.Name}."
        });
    }

    [HttpPost("{id}/unassign-task/{taskId}")]
    public async Task<IActionResult> UnassignTask(int id, int taskId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.ProjectId == id);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan pada proyek ini." });

        task.ProjectId = null;
        task.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Tugas '{task.Title}' berhasil dilepaskan dari proyek." });
    }
}

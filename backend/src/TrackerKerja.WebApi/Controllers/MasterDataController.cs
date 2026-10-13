using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/master")]
public class MasterDataController : ControllerBase
{
    private readonly AppDbContext _context;

    public MasterDataController(AppDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // PRIORITIES
    // ==========================================

    [HttpGet("priorities")]
    public async Task<IActionResult> GetPriorities()
    {
        var priorities = await _context.MasterPriorities
            .AsNoTracking()
            .OrderBy(p => p.OrderIndex)
            .Select(p => new MasterPriorityDto(p.Id, p.Name, p.Color, p.Icon, p.OrderIndex, p.Description, p.IsDefault))
            .ToListAsync();

        return Ok(new { success = true, data = priorities });
    }

    [HttpPost("priorities")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreatePriority([FromBody] CreatePriorityRequest request)
    {
        var priority = new MasterPriority
        {
            Name = request.Name,
            Color = request.Color,
            Icon = request.Icon,
            OrderIndex = request.OrderIndex,
            Description = request.Description,
            IsDefault = request.IsDefault
        };

        _context.MasterPriorities.Add(priority);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = priority });
    }

    [HttpPut("priorities/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdatePriority(int id, [FromBody] UpdatePriorityRequest request)
    {
        var priority = await _context.MasterPriorities.FindAsync(id);
        if (priority == null)
            return NotFound(new { success = false, message = "Prioritas tidak ditemukan" });

        priority.Name = request.Name;
        priority.Color = request.Color;
        priority.Icon = request.Icon;
        priority.OrderIndex = request.OrderIndex;
        priority.Description = request.Description;
        priority.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = priority });
    }

    [HttpDelete("priorities/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeletePriority(int id)
    {
        var priority = await _context.MasterPriorities.FindAsync(id);
        if (priority == null)
            return NotFound(new { success = false, message = "Prioritas tidak ditemukan" });

        if (priority.IsDefault)
            return BadRequest(new { success = false, message = "Prioritas default sistem tidak dapat dihapus." });

        _context.MasterPriorities.Remove(priority);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Prioritas berhasil dihapus" });
    }

    // ==========================================
    // STATUSES
    // ==========================================

    [HttpGet("statuses")]
    public async Task<IActionResult> GetStatuses()
    {
        var statuses = await _context.MasterStatuses
            .AsNoTracking()
            .OrderBy(s => s.OrderIndex)
            .Select(s => new MasterStatusDto(s.Id, s.Name, s.Color, s.IsDoneState, s.OrderIndex, s.Description, s.IsDefault))
            .ToListAsync();

        return Ok(new { success = true, data = statuses });
    }

    [HttpPost("statuses")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateStatus([FromBody] CreateStatusRequest request)
    {
        var status = new MasterStatus
        {
            Name = request.Name,
            Color = request.Color,
            IsDoneState = request.IsDoneState,
            OrderIndex = request.OrderIndex,
            Description = request.Description,
            IsDefault = request.IsDefault
        };

        _context.MasterStatuses.Add(status);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = status });
    }

    [HttpPut("statuses/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var status = await _context.MasterStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { success = false, message = "Status tidak ditemukan" });

        status.Name = request.Name;
        status.Color = request.Color;
        status.IsDoneState = request.IsDoneState;
        status.OrderIndex = request.OrderIndex;
        status.Description = request.Description;
        status.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = status });
    }

    [HttpDelete("statuses/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteStatus(int id)
    {
        var status = await _context.MasterStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { success = false, message = "Status tidak ditemukan" });

        if (status.IsDefault)
            return BadRequest(new { success = false, message = "Status default sistem tidak dapat dihapus." });

        _context.MasterStatuses.Remove(status);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Status berhasil dihapus" });
    }

    // ==========================================
    // MILESTONES
    // ==========================================

    [HttpGet("milestones")]
    public async Task<IActionResult> GetMilestones()
    {
        var milestones = await _context.MasterMilestones
            .AsNoTracking()
            .OrderBy(m => m.OrderIndex)
            .Select(m => new MasterMilestoneDto(m.Id, m.Name, m.Phase, m.Color, m.Icon, m.OrderIndex, m.Description, m.IsDefault))
            .ToListAsync();

        return Ok(new { success = true, data = milestones });
    }

    [HttpPost("milestones")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateMilestone([FromBody] CreateMilestoneRequest request)
    {
        var milestone = new MasterMilestone
        {
            Name = request.Name,
            Phase = request.Phase,
            Color = request.Color,
            Icon = request.Icon,
            OrderIndex = request.OrderIndex,
            Description = request.Description,
            IsDefault = request.IsDefault
        };

        _context.MasterMilestones.Add(milestone);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = milestone });
    }

    [HttpPut("milestones/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdateMilestone(int id, [FromBody] UpdateMilestoneRequest request)
    {
        var milestone = await _context.MasterMilestones.FindAsync(id);
        if (milestone == null)
            return NotFound(new { success = false, message = "Milestone tidak ditemukan" });

        milestone.Name = request.Name;
        milestone.Phase = request.Phase;
        milestone.Color = request.Color;
        milestone.Icon = request.Icon;
        milestone.OrderIndex = request.OrderIndex;
        milestone.Description = request.Description;
        milestone.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = milestone });
    }

    [HttpDelete("milestones/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteMilestone(int id)
    {
        var milestone = await _context.MasterMilestones.FindAsync(id);
        if (milestone == null)
            return NotFound(new { success = false, message = "Milestone tidak ditemukan" });

        if (milestone.IsDefault)
            return BadRequest(new { success = false, message = "Milestone default sistem tidak dapat dihapus." });

        _context.MasterMilestones.Remove(milestone);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Milestone berhasil dihapus" });
    }

    // ==========================================
    // CATEGORIES
    // ==========================================

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Color, c.Description))
            .ToListAsync();

        return Ok(new { success = true, data = categories });
    }

    [HttpPost("categories")]
    [Authorize]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name,
            Color = request.Color,
            Description = request.Description
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = category });
    }

    [HttpPut("categories/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { success = false, message = "Kategori tidak ditemukan" });

        category.Name = request.Name;
        category.Color = request.Color;
        category.Description = request.Description;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = category });
    }

    [HttpDelete("categories/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { success = false, message = "Kategori tidak ditemukan" });

        var isReferenced = await _context.Tasks.AnyAsync(t => t.CategoryId == id);
        if (isReferenced)
        {
            return BadRequest(new { success = false, message = "Kategori tidak dapat dihapus karena masih digunakan oleh tugas aktif." });
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Kategori berhasil dihapus" });
    }
}

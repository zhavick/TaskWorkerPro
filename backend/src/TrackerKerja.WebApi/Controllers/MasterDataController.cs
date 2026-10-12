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
}

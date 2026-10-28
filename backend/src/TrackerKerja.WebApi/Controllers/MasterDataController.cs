using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/master")]
[Route("api/masterdata")]
[Route("api/master-data")]
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

        if (priorities.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            priorities = await _context.MasterPriorities
                .AsNoTracking()
                .OrderBy(p => p.OrderIndex)
                .Select(p => new MasterPriorityDto(p.Id, p.Name, p.Color, p.Icon, p.OrderIndex, p.Description, p.IsDefault))
                .ToListAsync();
        }

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

        if (statuses.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            statuses = await _context.MasterStatuses
                .AsNoTracking()
                .OrderBy(s => s.OrderIndex)
                .Select(s => new MasterStatusDto(s.Id, s.Name, s.Color, s.IsDoneState, s.OrderIndex, s.Description, s.IsDefault))
                .ToListAsync();
        }

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

        if (milestones.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            milestones = await _context.MasterMilestones
                .AsNoTracking()
                .OrderBy(m => m.OrderIndex)
                .Select(m => new MasterMilestoneDto(m.Id, m.Name, m.Phase, m.Color, m.Icon, m.OrderIndex, m.Description, m.IsDefault))
                .ToListAsync();
        }

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

        if (categories.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            categories = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new CategoryDto(c.Id, c.Name, c.Color, c.Description))
                .ToListAsync();
        }

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

    [HttpGet("job-titles")]
    public async Task<IActionResult> GetJobTitles()
    {
        var titles = await _context.Users
            .AsNoTracking()
            .Where(u => !string.IsNullOrEmpty(u.JobTitle))
            .Select(u => u.JobTitle!)
            .Distinct()
            .ToListAsync();
        return Ok(new { success = true, data = titles });
    }

    // ==========================================
    // HOLIDAYS (HARI LIBUR)
    // ==========================================

    [HttpGet("holidays")]
    public async Task<IActionResult> GetHolidays([FromQuery] int? year = null, [FromQuery] int? companyId = null)
    {
        var query = _context.Holidays
            .AsNoTracking()
            .Include(h => h.Company)
            .AsQueryable();

        if (year.HasValue)
        {
            query = query.Where(h => h.Date.Year == year.Value);
        }

        if (companyId.HasValue)
        {
            query = query.Where(h => h.IsNational || h.CompanyId == companyId.Value);
        }

        var holidays = await query
            .OrderBy(h => h.Date)
            .Select(h => new HolidayDto(
                h.Id,
                h.Date,
                h.Name,
                h.Description,
                h.IsNational,
                h.CompanyId,
                h.Company != null ? h.Company.Name : null
            ))
            .ToListAsync();

        return Ok(new { success = true, data = holidays });
    }

    [HttpGet("holidays/{id:int}")]
    public async Task<IActionResult> GetHolidayById(int id)
    {
        var h = await _context.Holidays
            .AsNoTracking()
            .Include(x => x.Company)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (h == null)
            return NotFound(new { success = false, message = "Hari libur tidak ditemukan" });

        var dto = new HolidayDto(
            h.Id,
            h.Date,
            h.Name,
            h.Description,
            h.IsNational,
            h.CompanyId,
            h.Company != null ? h.Company.Name : null
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost("holidays")]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Nama hari libur wajib diisi." });

        var holiday = new Holiday
        {
            Date = request.Date,
            Name = request.Name.Trim(),
            Description = request.Description,
            IsNational = request.IsNational,
            CompanyId = request.IsNational ? null : request.CompanyId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Holidays.Add(holiday);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = holiday });
    }

    [HttpPut("holidays/{id:int}")]
    public async Task<IActionResult> UpdateHoliday(int id, [FromBody] UpdateHolidayRequest request)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
            return NotFound(new { success = false, message = "Hari libur tidak ditemukan" });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Nama hari libur wajib diisi." });

        holiday.Date = request.Date;
        holiday.Name = request.Name.Trim();
        holiday.Description = request.Description;
        holiday.IsNational = request.IsNational;
        holiday.CompanyId = request.IsNational ? null : request.CompanyId;
        holiday.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = holiday });
    }

    [HttpDelete("holidays/{id:int}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
            return NotFound(new { success = false, message = "Hari libur tidak ditemukan" });

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Hari libur berhasil dihapus" });
    }

    [HttpPost("holidays/seed-national")]
    public async Task<IActionResult> SeedNationalHolidays([FromQuery] int year = 2026)
    {
        var defaults = DbInitializer.GetDefaultNationalHolidays(year);
        if (!defaults.Any())
        {
            return BadRequest(new { success = false, message = $"Tidak ada data master libur nasional bawaan untuk tahun {year}." });
        }

        var existingDates = await _context.Holidays
            .Where(h => h.IsNational && h.Date.Year == year)
            .Select(h => h.Date)
            .ToListAsync();

        var toAdd = defaults.Where(d => !existingDates.Contains(d.Date)).ToList();
        if (toAdd.Any())
        {
            _context.Holidays.AddRange(toAdd);
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, message = $"Berhasil menambahkan {toAdd.Count} hari libur nasional untuk tahun {year}.", addedCount = toAdd.Count });
    }
}

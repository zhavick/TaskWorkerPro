using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Administrator")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditLogsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? method = null,
        [FromQuery] int? statusCode = null)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(a => (a.UserName != null && a.UserName.Contains(search)) ||
                                     (a.Path != null && a.Path.Contains(search)) ||
                                     (a.ControllerName != null && a.ControllerName.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(method))
        {
            query = query.Where(a => a.HttpMethod == method);
        }

        if (statusCode.HasValue)
        {
            query = query.Where(a => a.StatusCode == statusCode.Value);
        }

        var totalItems = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.UserId, a.UserEmail, a.UserName, a.ControllerName, a.ActionName,
                a.HttpMethod, a.Path, a.StatusCode, a.DurationMs, a.Timestamp, a.Details
            ))
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = items,
            pagination = new
            {
                page,
                pageSize,
                totalItems,
                totalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            }
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetAuditLogById(long id)
    {
        var log = await _context.AuditLogs.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
        if (log == null) return NotFound(new { success = false, message = "Audit log tidak ditemukan." });

        return Ok(new { success = true, data = log });
    }
}

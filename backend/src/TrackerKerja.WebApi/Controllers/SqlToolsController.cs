using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/sqltools")]
[Authorize]
public class SqlToolsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISqlFormatterService _formatterService;

    public SqlToolsController(AppDbContext context, ISqlFormatterService formatterService)
    {
        _context = context;
        _formatterService = formatterService;
    }

    [HttpPost("format")]
    public async Task<IActionResult> FormatSql([FromBody] SqlFormatRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Sql))
        {
            return BadRequest(new { success = false, message = "Kueri SQL tidak boleh kosong." });
        }

        var result = _formatterService.Format(request);

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var history = new SqlHistory
            {
                Name = request.Name.Trim(),
                Content = result.FormattedSql,
                Dialect = result.Dialect,
                TaskId = request.TaskId,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _context.SqlHistories.Add(history);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            success = true,
            data = result
        });
    }

    [HttpPost("minify")]
    public IActionResult MinifySql([FromBody] SqlMinifyRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Sql))
        {
            return BadRequest(new { success = false, message = "Kueri SQL tidak boleh kosong." });
        }

        var result = _formatterService.Minify(request);

        return Ok(new
        {
            success = true,
            data = result
        });
    }

    [HttpPost("validate")]
    public IActionResult ValidateSql([FromBody] SqlValidationRequest request)
    {
        if (request == null)
        {
            return BadRequest(new { success = false, message = "Permintaan tidak valid." });
        }

        var result = _formatterService.Validate(request);

        return Ok(new
        {
            success = true,
            data = result
        });
    }

    [HttpGet("dialects")]
    public IActionResult GetDialects()
    {
        var dialects = _formatterService.GetSupportedDialects();

        return Ok(new
        {
            success = true,
            data = dialects
        });
    }

    [HttpGet("samples/{dialect}")]
    public IActionResult GetSampleQuery(string dialect, [FromQuery] string? type = "basic")
    {
        var sample = _formatterService.GetSampleQuery(dialect, type ?? "basic");

        return Ok(new
        {
            success = true,
            data = new
            {
                dialect,
                sampleType = type ?? "basic",
                query = sample
            }
        });
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var history = await _context.SqlHistories
            .AsNoTracking()
            .OrderByDescending(h => h.CreatedAt)
            .Take(50)
            .Select(h => new
            {
                h.Id,
                h.Name,
                h.Dialect,
                h.Content,
                h.TaskId,
                h.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = history
        });
    }

    [HttpDelete("history/{id}")]
    public async Task<IActionResult> DeleteHistory(int id)
    {
        var item = await _context.SqlHistories.FirstOrDefaultAsync(h => h.Id == id);
        if (item == null)
        {
            return NotFound(new { success = false, message = "Riwayat SQL tidak ditemukan." });
        }

        _context.SqlHistories.Remove(item);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Riwayat SQL berhasil dihapus."
        });
    }
}

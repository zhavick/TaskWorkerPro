using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/dev-tools")]
[Route("api/devtools")]
[Route("api/jsontools")]
[Authorize]
public class DevToolsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DevToolsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("json/format")]
    [HttpPost("format")]
    public async Task<IActionResult> FormatJson([FromBody] JsonFormatRequest request)
    {
        var jsonToFormat = request.ResolvedJson;
        if (string.IsNullOrWhiteSpace(jsonToFormat))
        {
            return BadRequest(new { success = false, message = "Payload JSON tidak boleh kosong." });
        }

        try
        {
            using var doc = JsonDocument.Parse(jsonToFormat);
            var prettyJson = JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true });

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var history = new JsonHistory
                {
                    Name = request.Name,
                    Content = prettyJson,
                    TaskId = request.TaskId,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.JsonHistories.Add(history);
                await _context.SaveChangesAsync();
            }

            return Ok(new { 
                success = true, 
                formatted = prettyJson,
                data = new { formatted = prettyJson }
            });
        }
        catch (JsonException ex)
        {
            return BadRequest(new { success = false, message = "Format JSON tidak valid: " + ex.Message });
        }
    }

    [HttpGet("json/history")]
    [HttpGet("history")]
    public async Task<IActionResult> GetJsonHistory()
    {
        var history = await _context.JsonHistories
            .Include(h => h.Task)
            .AsNoTracking()
            .OrderByDescending(h => h.CreatedAt)
            .Take(50)
            .Select(h => new { 
                h.Id, 
                h.Name, 
                h.Content, 
                h.TaskId, 
                TaskTitle = h.Task != null ? h.Task.Title : null, 
                h.CreatedAt 
            })
            .ToListAsync();

        return Ok(new { success = true, data = history });
    }

    [HttpDelete("json/history/{id}")]
    [HttpDelete("history/{id}")]
    public async Task<IActionResult> DeleteJsonHistory(int id)
    {
        var item = await _context.JsonHistories.FirstOrDefaultAsync(h => h.Id == id);
        if (item == null) return NotFound(new { success = false, message = "Riwayat JSON tidak ditemukan." });

        _context.JsonHistories.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Riwayat JSON berhasil dihapus." });
    }

    [HttpPost("sql/format")]
    public async Task<IActionResult> FormatSql([FromBody] SqlFormatRequest request)
    {
        // Simple beautifier keyword formatting
        var keywords = new[] { "SELECT", "FROM", "WHERE", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "GROUP BY", "ORDER BY", "HAVING", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM" };
        var formatted = request.SqlString;

        foreach (var kw in keywords)
        {
            formatted = System.Text.RegularExpressions.Regex.Replace(
                formatted,
                @"\b" + kw + @"\b",
                "\n" + kw,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase
            );
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var history = new SqlHistory
            {
                Name = request.Name,
                Content = formatted.Trim(),
                Dialect = request.Dialect ?? "PostgreSQL",
                TaskId = request.TaskId,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _context.SqlHistories.Add(history);
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, formatted = formatted.Trim() });
    }

    [HttpGet("sql/history")]
    public async Task<IActionResult> GetSqlHistory()
    {
        var history = await _context.SqlHistories
            .Include(h => h.Task)
            .AsNoTracking()
            .OrderByDescending(h => h.CreatedAt)
            .Take(50)
            .Select(h => new { 
                h.Id, 
                h.Name, 
                h.Dialect, 
                h.Content, 
                h.TaskId, 
                TaskTitle = h.Task != null ? h.Task.Title : null, 
                h.CreatedAt 
            })
            .ToListAsync();

        return Ok(new { success = true, data = history });
    }
}

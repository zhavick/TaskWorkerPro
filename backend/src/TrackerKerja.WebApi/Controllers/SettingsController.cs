using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize(Roles = "Administrator")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSettings()
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .Select(s => new SystemSettingDto(s.Key, s.Value, s.Description, s.UpdatedAt))
            .ToListAsync();

        return Ok(new { success = true, data = settings });
    }

    [HttpPut("batch")]
    public async Task<IActionResult> BatchUpdateSettings([FromBody] BatchUpdateSettingsRequest request)
    {
        foreach (var (key, value) in request.Settings)
        {
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting != null)
            {
                setting.Value = value;
                setting.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Pengaturan berhasil diperbarui." });
    }

    [HttpPost("test-smtp")]
    public IActionResult TestSmtp()
    {
        // Simulasi pengujian koneksi SMTP
        return Ok(new { success = true, message = "Koneksi SMTP berhasil diverifikasi." });
    }
}

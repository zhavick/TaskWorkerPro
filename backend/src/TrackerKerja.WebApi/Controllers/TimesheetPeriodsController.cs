using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/companies/{companyId}/timesheet-periods")]
[Authorize]
public class TimesheetPeriodsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public TimesheetPeriodsController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    private static int CalculateWorkingDays(DateOnly start, DateOnly end)
    {
        int count = 0;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
            {
                count++;
            }
        }
        return count;
    }

    [HttpGet]
    public async Task<IActionResult> GetPeriods(int companyId)
    {
        var periods = await _context.TimesheetPeriods
            .AsNoTracking()
            .Where(p => p.CompanyId == companyId)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();

        var dtos = periods.Select(p => new TimesheetPeriodDto(
            p.Id,
            p.CompanyId,
            p.PeriodCode,
            p.Name,
            p.StartDate,
            p.EndDate,
            p.WorkingDaysCount,
            p.IsClosed,
            p.Notes,
            p.CreatedAt,
            p.UpdatedAt
        )).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpPost]
    public async Task<IActionResult> CreatePeriod(int companyId, [FromBody] CreateTimesheetPeriodRequest request)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        if (request.EndDate < request.StartDate)
        {
            return BadRequest(new { success = false, message = "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        }

        int workingDays = request.WorkingDaysCount ?? CalculateWorkingDays(request.StartDate, request.EndDate);

        var period = new TimesheetPeriod
        {
            CompanyId = companyId,
            PeriodCode = request.PeriodCode.Trim(),
            Name = request.Name.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            WorkingDaysCount = workingDays,
            IsClosed = false,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.TimesheetPeriods.Add(period);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Periode cut-off timesheet berhasil dibuat.", data = period });
    }

    [HttpPut("{periodId}")]
    public async Task<IActionResult> UpdatePeriod(int companyId, int periodId, [FromBody] UpdateTimesheetPeriodRequest request)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) return NotFound(new { success = false, message = "Periode tidak ditemukan." });

        if (request.EndDate < request.StartDate)
        {
            return BadRequest(new { success = false, message = "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        }

        period.PeriodCode = request.PeriodCode.Trim();
        period.Name = request.Name.Trim();
        period.StartDate = request.StartDate;
        period.EndDate = request.EndDate;
        period.WorkingDaysCount = request.WorkingDaysCount;
        period.IsClosed = request.IsClosed;
        period.Notes = request.Notes?.Trim();
        period.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Periode cut-off timesheet berhasil diperbarui." });
    }

    [HttpDelete("{periodId}")]
    public async Task<IActionResult> DeletePeriod(int companyId, int periodId)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) return NotFound(new { success = false, message = "Periode tidak ditemukan." });

        _context.TimesheetPeriods.Remove(period);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Periode berhasil dihapus." });
    }

    [HttpPost("{periodId}/toggle-close")]
    public async Task<IActionResult> ToggleClosePeriod(int companyId, int periodId)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) return NotFound(new { success = false, message = "Periode tidak ditemukan." });

        period.IsClosed = !period.IsClosed;
        period.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Periode sekarang {(period.IsClosed ? "ditutup" : "dibuka")}." });
    }
}

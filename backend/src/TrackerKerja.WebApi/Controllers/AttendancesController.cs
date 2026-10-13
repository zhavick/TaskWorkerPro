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
[Route("api/attendances")]
[Authorize]
public class AttendancesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public AttendancesController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetTodayStatus()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var attendance = await _context.Attendances
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

        if (attendance == null)
        {
            return Ok(new { success = true, data = new TodayAttendanceStatusDto(false, false, null, null, 0.0, AttendanceType.Present, WorkLocation.WFO, null) });
        }

        return Ok(new
        {
            success = true,
            data = new TodayAttendanceStatusDto(
                attendance.ClockIn.HasValue,
                attendance.ClockOut.HasValue,
                attendance.ClockIn,
                attendance.ClockOut,
                attendance.TotalHours,
                attendance.Type,
                attendance.WorkLocation,
                attendance.Notes
            )
        });
    }

    [HttpPost("clock-in")]
    public async Task<IActionResult> ClockIn([FromBody] ClockInRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var existing = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);
        if (existing != null && existing.ClockIn.HasValue)
        {
            return BadRequest(new { success = false, message = "Anda sudah melakukan Clock In untuk hari ini." });
        }

        var now = DateTimeOffset.UtcNow;
        if (existing == null)
        {
            existing = new Attendance
            {
                UserId = userId,
                Date = today,
                Type = AttendanceType.Present,
                WorkLocation = request.WorkLocation,
                ClockIn = now,
                Notes = request.Notes?.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Attendances.Add(existing);
        }
        else
        {
            existing.ClockIn = now;
            existing.WorkLocation = request.WorkLocation;
            existing.Notes = request.Notes?.Trim();
            existing.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Presensi masuk (Clock In) berhasil dicatat.", clockInTime = now });
    }

    [HttpPost("clock-out")]
    public async Task<IActionResult> ClockOut([FromBody] ClockOutRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var existing = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);
        if (existing == null || !existing.ClockIn.HasValue)
        {
            return BadRequest(new { success = false, message = "Anda belum melakukan Clock In hari ini." });
        }

        if (existing.ClockOut.HasValue)
        {
            return BadRequest(new { success = false, message = "Anda sudah melakukan Clock Out hari ini." });
        }

        var now = DateTimeOffset.UtcNow;
        existing.ClockOut = now;
        var diff = (now - existing.ClockIn.Value).TotalHours;
        existing.TotalHours = Math.Round(Math.Max(0.1, diff), 2);
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            existing.Notes = string.IsNullOrEmpty(existing.Notes) ? request.Notes : $"{existing.Notes} | Out: {request.Notes}";
        }
        existing.UpdatedAt = now;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Presensi pulang (Clock Out) berhasil dicatat.",
            clockOutTime = now,
            totalHours = existing.TotalHours
        });
    }

    [HttpPost("leave")]
    public async Task<IActionResult> SubmitLeave([FromBody] SubmitLeaveRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (request.Type == AttendanceType.Present)
        {
            return BadRequest(new { success = false, message = "Untuk kehadiran normal, silakan gunakan fitur Clock In." });
        }

        var targetDate = request.Date;
        var existing = await _context.Attendances.FirstOrDefaultAsync(a => a.UserId == userId && a.Date == targetDate);
        var now = DateTimeOffset.UtcNow;

        if (existing != null)
        {
            existing.Type = request.Type;
            existing.LeaveReason = request.LeaveReason?.Trim();
            existing.Notes = request.Notes?.Trim();
            existing.ClockIn = null;
            existing.ClockOut = null;
            existing.TotalHours = 0.0;
            existing.UpdatedAt = now;
        }
        else
        {
            existing = new Attendance
            {
                UserId = userId,
                Date = targetDate,
                Type = request.Type,
                WorkLocation = WorkLocation.WFO,
                ClockIn = null,
                ClockOut = null,
                TotalHours = 0.0,
                LeaveReason = request.LeaveReason?.Trim(),
                Notes = request.Notes?.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.Attendances.Add(existing);
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = $"Pencatatan {request.Type} pada tanggal {targetDate:yyyy-MM-dd} berhasil disimpan.", data = existing });
    }

    [HttpGet("my-summary")]
    public async Task<IActionResult> GetMySummary([FromQuery] int? month = null, [FromQuery] int? year = null)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var now = DateTime.UtcNow;
        int targetMonth = month ?? now.Month;
        int targetYear = year ?? now.Year;

        var records = await _context.Attendances
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Date.Month == targetMonth && a.Date.Year == targetYear)
            .ToListAsync();

        int presentDays = records.Count(a => a.Type == AttendanceType.Present);
        int leaveDays = records.Count(a => a.Type == AttendanceType.Leave);
        int sickDays = records.Count(a => a.Type == AttendanceType.Sick);
        int permissionDays = records.Count(a => a.Type == AttendanceType.Permission);
        int tripDays = records.Count(a => a.Type == AttendanceType.BusinessTrip);
        double totalHours = Math.Round(records.Sum(a => a.TotalHours), 2);
        double avgDailyHours = presentDays > 0 ? Math.Round(totalHours / presentDays, 2) : 0.0;

        var summary = new AttendanceMonthlySummaryDto(
            presentDays,
            leaveDays,
            sickDays,
            permissionDays,
            tripDays,
            totalHours,
            avgDailyHours
        );

        return Ok(new { success = true, month = targetMonth, year = targetYear, data = summary });
    }

    [HttpGet("my-history")]
    public async Task<IActionResult> GetMyHistory([FromQuery] int? month = null, [FromQuery] int? year = null)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var now = DateTime.UtcNow;
        int targetMonth = month ?? now.Month;
        int targetYear = year ?? now.Year;

        var records = await _context.Attendances
            .Include(a => a.User)
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.Date.Month == targetMonth && a.Date.Year == targetYear)
            .OrderByDescending(a => a.Date)
            .Select(a => new AttendanceHistoryDto(
                a.Id,
                a.UserId,
                a.User.FullName,
                a.Date,
                a.Type,
                a.WorkLocation,
                a.ClockIn,
                a.ClockOut,
                a.TotalHours,
                a.LeaveReason,
                a.Notes,
                a.CreatedAt
            ))
            .ToListAsync();

        return Ok(new { success = true, data = records });
    }

    [HttpGet("reconciliation")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetReconciliation(
        [FromQuery] DateOnly? date = null,
        [FromQuery] int? companyId = null)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var targetCompany = companyId ?? _tenantService.CompanyId;

        var records = await _context.Attendances
            .Include(a => a.User)
            .AsNoTracking()
            .Where(a => a.Date == targetDate && (!targetCompany.HasValue || a.User.CompanyId == targetCompany.Value))
            .OrderBy(a => a.User.FullName)
            .Select(a => new AttendanceHistoryDto(
                a.Id,
                a.UserId,
                a.User.FullName,
                a.Date,
                a.Type,
                a.WorkLocation,
                a.ClockIn,
                a.ClockOut,
                a.TotalHours,
                a.LeaveReason,
                a.Notes,
                a.CreatedAt
            ))
            .ToListAsync();

        return Ok(new { success = true, date = targetDate, data = records });
    }

    [HttpPut("reconciliation/{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> ReconcileAttendance(int id, [FromBody] ReconcileAttendanceRequest request)
    {
        var attendance = await _context.Attendances.FirstOrDefaultAsync(a => a.Id == id);
        if (attendance == null) return NotFound(new { success = false, message = "Catatan presensi tidak ditemukan." });

        attendance.Type = request.Type;
        attendance.WorkLocation = request.WorkLocation;
        attendance.ClockIn = request.ClockIn;
        attendance.ClockOut = request.ClockOut;
        attendance.LeaveReason = request.LeaveReason;
        attendance.Notes = request.Notes;

        if (request.ClockIn.HasValue && request.ClockOut.HasValue)
        {
            attendance.TotalHours = Math.Round(Math.Max(0.0, (request.ClockOut.Value - request.ClockIn.Value).TotalHours), 2);
        }
        else
        {
            attendance.TotalHours = 0.0;
        }

        attendance.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Presensi berhasil direkonsiliasi.", data = attendance });
    }

    [HttpPost("reconciliation/manual-entry")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateManualEntry([FromBody] ManualAttendanceEntryRequest request)
    {
        var existing = await _context.Attendances
            .FirstOrDefaultAsync(a => a.UserId == request.UserId && a.Date == request.Date);

        if (existing != null)
        {
            return BadRequest(new { success = false, message = "Catatan kehadiran anggota pada tanggal ini sudah ada. Gunakan menu koreksi (Reconcile)." });
        }

        double totalHours = 0.0;
        if (request.ClockIn.HasValue && request.ClockOut.HasValue)
        {
            totalHours = Math.Round(Math.Max(0.0, (request.ClockOut.Value - request.ClockIn.Value).TotalHours), 2);
        }

        var entry = new Attendance
        {
            UserId = request.UserId,
            Date = request.Date,
            Type = request.Type,
            WorkLocation = request.WorkLocation,
            ClockIn = request.ClockIn,
            ClockOut = request.ClockOut,
            TotalHours = totalHours,
            LeaveReason = request.LeaveReason,
            Notes = request.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Attendances.Add(entry);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Entri presensi manual berhasil ditambahkan.", data = entry });
    }
}

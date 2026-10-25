using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/timesheets")]
[Authorize]
public class TimesheetsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly IExcelExportService _excelService;

    public TimesheetsController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        IExcelExportService excelService)
    {
        _context = context;
        _tenantService = tenantService;
        _excelService = excelService;
    }

    [HttpGet("active-timers")]
    [HttpGet("running")]
    public async Task<IActionResult> GetActiveTimers()
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized();
        }

        var activeSessions = await _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .AsNoTracking()
            .Where(s => s.UserId == currentUserId && s.EndTime == null)
            .OrderByDescending(s => s.StartTime)
            .ToListAsync();

        var now = DateTimeOffset.UtcNow;
        var dtos = activeSessions.Select(s => new ActiveTimerDto(
            s.Id,
            s.TaskId,
            s.Task.Title,
            s.Task.Project?.Name,
            s.Task.Project?.Color,
            s.StartTime,
            Math.Max(0, (long)(now - s.StartTime).TotalSeconds),
            s.Notes
        )).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpPost("start")]
    public async Task<IActionResult> StartTimer([FromBody] StartTimerRequest request)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == request.TaskId);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        var session = new WorkSession
        {
            TaskId = task.Id,
            UserId = currentUserId,
            StartTime = DateTimeOffset.UtcNow,
            EndTime = null, // Live running timer
            Duration = 0,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Timer berhasil dimulai.",
            data = new ActiveTimerDto(
                session.Id,
                task.Id,
                task.Title,
                task.Project?.Name,
                task.Project?.Color,
                session.StartTime,
                0,
                session.Notes
            )
        });
    }

    [HttpPost("{sessionId}/stop")]
    [HttpPost("stop/{sessionId}")]
    public async Task<IActionResult> StopTimer(int sessionId, [FromBody] StopTimerRequest? request = null)
    {
        var session = await _context.Sessions
            .Include(s => s.Task)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null) return NotFound(new { success = false, message = "Sesi timer tidak ditemukan." });

        if (session.UserId != _tenantService.UserId && !_tenantService.IsAdmin)
        {
            return Forbid();
        }

        if (session.EndTime != null)
        {
            return BadRequest(new { success = false, message = "Timer ini sudah pernah dihentikan sebelumnya." });
        }

        var stopTime = request?.StopTime.HasValue == true ? request.StopTime.Value.ToUniversalTime() : DateTimeOffset.UtcNow;
        if (stopTime <= session.StartTime)
        {
            stopTime = DateTimeOffset.UtcNow;
        }

        session.EndTime = stopTime;
        session.Duration = Math.Max(1, (long)(stopTime - session.StartTime).TotalSeconds);
        if (!string.IsNullOrWhiteSpace(request?.Notes))
        {
            session.Notes = request.Notes.Trim();
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Timer berhasil dihentikan.",
            durationSeconds = session.Duration,
            durationHours = Math.Round(session.Duration / 3600.0, 2)
        });
    }

    [HttpPost("manual")]
    public async Task<IActionResult> LogManualSession([FromBody] ManualSessionRequest request)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var startTimeUtc = request.StartTime.ToUniversalTime();
        var endTimeUtc = request.EndTime.ToUniversalTime();

        if (endTimeUtc <= startTimeUtc)
        {
            return BadRequest(new { success = false, message = "Waktu selesai harus lebih besar dari waktu mulai." });
        }

        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == request.TaskId);
        if (task == null) return NotFound(new { success = false, message = "Tugas tidak ditemukan." });

        var duration = Math.Max(1, (long)(endTimeUtc - startTimeUtc).TotalSeconds);

        // If logged by admin for a specific task, attribute the session to the task's assigned user if present
        var sessionUserId = currentUserId;
        if (_tenantService.IsAdmin && !string.IsNullOrEmpty(task.AssignedToUserId))
        {
            sessionUserId = task.AssignedToUserId;
        }

        var session = new WorkSession
        {
            TaskId = task.Id,
            UserId = sessionUserId,
            StartTime = startTimeUtc,
            EndTime = endTimeUtc,
            Duration = duration,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Sesi kerja manual berhasil dicatat.", data = session });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? userId = null)
    {
        var targetUserId = !string.IsNullOrEmpty(userId) && _tenantService.IsAdmin ? userId : _tenantService.UserId;
        if (string.IsNullOrEmpty(targetUserId)) return Unauthorized();

        var now = DateTimeOffset.UtcNow;
        var startOfToday = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var startOfWeek = startOfToday.AddDays(-(int)startOfToday.DayOfWeek);
        var startOfMonth = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

        var sessions = await _context.Sessions
            .AsNoTracking()
            .Where(s => s.UserId == targetUserId && s.EndTime != null)
            .Select(s => new { s.StartTime, s.Duration })
            .ToListAsync();

        long todaySecs = sessions.Where(s => s.StartTime >= startOfToday).Sum(s => s.Duration);
        long weekSecs = sessions.Where(s => s.StartTime >= startOfWeek).Sum(s => s.Duration);
        long monthSecs = sessions.Where(s => s.StartTime >= startOfMonth).Sum(s => s.Duration);
        double totalManDays = Math.Round((monthSecs / 3600.0) / 8.0, 2);

        var summary = new TimesheetSummaryDto(todaySecs, weekSecs, monthSecs, totalManDays, sessions.Count);
        return Ok(new { success = true, data = summary });
    }

    [HttpGet]
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(
        [FromQuery] string? userId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] int? taskId = null,
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Sessions
            .Include(s => s.Task).ThenInclude(t => t.Project)
            .Include(s => s.User)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(userId)) query = query.Where(s => s.UserId == userId);
        if (projectId.HasValue) query = query.Where(s => s.Task.ProjectId == projectId.Value);
        if (taskId.HasValue) query = query.Where(s => s.TaskId == taskId.Value);
        if (startDate.HasValue) query = query.Where(s => s.StartTime >= startDate.Value);
        if (endDate.HasValue) query = query.Where(s => s.StartTime <= endDate.Value);

        var totalCount = await query.CountAsync();

        var sessions = await query
            .OrderByDescending(s => s.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = sessions.Select(s => new TimesheetSessionDto(
            s.Id,
            s.TaskId,
            s.Task.Title,
            s.Task.ProjectId,
            s.Task.Project?.Name,
            s.Task.Project?.Color,
            s.UserId,
            s.User?.FullName ?? s.UserId,
            s.User?.ProfilePictureUrl,
            s.StartTime,
            s.EndTime,
            s.Duration,
            Math.Round(s.Duration / 3600.0, 2),
            s.Notes,
            s.CreatedAt
        )).ToList();

        // Calculate Summary for Current User
        var myUserId = _tenantService.UserId;
        var now = DateTimeOffset.UtcNow;
        var startOfToday = new DateTimeOffset(now.Year, now.Month, now.Day, 0, 0, 0, TimeSpan.Zero);
        var startOfWeek = startOfToday.AddDays(-(int)startOfToday.DayOfWeek);
        var startOfMonth = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

        var mySessions = await _context.Sessions
            .Where(s => s.UserId == myUserId && s.EndTime != null)
            .Select(s => new { s.StartTime, s.Duration })
            .ToListAsync();

        long todaySecs = mySessions.Where(s => s.StartTime >= startOfToday).Sum(s => s.Duration);
        long weekSecs = mySessions.Where(s => s.StartTime >= startOfWeek).Sum(s => s.Duration);
        long monthSecs = mySessions.Where(s => s.StartTime >= startOfMonth).Sum(s => s.Duration);
        double totalManDays = Math.Round((monthSecs / 3600.0) / 8.0, 2);

        var summary = new TimesheetSummaryDto(todaySecs, weekSecs, monthSecs, totalManDays, mySessions.Count);

        return Ok(new
        {
            success = true,
            totalCount,
            page,
            pageSize,
            data = dtos,
            summary
        });
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<IActionResult> DeleteSession(int sessionId)
    {
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session == null) return NotFound(new { success = false, message = "Sesi tidak ditemukan." });

        if (session.UserId != _tenantService.UserId && !_tenantService.IsAdmin)
        {
            return Forbid();
        }

        _context.Sessions.Remove(session);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Sesi berhasil dihapus." });
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] int? projectId = null,
        [FromQuery] string? userId = null)
    {
        var filter = new TimesheetExportFilter(startDate, endDate, projectId, userId);
        var bytes = await _excelService.GenerateTimesheetExcelAsync(filter, _tenantService.CompanyId);

        var fileName = $"Timesheet_Report_{DateTimeOffset.UtcNow:yyyyMMdd_HHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
}

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
[Route("api/attendance")]
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

    private int? ResolveTargetCompanyId(int? requestCompanyId)
    {
        if (requestCompanyId.HasValue)
        {
            if (requestCompanyId.Value == -1) return null; // -1 = Semua Perusahaan (Admin)
            if (requestCompanyId.Value > 0) return requestCompanyId.Value;
        }

        if (!_tenantService.IsAdmin)
        {
            return _tenantService.CompanyId;
        }

        // Untuk Administrator:
        // Cek apakah _tenantService.CompanyId memiliki data operasional (tugas/absensi)
        if (_tenantService.CompanyId.HasValue)
        {
            var adminComp = _tenantService.CompanyId.Value;
            var hasOperationalData = _context.Tasks.Any(t => t.CompanyId == adminComp) ||
                                     _context.Attendances.Any(a => a.User.CompanyId == adminComp);
            if (hasOperationalData)
            {
                return adminComp;
            }
        }

        // Jika holding/company admin tidak memiliki data, arahkan ke primary company operasional
        var primaryCompWithData = _context.Tasks
            .Where(t => t.CompanyId.HasValue)
            .Select(t => t.CompanyId!.Value)
            .FirstOrDefault();

        if (primaryCompWithData == 0)
        {
            primaryCompWithData = _context.Attendances
                .Where(a => a.User.CompanyId.HasValue)
                .Select(a => a.User.CompanyId!.Value)
                .FirstOrDefault();
        }

        return primaryCompWithData > 0 ? primaryCompWithData : _tenantService.CompanyId;
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetTodayStatus()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var tzOffset = TimeSpan.FromHours(7); // WIB
        var nowTz = DateTimeOffset.UtcNow.ToOffset(tzOffset);
        var today = DateOnly.FromDateTime(nowTz.DateTime);

        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.UserId == userId && a.Date == today);

        // Auto-reflect today's active tasks if attendance is not set or has 0 hours
        if (attendance == null || (attendance.TotalHours == 0.0 && attendance.Type == AttendanceType.Present))
        {
            var isWeekend = today.DayOfWeek == DayOfWeek.Saturday || today.DayOfWeek == DayOfWeek.Sunday;
            var isHoliday = await _context.Holidays.AsNoTracking().AnyAsync(h => h.Date == today);

            if (!isWeekend && !isHoliday)
            {
                var todayStartUtc = new DateTimeOffset(today.Year, today.Month, today.Day, 0, 0, 0, tzOffset).ToUniversalTime();
                var todayEndUtc = new DateTimeOffset(today.Year, today.Month, today.Day, 23, 59, 59, tzOffset).ToUniversalTime();

                var activeTasks = await _context.Tasks
                    .AsNoTracking()
                    .Where(t => t.AssignedToUserId == userId &&
                                (t.StartDate == null || t.StartDate <= todayEndUtc) &&
                                (t.DueDate == null || t.DueDate >= todayStartUtc))
                    .ToListAsync();

                if (activeTasks.Count > 0)
                {
                    var clockIn = new DateTimeOffset(today.Year, today.Month, today.Day, 8, 0, 0, tzOffset).ToUniversalTime();
                    var clockOut = new DateTimeOffset(today.Year, today.Month, today.Day, 17, 10, 0, tzOffset).ToUniversalTime();
                    var taskTitles = string.Join(", ", activeTasks.Take(2).Select(t => t.Title.Length > 80 ? t.Title.Substring(0, 77) + "..." : t.Title));
                    if (activeTasks.Count > 2) taskTitles += $" (+{activeTasks.Count - 2} lainnya)";
                    var notesText = $"Presensi sinkronisasi tugas hari ini (8 Jam): {taskTitles}";
                    if (notesText.Length > 450) notesText = notesText.Substring(0, 447) + "...";

                    if (attendance == null)
                    {
                        attendance = new Attendance
                        {
                            UserId = userId,
                            Date = today,
                            Type = AttendanceType.Present,
                            WorkLocation = WorkLocation.WFO,
                            ClockIn = clockIn,
                            ClockOut = clockOut,
                            TotalHours = 8.0,
                            Status = 2,
                            Notes = $"Presensi sinkronisasi tugas hari ini (8 Jam): {taskTitles}",
                            CreatedAt = DateTimeOffset.UtcNow,
                            UpdatedAt = DateTimeOffset.UtcNow
                        };
                        _context.Attendances.Add(attendance);
                    }
                    else
                    {
                        attendance.ClockIn ??= clockIn;
                        attendance.ClockOut ??= clockOut;
                        attendance.TotalHours = 8.0;
                        attendance.Status = 2;
                        attendance.Notes = $"Presensi sinkronisasi tugas hari ini (8 Jam): {taskTitles}";
                        attendance.UpdatedAt = DateTimeOffset.UtcNow;
                    }

                    await _context.SaveChangesAsync();
                }
            }
        }

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
    [HttpPost("clockin")]
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
    [HttpPost("clockout")]
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
    [HttpPost("request-leave")]
    [HttpPost("requestleave")]
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

    [HttpPost("approve/{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> Approve(int id)
    {
        var attendance = await _context.Attendances.FirstOrDefaultAsync(a => a.Id == id);
        if (attendance == null)
            return NotFound(new { success = false, message = "Catatan presensi/izin tidak ditemukan." });

        attendance.Status = 2; // Approved
        attendance.ApprovedByUserId = _tenantService.UserId;
        attendance.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Pengajuan presensi/izin #{id} berhasil disetujui.", data = attendance });
    }

    [HttpGet("summary")]
    [HttpGet("my-summary")]
    public async Task<IActionResult> GetMySummary([FromQuery] int? month = null, [FromQuery] int? year = null, [FromQuery] string? userId = null)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var targetUserId = _tenantService.IsAdmin && !string.IsNullOrEmpty(userId) ? userId : currentUserId;

        var now = DateTime.UtcNow;
        int targetMonth = month ?? now.Month;
        int targetYear = year ?? now.Year;

        var records = await _context.Attendances
            .AsNoTracking()
            .Where(a => a.UserId == targetUserId && a.Date.Month == targetMonth && a.Date.Year == targetYear)
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

    [HttpGet]
    [HttpGet("my-history")]
    public async Task<IActionResult> GetMyHistory([FromQuery] int? month = null, [FromQuery] int? year = null, [FromQuery] string? userId = null)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var targetUserId = _tenantService.IsAdmin && !string.IsNullOrEmpty(userId) ? userId : currentUserId;

        var now = DateTime.UtcNow;
        int targetMonth = month ?? now.Month;
        int targetYear = year ?? now.Year;

        var records = await _context.Attendances
            .Include(a => a.User)
            .AsNoTracking()
            .Where(a => a.UserId == targetUserId && a.Date.Month == targetMonth && a.Date.Year == targetYear)
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
    public async Task<IActionResult> GetReconciliation(
        [FromQuery] DateOnly? date = null,
        [FromQuery] int? companyId = null)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var targetCompany = ResolveTargetCompanyId(companyId);

        var records = await _context.Attendances
            .Include(a => a.User)
            .AsNoTracking()
            .Where(a => a.Date == targetDate && (!targetCompany.HasValue || a.User.CompanyId == targetCompany.Value || a.User.CompanyId == null))
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

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthlyTeamReconciliation(
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] int? companyId = null)
    {
        var now = DateTime.UtcNow;
        int targetMonth = month ?? now.Month;
        int targetYear = year ?? now.Year;
        var targetCompany = ResolveTargetCompanyId(companyId);

        var membersQuery = _context.Users.AsNoTracking().Where(u => u.IsApproved);
        if (targetCompany.HasValue)
        {
            membersQuery = membersQuery.Where(u => u.CompanyId == targetCompany.Value || u.CompanyId == null);
        }

        var members = await membersQuery
            .OrderBy(u => u.FullName)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.JobTitle,
                AvatarUrl = u.ProfilePictureUrl
            })
            .ToListAsync();

        var memberIds = members.Select(m => m.Id).ToList();

        var records = await _context.Attendances
            .AsNoTracking()
            .Where(a => memberIds.Contains(a.UserId) && a.Date.Month == targetMonth && a.Date.Year == targetYear)
            .ToListAsync();

        int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
        var memberItems = new List<TeamMemberMonthlyAttendanceItemDto>();
        double grandTotalHours = 0.0;

        foreach (var member in members)
        {
            var userRecords = records.Where(r => r.UserId == member.Id).ToList();
            int present = userRecords.Count(r => r.Type == AttendanceType.Present);
            int leave = userRecords.Count(r => r.Type == AttendanceType.Leave);
            int sick = userRecords.Count(r => r.Type == AttendanceType.Sick);
            int permission = userRecords.Count(r => r.Type == AttendanceType.Permission);
            int trip = userRecords.Count(r => r.Type == AttendanceType.BusinessTrip);
            double totalHours = Math.Round(userRecords.Sum(r => r.TotalHours), 2);
            grandTotalHours += totalHours;

            var dailyList = userRecords
                .OrderBy(r => r.Date.Day)
                .Select(r => new TeamMemberDailyAttendanceDto(
                    r.Date.Day,
                    r.Type,
                    r.TotalHours,
                    r.WorkLocation,
                    r.ClockIn,
                    r.ClockOut
                ))
                .ToList();

            memberItems.Add(new TeamMemberMonthlyAttendanceItemDto(
                member.Id,
                member.FullName,
                member.JobTitle,
                member.AvatarUrl,
                present,
                leave,
                sick,
                permission,
                trip,
                totalHours,
                dailyList
            ));
        }

        var report = new TeamMonthlyAttendanceReportDto(
            targetMonth,
            targetYear,
            daysInMonth,
            members.Count,
            Math.Round(grandTotalHours, 2),
            memberItems
        );

        return Ok(new { success = true, data = report });
    }

    [HttpPut("reconciliation/{id}")]
    public async Task<IActionResult> ReconcileAttendance(int id, [FromBody] ReconcileAttendanceRequest request)
    {
        var attendance = await _context.Attendances.FirstOrDefaultAsync(a => a.Id == id);
        if (attendance == null) return NotFound(new { success = false, message = "Catatan presensi tidak ditemukan." });

        // Enforce RBAC: Non-admin can only update their own attendance record
        if (!_tenantService.IsAdmin && attendance.UserId != _tenantService.UserId)
        {
            return StatusCode(403, new { success = false, message = "Anda hanya dapat memperbarui data presensi Anda sendiri." });
        }

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
    [HttpPost("manual-entry")]
    [Authorize]
    public async Task<IActionResult> CreateManualEntry([FromBody] ManualAttendanceEntryRequest request)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        // Enforce RBAC: Non-admin can only record manual entry for themselves
        string targetUserId;
        if (!_tenantService.IsAdmin)
        {
            targetUserId = currentUserId;
        }
        else
        {
            targetUserId = string.IsNullOrWhiteSpace(request.UserId) ? currentUserId : request.UserId;

            if (targetUserId != currentUserId && _tenantService.CompanyId.HasValue)
            {
                var targetMember = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == targetUserId);
                if (targetMember == null || (targetMember.CompanyId.HasValue && targetMember.CompanyId != _tenantService.CompanyId.Value))
                {
                    return BadRequest(new { success = false, message = "Anggota tidak ditemukan pada perusahaan ini." });
                }
            }
        }

        var existing = await _context.Attendances
            .FirstOrDefaultAsync(a => a.UserId == targetUserId && a.Date == request.Date);

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
            UserId = targetUserId,
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

    [HttpPost("sync-from-tasks")]
    [Authorize]
    public async Task<IActionResult> SyncFromTasks(
        [FromQuery] int? companyId = null,
        [FromQuery] string? userId = null,
        [FromQuery] DateOnly? date = null,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null)
    {
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId)) return Unauthorized();

        var isAdmin = _tenantService.IsAdmin;
        int? targetCompanyId = ResolveTargetCompanyId(companyId);
        string? targetUserId = isAdmin ? userId : currentUserId;

        var usersQuery = _context.Users.Where(u => u.IsApproved);
        if (targetCompanyId.HasValue)
        {
            usersQuery = usersQuery.Where(u => u.CompanyId == targetCompanyId.Value || u.CompanyId == null);
        }
        if (!string.IsNullOrEmpty(targetUserId))
        {
            usersQuery = usersQuery.Where(u => u.Id == targetUserId);
        }

        var users = await usersQuery.ToListAsync();
        if (users.Count == 0)
        {
            return Ok(new { success = true, message = "Tidak ada pengguna yang memenuhi kriteria sinkronisasi.", syncedCount = 0 });
        }

        var holidays = await _context.Holidays.AsNoTracking().ToListAsync();
        var holidaySet = holidays.Select(h => h.Date).ToHashSet();
        var tzOffset = TimeSpan.FromHours(7);

        int totalSynced = 0;

        foreach (var user in users)
        {
            var userTasks = await _context.Tasks
                .AsNoTracking()
                .Where(t => t.AssignedToUserId == user.Id)
                .ToListAsync();

            if (userTasks.Count == 0) continue;

            // Collect active dates for user
            var dateTaskMap = new Dictionary<DateOnly, List<WorkTask>>();

            foreach (var task in userTasks)
            {
                DateOnly taskStart;
                DateOnly taskDue;

                if (task.StartDate.HasValue && task.DueDate.HasValue)
                {
                    taskStart = DateOnly.FromDateTime(task.StartDate.Value.ToOffset(tzOffset).DateTime);
                    taskDue = DateOnly.FromDateTime(task.DueDate.Value.ToOffset(tzOffset).DateTime);
                }
                else if (task.StartDate.HasValue)
                {
                    taskStart = DateOnly.FromDateTime(task.StartDate.Value.ToOffset(tzOffset).DateTime);
                    taskDue = taskStart;
                }
                else if (task.DueDate.HasValue)
                {
                    taskDue = DateOnly.FromDateTime(task.DueDate.Value.ToOffset(tzOffset).DateTime);
                    taskStart = taskDue;
                }
                else
                {
                    var created = DateOnly.FromDateTime(task.CreatedAt.ToOffset(tzOffset).DateTime);
                    taskStart = created;
                    taskDue = created;
                }

                if (taskStart > taskDue)
                {
                    var tmp = taskStart;
                    taskStart = taskDue;
                    taskDue = tmp;
                }

                // Jika tugas masih berjalan (belum selesai) dan dueDate di masa lampau, anggap berlanjut hingga hari ini
                var today = DateOnly.FromDateTime(DateTime.UtcNow.Add(tzOffset));
                if (task.Status != Domain.Enums.TaskStatus.Done)
                {
                    if (taskDue < today && taskStart <= today)
                    {
                        taskDue = today;
                    }
                }

                // If specific date requested, clamp or filter
                if (date.HasValue)
                {
                    if (date.Value < taskStart || date.Value > taskDue) continue;
                    taskStart = date.Value;
                    taskDue = date.Value;
                }
                else if (month.HasValue && year.HasValue)
                {
                    var mStart = new DateOnly(year.Value, month.Value, 1);
                    var mEnd = new DateOnly(year.Value, month.Value, DateTime.DaysInMonth(year.Value, month.Value));
                    if (taskDue < mStart || taskStart > mEnd) continue;
                    taskStart = taskStart < mStart ? mStart : taskStart;
                    taskDue = taskDue > mEnd ? mEnd : taskDue;
                }

                for (var cur = taskStart; cur <= taskDue; cur = cur.AddDays(1))
                {
                    // Skip weekends & holidays
                    if (cur.DayOfWeek == DayOfWeek.Saturday || cur.DayOfWeek == DayOfWeek.Sunday || holidaySet.Contains(cur))
                    {
                        continue;
                    }

                    if (!dateTaskMap.ContainsKey(cur))
                    {
                        dateTaskMap[cur] = new List<WorkTask>();
                    }
                    if (!dateTaskMap[cur].Any(t => t.Id == task.Id))
                    {
                        dateTaskMap[cur].Add(task);
                    }
                }
            }

            foreach (var kvp in dateTaskMap)
            {
                var curDate = kvp.Key;
                var tasksOnDate = kvp.Value;

                var clockIn = new DateTimeOffset(curDate.Year, curDate.Month, curDate.Day, 8, 0, 0, tzOffset);
                var clockOut = new DateTimeOffset(curDate.Year, curDate.Month, curDate.Day, 17, 10, 0, tzOffset);
                var taskTitles = string.Join(", ", tasksOnDate.Take(2).Select(t => t.Title.Length > 80 ? t.Title.Substring(0, 77) + "..." : t.Title));
                if (tasksOnDate.Count > 2) taskTitles += $" (+{tasksOnDate.Count - 2} lainnya)";
                var notesText = $"Presensi sinkronisasi tugas harian (8 Jam): {taskTitles}";
                if (notesText.Length > 450) notesText = notesText.Substring(0, 447) + "...";

                var existingAtt = await _context.Attendances
                    .FirstOrDefaultAsync(a => a.UserId == user.Id && a.Date == curDate);

                if (existingAtt == null)
                {
                    existingAtt = new Attendance
                    {
                        UserId = user.Id,
                        Date = curDate,
                        Type = AttendanceType.Present,
                        WorkLocation = WorkLocation.WFO,
                        ClockIn = clockIn.ToUniversalTime(),
                        ClockOut = clockOut.ToUniversalTime(),
                        TotalHours = 8.0,
                        Status = 2, // Approved
                        Notes = notesText,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    _context.Attendances.Add(existingAtt);
                    totalSynced++;
                }
                else
                {
                    existingAtt.Type = AttendanceType.Present;
                    existingAtt.WorkLocation = WorkLocation.WFO;
                    existingAtt.ClockIn = clockIn.ToUniversalTime();
                    existingAtt.ClockOut = clockOut.ToUniversalTime();
                    existingAtt.TotalHours = 8.0;
                    existingAtt.Status = 2; // Approved
                    existingAtt.Notes = notesText;
                    existingAtt.UpdatedAt = DateTimeOffset.UtcNow;
                    totalSynced++;
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Presensi berhasil disinkronkan: {totalSynced} entri kehadiran (8 Jam/hari) diperbarui untuk {users.Count} personel.",
            syncedCount = totalSynced,
            usersCount = users.Count
        });
    }
}

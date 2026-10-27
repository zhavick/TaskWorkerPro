using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class AutomatedTimesheetGeneratorService : IAutomatedTimesheetGeneratorService
{
    private readonly AppDbContext _context;

    public AutomatedTimesheetGeneratorService(AppDbContext context)
    {
        _context = context;
    }

    private static int GetPriorityWeight(TaskPriority p) => p switch
    {
        TaskPriority.Critical => 4,
        TaskPriority.High => 3,
        TaskPriority.Medium => 2,
        _ => 1 // Low
    };

    public async Task<AutoGenerateTimesheetResultDto> GenerateTimesheetsAsync(
        AutoGenerateTimesheetRequest request,
        int companyId,
        CancellationToken cancellationToken = default)
    {
        var period = await _context.TimesheetPeriods
            .FirstOrDefaultAsync(p => p.Id == request.PeriodId && p.CompanyId == companyId, cancellationToken);

        if (period == null)
        {
            return new AutoGenerateTimesheetResultDto(
                Success: false,
                Message: "Periode cut-off timesheet tidak ditemukan.",
                UsersProcessedCount: 0,
                WorkingDaysCount: 0,
                GeneratedSessionsCount: 0,
                AttendancesCreatedCount: 0,
                TotalHoursGenerated: 0
            );
        }

        // Query target users
        var userQuery = _context.Users
            .Where(u => u.CompanyId == companyId && u.IsApproved && u.RejectionReason == null);

        if (!string.IsNullOrWhiteSpace(request.UserId) && request.UserId.ToLowerInvariant() != "all")
        {
            userQuery = userQuery.Where(u => u.Id == request.UserId);
        }

        var users = await userQuery.ToListAsync(cancellationToken);
        if (users.Count == 0)
        {
            return new AutoGenerateTimesheetResultDto(
                Success: false,
                Message: "Tidak ada personel target yang aktif/disetujui pada perusahaan ini.",
                UsersProcessedCount: 0,
                WorkingDaysCount: 0,
                GeneratedSessionsCount: 0,
                AttendancesCreatedCount: 0,
                TotalHoursGenerated: 0
            );
        }

        // Query company tasks (include tasks explicitly set to this company, or assigned to this company's users)
        var targetUserIds = users.Select(u => u.Id).ToList();
        var companyTasks = await _context.Tasks
            .Include(t => t.Project)
            .Include(t => t.Sessions)
            .Where(t => t.CompanyId == companyId || (t.AssignedToUserId != null && targetUserIds.Contains(t.AssignedToUserId)))
            .ToListAsync(cancellationToken);

        // Synchronize any tasks assigned to these users that had old or null CompanyId
        var tasksNeedingCompanySync = companyTasks.Where(t => t.CompanyId != companyId).ToList();
        if (tasksNeedingCompanySync.Count > 0)
        {
            foreach (var t in tasksNeedingCompanySync)
            {
                t.CompanyId = companyId;
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (companyTasks.Count == 0)
        {
            return new AutoGenerateTimesheetResultDto(
                Success: false,
                Message: "Belum ada daftar tugas (tasks) pada perusahaan ini untuk dikonversi menjadi timesheet.",
                UsersProcessedCount: 0,
                WorkingDaysCount: 0,
                GeneratedSessionsCount: 0,
                AttendancesCreatedCount: 0,
                TotalHoursGenerated: 0
            );
        }

        // Gather working dates (Monday - Friday)
        var workingDates = new List<DateOnly>();
        for (var d = period.StartDate; d <= period.EndDate; d = d.AddDays(1))
        {
            if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
            {
                workingDates.Add(d);
            }
        }

        int totalSessionsCreated = 0;
        int totalAttendancesCreated = 0;
        long totalSecondsCreated = 0;
        var tzOffset = TimeSpan.FromHours(7); // WIB (UTC+7)

        foreach (var user in users)
        {
            var userTasks = companyTasks.Where(t => t.AssignedToUserId == user.Id).ToList();
            if (userTasks.Count == 0)
            {
                userTasks = companyTasks;
            }

            // Urutkan tugas unik per personel: prioritaskan yang memiliki StartDate, lalu bobot prioritas
            var distinctUserTasks = userTasks
                .GroupBy(t => t.Id)
                .Select(g => g.First())
                .OrderBy(t => t.StartDate.HasValue ? 0 : 1)
                .ThenBy(t => t.StartDate ?? t.CreatedAt)
                .ThenByDescending(t => GetPriorityWeight(t.Priority))
                .ToList();

            // Total hari yang di-generate per personel dibatasi sejumlah data tugas unik yang dimiliki (1 tugas = 1 hari kerja 8 jam)
            int daysToGenerate = Math.Min(distinctUserTasks.Count, workingDates.Count);
            if (daysToGenerate == 0) continue;

            if (request.Mode == "Overwrite")
            {
                var periodStartUtc = new DateTimeOffset(period.StartDate.Year, period.StartDate.Month, period.StartDate.Day, 0, 0, 0, tzOffset).ToUniversalTime();
                var periodEndUtc = new DateTimeOffset(period.EndDate.Year, period.EndDate.Month, period.EndDate.Day, 23, 59, 59, tzOffset).ToUniversalTime();

                var oldSessions = await _context.Sessions
                    .Where(s => s.UserId == user.Id && s.StartTime >= periodStartUtc && s.StartTime <= periodEndUtc)
                    .ToListAsync(cancellationToken);
                if (oldSessions.Count > 0)
                {
                    _context.Sessions.RemoveRange(oldSessions);
                }

                var oldAttendances = await _context.Attendances
                    .Where(a => a.UserId == user.Id && a.Date >= period.StartDate && a.Date <= period.EndDate)
                    .ToListAsync(cancellationToken);
                if (oldAttendances.Count > 0)
                {
                    _context.Attendances.RemoveRange(oldAttendances);
                }
            }

            for (int dayIdx = 0; dayIdx < daysToGenerate; dayIdx++)
            {
                var date = workingDates[dayIdx];
                var dayStart = new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, tzOffset);
                var dayEnd = dayStart.AddDays(1);
                var dayStartUtc = dayStart.ToUniversalTime();
                var dayEndUtc = dayEnd.ToUniversalTime();

                var existingSessions = await _context.Sessions
                    .Where(s => s.UserId == user.Id && s.StartTime >= dayStartUtc && s.StartTime < dayEndUtc)
                    .ToListAsync(cancellationToken);

                long existingDuration = existingSessions.Sum(s => s.Duration);

                if (request.Mode == "FillEmptyOnly" && existingDuration >= 28800)
                {
                    // Day is already full (>= 8 hours)
                    continue;
                }

                if (request.Mode == "Overwrite" && existingSessions.Count > 0)
                {
                    _context.Sessions.RemoveRange(existingSessions);
                    existingDuration = 0;
                }

                long neededSeconds = 28800 - existingDuration;
                if (neededSeconds <= 0) continue;

                var task = distinctUserTasks[dayIdx];

                // Jadwalkan 1 sesi utuh 8 jam (28.800 detik) untuk tugas tersebut pada hari ini
                var startTime = new DateTimeOffset(date.Year, date.Month, date.Day, 8, 0, 0, tzOffset);
                var endTime = new DateTimeOffset(date.Year, date.Month, date.Day, 17, 0, 0, tzOffset);

                var session = new WorkSession
                {
                    TaskId = task.Id,
                    UserId = user.Id,
                    StartTime = startTime.ToUniversalTime(),
                    EndTime = endTime.ToUniversalTime(),
                    Duration = neededSeconds,
                    Notes = $"Pengerjaan tugas {task.Title} (Auto-generated)",
                    CreatedAt = DateTimeOffset.UtcNow
                };

                _context.Sessions.Add(session);
                totalSessionsCreated++;
                totalSecondsCreated += neededSeconds;

                // Synchronize Attendance (ClockIn: 08:00, ClockOut: 17:10, WFO)
                var attExists = await _context.Attendances
                    .AnyAsync(a => a.UserId == user.Id && a.Date == date, cancellationToken);

                if (!attExists)
                {
                    var clockIn = new DateTimeOffset(date.Year, date.Month, date.Day, 8, 0, 0, tzOffset);
                    var clockOut = new DateTimeOffset(date.Year, date.Month, date.Day, 17, 10, 0, tzOffset);
                    var att = new Attendance
                    {
                        UserId = user.Id,
                        Date = date,
                        ClockIn = clockIn.ToUniversalTime(),
                        ClockOut = clockOut.ToUniversalTime(),
                        WorkLocation = WorkLocation.WFO
                    };
                    _context.Attendances.Add(att);
                    totalAttendancesCreated++;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        double totalHours = Math.Round((double)totalSecondsCreated / 3600.0, 2);

        return new AutoGenerateTimesheetResultDto(
            Success: true,
            Message: $"Timesheet otomatis berhasil dibuat: {totalSessionsCreated} sesi jam kerja ({totalHours} jam) dan {totalAttendancesCreated} data absensi untuk {users.Count} personel.",
            UsersProcessedCount: users.Count,
            WorkingDaysCount: workingDates.Count,
            GeneratedSessionsCount: totalSessionsCreated,
            AttendancesCreatedCount: totalAttendancesCreated,
            TotalHoursGenerated: totalHours
        );
    }
}

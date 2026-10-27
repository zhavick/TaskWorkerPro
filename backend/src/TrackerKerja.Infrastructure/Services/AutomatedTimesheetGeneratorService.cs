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

        // Query company tasks
        var companyTasks = await _context.Tasks
            .Include(t => t.Project)
            .Where(t => t.CompanyId == companyId)
            .ToListAsync(cancellationToken);

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

            foreach (var date in workingDates)
            {
                var dayStart = new DateTimeOffset(date.Year, date.Month, date.Day, 0, 0, 0, tzOffset);
                var dayEnd = dayStart.AddDays(1);

                var existingSessions = await _context.Sessions
                    .Where(s => s.UserId == user.Id && s.StartTime >= dayStart && s.StartTime < dayEnd)
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

                // Match candidate tasks for this date
                var targetDateTime = new DateTimeOffset(date.Year, date.Month, date.Day, 12, 0, 0, tzOffset);
                var candidateTasks = userTasks.Where(t =>
                    (t.StartDate.HasValue && t.DueDate.HasValue && t.StartDate.Value <= targetDateTime && t.DueDate.Value >= targetDateTime)
                    || (t.StartDate.HasValue && !t.DueDate.HasValue && t.StartDate.Value <= targetDateTime)
                    || (!t.StartDate.HasValue && t.DueDate.HasValue && t.DueDate.Value >= targetDateTime)
                    || (!t.StartDate.HasValue && !t.DueDate.HasValue && t.CreatedAt <= targetDateTime)
                ).ToList();

                if (candidateTasks.Count == 0)
                {
                    candidateTasks = userTasks;
                }

                // Allocate proportional durations based on Priority Weight
                int totalWeight = candidateTasks.Sum(t => GetPriorityWeight(t.Priority));
                var taskAllocations = new List<(WorkTask Task, long Seconds)>();
                long sumAlloc = 0;

                for (int i = 0; i < candidateTasks.Count; i++)
                {
                    var t = candidateTasks[i];
                    long sec = (long)Math.Round((double)GetPriorityWeight(t.Priority) / totalWeight * neededSeconds);
                    if (sec < 60) sec = 60; // minimum 1 minute
                    taskAllocations.Add((t, sec));
                    sumAlloc += sec;
                }

                // Balance difference to ensure exact neededSeconds
                long diff = neededSeconds - sumAlloc;
                if (taskAllocations.Count > 0)
                {
                    var first = taskAllocations[0];
                    taskAllocations[0] = (first.Task, Math.Max(60, first.Seconds + diff));
                }

                // Schedule sessions between 08:00 and 17:00, splitting around 12:00 - 13:00 lunch
                var currentTime = new DateTimeOffset(date.Year, date.Month, date.Day, 8, 0, 0, tzOffset);
                var lunchStart = new DateTimeOffset(date.Year, date.Month, date.Day, 12, 0, 0, tzOffset);
                var lunchEnd = new DateTimeOffset(date.Year, date.Month, date.Day, 13, 0, 0, tzOffset);

                foreach (var alloc in taskAllocations)
                {
                    long remainingTaskSecs = alloc.Seconds;

                    while (remainingTaskSecs > 0)
                    {
                        if (currentTime >= lunchStart && currentTime < lunchEnd)
                        {
                            currentTime = lunchEnd;
                        }

                        DateTimeOffset sessionEnd;
                        long thisSessionSecs;

                        if (currentTime < lunchStart)
                        {
                            var maxMorningSecs = (long)(lunchStart - currentTime).TotalSeconds;
                            if (remainingTaskSecs <= maxMorningSecs)
                            {
                                thisSessionSecs = remainingTaskSecs;
                                sessionEnd = currentTime.AddSeconds(thisSessionSecs);
                            }
                            else
                            {
                                thisSessionSecs = maxMorningSecs;
                                sessionEnd = lunchStart;
                            }
                        }
                        else
                        {
                            thisSessionSecs = remainingTaskSecs;
                            sessionEnd = currentTime.AddSeconds(thisSessionSecs);
                        }

                        var session = new WorkSession
                        {
                            TaskId = alloc.Task.Id,
                            UserId = user.Id,
                            StartTime = currentTime,
                            EndTime = sessionEnd,
                            Duration = thisSessionSecs,
                            Notes = $"Pengerjaan tugas {alloc.Task.Title} (Auto-generated)",
                            CreatedAt = DateTimeOffset.UtcNow
                        };

                        _context.Sessions.Add(session);
                        totalSessionsCreated++;
                        totalSecondsCreated += thisSessionSecs;

                        remainingTaskSecs -= thisSessionSecs;
                        currentTime = sessionEnd;
                    }
                }

                // Synchronize Attendance (ClockIn: 08:00, ClockOut: 17:10, WFO)
                var attExists = await _context.Attendances
                    .AnyAsync(a => a.UserId == user.Id && a.Date == date, cancellationToken);

                if (!attExists)
                {
                    var att = new Attendance
                    {
                        UserId = user.Id,
                        Date = date,
                        ClockIn = new DateTimeOffset(date.Year, date.Month, date.Day, 8, 0, 0, tzOffset),
                        ClockOut = new DateTimeOffset(date.Year, date.Month, date.Day, 17, 10, 0, tzOffset),
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

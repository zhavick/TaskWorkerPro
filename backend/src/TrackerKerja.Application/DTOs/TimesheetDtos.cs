namespace TrackerKerja.Application.DTOs;

public record ActiveTimerDto(
    int SessionId,
    int TaskId,
    string TaskTitle,
    string? ProjectName,
    string? ProjectColor,
    DateTimeOffset StartTime,
    long CurrentElapsedSeconds,
    string? Notes
);

public record StartTimerRequest(
    int TaskId,
    string? Notes
);

public record StopTimerRequest(
    string? Notes,
    DateTimeOffset? StopTime
);

public record ManualSessionRequest(
    int TaskId,
    DateTimeOffset StartTime,
    DateTimeOffset EndTime,
    string? Notes
);

public record TimesheetSessionDto(
    int SessionId,
    int TaskId,
    string TaskTitle,
    int? ProjectId,
    string? ProjectName,
    string? ProjectColor,
    string UserId,
    string UserName,
    string? UserAvatar,
    DateTimeOffset StartTime,
    DateTimeOffset? EndTime,
    long DurationSeconds,
    double DurationHours,
    string? Notes,
    DateTimeOffset CreatedAt
);

public record TimesheetSummaryDto(
    long TodaySeconds,
    long ThisWeekSeconds,
    long ThisMonthSeconds,
    double TotalManDays,
    int TotalSessionsCount
);

public record TimesheetExportFilter(
    DateTimeOffset? StartDate,
    DateTimeOffset? EndDate,
    int? ProjectId,
    string? UserId
);

public record AutoGenerateTimesheetRequest(
    int? CompanyId,
    int PeriodId,
    string? UserId = "all",
    string Mode = "Overwrite"
);

public record AutoGenerateTimesheetResultDto(
    bool Success,
    string Message,
    int UsersProcessedCount,
    int WorkingDaysCount,
    int GeneratedSessionsCount,
    int AttendancesCreatedCount,
    double TotalHoursGenerated
);


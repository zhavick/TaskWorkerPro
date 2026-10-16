using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Application.DTOs;

public record TodayAttendanceStatusDto(
    bool HasClockedIn,
    bool HasClockedOut,
    DateTimeOffset? ClockInTime,
    DateTimeOffset? ClockOutTime,
    double TotalHours,
    AttendanceType Type,
    WorkLocation WorkLocation,
    string? Notes
);

public record ClockInRequest(
    WorkLocation WorkLocation,
    string? Notes
);

public record ClockOutRequest(
    string? Notes
);

public record AttendanceHistoryDto(
    int Id,
    string UserId,
    string UserName,
    DateOnly Date,
    AttendanceType Type,
    WorkLocation WorkLocation,
    DateTimeOffset? ClockIn,
    DateTimeOffset? ClockOut,
    double TotalHours,
    string? LeaveReason,
    string? Notes,
    DateTimeOffset CreatedAt
);

public record ReconcileAttendanceRequest(
    int Id,
    AttendanceType Type,
    WorkLocation WorkLocation,
    DateTimeOffset? ClockIn,
    DateTimeOffset? ClockOut,
    string? LeaveReason,
    string? Notes
);

public record ManualAttendanceEntryRequest(
    string UserId,
    DateOnly Date,
    AttendanceType Type,
    WorkLocation WorkLocation,
    DateTimeOffset? ClockIn,
    DateTimeOffset? ClockOut,
    string? LeaveReason,
    string? Notes
);

public record SubmitLeaveRequest(
    DateOnly Date,
    AttendanceType Type,
    string? LeaveReason,
    string? Notes
);

public record AttendanceMonthlySummaryDto(
    int TotalDaysPresent,
    int TotalDaysLeave,
    int TotalDaysSick,
    int TotalDaysPermission,
    int TotalDaysBusinessTrip,
    double TotalWorkingHours,
    double AverageDailyHours
);

public record TeamMemberDailyAttendanceDto(
    int Day,
    AttendanceType Type,
    double TotalHours,
    WorkLocation WorkLocation,
    DateTimeOffset? ClockIn,
    DateTimeOffset? ClockOut
);

public record TeamMemberMonthlyAttendanceItemDto(
    string UserId,
    string FullName,
    string? JobTitle,
    string? AvatarUrl,
    int TotalPresent,
    int TotalLeave,
    int TotalSick,
    int TotalPermission,
    int TotalBusinessTrip,
    double TotalHours,
    List<TeamMemberDailyAttendanceDto> DailyRecords
);

public record TeamMonthlyAttendanceReportDto(
    int Month,
    int Year,
    int DaysInMonth,
    int TotalTeamMembers,
    double TeamTotalHours,
    List<TeamMemberMonthlyAttendanceItemDto> Members
);


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

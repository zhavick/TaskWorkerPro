namespace TrackerKerja.Application.DTOs;

/// <summary>Filter umum untuk modul pelaporan.</summary>
public record ReportFilter(
    DateTimeOffset? StartDate,
    DateTimeOffset? EndDate,
    int? ProjectId,
    string? Milestone,
    string? UserId);

// ---------------------------------------------------------------------------
// Laporan Timesheet: Project -> Milestone -> Task (dengan rincian per anggota)
// ---------------------------------------------------------------------------
public record ReportMemberHoursDto(string UserId, string UserName, long Seconds, double Hours);

public record TimesheetTaskRowDto(
    int TaskId,
    string Title,
    string Status,
    int Progress,
    int SessionCount,
    long Seconds,
    double Hours,
    List<ReportMemberHoursDto> Members);

public record TimesheetMilestoneGroupDto(
    string Milestone,
    int TaskCount,
    int SessionCount,
    long Seconds,
    double Hours,
    List<TimesheetTaskRowDto> Tasks);

public record TimesheetProjectGroupDto(
    int? ProjectId,
    string ProjectName,
    string Color,
    int TaskCount,
    int SessionCount,
    long Seconds,
    double Hours,
    double ManDays,
    List<TimesheetMilestoneGroupDto> Milestones);

public record TimesheetReportDto(
    long TotalSeconds,
    double TotalHours,
    double TotalManDays,
    int TotalSessions,
    int TotalTasks,
    List<TimesheetProjectGroupDto> Projects);

// ---------------------------------------------------------------------------
// Laporan Tugas: Project -> Milestone -> Task
// ---------------------------------------------------------------------------
public record TaskReportRowDto(
    int TaskId,
    string Title,
    string Priority,
    string Status,
    int Progress,
    string? AssigneeId,
    string AssigneeName,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    bool IsOverdue,
    double LoggedHours);

public record TaskMilestoneGroupDto(
    string Milestone,
    int TotalTasks,
    int DoneTasks,
    int OverdueTasks,
    double AvgProgress,
    double LoggedHours,
    List<TaskReportRowDto> Tasks);

public record TaskProjectGroupDto(
    int? ProjectId,
    string ProjectName,
    string Color,
    int TotalTasks,
    int DoneTasks,
    int OverdueTasks,
    double AvgProgress,
    double LoggedHours,
    List<TaskMilestoneGroupDto> Milestones);

public record TaskReportDto(
    int TotalTasks,
    int DoneTasks,
    int InProgressTasks,
    int TodoTasks,
    int OverdueTasks,
    double CompletionRate,
    double AvgProgress,
    List<TaskProjectGroupDto> Projects);

// ---------------------------------------------------------------------------
// Laporan Achievement Anggota (tugas + jam kerja)
// ---------------------------------------------------------------------------
public record MemberAchievementDto(
    string UserId,
    string UserName,
    string? JobTitle,
    string? AvatarUrl,
    string Color,
    int TotalTasks,
    int DoneTasks,
    int InProgressTasks,
    int OverdueTasks,
    int DoneOnTime,
    double CompletionRate,
    double AvgProgress,
    int SessionCount,
    long Seconds,
    double Hours,
    double ManDays,
    int ProjectCount);

public record MemberReportDto(
    int TotalMembers,
    int TotalTasks,
    int DoneTasks,
    double TotalHours,
    List<MemberAchievementDto> Members);

// ---------------------------------------------------------------------------
// Opsi filter
// ---------------------------------------------------------------------------
public record ReportOptionDto(string Id, string Name);

public record ReportFilterOptionsDto(
    List<ReportOptionDto> Projects,
    List<ReportOptionDto> Members,
    List<string> Milestones);

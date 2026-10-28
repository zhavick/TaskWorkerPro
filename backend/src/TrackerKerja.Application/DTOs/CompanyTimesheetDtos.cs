namespace TrackerKerja.Application.DTOs;

public record TimesheetColumnMappingDto(
    string ColumnLetter,
    string HeaderTitle,
    string SourceField,
    string? Formula = null,
    string? DefaultValue = null
);

public record TimesheetPeriodDto(
    int Id,
    int CompanyId,
    string PeriodCode,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkingDaysCount,
    bool IsClosed,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CreateTimesheetPeriodRequest(
    string PeriodCode,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    int? WorkingDaysCount = null,
    string? Notes = null
);

public record UpdateTimesheetPeriodRequest(
    string PeriodCode,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkingDaysCount,
    bool IsClosed,
    string? Notes = null
);

public record CompanyTimesheetConfigDto(
    int Id,
    int CompanyId,
    string? TemplateFileName,
    string HeaderTitle,
    string ClientName,
    string? SowNumber,
    string ApproverTitle,
    string ApproverName,
    string ResourceTitle,
    bool IncludeWeekends,
    string WeekendTaskTextFormat,
    int HeaderRowIndex,
    int DataStartRowIndex,
    List<TimesheetColumnMappingDto> ColumnsMapping,
    DateTimeOffset UpdatedAt
);

public record UpdateCompanyTimesheetConfigRequest(
    string HeaderTitle,
    string ClientName,
    string? SowNumber,
    string ApproverTitle,
    string ApproverName,
    string ResourceTitle,
    bool IncludeWeekends,
    string WeekendTaskTextFormat,
    int HeaderRowIndex,
    int DataStartRowIndex,
    List<TimesheetColumnMappingDto> ColumnsMapping
);

public static class CompanyTimesheetPresets
{
    public static List<TimesheetColumnMappingDto> GetElistecDefaultMappings()
    {
        return new List<TimesheetColumnMappingDto>
        {
            new("A", "Issue Key", "TaskKey", null, ""),
            new("B", "Issue Summary", "TaskSummary", null, ""),
            new("C", "Hours", "Hours", null, "0"),
            new("D", "MD", "ManDaysFormula", "=IF(C{row}=\"\",\"\",C{row}/8)", ""),
            new("E", "Work Date", "WorkDate", null, ""),
            new("F", "Clock In", "ClockIn", null, "-"),
            new("G", "Clock Out", "ClockOut", null, "-"),
            new("H", "Username", "Username", null, ""),
            new("I", "Full Name", "FullName", null, ""),
            new("J", "Period", "PeriodCode", null, ""),
            new("K", "Project Name", "ProjectName", null, "-"),
            new("L", "Activity Type", "ActivityType", null, "-"),
            new("M", "Working Place", "WorkingPlace", null, "WFO"),
            new("N", "Evidence", "Evidence", null, "")
        };
    }
}

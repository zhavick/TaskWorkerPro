namespace TrackerKerja.Domain.Entities;

public class CompanyTimesheetConfig
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    
    public string? TemplateFilePath { get; set; }
    public string HeaderTitle { get; set; } = "ELISTEC - Timesheet";
    public string ClientName { get; set; } = "Tugu Insurance";
    public string? SowNumber { get; set; }
    public string ApproverTitle { get; set; } = "Mengetahui,";
    public string ApproverName { get; set; } = "xxxx";
    public string ResourceTitle { get; set; } = "Resource,";

    public bool IncludeWeekends { get; set; } = true;
    public string WeekendTaskTextFormat { get; set; } = "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task";

    public int HeaderRowIndex { get; set; } = 7;
    public int DataStartRowIndex { get; set; } = 8;
    public string ColumnsMappingJson { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company Company { get; set; } = null!;
}

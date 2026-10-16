namespace TrackerKerja.Application.DTOs;

public record ExcelImportResultDto(
    int TotalProcessed,
    int TotalImported,
    int TotalProjectsCreated,
    List<string> Messages,
    int TotalUpdated = 0
);


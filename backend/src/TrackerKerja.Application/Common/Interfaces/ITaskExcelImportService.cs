using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface ITaskExcelImportService
{
    Task<ExcelImportResultDto> ImportTasksFromExcelAsync(Stream fileStream, int? companyId, CancellationToken cancellationToken = default);
}

using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface ITaskExcelImportService
{
    byte[] GenerateTemplate(string format);
    Task<TaskImportPreviewDto> PreviewImportAsync(Stream fileStream, string fileName, int? companyId, CancellationToken cancellationToken = default);
    Task<TaskImportResultDto> CommitImportAsync(TaskImportCommitRequest request, int? companyId, CancellationToken cancellationToken = default);
    Task<ExcelImportResultDto> ImportTasksFromExcelAsync(Stream fileStream, int? companyId, CancellationToken cancellationToken = default);
}

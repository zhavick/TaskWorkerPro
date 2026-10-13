using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IExcelExportService
{
    Task<byte[]> GenerateTimesheetExcelAsync(TimesheetExportFilter filter, int? companyId);
    Task<byte[]> GenerateTasksExcelAsync(
        TaskExportFilterDto filter,
        int? companyId,
        string currentUserId,
        bool isAdmin,
        CancellationToken cancellationToken = default);
}

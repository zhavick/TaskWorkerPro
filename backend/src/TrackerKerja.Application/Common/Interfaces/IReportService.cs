using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IReportService
{
    Task<TimesheetReportDto> GetTimesheetReportAsync(ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default);
    Task<TaskReportDto> GetTaskReportAsync(ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default);
    Task<MemberReportDto> GetMemberReportAsync(ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default);
    Task<ReportFilterOptionsDto> GetFilterOptionsAsync(int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default);

    /// <param name="type">timesheet | tasks | members</param>
    Task<byte[]> ExportExcelAsync(string type, ReportFilter filter, int? companyId, string currentUserId, bool isAdmin, CancellationToken ct = default);
}

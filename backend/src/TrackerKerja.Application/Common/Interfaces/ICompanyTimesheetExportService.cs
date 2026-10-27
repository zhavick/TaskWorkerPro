namespace TrackerKerja.Application.Common.Interfaces;

public interface ICompanyTimesheetExportService
{
    Task<byte[]> ExportUserTimesheetAsync(int companyId, int periodId, string userId);
    Task<byte[]> ExportBulkCompanyTimesheetsZipAsync(int companyId, int periodId);
}

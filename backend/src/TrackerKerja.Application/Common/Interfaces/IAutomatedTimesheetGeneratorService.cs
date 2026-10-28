using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IAutomatedTimesheetGeneratorService
{
    Task<AutoGenerateTimesheetResultDto> GenerateTimesheetsAsync(
        AutoGenerateTimesheetRequest request,
        int companyId,
        CancellationToken cancellationToken = default);
}

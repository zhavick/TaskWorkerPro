namespace TrackerKerja.Application.Common.Interfaces;

public interface ICurrentTenantService
{
    int? CompanyId { get; }
    string? CompanyCode { get; }
    string? UserId { get; }
    bool IsAdmin { get; }
}

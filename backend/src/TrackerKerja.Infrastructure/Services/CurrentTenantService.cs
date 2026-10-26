using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using TrackerKerja.Application.Common.Interfaces;

namespace TrackerKerja.Infrastructure.Services;

public class CurrentTenantService : ICurrentTenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? CompanyId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string? CompanyCode => _httpContextAccessor.HttpContext?.User?.FindFirst("companyCode")?.Value;

    public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public bool IsAdmin
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return false;
            if (user.IsInRole("Administrator") || user.IsInRole("SuperAdmin") || user.IsInRole("Admin"))
                return true;
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrEmpty(roleClaim) && (roleClaim.Equals("Administrator", StringComparison.OrdinalIgnoreCase) || roleClaim.Equals("Admin", StringComparison.OrdinalIgnoreCase) || roleClaim.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)))
                return true;
            var jobTitle = user.FindFirst("jobTitle")?.Value;
            if (!string.IsNullOrEmpty(jobTitle) && (jobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase) || jobTitle.Contains("Architect", StringComparison.OrdinalIgnoreCase)))
                return true;
            return false;
        }
    }

    public bool IsPurgeAdmin
    {
        get
        {
            if (IsAdmin) return true;
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return false;
            if (user.IsInRole("DataPurgeAdmin") || user.IsInRole("CleanupAdmin"))
                return true;
            var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrEmpty(roleClaim) && (roleClaim.Equals("DataPurgeAdmin", StringComparison.OrdinalIgnoreCase) || roleClaim.Equals("CleanupAdmin", StringComparison.OrdinalIgnoreCase)))
                return true;
            return false;
        }
    }
}

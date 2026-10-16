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

    public bool IsAdmin => (_httpContextAccessor.HttpContext?.User?.IsInRole("Administrator") ?? false)
                        || (_httpContextAccessor.HttpContext?.User?.IsInRole("SuperAdmin") ?? false);
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/sync")]
public class SyncController : ControllerBase
{
    private readonly ISyncService _syncService;
    private readonly ICurrentTenantService _tenantService;
    private readonly IConfiguration _configuration;

    public SyncController(
        ISyncService syncService,
        ICurrentTenantService tenantService,
        IConfiguration configuration)
    {
        _syncService = syncService;
        _tenantService = tenantService;
        _configuration = configuration;
    }

    [HttpGet("ping")]
    [AllowAnonymous]
    public async Task<IActionResult> Ping()
    {
        var info = await _syncService.GetLocalPingInfoAsync();
        return Ok(info);
    }

    [HttpPost("ping-host")]
    [Authorize]
    public async Task<IActionResult> PingHost([FromBody] PingHostRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.HostUrl))
        {
            return BadRequest(new { success = false, message = "URL Host tidak boleh kosong." });
        }

        try
        {
            var pingInfo = await _syncService.PingRemoteHostAsync(request.HostUrl, request.ApiKey, request.AllowUntrustedSsl);
            return Ok(pingInfo);
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = $"Gagal menghubungi host: {ex.Message}" });
        }
    }

    [HttpPost("push")]
    [Authorize]
    public async Task<IActionResult> Push([FromBody] SyncPushRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.HostUrl))
        {
            return BadRequest(new { success = false, message = "URL Host tidak boleh kosong." });
        }

        var result = await _syncService.PushToHostAsync(request, _tenantService.UserId);
        return Ok(result);
    }

    [HttpPost("pull")]
    [Authorize]
    public async Task<IActionResult> Pull([FromBody] SyncPullRequest request)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.HostUrl))
        {
            return BadRequest(new { success = false, message = "URL Host tidak boleh kosong." });
        }

        var result = await _syncService.PullFromHostAsync(request, _tenantService.UserId);
        return Ok(result);
    }

    [HttpPost("receive")]
    [AllowAnonymous]
    public async Task<IActionResult> ReceivePayload([FromBody] SyncPayload payload)
    {
        if (!IsSyncAuthorized())
        {
            return Unauthorized(new { success = false, message = "Kunci otorisasi sinkronisasi X-Sync-Key tidak valid." });
        }

        var result = await _syncService.ProcessReceivedPayloadAsync(payload, _tenantService.UserId ?? "sync-agent");
        return Ok(result);
    }

    [HttpGet("export-package")]
    [AllowAnonymous]
    public async Task<IActionResult> ExportPackage([FromQuery] bool includeFiles = true)
    {
        if (!IsSyncAuthorized())
        {
            return Unauthorized(new { success = false, message = "Kunci otorisasi sinkronisasi X-Sync-Key tidak valid." });
        }

        var zipBytes = await _syncService.ExportPackageZipAsync(includeFiles);
        var fileName = $"trackerkerja_sync_package_{DateTime.UtcNow:yyyyMMdd_HHmmss}.zip";
        return File(zipBytes, "application/zip", fileName);
    }

    [HttpGet("export-sql")]
    [AllowAnonymous]
    public async Task<IActionResult> ExportSql()
    {
        if (!IsSyncAuthorized())
        {
            return Unauthorized(new { success = false, message = "Kunci otorisasi sinkronisasi X-Sync-Key tidak valid." });
        }

        var sqlContent = await _syncService.ExportSqlDumpAsync();
        var fileName = $"trackerkerja_sync_dump_{DateTime.UtcNow:yyyyMMdd_HHmmss}.sql";
        return File(System.Text.Encoding.UTF8.GetBytes(sqlContent), "application/sql", fileName);
    }

    [HttpPost("import-package")]
    [Authorize]
    public async Task<IActionResult> ImportPackage(IFormFile file)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "Berkas paket tidak ditemukan atau kosong." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".zip" && ext != ".sql")
        {
            return BadRequest(new { success = false, message = "Hanya berkas berekstensi .zip atau .sql yang diizinkan." });
        }

        if (ext == ".sql")
        {
            using var reader = new StreamReader(file.OpenReadStream(), System.Text.Encoding.UTF8);
            var sqlContent = await reader.ReadToEndAsync();
            var result = await _syncService.ImportSqlScriptAsync(sqlContent, _tenantService.UserId);
            return Ok(result);
        }
        else
        {
            using var stream = file.OpenReadStream();
            var result = await _syncService.ImportPackageZipAsync(stream, _tenantService.UserId);
            return Ok(result);
        }
    }

    [HttpGet("history")]
    [Authorize]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 30)
    {
        if (!IsAdmin())
        {
            return Forbid();
        }

        var history = await _syncService.GetSyncHistoryAsync(limit);
        return Ok(history);
    }

    private bool IsAdmin()
    {
        return _tenantService.IsAdmin || (User.Identity?.IsAuthenticated == true && (User.IsInRole("Administrator") || User.IsInRole("SuperAdmin")));
    }

    private bool IsSyncAuthorized()
    {
        if (IsAdmin())
        {
            return true;
        }

        var syncKeyHeader = Request.Headers["X-Sync-Key"].FirstOrDefault()
            ?? Request.Headers["ApiSecretKey"].FirstOrDefault()
            ?? Request.Query["key"].FirstOrDefault()
            ?? Request.Query["apiKey"].FirstOrDefault();

        var configuredKey = _configuration["SyncSettings:ApiKey"] ?? "TRACKERKERJA_SYNC_SECRET_DEFAULT_2026";

        return !string.IsNullOrWhiteSpace(syncKeyHeader) &&
               string.Equals(syncKeyHeader, configuredKey, StringComparison.Ordinal);
    }
}

public record PingHostRequest(string HostUrl, string ApiKey, bool AllowUntrustedSsl = false);

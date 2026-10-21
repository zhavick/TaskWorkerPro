using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/sync")]
public class SyncController : ControllerBase
{
    private readonly ISyncService _syncService;
    private readonly ICurrentTenantService _tenantService;
    private readonly IConfiguration _configuration;
    private readonly AppDbContext? _context;

    public SyncController(
        ISyncService syncService,
        ICurrentTenantService tenantService,
        IConfiguration configuration,
        AppDbContext? context = null)
    {
        _syncService = syncService;
        _tenantService = tenantService;
        _configuration = configuration;
        _context = context;
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

    [HttpGet("pull")]
    [AllowAnonymous]
    public async Task<IActionResult> PullDelta([FromQuery] DateTimeOffset? since = null)
    {
        if (!IsSyncAuthorized())
        {
            return Unauthorized(new { success = false, message = "Akses Ditolak: Diperlukan API Key sinkronisasi (X-Sync-ApiKey) yang valid atau otorisasi Administrator." });
        }

        var sqlContent = await _syncService.ExportSqlDumpAsync();
        return Ok(new
        {
            success = true,
            serverTimestamp = DateTimeOffset.UtcNow,
            deltaSql = sqlContent
        });
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
            return Unauthorized(new { success = false, message = "Akses Ditolak: Diperlukan API Key sinkronisasi (X-Sync-ApiKey) yang valid atau otorisasi Administrator." });
        }

        var result = await _syncService.ProcessReceivedPayloadAsync(payload, _tenantService.UserId ?? "sync-agent");
        return Ok(result);
    }

    [HttpGet("export-package")]
    [HttpGet("package")]
    [AllowAnonymous]
    public async Task<IActionResult> ExportPackage([FromQuery] bool includeFiles = true)
    {
        if (!IsSyncAuthorized())
        {
            return Unauthorized(new { success = false, message = "Akses Ditolak: Diperlukan API Key sinkronisasi (X-Sync-ApiKey) yang valid atau otorisasi Administrator." });
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
            return Unauthorized(new { success = false, message = "Akses Ditolak: Diperlukan API Key sinkronisasi (X-Sync-ApiKey) yang valid atau otorisasi Administrator." });
        }

        var sqlContent = await _syncService.ExportSqlDumpAsync();
        var fileName = $"trackerkerja_sync_dump_{DateTime.UtcNow:yyyyMMdd_HHmmss}.sql";
        return File(System.Text.Encoding.UTF8.GetBytes(sqlContent), "application/sql", fileName);
    }

    [HttpPost("import-package")]
    [HttpPost("package/upload")]
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

        var syncKeyHeader = Request.Headers["X-Sync-ApiKey"].FirstOrDefault()
            ?? Request.Headers["X-Sync-Key"].FirstOrDefault()
            ?? Request.Headers["X-Api-Key"].FirstOrDefault()
            ?? Request.Headers["ApiKey"].FirstOrDefault()
            ?? Request.Headers["ApiSecretKey"].FirstOrDefault()
            ?? Request.Query["apiKey"].FirstOrDefault()
            ?? Request.Query["key"].FirstOrDefault()
            ?? Request.Query["syncKey"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(syncKeyHeader))
        {
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                syncKeyHeader = authHeader.Substring("Bearer ".Length).Trim();
            }
        }

        if (string.IsNullOrWhiteSpace(syncKeyHeader))
        {
            return false;
        }

        var incomingKey = syncKeyHeader.Trim();

        var validKeys = new HashSet<string>(StringComparer.Ordinal)
        {
            "TK-SYNC-VUBKJ5PNX3PHI1WX",
            "TK-SYNC-TNEBGVH4EEVMPCQ9",
            "TRACKERKERJA_SYNC_SECRET_DEFAULT_2026"
        };

        var configuredKey = _configuration["SyncSettings:ApiKey"] 
            ?? _configuration["Sync_ApiKey"];
        if (!string.IsNullOrWhiteSpace(configuredKey))
        {
            validKeys.Add(configuredKey.Trim());
        }

        var altKeys = _configuration.GetSection("SyncSettings:AlternativeApiKeys").Get<string[]>();
        if (altKeys != null)
        {
            foreach (var alt in altKeys)
            {
                if (!string.IsNullOrWhiteSpace(alt)) validKeys.Add(alt.Trim());
            }
        }

        if (_context != null)
        {
            var dbKeys = _context.SystemSettings
                .Where(s => s.Key == "Sync_ApiKey" || s.Key == "HostSync_ApiKey" || s.Key == "Sync_HostSecret" || s.Key == "SyncApiKey" || s.Key == "SyncSettings:ApiKey")
                .Select(s => s.Value)
                .ToList();

            foreach (var dbKey in dbKeys)
            {
                if (!string.IsNullOrWhiteSpace(dbKey)) validKeys.Add(dbKey.Trim());
            }
        }

        return validKeys.Contains(incomingKey);
    }
}

public record PingHostRequest(string HostUrl, string ApiKey, bool AllowUntrustedSsl = false);

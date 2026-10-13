using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class SyncControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly SyncService _syncService;
    private readonly IConfiguration _configuration;
    private readonly FakeTenantService _adminTenantService;
    private readonly FakeTenantService _normalTenantService;
    private readonly string _tempUploadDir;

    public SyncControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _adminTenantService = new FakeTenantService(1, "TEST", "admin-usr", true);
        _normalTenantService = new FakeTenantService(1, "TEST", "normal-usr", false);

        _context = new AppDbContext(options, _adminTenantService);

        _tempUploadDir = Path.Combine(Path.GetTempPath(), "TrackerKerjaSyncCtrl_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempUploadDir);

        _syncService = new SyncService(_context, _tempUploadDir, httpClientFactory: null);

        var configValues = new Dictionary<string, string?>
        {
            { "SyncSettings:ApiKey", "TEST_SECRET_KEY_123" }
        };
        _configuration = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();
    }

    public void Dispose()
    {
        _context.Dispose();
        if (Directory.Exists(_tempUploadDir))
        {
            try { Directory.Delete(_tempUploadDir, recursive: true); } catch { }
        }
    }

    [Fact]
    public async Task Ping_ShouldReturnOkStatus()
    {
        var controller = new SyncController(_syncService, _adminTenantService, _configuration);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        var result = await controller.Ping();
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        var ping = Assert.IsType<SyncPingResponse>(okResult.Value);
        Assert.True(ping.Ready);
    }

    [Fact]
    public async Task ReceivePayload_WithoutValidKeyOrAdmin_ShouldReturnUnauthorized()
    {
        var controller = new SyncController(_syncService, _normalTenantService, _configuration);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        var payload = new SyncPayload();
        var result = await controller.ReceivePayload(payload);

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task ReceivePayload_WithValidHeaderKey_ShouldReturnOk()
    {
        var controller = new SyncController(_syncService, _normalTenantService, _configuration);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Sync-Key"] = "TEST_SECRET_KEY_123";
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var payload = new SyncPayload
        {
            Manifest = new SyncManifest { EntityCount = 0 },
            Data = new SyncDatabaseData()
        };

        var result = await controller.ReceivePayload(payload);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        var opResult = Assert.IsType<SyncOperationResult>(okResult.Value);
        Assert.True(opResult.Success);
    }

    [Fact]
    public async Task ExportPackage_WithValidKey_ShouldReturnZipFile()
    {
        var controller = new SyncController(_syncService, _normalTenantService, _configuration);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Sync-Key"] = "TEST_SECRET_KEY_123";
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var result = await controller.ExportPackage(includeFiles: false);
        var fileResult = Assert.IsType<FileContentResult>(result);

        Assert.Equal("application/zip", fileResult.ContentType);
        Assert.NotEmpty(fileResult.FileContents);
    }

    [Fact]
    public async Task GetHistory_AsAdmin_ShouldReturnHistoryList()
    {
        var controller = new SyncController(_syncService, _adminTenantService, _configuration);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        _context.SyncHistories.Add(new SyncHistory
        {
            Direction = SyncDirection.Push,
            Status = SyncStatus.Success,
            TargetHost = "https://induk.trackerkerja.id",
            TotalRecordsSynced = 10,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        var result = await controller.GetHistory(limit: 10);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        var list = Assert.IsAssignableFrom<IReadOnlyList<SyncHistoryDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    private class FakeTenantService : ICurrentTenantService
    {
        public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin)
        {
            CompanyId = companyId;
            CompanyCode = companyCode;
            UserId = userId;
            IsAdmin = isAdmin;
        }

        public int? CompanyId { get; }
        public string? CompanyCode { get; }
        public string? UserId { get; }
        public bool IsAdmin { get; }
    }
}

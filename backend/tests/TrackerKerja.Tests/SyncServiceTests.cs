using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class SyncServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly string _tempUploadDir;
    private readonly SyncService _syncService;

    public SyncServiceTests()
    {
        var dbName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var tenantService = new FakeTenantService(1, "TEST", "test-user-id", true);
        _context = new AppDbContext(options, tenantService);

        _tempUploadDir = Path.Combine(Path.GetTempPath(), "TrackerKerjaSyncTests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempUploadDir);

        _syncService = new SyncService(_context, _tempUploadDir, httpClientFactory: null);
    }

    public void Dispose()
    {
        _context.Dispose();
        if (Directory.Exists(_tempUploadDir))
        {
            try
            {
                Directory.Delete(_tempUploadDir, recursive: true);
            }
            catch
            {
                // Ignore cleanup error in test temp folder
            }
        }
    }

    [Fact]
    public async Task GetLocalPingInfoAsync_ShouldReturnAccurateCounts()
    {
        // Arrange
        _context.Companies.Add(new Company { Id = 101, Name = "Cabang Surabaya", Code = "SBY" });
        _context.Users.Add(new AppUser { Id = "usr-1", UserName = "andi", FullName = "Andi Pratama" });
        _context.Projects.Add(new Project { Id = 201, Name = "Sistem Inventory", CompanyId = 101 });
        _context.Tasks.Add(new WorkTask { Id = 301, Title = "Setup Server", ProjectId = 201 });
        _context.Notes.Add(new WorkNote { Id = 401, Title = "Catatan Instalasi" });
        await _context.SaveChangesAsync();

        // Act
        var ping = await _syncService.GetLocalPingInfoAsync();

        // Assert
        Assert.NotNull(ping);
        Assert.True(ping.Ready);
        Assert.True(ping.TotalCompanies >= 1);
        Assert.True(ping.TotalUsers >= 1);
        Assert.True(ping.TotalProjects >= 1);
        Assert.True(ping.TotalTasks >= 1);
        Assert.True(ping.TotalNotes >= 1);
    }

    [Fact]
    public async Task ExportPackageZipAsync_ShouldContainManifestAndSyncData()
    {
        // Arrange
        _context.Companies.Add(new Company { Id = 102, Name = "Cabang Bandung", Code = "BDG" });
        _context.Tasks.Add(new WorkTask { Id = 302, Title = "Migrasi Database" });
        await _context.SaveChangesAsync();

        // Act
        var zipBytes = await _syncService.ExportPackageZipAsync(includeFiles: false);

        // Assert
        Assert.NotNull(zipBytes);
        Assert.True(zipBytes.Length > 0);

        using var memoryStream = new MemoryStream(zipBytes);
        using var archive = new ZipArchive(memoryStream, ZipArchiveMode.Read);

        var manifestEntry = archive.GetEntry("manifest.json");
        Assert.NotNull(manifestEntry);

        var dataEntry = archive.GetEntry("sync_data.json");
        Assert.NotNull(dataEntry);

        var sqlEntry = archive.GetEntry("sync_data.sql");
        Assert.NotNull(sqlEntry);

        using var reader = new StreamReader(manifestEntry.Open(), Encoding.UTF8);
        var manifestJson = await reader.ReadToEndAsync();
        var manifest = JsonSerializer.Deserialize<SyncManifest>(manifestJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(manifest);
        Assert.True(manifest.EntityCount >= 2);
    }

    [Fact]
    public async Task ExportSqlDumpAsync_ShouldGenerateValidSqlScript()
    {
        // Arrange
        _context.Companies.Add(new Company { Id = 103, Name = "Cabang Semarang", Code = "SMG" });
        _context.Tasks.Add(new WorkTask { Id = 303, Title = "Backup Server" });
        await _context.SaveChangesAsync();

        // Act
        var sql = await _syncService.ExportSqlDumpAsync();

        // Assert
        Assert.NotNull(sql);
        Assert.Contains("companies", sql);
        Assert.Contains("Cabang Semarang", sql);
        Assert.Contains("SMG", sql);
        Assert.Contains("tasks", sql);
        Assert.Contains("Backup Server", sql);

        var historyList = await _syncService.GetSyncHistoryAsync(10);
        Assert.Contains(historyList, h => h.Direction == "ExportSql" && h.Status == "Success");
    }

    [Fact]
    public async Task ImportSqlScriptAsync_ShouldExecuteStatementsAndRecordHistory()
    {
        // Arrange
        var sqlScript = @"
            -- Sample SQL import
            INSERT OR REPLACE INTO companies (id, name, code) VALUES (777, 'Cabang Bali', 'DPS');
            INSERT OR REPLACE INTO tasks (id, title) VALUES (888, 'Audit Keamanan');
        ";

        // Act
        var result = await _syncService.ImportSqlScriptAsync(sqlScript, "test-admin");

        // Assert
        Assert.True(result.Success);
        Assert.True(result.RecordsProcessed >= 2);

        var historyList = await _syncService.GetSyncHistoryAsync(10);
        Assert.Contains(historyList, h => h.Direction == "ImportSql" && h.Status == "Success");
    }

    [Fact]
    public async Task ProcessReceivedPayloadAsync_ShouldMergeEntitiesAndRecordHistory()
    {
        // Arrange
        var payload = new SyncPayload
        {
            Manifest = new SyncManifest
            {
                SourceInstance = "Node-Test",
                Version = "1.0.0",
                EntityCount = 2
            },
            Data = new SyncDatabaseData
            {
                Companies = new List<CompanySyncDto>
                {
                    new() { Id = 888, Name = "Remote Company", Code = "RMT" }
                },
                Tasks = new List<TaskSyncDto>
                {
                    new() { Id = 999, Title = "Remote Sync Task", CompanyId = 888 }
                }
            }
        };

        // Act
        var result = await _syncService.ProcessReceivedPayloadAsync(payload, triggeredByUserId: "admin-id");

        // Assert
        Assert.True(result.Success);
        Assert.True(result.RecordsProcessed >= 2);

        var insertedCompany = await _context.Companies.FindAsync(888);
        Assert.NotNull(insertedCompany);
        Assert.Equal("Remote Company", insertedCompany.Name);

        var insertedTask = await _context.Tasks.FindAsync(999);
        Assert.NotNull(insertedTask);
        Assert.Equal("Remote Sync Task", insertedTask.Title);

        var historyList = await _syncService.GetSyncHistoryAsync(10);
        Assert.NotEmpty(historyList);
        Assert.Contains(historyList, h => h.TotalRecordsSynced >= 2);
    }

    [Fact]
    public async Task ImportPackageZipAsync_MaliciousPathTraversal_ShouldRejectZipSlip()
    {
        // Arrange: build a ZIP containing an entry with path traversal (e.g. "../../evil.txt")
        using var maliciousStream = new MemoryStream();
        using (var archive = new ZipArchive(maliciousStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var manifestEntry = archive.CreateEntry("manifest.json");
            using (var writer = new StreamWriter(manifestEntry.Open()))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(new SyncManifest { EntityCount = 0 }));
            }

            var dataEntry = archive.CreateEntry("sync_data.json");
            using (var writer = new StreamWriter(dataEntry.Open()))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(new SyncDatabaseData()));
            }

            var maliciousEntry = archive.CreateEntry("../../../evil.txt");
            using (var writer = new StreamWriter(maliciousEntry.Open()))
            {
                await writer.WriteAsync("Malicious payload");
            }
        }

        maliciousStream.Position = 0;

        // Act
        var result = await _syncService.ImportPackageZipAsync(maliciousStream, "test-user");

        // Assert: Zip slip attempt must be rejected
        Assert.False(result.Success);
        Assert.Contains("Zip Slip", result.Message, StringComparison.OrdinalIgnoreCase);
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

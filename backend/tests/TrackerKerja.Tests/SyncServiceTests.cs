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
    public async Task ImportPackageZipAsync_WithUserProfileAndAttachments_ShouldExtractFilesAndBindData()
    {
        // Arrange
        // Existing user in target db (simulating host induk)
        _context.Users.Add(new AppUser
        {
            Id = "usr-host",
            UserName = "budi",
            NormalizedUserName = "BUDI",
            Email = "budi@corporate.com",
            NormalizedEmail = "BUDI@CORPORATE.COM",
            FullName = "Budi Santoso",
            JobTitle = "Staff Lama",
            AvatarColor = "#10B981"
        });
        await _context.SaveChangesAsync();

        // Create a zip with avatars, covers, notes, and user data
        using var zipMs = new MemoryStream();
        using (var archive = new ZipArchive(zipMs, ZipArchiveMode.Create, leaveOpen: true))
        {
            var manifestEntry = archive.CreateEntry("manifest.json");
            using (var writer = new StreamWriter(manifestEntry.Open()))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(new SyncManifest { EntityCount = 2 }));
            }

            var syncData = new SyncDatabaseData
            {
                Users = new List<UserSyncDto>
                {
                    new()
                    {
                        Id = "usr-remote-different-id",
                        UserName = "budi",
                        NormalizedUserName = "BUDI",
                        Email = "budi@corporate.com",
                        NormalizedEmail = "BUDI@CORPORATE.COM",
                        FullName = "Budi Santoso Updated",
                        JobTitle = "Senior Lead Architect",
                        AvatarColor = "#6366F1",
                        ProfilePictureUrl = "/uploads/users/budi/avatar/budi_avatar.png",
                        CoverPictureUrl = "/uploads/users/budi/cover/budi_cover.jpg"
                    }
                },
                NoteAttachments = new List<NoteAttachmentSyncDto>
                {
                    new()
                    {
                        Id = 9999,
                        NoteId = 555,
                        FileName = "blueprint.pdf",
                        FilePath = @"C:\OldMachine\TrackerKerja\frontend\public\uploads\notes\555\blueprint.pdf",
                        FileSize = 1024,
                        ContentType = "application/pdf",
                        FileExtension = ".pdf"
                    }
                }
            };

            var dataEntry = archive.CreateEntry("sync_data.json");
            using (var writer = new StreamWriter(dataEntry.Open()))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(syncData));
            }

            // Avatar physical file
            var avatarEntry = archive.CreateEntry("uploads/users/budi/avatar/budi_avatar.png");
            using (var writer = new StreamWriter(avatarEntry.Open()))
            {
                await writer.WriteAsync("FAKE_IMAGE_DATA_AVATAR");
            }

            // Cover physical file
            var coverEntry = archive.CreateEntry("uploads/users/budi/cover/budi_cover.jpg");
            using (var writer = new StreamWriter(coverEntry.Open()))
            {
                await writer.WriteAsync("FAKE_IMAGE_DATA_COVER");
            }

            // Note attachment file
            var noteFileEntry = archive.CreateEntry("uploads/notes/555/blueprint.pdf");
            using (var writer = new StreamWriter(noteFileEntry.Open()))
            {
                await writer.WriteAsync("FAKE_PDF_NOTE_CONTENT");
            }
        }

        zipMs.Position = 0;

        // Act
        var result = await _syncService.ImportPackageZipAsync(zipMs, "admin-trigger");

        // Assert
        Assert.True(result.Success);

        // 1. User profile data binding in host
        var updatedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == "budi@corporate.com");
        Assert.NotNull(updatedUser);
        Assert.Equal("Budi Santoso Updated", updatedUser.FullName);
        Assert.Equal("Senior Lead Architect", updatedUser.JobTitle);
        Assert.Equal("/uploads/users/budi/avatar/budi_avatar.png", updatedUser.ProfilePictureUrl);
        Assert.Equal("/uploads/users/budi/cover/budi_cover.jpg", updatedUser.CoverPictureUrl);

        // 2. Note attachment data binding with normalized path
        var attachment = await _context.NoteAttachments.FindAsync(9999);
        Assert.NotNull(attachment);
        Assert.Equal("/uploads/notes/555/blueprint.pdf", attachment.FilePath);

        // 3. Physical file presence on disk in _tempUploadDir
        var avatarFile = Path.Combine(_tempUploadDir, "users", "budi", "avatar", "budi_avatar.png");
        Assert.True(File.Exists(avatarFile));
        Assert.Equal("FAKE_IMAGE_DATA_AVATAR", await File.ReadAllTextAsync(avatarFile));

        var coverFile = Path.Combine(_tempUploadDir, "users", "budi", "cover", "budi_cover.jpg");
        Assert.True(File.Exists(coverFile));
        Assert.Equal("FAKE_IMAGE_DATA_COVER", await File.ReadAllTextAsync(coverFile));

        var noteFile = Path.Combine(_tempUploadDir, "notes", "555", "blueprint.pdf");
        Assert.True(File.Exists(noteFile));
        Assert.Equal("FAKE_PDF_NOTE_CONTENT", await File.ReadAllTextAsync(noteFile));
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

    [Fact]
    public async Task PrepareSyncPayloadAsync_ShouldIncludeTimesheetsAttendancesAndMasterData()
    {
        // Arrange
        _context.Users.Add(new AppUser { Id = "usr-sync-1", UserName = "andi", FullName = "Andi Pratama" });
        _context.Tasks.Add(new WorkTask { Id = 801, Title = "Sinkronisasi Fitur Baru" });
        _context.Sessions.Add(new WorkSession
        {
            Id = 901,
            TaskId = 801,
            UserId = "usr-sync-1",
            StartTime = DateTimeOffset.UtcNow.AddHours(-2),
            EndTime = DateTimeOffset.UtcNow,
            Duration = 7200,
            Notes = "Sesi lembur timesheet"
        });
        _context.Attendances.Add(new Attendance
        {
            Id = 951,
            UserId = "usr-sync-1",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Type = AttendanceType.Present,
            WorkLocation = WorkLocation.WFO,
            Status = 1,
            TotalHours = 8.0
        });
        _context.MasterBadges.Add(new MasterBadge
        {
            Id = 701,
            Code = "NIGHT_OWL",
            Name = "Burung Hantu Malam",
            Category = "Timesheet",
            Points = 150,
            Rarity = BadgeRarity.Rare
        });
        _context.EmailTemplates.Add(new EmailTemplate
        {
            Id = 601,
            EventCode = "SYNC_ALERT",
            EventName = "Peringatan Sinkronisasi",
            Subject = "Pemberitahuan Sinkronisasi Selesai",
            BodyHtml = "<p>Sinkronisasi berhasil.</p>"
        });
        _context.SystemSettings.Add(new SystemSetting
        {
            Key = "Sync_TestKey",
            Value = "TestValue123",
            Description = "Pengaturan uji coba"
        });
        await _context.SaveChangesAsync();

        // Act
        var payload = await _syncService.PrepareSyncPayloadAsync(includeFiles: false);

        // Assert
        Assert.NotNull(payload);
        Assert.NotNull(payload.Data);
        Assert.Contains(payload.Data.Sessions, s => s.Id == 901);
        Assert.Contains(payload.Data.Attendances, a => a.Id == 951);
        Assert.Contains(payload.Data.MasterBadges, b => b.Code == "NIGHT_OWL");
        Assert.Contains(payload.Data.EmailTemplates, e => e.EventCode == "SYNC_ALERT");
        Assert.Contains(payload.Data.SystemSettings, s => s.Key == "Sync_TestKey");
        Assert.Contains("sessions", payload.Manifest.IncludedTables);
        Assert.Contains("attendances", payload.Manifest.IncludedTables);
        Assert.Contains("master_badges", payload.Manifest.IncludedTables);
        Assert.Contains("email_templates", payload.Manifest.IncludedTables);
    }

    [Fact]
    public async Task ImportPackageZipAsync_ShouldMergeTimesheetsAttendancesAndMasterData()
    {
        // Arrange
        _context.Users.Add(new AppUser { Id = "usr-dest-1", NormalizedEmail = "DEV@TRACKERKERJA.LOCAL", FullName = "Local Dev" });
        _context.Tasks.Add(new WorkTask { Id = 802, Title = "Backend Testing Task" });
        await _context.SaveChangesAsync();

        var syncData = new SyncDatabaseData
        {
            Sessions = new List<SessionSyncDto>
            {
                new SessionSyncDto
                {
                    Id = 902,
                    TaskId = 802,
                    UserId = "DEV@TRACKERKERJA.LOCAL", // Matching by email fallback
                    StartTime = DateTimeOffset.UtcNow.AddHours(-1),
                    EndTime = DateTimeOffset.UtcNow,
                    Duration = 3600,
                    Notes = "Timesheet dari host induk"
                }
            },
            Attendances = new List<AttendanceSyncDto>
            {
                new AttendanceSyncDto
                {
                    Id = 952,
                    UserId = "DEV@TRACKERKERJA.LOCAL",
                    Date = new DateOnly(2026, 10, 22),
                    Type = AttendanceType.Present,
                    WorkLocation = WorkLocation.WFO,
                    Status = 1,
                    TotalHours = 8.5,
                    Notes = "Presensi dari host induk"
                }
            },
            MasterBadges = new List<MasterBadgeSyncDto>
            {
                new MasterBadgeSyncDto
                {
                    Id = 702,
                    Code = "EARLY_BIRD",
                    Name = "Rajin Subuh",
                    Category = "Presensi",
                    Points = 150,
                    Rarity = BadgeRarity.Rare
                }
            },
            EmailTemplates = new List<EmailTemplateSyncDto>
            {
                new EmailTemplateSyncDto
                {
                    Id = 602,
                    EventCode = "REMOTE_HOST_SYNC",
                    EventName = "Host Induk Sync",
                    Subject = "Sync Notification",
                    BodyHtml = "<p>Data presensi & timesheet berhasil diambil</p>"
                }
            },
            SystemSettings = new List<SystemSettingSyncDto>
            {
                new SystemSettingSyncDto
                {
                    Key = "Sync_HostMasterMode",
                    Value = "Active",
                    Description = "Mode master host"
                }
            }
        };

        using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var manifestEntry = archive.CreateEntry("manifest.json");
            using (var writer = new StreamWriter(manifestEntry.Open()))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(new SyncManifest { EntityCount = 5 }));
            }

            var dataEntry = archive.CreateEntry("sync_data.json");
            using (var writer = new StreamWriter(dataEntry.Open()))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(syncData));
            }
        }
        zipStream.Position = 0;

        // Act
        var result = await _syncService.ImportPackageZipAsync(zipStream, "admin");

        // Assert
        Assert.True(result.Success);

        var mergedSession = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == 902);
        Assert.NotNull(mergedSession);
        Assert.Equal("usr-dest-1", mergedSession.UserId); // Resolved to local user id
        Assert.Equal(3600, mergedSession.Duration);

        var mergedAttendance = await _context.Attendances.FirstOrDefaultAsync(a => a.Id == 952);
        Assert.NotNull(mergedAttendance);
        Assert.Equal("usr-dest-1", mergedAttendance.UserId);
        Assert.Equal(8.5, mergedAttendance.TotalHours);

        var mergedBadge = await _context.MasterBadges.FirstOrDefaultAsync(b => b.Code == "EARLY_BIRD");
        Assert.NotNull(mergedBadge);
        Assert.Equal("Rajin Subuh", mergedBadge.Name);

        var mergedTemplate = await _context.EmailTemplates.FirstOrDefaultAsync(e => e.EventCode == "REMOTE_HOST_SYNC");
        Assert.NotNull(mergedTemplate);

        var mergedSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "Sync_HostMasterMode");
        Assert.NotNull(mergedSetting);
        Assert.Equal("Active", mergedSetting.Value);
    }

    [Fact]
    public void GenerateSqlScript_ShouldIncludeMasterBadgesEmailTemplatesAndSessions()
    {
        // Arrange
        var data = new SyncDatabaseData
        {
            Sessions = new List<SessionSyncDto>
            {
                new SessionSyncDto { Id = 1, TaskId = 10, UserId = "u1", Duration = 1800, Notes = "Test Session" }
            },
            Attendances = new List<AttendanceSyncDto>
            {
                new AttendanceSyncDto { Id = 1, UserId = "u1", Date = new DateOnly(2026, 10, 22), TotalHours = 8.0 }
            },
            MasterBadges = new List<MasterBadgeSyncDto>
            {
                new MasterBadgeSyncDto { Id = 1, Code = "NIGHT_OWL", Name = "Burung Hantu", Points = 150 }
            },
            EmailTemplates = new List<EmailTemplateSyncDto>
            {
                new EmailTemplateSyncDto { Id = 1, EventCode = "ALERT_1", EventName = "Alert", Subject = "Subj", BodyHtml = "<b>Body</b>" }
            },
            SystemSettings = new List<SystemSettingSyncDto>
            {
                new SystemSettingSyncDto { Key = "Sys_K", Value = "Sys_V" }
            }
        };

        // Act
        var sql = _syncService.GenerateSqlScript(data);

        // Assert
        Assert.Contains("master_badges", sql);
        Assert.Contains("NIGHT_OWL", sql);
        Assert.Contains("email_templates", sql);
        Assert.Contains("system_settings", sql);
        Assert.Contains("sessions", sql);
        Assert.Contains("attendances", sql);
    }

    [Fact]
    public async Task DbInitializer_ShouldSeed15NewCreativeBadges()
    {
        // Act
        await DbInitializer.SeedAsync(_context);

        // Assert: All 15 creative badges must exist
        var newBadgeCodes = new[]
        {
            "NIGHT_OWL", "EARLY_BIRD", "TIME_LORD", "SPRINT_CHAMPION", "BUG_HUNTER",
            "CLEAN_SWEEPER", "DOCUMENTATION_GURU", "MARATHONER", "PERFECT_ATTENDANCE",
            "TASK_CRUSHER", "TEAM_CATALYST", "CONSISTENCY_KING", "MILESTONE_MASTER",
            "ZEN_WORKER", "LIFELONG_LEARNER"
        };

        var allBadges = await _context.MasterBadges.ToListAsync();
        Assert.True(allBadges.Count >= 57);

        foreach (var code in newBadgeCodes)
        {
            Assert.Contains(allBadges, b => b.Code == code);
        }
    }

    [Fact]
    public async Task ProcessReceivedPayloadAsync_WhenNotesAreEmpty_ShouldMigrateAndPopulateFromOldSystem()
    {
        // Arrange
        // 1. Task lokal dengan deskripsi kosong
        _context.Tasks.Add(new WorkTask
        {
            Id = 5501,
            Title = "Implementasi Integrasi Pembayaran",
            Description = ""
        });

        // 2. Catatan lokal dengan ID 7701 tetapi konten masih kosong (<p></p>)
        _context.Notes.Add(new WorkNote
        {
            Id = 7701,
            Title = "Catatan Integrasi Pembayaran",
            ContentHtml = "<p></p>",
            TaskId = 5501
        });

        // 3. Sesi & Presensi lokal dengan Notes kosong
        _context.Sessions.Add(new WorkSession
        {
            Id = 8801,
            TaskId = 5501,
            UserId = "user-1",
            StartTime = DateTimeOffset.UtcNow.AddHours(-1),
            Duration = 3600,
            Notes = ""
        });
        _context.Attendances.Add(new Attendance
        {
            Id = 9901,
            UserId = "user-1",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Notes = null
        });
        await _context.SaveChangesAsync();

        // Payload dari sistem lama (berisi data catatan yang lengkap)
        var payload = new SyncPayload
        {
            Manifest = new SyncManifest
            {
                SourceInstance = "SistemLama-Host",
                EntityCount = 4
            },
            Data = new SyncDatabaseData
            {
                Tasks = new List<TaskSyncDto>
                {
                    new()
                    {
                        Id = 5501,
                        Title = "Implementasi Integrasi Pembayaran",
                        Description = "Deskripsi teknis lengkap diekspor dari sistem lama."
                    }
                },
                Notes = new List<WorkNoteSyncDto>
                {
                    // Note 7701: Memperbarui note lokal yang kontennya masih kosong
                    new()
                    {
                        Id = 7701,
                        Title = "Catatan Integrasi Pembayaran",
                        ContentHtml = "<p>Data rahasia payment gateway berhasil dipindahkan dari sistem lama.</p>",
                        Category = "Technical",
                        Color = "#ef4444",
                        TaskId = 5501
                    },
                    // Note 7702: Catatan baru dari sistem lama yang sebelumnya belum ada di lokal
                    new()
                    {
                        Id = 7702,
                        Title = "Arsitektur Settlement ESPay",
                        ContentHtml = "<p>Detail arsitektur settlement H+1 dari sistem lama.</p>",
                        Category = "Meeting",
                        Color = "#6366F1",
                        TaskId = 5501
                    }
                },
                Sessions = new List<SessionSyncDto>
                {
                    new()
                    {
                        Id = 8801,
                        TaskId = 5501,
                        UserId = "user-1",
                        StartTime = DateTimeOffset.UtcNow.AddHours(-1),
                        Duration = 3600,
                        Notes = "Catatan sesi lembur ditransfer dari sistem lama"
                    }
                },
                Attendances = new List<AttendanceSyncDto>
                {
                    new()
                    {
                        Id = 9901,
                        UserId = "user-1",
                        Date = DateOnly.FromDateTime(DateTime.UtcNow),
                        Notes = "Catatan presensi WFO dari sistem lama"
                    }
                }
            }
        };

        // Act
        var result = await _syncService.ProcessReceivedPayloadAsync(payload, "admin-tester");

        // Assert
        Assert.True(result.Success);

        // 1. Catatan 7701 yang tadinya kosong harus ter-update dari sistem lama
        var updatedNote = await _context.Notes.FindAsync(7701);
        Assert.NotNull(updatedNote);
        Assert.Contains("Data rahasia payment gateway berhasil dipindahkan dari sistem lama", updatedNote.ContentHtml);
        Assert.Equal("Technical", updatedNote.Category);

        // 2. Catatan 7702 baru dari sistem lama harus ter-create di lokal dan terhubung ke task 5501
        var newNote = await _context.Notes.FindAsync(7702);
        Assert.NotNull(newNote);
        Assert.Contains("Detail arsitektur settlement H+1 dari sistem lama", newNote.ContentHtml);
        Assert.Equal(5501, newNote.TaskId);

        // 3. Deskripsi task lokal yang tadinya kosong harus terisi
        var updatedTask = await _context.Tasks.FindAsync(5501);
        Assert.NotNull(updatedTask);
        Assert.Equal("Deskripsi teknis lengkap diekspor dari sistem lama.", updatedTask.Description);

        // 4. Session & Attendance notes yang tadinya kosong harus terisi
        var updatedSession = await _context.Sessions.FindAsync(8801);
        Assert.NotNull(updatedSession);
        Assert.Equal("Catatan sesi lembur ditransfer dari sistem lama", updatedSession.Notes);

        var updatedAttendance = await _context.Attendances.FindAsync(9901);
        Assert.NotNull(updatedAttendance);
        Assert.Equal("Catatan presensi WFO dari sistem lama", updatedAttendance.Notes);
    }

    [Fact]
    public async Task ImportSqlScriptAsync_SampleSourceDb_ShouldImportNotesAndAttachmentsSuccessfully()
    {
        var dir = AppContext.BaseDirectory;
        string? sampleSqlPath = null;
        for (int i = 0; i < 8 && dir != null; i++)
        {
            var candidate = Path.Combine(dir, "Sample Source DB", "TrackerKerja_Sync_20261023_234611.sql");
            if (File.Exists(candidate))
            {
                sampleSqlPath = candidate;
                break;
            }
            dir = Directory.GetParent(dir)?.FullName;
        }

        Assert.True(sampleSqlPath != null && File.Exists(sampleSqlPath), "Sample SQL file must exist");

        var sqlContent = await File.ReadAllTextAsync(sampleSqlPath!);
        var result = await _syncService.ImportSqlScriptAsync(sqlContent, "admin-sample-test");

        Assert.True(result.Success, result.Message);
        Assert.True(result.RecordsProcessed > 0);

        var notes = await _context.Notes.IgnoreQueryFilters().ToListAsync();
        Assert.NotEmpty(notes);
        Assert.True(notes.Count >= 40, $"Expected >= 40 notes, but got {notes.Count}");

        var attachments = await _context.NoteAttachments.IgnoreQueryFilters().ToListAsync();
        Assert.NotEmpty(attachments);
        Assert.True(attachments.Count >= 50, $"Expected >= 50 attachments, but got {attachments.Count}");

        // Verify specific sample note
        var sampleNote = notes.FirstOrDefault(n => n.Id == 9);
        Assert.NotNull(sampleNote);
        Assert.Equal("Sharing knowledge alur proses TCES - TICS", sampleNote.Title);
        Assert.Contains("Sharing knowledge alur proses TCES - TICS", sampleNote.ContentHtml);

        // Verify attachment connected to note 9
        var sampleAtt = attachments.FirstOrDefault(a => a.NoteId == 9);
        Assert.NotNull(sampleAtt);
        Assert.Contains(".pdf", sampleAtt.FileName);
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

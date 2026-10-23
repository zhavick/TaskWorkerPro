using System.Diagnostics;
using System.IO.Compression;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class SyncService : ISyncService
{
    private readonly AppDbContext _context;
    private readonly string _uploadBasePath;
    private readonly IHttpClientFactory? _httpClientFactory;
    private readonly ILogger<SyncService>? _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public SyncService(
        AppDbContext context,
        IWebHostEnvironment env,
        IHttpClientFactory? httpClientFactory = null,
        ILogger<SyncService>? logger = null)
        : this(context, Path.Combine(env.ContentRootPath, "uploads"), httpClientFactory, logger)
    {
    }

    public SyncService(
        AppDbContext context,
        string uploadBasePath,
        IHttpClientFactory? httpClientFactory = null,
        ILogger<SyncService>? logger = null)
    {
        _context = context;
        _uploadBasePath = Path.GetFullPath(uploadBasePath);
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        if (!Directory.Exists(_uploadBasePath))
        {
            Directory.CreateDirectory(_uploadBasePath);
        }
    }

    public async Task<SyncPingResponse> GetLocalPingInfoAsync()
    {
        var totalCompanies = await _context.Companies.IgnoreQueryFilters().CountAsync();
        var totalUsers = await _context.Users.IgnoreQueryFilters().CountAsync();
        var totalProjects = await _context.Projects.IgnoreQueryFilters().CountAsync();
        var totalTasks = await _context.Tasks.IgnoreQueryFilters().CountAsync();
        var totalNotes = await _context.Notes.IgnoreQueryFilters().CountAsync();
        var totalAttachments = await _context.NoteAttachments.IgnoreQueryFilters().CountAsync();
        var totalSessions = await _context.Sessions.IgnoreQueryFilters().CountAsync();
        var totalAttendances = await _context.Attendances.IgnoreQueryFilters().CountAsync();
        var totalBadges = await _context.MasterBadges.IgnoreQueryFilters().CountAsync();

        var totalUploadsSize = CalculateDirectorySize(_uploadBasePath);

        return new SyncPingResponse
        {
            InstanceName = "TrackerKerja-Node",
            Version = "1.0.0",
            ServerTime = DateTimeOffset.UtcNow,
            TotalCompanies = totalCompanies,
            TotalUsers = totalUsers,
            TotalProjects = totalProjects,
            TotalTasks = totalTasks,
            TotalNotes = totalNotes,
            TotalAttachments = totalAttachments,
            TotalSessions = totalSessions,
            TotalAttendances = totalAttendances,
            TotalBadges = totalBadges,
            TotalUploadsSizeBytes = totalUploadsSize,
            Ready = true,
            ResponseLatencyMs = 0
        };
    }

    public async Task<SyncPingResponse> PingRemoteHostAsync(string hostUrl, string apiKey, bool allowUntrustedSsl = false)
    {
        var cleanUrl = hostUrl.TrimEnd('/');
        var candidates = await GetCandidateApiKeysAsync(apiKey);
        var stopwatch = Stopwatch.StartNew();

        HttpResponseMessage? lastResponse = null;
        string? lastErrorBody = null;

        foreach (var candidateKey in candidates)
        {
            var client = CreateHttpClient(candidateKey, allowUntrustedSsl);
            var queryParams = !string.IsNullOrWhiteSpace(candidateKey)
                ? $"?apiKey={Uri.EscapeDataString(candidateKey)}&key={Uri.EscapeDataString(candidateKey)}&syncKey={Uri.EscapeDataString(candidateKey)}"
                : "";

            try
            {
                var response = await client.GetAsync($"{cleanUrl}/api/sync/ping{queryParams}");
                if (response.IsSuccessStatusCode)
                {
                    stopwatch.Stop();
                    var pingResult = await response.Content.ReadFromJsonAsync<SyncPingResponse>(JsonOptions);
                    if (pingResult != null)
                    {
                        await PersistWorkingSyncKeyAsync(cleanUrl, candidateKey);
                        return pingResult with { ResponseLatencyMs = stopwatch.ElapsedMilliseconds };
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized ||
                         response.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    lastResponse = response;
                    lastErrorBody = await response.Content.ReadAsStringAsync();
                    continue; // Coba kunci kandidat berikutnya
                }
                else
                {
                    lastResponse = response;
                    lastErrorBody = await response.Content.ReadAsStringAsync();
                    break;
                }
            }
            catch (Exception ex) when (candidateKey != candidates.Last())
            {
                lastErrorBody = ex.Message;
            }
        }

        stopwatch.Stop();
        if (lastResponse != null)
        {
            throw new HttpRequestException($"Ping failed with status {lastResponse.StatusCode}: {lastErrorBody}");
        }

        throw new HttpRequestException($"Ping failed: Host tidak dapat dihubungi atau semua kunci sinkronisasi ditolak ({lastErrorBody}).");
    }

    public async Task<byte[]> ExportPackageZipAsync(bool includeFiles)
    {
        var payload = await PrepareSyncPayloadAsync(includeFiles: false);

        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            // 1. Add manifest.json
            var manifestEntry = archive.CreateEntry("manifest.json", CompressionLevel.Optimal);
            using (var writer = new StreamWriter(manifestEntry.Open(), Encoding.UTF8))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(payload.Manifest, JsonOptions));
            }

            // 2. Add sync_data.json
            var dataEntry = archive.CreateEntry("sync_data.json", CompressionLevel.Optimal);
            using (var writer = new StreamWriter(dataEntry.Open(), Encoding.UTF8))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(payload.Data, JsonOptions));
            }

            // 3. Add sync_data.sql
            var sqlScript = GenerateSqlScript(payload.Data);
            var sqlEntry = archive.CreateEntry("sync_data.sql", CompressionLevel.Optimal);
            using (var writer = new StreamWriter(sqlEntry.Open(), Encoding.UTF8))
            {
                await writer.WriteAsync(sqlScript);
            }

            // 4. Add physical files if requested (avatars, covers, note attachments, etc.)
            if (includeFiles)
            {
                ConsolidateLocalUploads();
                if (Directory.Exists(_uploadBasePath))
                {
                    var files = Directory.GetFiles(_uploadBasePath, "*.*", SearchOption.AllDirectories);
                    foreach (var file in files)
                    {
                        var relativePath = Path.GetRelativePath(_uploadBasePath, file).Replace('\\', '/');
                        var entryName = relativePath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase)
                            ? relativePath
                            : $"uploads/{relativePath}";
                        var fileEntry = archive.CreateEntry(entryName, CompressionLevel.Optimal);

                        using var sourceStream = File.OpenRead(file);
                        using var targetStream = fileEntry.Open();
                        await sourceStream.CopyToAsync(targetStream);
                    }
                }
            }
        }

        var zipBytes = memoryStream.ToArray();

        // Record history
        _context.SyncHistories.Add(new SyncHistory
        {
            Direction = SyncDirection.ExportZip,
            Status = SyncStatus.Success,
            TargetHost = "Local Package Export",
            TotalRecordsSynced = payload.Manifest.EntityCount,
            FileSizeBytes = zipBytes.Length,
            SummaryJson = JsonSerializer.Serialize(new { payload.Manifest.EntityCount, IncludesFiles = includeFiles }),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        return zipBytes;
    }

    public async Task<string> ExportSqlDumpAsync()
    {
        var payload = await PrepareSyncPayloadAsync(includeFiles: false);
        var sqlScript = GenerateSqlScript(payload.Data);

        _context.SyncHistories.Add(new SyncHistory
        {
            Direction = SyncDirection.ExportSql,
            Status = SyncStatus.Success,
            TargetHost = "Local SQL Dump Export",
            TotalRecordsSynced = payload.Manifest.EntityCount,
            FileSizeBytes = Encoding.UTF8.GetByteCount(sqlScript),
            SummaryJson = JsonSerializer.Serialize(new { payload.Manifest.EntityCount, Format = "SQL" }),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        return sqlScript;
    }

    public async Task<SyncOperationResult> ImportPackageZipAsync(Stream zipStream, string? triggeredByUserId)
    {
        try
        {
            using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: false);

            // Zip Slip Security Guard Verification
            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name)) continue; // directory entry

                // Normalize path
                var destinationPath = Path.GetFullPath(Path.Combine(_uploadBasePath, entry.FullName));
                if (!destinationPath.StartsWith(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
                {
                    var failMsg = $"Zip Slip path traversal attempt detected in entry: {entry.FullName}";
                    _logger?.LogWarning(failMsg);

                    _context.SyncHistories.Add(new SyncHistory
                    {
                        Direction = SyncDirection.ImportZip,
                        Status = SyncStatus.Failed,
                        TargetHost = "Local Package Import",
                        ErrorMessage = failMsg,
                        TriggeredByUserId = triggeredByUserId
                    });
                    await _context.SaveChangesAsync();

                    return new SyncOperationResult
                    {
                        Success = false,
                        Message = failMsg,
                        Status = SyncStatus.Failed
                    };
                }
            }

            var manifestEntry = archive.GetEntry("manifest.json");
            var dataEntry = archive.GetEntry("sync_data.json");
            var sqlEntry = archive.GetEntry("sync_data.sql");

            if (dataEntry == null && sqlEntry == null)
            {
                return new SyncOperationResult
                {
                    Success = false,
                    Message = "Berkas paket tidak valid: sync_data.json atau sync_data.sql tidak ditemukan.",
                    Status = SyncStatus.Failed
                };
            }

            // Extract file attachments if present (avatars, covers, note attachments, etc.)
            var extractedFilesCount = 0;
            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name)) continue; // directory entry

                var rawName = entry.FullName.Replace('\\', '/');
                var isUploadEntry = rawName.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase);
                var relPath = isUploadEntry ? rawName.Substring("uploads/".Length) : rawName;

                if (string.IsNullOrWhiteSpace(relPath) ||
                    relPath.Equals("manifest.json", StringComparison.OrdinalIgnoreCase) ||
                    relPath.Equals("sync_data.json", StringComparison.OrdinalIgnoreCase) ||
                    relPath.Equals("sync_data.sql", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var destinationPath = Path.GetFullPath(Path.Combine(_uploadBasePath, relPath));
                if (!destinationPath.StartsWith(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Zip Slip detected: {entry.FullName}");
                }

                var destinationDir = Path.GetDirectoryName(destinationPath);
                if (!string.IsNullOrEmpty(destinationDir))
                {
                    Directory.CreateDirectory(destinationDir);
                }
                entry.ExtractToFile(destinationPath, overwrite: true);
                extractedFilesCount++;

                MirrorExtractedFile(relPath, destinationPath);
            }

            var mergedCount = 0;
            if (dataEntry != null)
            {
                using var dataReader = new StreamReader(dataEntry.Open(), Encoding.UTF8);
                var dataJson = await dataReader.ReadToEndAsync();
                var data = JsonSerializer.Deserialize<SyncDatabaseData>(dataJson, JsonOptions) ?? new SyncDatabaseData();
                mergedCount = await MergeDatabaseDataAsync(data);
            }
            else if (sqlEntry != null)
            {
                using var sqlReader = new StreamReader(sqlEntry.Open(), Encoding.UTF8);
                var sqlContent = await sqlReader.ReadToEndAsync();
                var sqlResult = await ImportSqlScriptAsync(sqlContent, triggeredByUserId);
                mergedCount = sqlResult.RecordsProcessed;
            }

            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.ImportZip,
                Status = SyncStatus.Success,
                TargetHost = "Local Package Import",
                TotalRecordsSynced = mergedCount,
                FileSizeBytes = zipStream.CanSeek ? zipStream.Length : 0,
                SummaryJson = JsonSerializer.Serialize(new { RecordsMerged = mergedCount, FilesExtracted = extractedFilesCount }),
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = true,
                Message = $"Berhasil mengimpor paket: {mergedCount} rekod disinkronkan, {extractedFilesCount} berkas diekstrak.",
                RecordsProcessed = mergedCount,
                FileSizeBytes = zipStream.CanSeek ? zipStream.Length : 0,
                Status = SyncStatus.Success,
                Details = new List<string> { $"{mergedCount} rekod basis data", $"{extractedFilesCount} lampiran berkas" }
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to import package zip");
            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.ImportZip,
                Status = SyncStatus.Failed,
                TargetHost = "Local Package Import",
                ErrorMessage = ex.Message,
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = false,
                Message = $"Gagal mengimpor paket: {ex.Message}",
                Status = SyncStatus.Failed
            };
        }
    }

    public async Task<SyncOperationResult> ImportSqlScriptAsync(string sqlContent, string? triggeredByUserId)
    {
        if (string.IsNullOrWhiteSpace(sqlContent))
        {
            return new SyncOperationResult
            {
                Success = false,
                Message = "Skrip SQL kosong.",
                Status = SyncStatus.Failed
            };
        }

        try
        {
            var isPostgres = _context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true
                          || _context.Database.ProviderName?.Contains("Postgre", StringComparison.OrdinalIgnoreCase) == true;

            var rawStatements = SplitSqlStatements(sqlContent);
            var sanitizedStatements = new List<string>();

            foreach (var raw in rawStatements)
            {
                var translated = SanitizeAndTranslateSqlStatement(raw, isPostgres);
                if (!string.IsNullOrWhiteSpace(translated))
                {
                    sanitizedStatements.Add(translated);
                }
            }

            var executedStatements = 0;

            if (_context.Database.IsRelational())
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    foreach (var stmt in sanitizedStatements)
                    {
                        await _context.Database.ExecuteSqlRawAsync(stmt);
                        executedStatements++;
                    }

                    if (isPostgres)
                    {
                        await UpdatePostgresSequencesAsync();
                    }

                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw new InvalidOperationException($"Gagal mengeksekusi skrip SQL (Rollback berhasil): {ex.Message}", ex);
                }
            }
            else
            {
                // In-memory or non-relational test support
                executedStatements = sanitizedStatements.Count;
            }

            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.ImportSql,
                Status = SyncStatus.Success,
                TargetHost = "Local SQL Script Import",
                TotalRecordsSynced = executedStatements,
                FileSizeBytes = Encoding.UTF8.GetByteCount(sqlContent),
                SummaryJson = JsonSerializer.Serialize(new { StatementsExecuted = executedStatements }),
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = true,
                Message = $"Berhasil mengimpor skrip SQL: {executedStatements} baris perintah DML dieksekusi secara atomik.",
                RecordsProcessed = executedStatements,
                FileSizeBytes = Encoding.UTF8.GetByteCount(sqlContent),
                Status = SyncStatus.Success
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to import SQL script");
            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.ImportSql,
                Status = SyncStatus.Failed,
                TargetHost = "Local SQL Script Import",
                ErrorMessage = ex.Message,
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = false,
                Message = $"Gagal mengimpor skrip SQL: {ex.Message}",
                Status = SyncStatus.Failed
            };
        }
    }

    public async Task<SyncPayload> PrepareSyncPayloadAsync(bool includeFiles)
    {
        var companies = await _context.Companies.IgnoreQueryFilters()
            .Select(c => new CompanySyncDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                Description = c.Description,
                Address = c.Address,
                ContactEmail = c.ContactEmail,
                CreatedAt = c.CreatedAt
            }).ToListAsync();

        var users = await _context.Users.IgnoreQueryFilters()
            .Select(u => new UserSyncDto
            {
                Id = u.Id,
                UserName = u.UserName,
                NormalizedUserName = u.NormalizedUserName,
                Email = u.Email,
                NormalizedEmail = u.NormalizedEmail,
                EmailConfirmed = u.EmailConfirmed,
                PasswordHash = u.PasswordHash,
                SecurityStamp = u.SecurityStamp,
                ConcurrencyStamp = u.ConcurrencyStamp,
                PhoneNumber = u.PhoneNumber,
                FullName = u.FullName,
                JobTitle = u.JobTitle,
                AvatarColor = u.AvatarColor,
                ProfilePictureUrl = u.ProfilePictureUrl,
                CoverPictureUrl = u.CoverPictureUrl,
                CompanyId = u.CompanyId,
                IsApproved = u.IsApproved,
                ApprovedAt = u.ApprovedAt,
                ApprovedByUserId = u.ApprovedByUserId,
                CreatedAt = u.CreatedAt
            }).ToListAsync();

        var categories = await _context.Categories.IgnoreQueryFilters()
            .Select(c => new CategorySyncDto
            {
                Id = c.Id,
                Name = c.Name,
                Color = c.Color,
                Description = c.Description,
                CreatedAt = c.CreatedAt
            }).ToListAsync();

        var priorities = await _context.MasterPriorities.IgnoreQueryFilters()
            .Select(p => new MasterPrioritySyncDto
            {
                Id = p.Id,
                Name = p.Name,
                Color = p.Color,
                Icon = p.Icon,
                OrderIndex = p.OrderIndex,
                Description = p.Description,
                IsDefault = p.IsDefault
            }).ToListAsync();

        var statuses = await _context.MasterStatuses.IgnoreQueryFilters()
            .Select(s => new MasterStatusSyncDto
            {
                Id = s.Id,
                Name = s.Name,
                Color = s.Color,
                IsDoneState = s.IsDoneState,
                OrderIndex = s.OrderIndex,
                Description = s.Description,
                IsDefault = s.IsDefault
            }).ToListAsync();

        var milestones = await _context.MasterMilestones.IgnoreQueryFilters()
            .Select(m => new MasterMilestoneSyncDto
            {
                Id = m.Id,
                Name = m.Name,
                Phase = m.Phase,
                Color = m.Color,
                Icon = m.Icon,
                OrderIndex = m.OrderIndex,
                Description = m.Description,
                IsDefault = m.IsDefault
            }).ToListAsync();

        var projects = await _context.Projects.IgnoreQueryFilters()
            .Select(p => new ProjectSyncDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                Color = p.Color,
                Status = p.Status,
                CompanyId = p.CompanyId,
                ClientName = p.ClientName,
                ProjectManagerId = p.ProjectManagerId,
                Budget = p.Budget,
                ActualCost = p.ActualCost,
                UseBudget = p.UseBudget,
                Tags = p.Tags,
                Deadline = p.Deadline,
                CreatedAt = p.CreatedAt
            }).ToListAsync();

        var tasks = await _context.Tasks.IgnoreQueryFilters()
            .Select(t => new TaskSyncDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Priority = t.Priority,
                Status = t.Status,
                Progress = t.Progress,
                Milestone = t.Milestone,
                Obstacle = t.Obstacle,
                Solution = t.Solution,
                Tags = t.Tags,
                ProjectId = t.ProjectId,
                CategoryId = t.CategoryId,
                AssignedToUserId = t.AssignedToUserId,
                ParentTaskId = t.ParentTaskId,
                CompanyId = t.CompanyId,
                StartDate = t.StartDate,
                DueDate = t.DueDate,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            }).ToListAsync();

        var sessions = await _context.Sessions.IgnoreQueryFilters()
            .Select(s => new SessionSyncDto
            {
                Id = s.Id,
                TaskId = s.TaskId,
                UserId = s.UserId,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Duration = s.Duration,
                Notes = s.Notes,
                CreatedAt = s.CreatedAt
            }).ToListAsync();

        var attendances = await _context.Attendances.IgnoreQueryFilters()
            .Select(a => new AttendanceSyncDto
            {
                Id = a.Id,
                UserId = a.UserId,
                Date = a.Date,
                Type = a.Type,
                WorkLocation = a.WorkLocation,
                Status = a.Status,
                ApprovedByUserId = a.ApprovedByUserId,
                ClockIn = a.ClockIn,
                ClockOut = a.ClockOut,
                TotalHours = a.TotalHours,
                LeaveReason = a.LeaveReason,
                Notes = a.Notes,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            }).ToListAsync();

        var notes = await _context.Notes.IgnoreQueryFilters()
            .Select(n => new WorkNoteSyncDto
            {
                Id = n.Id,
                Title = n.Title,
                ContentHtml = n.ContentHtml,
                Category = n.Category,
                Color = n.Color,
                IsPinned = n.IsPinned,
                AuthorUserId = n.AuthorUserId,
                TaskId = n.TaskId,
                CompanyId = n.CompanyId,
                CreatedAt = n.CreatedAt,
                UpdatedAt = n.UpdatedAt
            }).ToListAsync();

        var attachments = await _context.NoteAttachments.IgnoreQueryFilters()
            .Select(a => new NoteAttachmentSyncDto
            {
                Id = a.Id,
                NoteId = a.NoteId,
                FileName = a.FileName,
                FilePath = (!string.IsNullOrWhiteSpace(a.FilePath) && !a.FilePath.Contains('\\') && a.FilePath.StartsWith("/uploads/"))
                    ? a.FilePath
                    : $"/uploads/notes/{a.NoteId}/{a.FileName}",
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                FileExtension = a.FileExtension,
                UploadedByUserId = a.UploadedByUserId,
                UploadedAt = a.UploadedAt
            }).ToListAsync();

        var masterBadges = await _context.MasterBadges.IgnoreQueryFilters()
            .Select(b => new MasterBadgeSyncDto
            {
                Id = b.Id,
                Code = b.Code,
                Name = b.Name,
                Description = b.Description,
                Category = b.Category,
                Icon = b.Icon,
                Color = b.Color,
                Points = b.Points,
                Rarity = b.Rarity,
                TriggerType = b.TriggerType,
                TriggerThreshold = b.TriggerThreshold,
                IsActive = b.IsActive,
                OrderIndex = b.OrderIndex,
                CreatedAt = b.CreatedAt
            }).ToListAsync();

        var rewardItems = await _context.RewardItems.IgnoreQueryFilters()
            .Select(r => new RewardItemSyncDto
            {
                Id = r.Id,
                Name = r.Name,
                Description = r.Description,
                PointCost = r.PointCost,
                Stock = r.Stock,
                Category = r.Category,
                ImageUrl = r.ImageUrl,
                Icon = r.Icon,
                Color = r.Color,
                IsActive = r.IsActive,
                IsMonthlyMilestoneReward = r.IsMonthlyMilestoneReward,
                OrderIndex = r.OrderIndex,
                CreatedAt = r.CreatedAt
            }).ToListAsync();

        var emailTemplates = await _context.EmailTemplates.IgnoreQueryFilters()
            .Select(e => new EmailTemplateSyncDto
            {
                Id = e.Id,
                EventCode = e.EventCode,
                EventName = e.EventName,
                Category = e.Category,
                Subject = e.Subject,
                BodyHtml = e.BodyHtml,
                AvailableVariables = e.AvailableVariables,
                IsActive = e.IsActive,
                UpdatedByUserId = e.UpdatedByUserId,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToListAsync();

        var systemSettings = await _context.SystemSettings.IgnoreQueryFilters()
            .Select(s => new SystemSettingSyncDto
            {
                Key = s.Key,
                Value = s.Value,
                Description = s.Description,
                UpdatedAt = s.UpdatedAt
            }).ToListAsync();

        var userBadges = await _context.UserBadges.IgnoreQueryFilters()
            .Include(ub => ub.Badge)
            .Select(ub => new UserBadgeSyncDto
            {
                Id = ub.Id,
                UserId = ub.UserId,
                BadgeId = ub.BadgeId,
                BadgeCode = ub.Badge != null ? ub.Badge.Code : null,
                UnlockedAt = ub.UnlockedAt,
                IsFeatured = ub.IsFeatured,
                AwardedBy = ub.AwardedBy
            }).ToListAsync();

        var dailyCheckIns = await _context.DailyCheckIns.IgnoreQueryFilters()
            .Select(dc => new DailyCheckInSyncDto
            {
                Id = dc.Id,
                UserId = dc.UserId,
                CheckInDate = dc.CheckInDate,
                CheckInTime = dc.CheckInTime,
                PointsEarned = dc.PointsEarned,
                StreakDay = dc.StreakDay,
                IsMonthlyMilestone = dc.IsMonthlyMilestone,
                Notes = dc.Notes
            }).ToListAsync();

        var rewardClaims = await _context.RewardClaims.IgnoreQueryFilters()
            .Include(rc => rc.RewardItem)
            .Select(rc => new RewardClaimSyncDto
            {
                Id = rc.Id,
                UserId = rc.UserId,
                RewardItemId = rc.RewardItemId,
                RewardItemName = rc.RewardItem != null ? rc.RewardItem.Name : null,
                PointsSpent = rc.PointsSpent,
                Status = rc.Status,
                ClaimedAt = rc.ClaimedAt,
                ProcessedAt = rc.ProcessedAt,
                ProcessedByUserId = rc.ProcessedByUserId,
                AdminNotes = rc.AdminNotes
            }).ToListAsync();

        var announcements = await _context.Announcements.IgnoreQueryFilters()
            .Select(a => new AnnouncementSyncDto
            {
                Id = a.Id,
                Title = a.Title,
                Content = a.Content,
                Type = a.Type,
                StartDate = a.StartDate,
                EndDate = a.EndDate,
                IsActive = a.IsActive,
                CompanyId = a.CompanyId,
                CreatedByUserId = a.CreatedByUserId,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            }).ToListAsync();

        var data = new SyncDatabaseData
        {
            Companies = companies,
            Users = users,
            Categories = categories,
            MasterPriorities = priorities,
            MasterStatuses = statuses,
            MasterMilestones = milestones,
            MasterBadges = masterBadges,
            UserBadges = userBadges,
            DailyCheckIns = dailyCheckIns,
            RewardItems = rewardItems,
            RewardClaims = rewardClaims,
            EmailTemplates = emailTemplates,
            SystemSettings = systemSettings,
            Announcements = announcements,
            Projects = projects,
            Tasks = tasks,
            Sessions = sessions,
            Attendances = attendances,
            Notes = notes,
            NoteAttachments = attachments
        };

        var entityCount = companies.Count + users.Count + categories.Count + priorities.Count +
                          statuses.Count + milestones.Count + masterBadges.Count + userBadges.Count +
                          dailyCheckIns.Count + rewardItems.Count + rewardClaims.Count +
                          emailTemplates.Count + systemSettings.Count + announcements.Count +
                          projects.Count + tasks.Count + sessions.Count + attendances.Count +
                          notes.Count + attachments.Count;

        string? filesZipBase64 = null;
        if (includeFiles)
        {
            ConsolidateLocalUploads();
        }
        long uploadsSize = CalculateDirectorySize(_uploadBasePath);

        if (includeFiles && Directory.Exists(_uploadBasePath))
        {
            using var fileZipMs = new MemoryStream();
            using (var zip = new ZipArchive(fileZipMs, ZipArchiveMode.Create, leaveOpen: true))
            {
                var files = Directory.GetFiles(_uploadBasePath, "*.*", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    var relPath = Path.GetRelativePath(_uploadBasePath, file).Replace('\\', '/');
                    var entryName = relPath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase)
                        ? relPath
                        : $"uploads/{relPath}";
                    var entry = zip.CreateEntry(entryName, CompressionLevel.Optimal);
                    using var s = File.OpenRead(file);
                    using var d = entry.Open();
                    await s.CopyToAsync(d);
                }
            }
            filesZipBase64 = Convert.ToBase64String(fileZipMs.ToArray());
        }

        var manifest = new SyncManifest
        {
            SourceInstance = "TrackerKerja-Node",
            Version = "1.0.0",
            ExportedAt = DateTimeOffset.UtcNow,
            IncludesFiles = includeFiles,
            EntityCount = entityCount,
            UploadsSizeBytes = uploadsSize,
            IncludedTables = new List<string>
            {
                "companies", "asp_net_users", "categories", "master_priorities",
                "master_statuses", "master_milestones", "master_badges", "user_badges",
                "daily_check_ins", "reward_items", "reward_claims",
                "email_templates", "system_settings", "announcements", "projects", "tasks",
                "sessions", "attendances", "notes", "note_attachments"
            }
        };

        return new SyncPayload
        {
            Manifest = manifest,
            Data = data,
            FilesZipBase64 = filesZipBase64
        };
    }

    public async Task<SyncOperationResult> ProcessReceivedPayloadAsync(SyncPayload payload, string? triggeredByUserId)
    {
        try
        {
            var extractedFiles = 0;
            if (!string.IsNullOrEmpty(payload.FilesZipBase64))
            {
                var zipBytes = Convert.FromBase64String(payload.FilesZipBase64);
                using var ms = new MemoryStream(zipBytes);
                using var archive = new ZipArchive(ms, ZipArchiveMode.Read);

                // Zip slip check & extraction
                foreach (var entry in archive.Entries)
                {
                    if (string.IsNullOrEmpty(entry.Name)) continue;

                    var rawName = entry.FullName.Replace('\\', '/');
                    var isUploadEntry = rawName.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase);
                    var relPath = isUploadEntry ? rawName.Substring("uploads/".Length) : rawName;

                    if (string.IsNullOrWhiteSpace(relPath) ||
                        relPath.Equals("manifest.json", StringComparison.OrdinalIgnoreCase) ||
                        relPath.Equals("sync_data.json", StringComparison.OrdinalIgnoreCase) ||
                        relPath.Equals("sync_data.sql", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    var dest = Path.GetFullPath(Path.Combine(_uploadBasePath, relPath));
                    if (!dest.StartsWith(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException($"Zip Slip detected: {entry.FullName}");
                    }
                    var dir = Path.GetDirectoryName(dest);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    entry.ExtractToFile(dest, overwrite: true);
                    extractedFiles++;

                    MirrorExtractedFile(relPath, dest);
                }
            }

            var mergedCount = await MergeDatabaseDataAsync(payload.Data);

            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.Receive,
                Status = SyncStatus.Success,
                TargetHost = payload.Manifest.SourceInstance,
                TotalRecordsSynced = mergedCount,
                FileSizeBytes = payload.Manifest.UploadsSizeBytes,
                SummaryJson = JsonSerializer.Serialize(new { RecordsMerged = mergedCount, FilesExtracted = extractedFiles }),
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = true,
                Message = $"Berhasil menerima dan memproses sinkronisasi: {mergedCount} rekod disinkronkan.",
                RecordsProcessed = mergedCount,
                Status = SyncStatus.Success,
                Details = new List<string> { $"{mergedCount} rekod digabungkan", $"{extractedFiles} berkas diekstrak" }
            };
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to process received payload");

            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.Receive,
                Status = SyncStatus.Failed,
                TargetHost = payload.Manifest.SourceInstance,
                ErrorMessage = ex.Message,
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = false,
                Message = $"Gagal memproses payload: {ex.Message}",
                Status = SyncStatus.Failed
            };
        }
    }

    public async Task<SyncOperationResult> PushToHostAsync(SyncPushRequest request, string? triggeredByUserId)
    {
        var cleanUrl = request.HostUrl.TrimEnd('/');
        var effectiveApiKey = request.ApiKey?.Trim();
        if (string.IsNullOrWhiteSpace(effectiveApiKey))
        {
            var dbSetting = await _context.SystemSettings
                .Where(s => s.Key == "Sync_ApiKey" || s.Key == "Sync_HostSecret" || s.Key == "SyncApiKey" || s.Key == "SyncSettings:ApiKey")
                .Select(s => s.Value)
                .FirstOrDefaultAsync();
            if (!string.IsNullOrWhiteSpace(dbSetting))
            {
                effectiveApiKey = dbSetting.Trim();
            }
        }

        var client = CreateHttpClient(effectiveApiKey, request.AllowUntrustedSsl);

        var payload = await PrepareSyncPayloadAsync(request.IncludeFiles);
        var queryParams = !string.IsNullOrWhiteSpace(effectiveApiKey) ? $"?apiKey={Uri.EscapeDataString(effectiveApiKey)}&key={Uri.EscapeDataString(effectiveApiKey)}&syncKey={Uri.EscapeDataString(effectiveApiKey)}" : "";
        var response = await client.PostAsJsonAsync($"{cleanUrl}/api/sync/receive{queryParams}", payload, JsonOptions);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            var failMsg = $"Push to host failed ({response.StatusCode}): {err}";

            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.Push,
                Status = SyncStatus.Failed,
                TargetHost = cleanUrl,
                ErrorMessage = failMsg,
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = false,
                Message = failMsg,
                Status = SyncStatus.Failed
            };
        }

        var result = await response.Content.ReadFromJsonAsync<SyncOperationResult>(JsonOptions);
        var opResult = result ?? new SyncOperationResult { Success = true, Message = "Push berhasil." };

        _context.SyncHistories.Add(new SyncHistory
        {
            Direction = SyncDirection.Push,
            Status = opResult.Success ? SyncStatus.Success : SyncStatus.Failed,
            TargetHost = cleanUrl,
            TotalRecordsSynced = payload.Manifest.EntityCount,
            FileSizeBytes = payload.Manifest.UploadsSizeBytes,
            SummaryJson = JsonSerializer.Serialize(new { payload.Manifest.EntityCount, request.IncludeFiles }),
            TriggeredByUserId = triggeredByUserId
        });
        await _context.SaveChangesAsync();

        return opResult;
    }

    public async Task<SyncOperationResult> PullFromHostAsync(SyncPullRequest request, string? triggeredByUserId)
    {
        var cleanUrl = request.HostUrl.TrimEnd('/');
        var candidates = await GetCandidateApiKeysAsync(request.ApiKey);

        HttpResponseMessage? response = null;
        string? successfulKey = null;
        string? lastError = null;

        foreach (var candidateKey in candidates)
        {
            var client = CreateHttpClient(candidateKey, request.AllowUntrustedSsl);
            var encKey = Uri.EscapeDataString(candidateKey);
            var queryParams = $"includeFiles={request.IncludeFiles}&cleanBeforeSync=false&apiKey={encKey}&key={encKey}&syncKey={encKey}";

            try
            {
                // Primary: /api/sync/export-package
                var primaryEndpoint = $"{cleanUrl}/api/sync/export-package?{queryParams}";
                var attemptResp = await client.GetAsync(primaryEndpoint);

                // Fallback 1: /api/sync/package
                if (attemptResp.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    var fallbackEndpoint = $"{cleanUrl}/api/sync/package?{queryParams}";
                    attemptResp = await client.GetAsync(fallbackEndpoint);
                }

                // Fallback 2: /api/sync/export-sql
                if (attemptResp.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    var sqlEndpoint = $"{cleanUrl}/api/sync/export-sql?{queryParams}";
                    attemptResp = await client.GetAsync(sqlEndpoint);
                }

                if (attemptResp.IsSuccessStatusCode)
                {
                    response = attemptResp;
                    successfulKey = candidateKey;
                    await PersistWorkingSyncKeyAsync(cleanUrl, candidateKey);
                    break;
                }

                if (attemptResp.StatusCode == System.Net.HttpStatusCode.Unauthorized ||
                    attemptResp.StatusCode == System.Net.HttpStatusCode.Forbidden)
                {
                    lastError = await attemptResp.Content.ReadAsStringAsync();
                    continue; // Coba kunci kandidat berikutnya
                }
                else
                {
                    response = attemptResp;
                    break;
                }
            }
            catch (Exception ex) when (candidateKey != candidates.Last())
            {
                lastError = ex.Message;
            }
        }

        if (response == null || !response.IsSuccessStatusCode)
        {
            var err = response != null ? await response.Content.ReadAsStringAsync() : lastError;
            var statusCode = response?.StatusCode.ToString() ?? "Unauthorized";
            var failMsg = $"Pull from host failed ({statusCode}): {err}";

            _context.SyncHistories.Add(new SyncHistory
            {
                Direction = SyncDirection.Pull,
                Status = SyncStatus.Failed,
                TargetHost = cleanUrl,
                ErrorMessage = failMsg,
                TriggeredByUserId = triggeredByUserId
            });
            await _context.SaveChangesAsync();

            return new SyncOperationResult
            {
                Success = false,
                Message = failMsg,
                Status = SyncStatus.Failed
            };
        }

        var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
        SyncOperationResult importResult;

        if (contentType.Contains("zip", StringComparison.OrdinalIgnoreCase) ||
            response.Content.Headers.ContentDisposition?.FileName?.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) == true)
        {
            using var zipStream = await response.Content.ReadAsStreamAsync();
            importResult = await ImportPackageZipAsync(zipStream, triggeredByUserId);
        }
        else
        {
            var sqlContent = await response.Content.ReadAsStringAsync();
            importResult = await ImportSqlScriptAsync(sqlContent, triggeredByUserId);
        }

        _context.SyncHistories.Add(new SyncHistory
        {
            Direction = SyncDirection.Pull,
            Status = importResult.Success ? SyncStatus.Success : SyncStatus.Failed,
            TargetHost = cleanUrl,
            TotalRecordsSynced = importResult.RecordsProcessed,
            FileSizeBytes = importResult.FileSizeBytes,
            SummaryJson = JsonSerializer.Serialize(new { importResult.RecordsProcessed, request.IncludeFiles, UsedKey = successfulKey }),
            TriggeredByUserId = triggeredByUserId
        });
        await _context.SaveChangesAsync();

        return importResult;
    }

    public async Task<IReadOnlyList<SyncHistoryDto>> GetSyncHistoryAsync(int limit = 30)
    {
        var histories = await _context.SyncHistories
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .Select(h => new SyncHistoryDto(
                h.Id,
                h.Direction.ToString(),
                h.Status.ToString(),
                h.TargetHost,
                h.TotalRecordsSynced,
                h.FileSizeBytes,
                h.SummaryJson,
                h.ErrorMessage,
                h.CreatedAt,
                h.TriggeredByUserId
            ))
            .ToListAsync();

        return histories;
    }

    private async Task<int> MergeDatabaseDataAsync(SyncDatabaseData data)
    {
        var totalMerged = 0;

        // 1. Merge Companies
        foreach (var c in data.Companies)
        {
            var existing = await _context.Companies.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == c.Id);
            if (existing != null)
            {
                existing.Name = c.Name;
                existing.Code = c.Code;
                existing.Description = c.Description;
                existing.Address = c.Address;
                existing.ContactEmail = c.ContactEmail;
            }
            else
            {
                _context.Companies.Add(new Company
                {
                    Id = c.Id,
                    Name = c.Name,
                    Code = c.Code,
                    Description = c.Description,
                    Address = c.Address,
                    ContactEmail = c.ContactEmail,
                    CreatedAt = c.CreatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 2. Merge Users
        foreach (var u in data.Users)
        {
            var existing = await _context.Users.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == u.Id ||
                    (!string.IsNullOrEmpty(u.NormalizedEmail) && x.NormalizedEmail == u.NormalizedEmail) ||
                    (!string.IsNullOrEmpty(u.NormalizedUserName) && x.NormalizedUserName == u.NormalizedUserName));

            if (existing != null)
            {
                existing.FullName = u.FullName;
                existing.JobTitle = u.JobTitle;
                if (!string.IsNullOrWhiteSpace(u.AvatarColor)) existing.AvatarColor = u.AvatarColor;
                if (!string.IsNullOrWhiteSpace(u.ProfilePictureUrl)) existing.ProfilePictureUrl = u.ProfilePictureUrl;
                if (!string.IsNullOrWhiteSpace(u.CoverPictureUrl)) existing.CoverPictureUrl = u.CoverPictureUrl;
                if (!string.IsNullOrWhiteSpace(u.PhoneNumber)) existing.PhoneNumber = u.PhoneNumber;
                if (u.CompanyId.HasValue) existing.CompanyId = u.CompanyId;
                existing.IsApproved = u.IsApproved;
                if (u.ApprovedAt.HasValue) existing.ApprovedAt = u.ApprovedAt;
                if (!string.IsNullOrWhiteSpace(u.ApprovedByUserId)) existing.ApprovedByUserId = u.ApprovedByUserId;
                existing.ConcurrencyStamp = Guid.NewGuid().ToString();
            }
            else
            {
                _context.Users.Add(new AppUser
                {
                    Id = u.Id,
                    UserName = u.UserName,
                    NormalizedUserName = u.NormalizedUserName,
                    Email = u.Email,
                    NormalizedEmail = u.NormalizedEmail,
                    EmailConfirmed = u.EmailConfirmed,
                    PasswordHash = u.PasswordHash,
                    SecurityStamp = u.SecurityStamp,
                    ConcurrencyStamp = u.ConcurrencyStamp ?? Guid.NewGuid().ToString(),
                    PhoneNumber = u.PhoneNumber,
                    FullName = u.FullName,
                    JobTitle = u.JobTitle,
                    AvatarColor = u.AvatarColor,
                    ProfilePictureUrl = u.ProfilePictureUrl,
                    CoverPictureUrl = u.CoverPictureUrl,
                    CompanyId = u.CompanyId,
                    IsApproved = u.IsApproved,
                    ApprovedAt = u.ApprovedAt,
                    ApprovedByUserId = u.ApprovedByUserId,
                    CreatedAt = u.CreatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 3. Merge Master Priorities, Statuses, Milestones, Categories
        foreach (var p in data.MasterPriorities)
        {
            var existing = await _context.MasterPriorities.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == p.Id);
            if (existing != null)
            {
                existing.Name = p.Name;
                existing.Color = p.Color;
                existing.Icon = p.Icon;
                existing.OrderIndex = p.OrderIndex;
                existing.Description = p.Description;
                existing.IsDefault = p.IsDefault;
            }
            else
            {
                _context.MasterPriorities.Add(new MasterPriority
                {
                    Id = p.Id,
                    Name = p.Name,
                    Color = p.Color,
                    Icon = p.Icon,
                    OrderIndex = p.OrderIndex,
                    Description = p.Description,
                    IsDefault = p.IsDefault
                });
            }
            totalMerged++;
        }

        foreach (var s in data.MasterStatuses)
        {
            var existing = await _context.MasterStatuses.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == s.Id);
            if (existing != null)
            {
                existing.Name = s.Name;
                existing.Color = s.Color;
                existing.IsDoneState = s.IsDoneState;
                existing.OrderIndex = s.OrderIndex;
                existing.Description = s.Description;
                existing.IsDefault = s.IsDefault;
            }
            else
            {
                _context.MasterStatuses.Add(new MasterStatus
                {
                    Id = s.Id,
                    Name = s.Name,
                    Color = s.Color,
                    IsDoneState = s.IsDoneState,
                    OrderIndex = s.OrderIndex,
                    Description = s.Description,
                    IsDefault = s.IsDefault
                });
            }
            totalMerged++;
        }

        foreach (var m in data.MasterMilestones)
        {
            var existing = await _context.MasterMilestones.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == m.Id);
            if (existing != null)
            {
                existing.Name = m.Name;
                existing.Phase = m.Phase;
                existing.Color = m.Color;
                existing.Icon = m.Icon;
                existing.OrderIndex = m.OrderIndex;
                existing.Description = m.Description;
                existing.IsDefault = m.IsDefault;
            }
            else
            {
                _context.MasterMilestones.Add(new MasterMilestone
                {
                    Id = m.Id,
                    Name = m.Name,
                    Phase = m.Phase,
                    Color = m.Color,
                    Icon = m.Icon,
                    OrderIndex = m.OrderIndex,
                    Description = m.Description,
                    IsDefault = m.IsDefault
                });
            }
            totalMerged++;
        }

        foreach (var cat in data.Categories)
        {
            var existing = await _context.Categories.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == cat.Id);
            if (existing != null)
            {
                existing.Name = cat.Name;
                existing.Color = cat.Color;
                existing.Description = cat.Description;
            }
            else
            {
                _context.Categories.Add(new Category
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    Color = cat.Color,
                    Description = cat.Description,
                    CreatedAt = cat.CreatedAt
                });
            }
            totalMerged++;
        }

        foreach (var b in data.MasterBadges)
        {
            var existing = await _context.MasterBadges.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == b.Id || (!string.IsNullOrEmpty(b.Code) && x.Code == b.Code));
            if (existing != null)
            {
                existing.Code = b.Code;
                existing.Name = b.Name;
                existing.Description = b.Description;
                existing.Category = b.Category;
                existing.Icon = b.Icon;
                existing.Color = b.Color;
                existing.Points = b.Points;
                existing.Rarity = b.Rarity;
                existing.TriggerType = b.TriggerType;
                existing.TriggerThreshold = b.TriggerThreshold;
                existing.IsActive = b.IsActive;
                existing.OrderIndex = b.OrderIndex;
            }
            else
            {
                _context.MasterBadges.Add(new MasterBadge
                {
                    Id = b.Id,
                    Code = b.Code,
                    Name = b.Name,
                    Description = b.Description,
                    Category = b.Category,
                    Icon = b.Icon,
                    Color = b.Color,
                    Points = b.Points,
                    Rarity = b.Rarity,
                    TriggerType = b.TriggerType,
                    TriggerThreshold = b.TriggerThreshold,
                    IsActive = b.IsActive,
                    OrderIndex = b.OrderIndex,
                    CreatedAt = b.CreatedAt
                });
            }
            totalMerged++;
        }

        foreach (var r in data.RewardItems)
        {
            var existing = await _context.RewardItems.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == r.Id || (!string.IsNullOrEmpty(r.Name) && x.Name == r.Name));
            if (existing != null)
            {
                existing.Name = r.Name;
                existing.Description = r.Description;
                existing.PointCost = r.PointCost;
                existing.Stock = r.Stock;
                existing.Category = r.Category;
                existing.ImageUrl = r.ImageUrl;
                existing.Icon = r.Icon;
                existing.Color = r.Color;
                existing.IsActive = r.IsActive;
                existing.IsMonthlyMilestoneReward = r.IsMonthlyMilestoneReward;
                existing.OrderIndex = r.OrderIndex;
            }
            else
            {
                _context.RewardItems.Add(new RewardItem
                {
                    Id = r.Id,
                    Name = r.Name,
                    Description = r.Description,
                    PointCost = r.PointCost,
                    Stock = r.Stock,
                    Category = r.Category,
                    ImageUrl = r.ImageUrl,
                    Icon = r.Icon,
                    Color = r.Color,
                    IsActive = r.IsActive,
                    IsMonthlyMilestoneReward = r.IsMonthlyMilestoneReward,
                    OrderIndex = r.OrderIndex,
                    CreatedAt = r.CreatedAt
                });
            }
            totalMerged++;
        }

        foreach (var e in data.EmailTemplates)
        {
            var existing = await _context.EmailTemplates.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == e.Id || (!string.IsNullOrEmpty(e.EventCode) && x.EventCode == e.EventCode));
            if (existing != null)
            {
                existing.EventCode = e.EventCode;
                existing.EventName = e.EventName;
                existing.Category = e.Category;
                existing.Subject = e.Subject;
                existing.BodyHtml = e.BodyHtml;
                existing.AvailableVariables = e.AvailableVariables;
                existing.IsActive = e.IsActive;
                existing.UpdatedByUserId = e.UpdatedByUserId;
                existing.UpdatedAt = e.UpdatedAt;
            }
            else
            {
                _context.EmailTemplates.Add(new EmailTemplate
                {
                    Id = e.Id,
                    EventCode = e.EventCode,
                    EventName = e.EventName,
                    Category = e.Category,
                    Subject = e.Subject,
                    BodyHtml = e.BodyHtml,
                    AvailableVariables = e.AvailableVariables,
                    IsActive = e.IsActive,
                    UpdatedByUserId = e.UpdatedByUserId,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt
                });
            }
            totalMerged++;
        }

        foreach (var set in data.SystemSettings)
        {
            var existing = await _context.SystemSettings.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Key == set.Key);
            if (existing != null)
            {
                existing.Value = set.Value;
                existing.Description = set.Description;
                existing.UpdatedAt = set.UpdatedAt;
            }
            else
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    Key = set.Key,
                    Value = set.Value,
                    Description = set.Description,
                    UpdatedAt = set.UpdatedAt
                });
            }
            totalMerged++;
        }

        await _context.SaveChangesAsync();

        // 3.1. Build company and user lookup dictionaries for robust relational binding
        var allLocalCompanies = await _context.Companies.IgnoreQueryFilters().ToListAsync();
        var defaultCompanyId = allLocalCompanies.FirstOrDefault()?.Id;
        var companyIdLookup = new Dictionary<int, int>();
        foreach (var c in allLocalCompanies)
        {
            companyIdLookup[c.Id] = c.Id;
        }
        foreach (var c in data.Companies)
        {
            var match = allLocalCompanies.FirstOrDefault(x => x.Id == c.Id || (!string.IsNullOrEmpty(c.Code) && string.Equals(x.Code, c.Code, StringComparison.OrdinalIgnoreCase)));
            if (match != null)
            {
                companyIdLookup[c.Id] = match.Id;
            }
        }

        var allUsers = await _context.Users.IgnoreQueryFilters().ToListAsync();
        var defaultFallbackUserId = allUsers.FirstOrDefault()?.Id;
        var userLookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in allUsers)
        {
            userLookup[u.Id] = u.Id;
            if (!string.IsNullOrEmpty(u.NormalizedEmail)) userLookup[u.NormalizedEmail] = u.Id;
            if (!string.IsNullOrEmpty(u.Email)) userLookup[u.Email] = u.Id;
            if (!string.IsNullOrEmpty(u.NormalizedUserName)) userLookup[u.NormalizedUserName] = u.Id;
            if (!string.IsNullOrEmpty(u.UserName)) userLookup[u.UserName] = u.Id;
        }
        foreach (var u in data.Users)
        {
            var match = allUsers.FirstOrDefault(x => x.Id == u.Id ||
                (!string.IsNullOrEmpty(u.NormalizedEmail) && string.Equals(x.NormalizedEmail, u.NormalizedEmail, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(u.Email) && string.Equals(x.Email, u.Email, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(u.NormalizedUserName) && string.Equals(x.NormalizedUserName, u.NormalizedUserName, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(u.UserName) && string.Equals(x.UserName, u.UserName, StringComparison.OrdinalIgnoreCase)));
            if (match != null)
            {
                userLookup[u.Id] = match.Id;
                if (!string.IsNullOrEmpty(u.Email)) userLookup[u.Email] = match.Id;
            }
        }

        // 4. Merge Projects
        foreach (var pr in data.Projects)
        {
            var resolvedCompanyId = pr.CompanyId.HasValue && companyIdLookup.TryGetValue(pr.CompanyId.Value, out var pcId)
                ? pcId
                : (pr.CompanyId ?? defaultCompanyId);

            var resolvedPmId = (!string.IsNullOrEmpty(pr.ProjectManagerId) && userLookup.TryGetValue(pr.ProjectManagerId, out var pmUid))
                ? pmUid
                : pr.ProjectManagerId;

            var existing = await _context.Projects.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == pr.Id);
            if (existing != null)
            {
                existing.Name = pr.Name;
                existing.Description = pr.Description;
                existing.Color = pr.Color;
                existing.Status = pr.Status;
                existing.CompanyId = resolvedCompanyId;
                existing.ClientName = pr.ClientName;
                existing.ProjectManagerId = resolvedPmId;
                existing.Budget = pr.Budget;
                existing.ActualCost = pr.ActualCost;
                existing.UseBudget = pr.UseBudget;
                existing.Tags = pr.Tags;
                existing.Deadline = pr.Deadline;
            }
            else
            {
                _context.Projects.Add(new Project
                {
                    Id = pr.Id,
                    Name = pr.Name,
                    Description = pr.Description,
                    Color = pr.Color,
                    Status = pr.Status,
                    CompanyId = resolvedCompanyId,
                    ClientName = pr.ClientName,
                    ProjectManagerId = resolvedPmId,
                    Budget = pr.Budget,
                    ActualCost = pr.ActualCost,
                    UseBudget = pr.UseBudget,
                    Tags = pr.Tags,
                    Deadline = pr.Deadline,
                    CreatedAt = pr.CreatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 5. Merge Tasks
        var allLocalTasks = await _context.Tasks.IgnoreQueryFilters().ToListAsync();
        var taskIdLookup = new Dictionary<int, int>();
        foreach (var lt in allLocalTasks)
        {
            taskIdLookup[lt.Id] = lt.Id;
        }

        foreach (var t in data.Tasks)
        {
            var resolvedCompanyId = t.CompanyId.HasValue && companyIdLookup.TryGetValue(t.CompanyId.Value, out var tcId)
                ? tcId
                : (t.CompanyId ?? defaultCompanyId);

            var resolvedAssignedUserId = (!string.IsNullOrEmpty(t.AssignedToUserId) && userLookup.TryGetValue(t.AssignedToUserId, out var aUid))
                ? aUid
                : (string.IsNullOrEmpty(t.AssignedToUserId) ? null : defaultFallbackUserId);

            var parentExists = t.ParentTaskId.HasValue && (data.Tasks.Any(x => x.Id == t.ParentTaskId.Value) || await _context.Tasks.IgnoreQueryFilters().AnyAsync(x => x.Id == t.ParentTaskId.Value));
            var resolvedParentTaskId = parentExists ? t.ParentTaskId : null;

            var existing = await _context.Tasks.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == t.Id);
            if (existing == null && !string.IsNullOrWhiteSpace(t.Title))
            {
                existing = await _context.Tasks.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Title.ToLower() == t.Title.ToLower() && (!t.ProjectId.HasValue || x.ProjectId == t.ProjectId));
            }

            if (existing != null)
            {
                taskIdLookup[t.Id] = existing.Id;

                existing.Title = t.Title;
                // Jika deskripsi/notes tugas di sistem lokal masih kosong, perbarui dari sistem lama
                if (IsContentEmpty(existing.Description) && !IsContentEmpty(t.Description))
                {
                    existing.Description = t.Description;
                }
                else if (!string.IsNullOrWhiteSpace(t.Description))
                {
                    existing.Description = t.Description;
                }

                existing.Priority = t.Priority;
                existing.Status = t.Status;
                existing.Progress = t.Progress;
                existing.Milestone = t.Milestone;
                existing.Obstacle = t.Obstacle;
                existing.Solution = t.Solution;
                existing.Tags = t.Tags;
                existing.ProjectId = t.ProjectId;
                existing.CategoryId = t.CategoryId;
                existing.AssignedToUserId = resolvedAssignedUserId;
                existing.ParentTaskId = resolvedParentTaskId;
                existing.CompanyId = resolvedCompanyId;
                existing.StartDate = t.StartDate;
                existing.DueDate = t.DueDate;
                existing.UpdatedAt = t.UpdatedAt;
            }
            else
            {
                var newTask = new WorkTask
                {
                    Id = t.Id,
                    Title = t.Title,
                    Description = t.Description,
                    Priority = t.Priority,
                    Status = t.Status,
                    Progress = t.Progress,
                    Milestone = t.Milestone,
                    Obstacle = t.Obstacle,
                    Solution = t.Solution,
                    Tags = t.Tags,
                    ProjectId = t.ProjectId,
                    CategoryId = t.CategoryId,
                    AssignedToUserId = resolvedAssignedUserId,
                    ParentTaskId = resolvedParentTaskId,
                    CompanyId = resolvedCompanyId,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                };
                _context.Tasks.Add(newTask);
                await _context.SaveChangesAsync();
                taskIdLookup[t.Id] = newTask.Id;
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 6. Merge Sessions (Timesheets)
        foreach (var s in data.Sessions)
        {
            var resolvedUserId = (!string.IsNullOrEmpty(s.UserId) && userLookup.TryGetValue(s.UserId, out var uid))
                ? uid
                : (defaultFallbackUserId ?? s.UserId);

            // Verify task exists or fallback to existing task via taskIdLookup
            var targetTaskId = taskIdLookup.TryGetValue(s.TaskId, out var mappedSid) ? mappedSid : s.TaskId;
            var taskExists = await _context.Tasks.IgnoreQueryFilters().AnyAsync(x => x.Id == targetTaskId);
            if (!taskExists)
            {
                var fallbackTask = await _context.Tasks.IgnoreQueryFilters().FirstOrDefaultAsync();
                if (fallbackTask != null)
                {
                    targetTaskId = fallbackTask.Id;
                }
                else
                {
                    continue; // Skip orphan session if no task exists
                }
            }

            var existing = await _context.Sessions.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == s.Id || (x.TaskId == targetTaskId && x.UserId == resolvedUserId && x.StartTime == s.StartTime));

            if (existing != null)
            {
                existing.TaskId = targetTaskId;
                existing.UserId = resolvedUserId;
                existing.StartTime = s.StartTime;
                existing.EndTime = s.EndTime;
                existing.Duration = s.Duration;
                // Jika notes pada session masih kosong, perbarui dan pindahkan dari sistem lama
                if (string.IsNullOrWhiteSpace(existing.Notes) && !string.IsNullOrWhiteSpace(s.Notes))
                {
                    existing.Notes = s.Notes;
                }
                else if (!string.IsNullOrWhiteSpace(s.Notes))
                {
                    existing.Notes = s.Notes;
                }
            }
            else
            {
                _context.Sessions.Add(new WorkSession
                {
                    Id = s.Id,
                    TaskId = targetTaskId,
                    UserId = resolvedUserId,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Duration = s.Duration,
                    Notes = s.Notes,
                    CreatedAt = s.CreatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 7. Merge Attendances (Presensi)
        foreach (var a in data.Attendances)
        {
            var resolvedUserId = (!string.IsNullOrEmpty(a.UserId) && userLookup.TryGetValue(a.UserId, out var uid))
                ? uid
                : (defaultFallbackUserId ?? a.UserId);

            var resolvedApproverId = (!string.IsNullOrEmpty(a.ApprovedByUserId) && userLookup.TryGetValue(a.ApprovedByUserId, out var appUid))
                ? appUid
                : a.ApprovedByUserId;

            var existing = await _context.Attendances.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == a.Id || (x.UserId == resolvedUserId && x.Date == a.Date));

            if (existing != null)
            {
                existing.UserId = resolvedUserId;
                existing.Date = a.Date;
                existing.Type = a.Type;
                existing.WorkLocation = a.WorkLocation;
                existing.Status = a.Status;
                existing.ApprovedByUserId = resolvedApproverId;
                existing.ClockIn = a.ClockIn;
                existing.ClockOut = a.ClockOut;
                existing.TotalHours = a.TotalHours;
                existing.LeaveReason = a.LeaveReason;
                // Jika notes pada data presensi masih kosong, perbarui dan pindahkan dari sistem lama
                if (string.IsNullOrWhiteSpace(existing.Notes) && !string.IsNullOrWhiteSpace(a.Notes))
                {
                    existing.Notes = a.Notes;
                }
                else if (!string.IsNullOrWhiteSpace(a.Notes))
                {
                    existing.Notes = a.Notes;
                }
                existing.UpdatedAt = a.UpdatedAt;
            }
            else
            {
                _context.Attendances.Add(new Attendance
                {
                    Id = a.Id,
                    UserId = resolvedUserId,
                    Date = a.Date,
                    Type = a.Type,
                    WorkLocation = a.WorkLocation,
                    Status = a.Status,
                    ApprovedByUserId = resolvedApproverId,
                    ClockIn = a.ClockIn,
                    ClockOut = a.ClockOut,
                    TotalHours = a.TotalHours,
                    LeaveReason = a.LeaveReason,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 8. Merge Notes (Catatan Kerja)
        var noteIdLookup = new Dictionary<int, int>();
        foreach (var n in data.Notes)
        {
            var resolvedCompanyId = n.CompanyId.HasValue && companyIdLookup.TryGetValue(n.CompanyId.Value, out var ncId)
                ? ncId
                : n.CompanyId;

            if (resolvedCompanyId.HasValue && !await _context.Companies.IgnoreQueryFilters().AnyAsync(c => c.Id == resolvedCompanyId.Value))
            {
                resolvedCompanyId = defaultCompanyId;
            }

            var resolvedAuthorId = (!string.IsNullOrEmpty(n.AuthorUserId) && userLookup.TryGetValue(n.AuthorUserId, out var nUid))
                ? nUid
                : n.AuthorUserId;

            if (!string.IsNullOrEmpty(resolvedAuthorId))
            {
                var authorExists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == resolvedAuthorId);
                if (!authorExists)
                {
                    resolvedAuthorId = defaultFallbackUserId;
                    if (!string.IsNullOrEmpty(resolvedAuthorId) && !await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == resolvedAuthorId))
                    {
                        resolvedAuthorId = null;
                    }
                }
            }

            int? resolvedTaskId = null;
            if (n.TaskId.HasValue)
            {
                if (taskIdLookup.TryGetValue(n.TaskId.Value, out var mappedTid))
                {
                    resolvedTaskId = mappedTid;
                }
                else if (await _context.Tasks.IgnoreQueryFilters().AnyAsync(x => x.Id == n.TaskId.Value))
                {
                    resolvedTaskId = n.TaskId.Value;
                }
            }

            // 1. Cari catatan berdasarkan ID
            var existing = await _context.Notes.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == n.Id);

            // 2. Jika tidak ditemukan berdasarkan ID, cari berdasarkan TaskId dan Title serupa
            if (existing == null && resolvedTaskId.HasValue && !string.IsNullOrWhiteSpace(n.Title))
            {
                existing = await _context.Notes.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.TaskId == resolvedTaskId.Value && x.Title.ToLower() == n.Title.Trim().ToLower());
            }

            // 3. Jika tidak ditemukan, cari berdasarkan Title dan Company
            if (existing == null && !string.IsNullOrWhiteSpace(n.Title))
            {
                existing = await _context.Notes.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.Title.ToLower() == n.Title.Trim().ToLower() && (!resolvedCompanyId.HasValue || x.CompanyId == resolvedCompanyId));
            }

            // 4. Jika masih belum ditemukan dan catatan lama terasosiasi dengan task tertentu,
            // periksa apakah tugas tersebut memiliki catatan di sistem lokal yang masih kosong kontennya
            if (existing == null && resolvedTaskId.HasValue)
            {
                var taskNotes = await _context.Notes.IgnoreQueryFilters().Where(x => x.TaskId == resolvedTaskId.Value).ToListAsync();
                existing = taskNotes.FirstOrDefault(x => IsContentEmpty(x.ContentHtml));
            }

            if (existing != null)
            {
                noteIdLookup[n.Id] = existing.Id;

                var isLocalContentEmpty = IsContentEmpty(existing.ContentHtml);
                var hasRemoteContent = !IsContentEmpty(n.ContentHtml);

                // PERSYARATAN: Jika notes di sistem lokal masih kosong, dan sinkronisasi menemukan data tersebut,
                // maka pindahkan/perbarui isi data catatan dari sistem lama
                if (isLocalContentEmpty && hasRemoteContent)
                {
                    existing.ContentHtml = n.ContentHtml!;
                    if (string.IsNullOrWhiteSpace(existing.Title) && !string.IsNullOrWhiteSpace(n.Title))
                    {
                        existing.Title = n.Title;
                    }
                }
                else if (hasRemoteContent)
                {
                    existing.ContentHtml = n.ContentHtml!;
                }

                if (!string.IsNullOrWhiteSpace(n.Title)) existing.Title = n.Title;
                if (!string.IsNullOrWhiteSpace(n.Category)) existing.Category = n.Category;
                if (!string.IsNullOrWhiteSpace(n.Color)) existing.Color = n.Color;
                existing.IsPinned = n.IsPinned;
                existing.AuthorUserId = resolvedAuthorId;
                if (resolvedTaskId.HasValue) existing.TaskId = resolvedTaskId;
                if (resolvedCompanyId.HasValue) existing.CompanyId = resolvedCompanyId;
                existing.UpdatedAt = n.UpdatedAt != default ? n.UpdatedAt : DateTimeOffset.UtcNow;
            }
            else
            {
                // Catatan baru dari sistem lama yang belum ada di sistem lokal
                var idTaken = await _context.Notes.IgnoreQueryFilters().AnyAsync(x => x.Id == n.Id);
                var newNote = new WorkNote
                {
                    Title = !string.IsNullOrWhiteSpace(n.Title) ? n.Title : "Catatan",
                    ContentHtml = n.ContentHtml ?? string.Empty,
                    Category = string.IsNullOrWhiteSpace(n.Category) ? "General" : n.Category,
                    Color = string.IsNullOrWhiteSpace(n.Color) ? "#6366F1" : n.Color,
                    IsPinned = n.IsPinned,
                    AuthorUserId = resolvedAuthorId,
                    TaskId = resolvedTaskId,
                    CompanyId = resolvedCompanyId,
                    CreatedAt = n.CreatedAt != default ? n.CreatedAt : DateTimeOffset.UtcNow,
                    UpdatedAt = n.UpdatedAt != default ? n.UpdatedAt : DateTimeOffset.UtcNow
                };

                if (!idTaken)
                {
                    newNote.Id = n.Id;
                }

                _context.Notes.Add(newNote);
                await _context.SaveChangesAsync();
                noteIdLookup[n.Id] = newNote.Id;
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 9. Merge NoteAttachments
        foreach (var att in data.NoteAttachments)
        {
            var targetNoteId = noteIdLookup.TryGetValue(att.NoteId, out var mappedNid) ? mappedNid : att.NoteId;
            var targetNoteExists = await _context.Notes.IgnoreQueryFilters().AnyAsync(x => x.Id == targetNoteId);
            if (!targetNoteExists)
            {
                // Auto-create placeholder note so relational FK constraints are never violated and attachments are preserved
                var placeholderNote = new WorkNote
                {
                    Id = targetNoteId,
                    Title = $"Catatan #{targetNoteId}",
                    ContentHtml = string.Empty,
                    Category = "General",
                    Color = "#6366F1",
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                _context.Notes.Add(placeholderNote);
                await _context.SaveChangesAsync();
            }

            var resolvedUploaderId = (!string.IsNullOrEmpty(att.UploadedByUserId) && userLookup.TryGetValue(att.UploadedByUserId, out var uploaderUid))
                ? uploaderUid
                : att.UploadedByUserId;

            if (!string.IsNullOrEmpty(resolvedUploaderId))
            {
                var uploaderExists = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == resolvedUploaderId);
                if (!uploaderExists)
                {
                    resolvedUploaderId = defaultFallbackUserId;
                    if (!string.IsNullOrEmpty(resolvedUploaderId) && !await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == resolvedUploaderId))
                    {
                        resolvedUploaderId = null;
                    }
                }
            }

            var normalizedFilePath = att.FilePath;
            if (string.IsNullOrWhiteSpace(normalizedFilePath) || Path.IsPathRooted(normalizedFilePath) || normalizedFilePath.Contains('\\'))
            {
                normalizedFilePath = $"/uploads/notes/{targetNoteId}/{att.FileName}";
            }

            var existing = await _context.NoteAttachments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == att.Id);
            if (existing != null)
            {
                existing.NoteId = targetNoteId;
                existing.FileName = att.FileName;
                existing.FilePath = normalizedFilePath;
                existing.FileSize = att.FileSize;
                existing.ContentType = att.ContentType;
                existing.FileExtension = att.FileExtension;
                existing.UploadedByUserId = resolvedUploaderId;
                existing.UploadedAt = att.UploadedAt != default ? att.UploadedAt : DateTimeOffset.UtcNow;
            }
            else
            {
                var attIdTaken = await _context.NoteAttachments.IgnoreQueryFilters().AnyAsync(x => x.Id == att.Id);
                var newAtt = new NoteAttachment
                {
                    NoteId = targetNoteId,
                    FileName = att.FileName,
                    FilePath = normalizedFilePath,
                    FileSize = att.FileSize,
                    ContentType = att.ContentType,
                    FileExtension = att.FileExtension,
                    UploadedByUserId = resolvedUploaderId,
                    UploadedAt = att.UploadedAt != default ? att.UploadedAt : DateTimeOffset.UtcNow
                };

                if (!attIdTaken)
                {
                    newAtt.Id = att.Id;
                }

                _context.NoteAttachments.Add(newAtt);
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 10. Merge UserBadges (Gamifikasi Lencana Pengguna)
        var allLocalBadges = await _context.MasterBadges.IgnoreQueryFilters().ToListAsync();
        var badgeCodeLookup = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var badgeIdLookup = new Dictionary<int, int>();
        foreach (var b in allLocalBadges)
        {
            badgeIdLookup[b.Id] = b.Id;
            if (!string.IsNullOrEmpty(b.Code)) badgeCodeLookup[b.Code] = b.Id;
        }

        foreach (var ub in data.UserBadges)
        {
            var resolvedUserId = (!string.IsNullOrEmpty(ub.UserId) && userLookup.TryGetValue(ub.UserId, out var uid))
                ? uid
                : (defaultFallbackUserId ?? ub.UserId);

            var resolvedBadgeId = ub.BadgeId;
            if (!string.IsNullOrEmpty(ub.BadgeCode) && badgeCodeLookup.TryGetValue(ub.BadgeCode, out var bId))
            {
                resolvedBadgeId = bId;
            }
            else if (badgeIdLookup.TryGetValue(ub.BadgeId, out var bId2))
            {
                resolvedBadgeId = bId2;
            }

            var badgeExists = allLocalBadges.Any(x => x.Id == resolvedBadgeId);
            var userExists = allUsers.Any(x => x.Id == resolvedUserId);
            if (!badgeExists || !userExists) continue;

            var existing = await _context.UserBadges.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == ub.Id || (x.UserId == resolvedUserId && x.BadgeId == resolvedBadgeId));

            if (existing != null)
            {
                existing.UserId = resolvedUserId;
                existing.BadgeId = resolvedBadgeId;
                existing.UnlockedAt = ub.UnlockedAt;
                existing.IsFeatured = ub.IsFeatured;
                existing.AwardedBy = ub.AwardedBy;
            }
            else
            {
                _context.UserBadges.Add(new UserBadge
                {
                    Id = ub.Id,
                    UserId = resolvedUserId,
                    BadgeId = resolvedBadgeId,
                    UnlockedAt = ub.UnlockedAt,
                    IsFeatured = ub.IsFeatured,
                    AwardedBy = ub.AwardedBy
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 11. Merge DailyCheckIns (Gamifikasi Presensi & Streak Harian)
        foreach (var dc in data.DailyCheckIns)
        {
            var resolvedUserId = (!string.IsNullOrEmpty(dc.UserId) && userLookup.TryGetValue(dc.UserId, out var uid))
                ? uid
                : (defaultFallbackUserId ?? dc.UserId);

            var userExists = allUsers.Any(x => x.Id == resolvedUserId);
            if (!userExists) continue;

            var existing = await _context.DailyCheckIns.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.Id == dc.Id || (x.UserId == resolvedUserId && x.CheckInDate == dc.CheckInDate));

            if (existing != null)
            {
                existing.UserId = resolvedUserId;
                existing.CheckInDate = dc.CheckInDate;
                existing.CheckInTime = dc.CheckInTime;
                existing.PointsEarned = dc.PointsEarned;
                existing.StreakDay = dc.StreakDay;
                existing.IsMonthlyMilestone = dc.IsMonthlyMilestone;
                existing.Notes = dc.Notes;
            }
            else
            {
                _context.DailyCheckIns.Add(new DailyCheckIn
                {
                    Id = dc.Id,
                    UserId = resolvedUserId,
                    CheckInDate = dc.CheckInDate,
                    CheckInTime = dc.CheckInTime,
                    PointsEarned = dc.PointsEarned,
                    StreakDay = dc.StreakDay,
                    IsMonthlyMilestone = dc.IsMonthlyMilestone,
                    Notes = dc.Notes
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 12. Merge RewardClaims (Gamifikasi Penukaran Poin)
        var allLocalRewards = await _context.RewardItems.IgnoreQueryFilters().ToListAsync();
        var rewardItemLookup = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in allLocalRewards)
        {
            if (!string.IsNullOrEmpty(r.Name)) rewardItemLookup[r.Name] = r.Id;
        }

        foreach (var rc in data.RewardClaims)
        {
            var resolvedUserId = (!string.IsNullOrEmpty(rc.UserId) && userLookup.TryGetValue(rc.UserId, out var uid))
                ? uid
                : (defaultFallbackUserId ?? rc.UserId);

            var resolvedItemId = rc.RewardItemId;
            if (!string.IsNullOrEmpty(rc.RewardItemName) && rewardItemLookup.TryGetValue(rc.RewardItemName, out var rId))
            {
                resolvedItemId = rId;
            }

            var itemExists = allLocalRewards.Any(x => x.Id == resolvedItemId);
            var userExists = allUsers.Any(x => x.Id == resolvedUserId);
            if (!itemExists || !userExists) continue;

            var resolvedProcessorId = (!string.IsNullOrEmpty(rc.ProcessedByUserId) && userLookup.TryGetValue(rc.ProcessedByUserId, out var pUid))
                ? pUid
                : rc.ProcessedByUserId;

            var existing = await _context.RewardClaims.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == rc.Id);
            if (existing != null)
            {
                existing.UserId = resolvedUserId;
                existing.RewardItemId = resolvedItemId;
                existing.PointsSpent = rc.PointsSpent;
                existing.Status = rc.Status;
                existing.ClaimedAt = rc.ClaimedAt;
                existing.ProcessedAt = rc.ProcessedAt;
                existing.ProcessedByUserId = resolvedProcessorId;
                existing.AdminNotes = rc.AdminNotes;
            }
            else
            {
                _context.RewardClaims.Add(new RewardClaim
                {
                    Id = rc.Id,
                    UserId = resolvedUserId,
                    RewardItemId = resolvedItemId,
                    PointsSpent = rc.PointsSpent,
                    Status = rc.Status,
                    ClaimedAt = rc.ClaimedAt,
                    ProcessedAt = rc.ProcessedAt,
                    ProcessedByUserId = resolvedProcessorId,
                    AdminNotes = rc.AdminNotes
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 13. Merge Announcements (Papan Pengumuman & Buletin)
        foreach (var a in data.Announcements)
        {
            var resolvedCompanyId = a.CompanyId.HasValue && companyIdLookup.TryGetValue(a.CompanyId.Value, out var acId)
                ? acId
                : (a.CompanyId ?? defaultCompanyId);

            var resolvedAuthorId = (!string.IsNullOrEmpty(a.CreatedByUserId) && userLookup.TryGetValue(a.CreatedByUserId, out var aUid))
                ? aUid
                : (defaultFallbackUserId ?? a.CreatedByUserId);

            var existing = await _context.Announcements.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == a.Id);
            if (existing != null)
            {
                existing.Title = a.Title;
                existing.Content = a.Content;
                existing.Type = a.Type;
                existing.StartDate = a.StartDate;
                existing.EndDate = a.EndDate;
                existing.IsActive = a.IsActive;
                existing.CompanyId = resolvedCompanyId;
                existing.CreatedByUserId = resolvedAuthorId;
                existing.UpdatedAt = a.UpdatedAt;
            }
            else
            {
                _context.Announcements.Add(new Announcement
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    Type = a.Type,
                    StartDate = a.StartDate,
                    EndDate = a.EndDate,
                    IsActive = a.IsActive,
                    CompanyId = resolvedCompanyId,
                    CreatedByUserId = resolvedAuthorId,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        return totalMerged;
    }

    private HttpClient CreateHttpClient(string? apiKey, bool allowUntrustedSsl = false)
    {
        HttpClient client;
        if (allowUntrustedSsl)
        {
            var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true
            };
            client = new HttpClient(handler);
        }
        else
        {
            client = _httpClientFactory?.CreateClient("SyncClient") ?? new HttpClient();
        }

        client.Timeout = TimeSpan.FromMinutes(10);
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            var trimmedKey = apiKey.Trim();

            // 1. Primary Header yang dibutuhkan Host (X-Sync-ApiKey)
            client.DefaultRequestHeaders.Remove("X-Sync-ApiKey");
            client.DefaultRequestHeaders.Add("X-Sync-ApiKey", trimmedKey);

            // 2. Secondary Standard Header (X-Sync-Key)
            client.DefaultRequestHeaders.Remove("X-Sync-Key");
            client.DefaultRequestHeaders.Add("X-Sync-Key", trimmedKey);

            // 3. Alternative Headers
            client.DefaultRequestHeaders.Remove("X-Api-Key");
            client.DefaultRequestHeaders.Add("X-Api-Key", trimmedKey);

            client.DefaultRequestHeaders.Remove("ApiKey");
            client.DefaultRequestHeaders.Add("ApiKey", trimmedKey);

            client.DefaultRequestHeaders.Remove("ApiSecretKey");
            client.DefaultRequestHeaders.Add("ApiSecretKey", trimmedKey);

            // 4. Bearer Token jika format JWT
            if (trimmedKey.StartsWith("ey", StringComparison.OrdinalIgnoreCase))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", trimmedKey);
            }
        }
        return client;
    }

    public string GenerateSqlScript(SyncDatabaseData data)
    {
        var isPostgres = _context.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true
                      || _context.Database.ProviderName?.Contains("Postgre", StringComparison.OrdinalIgnoreCase) == true;

        var sb = new StringBuilder();
        sb.AppendLine("-- =============================================================================");
        sb.AppendLine($"-- TrackerKerja Modern Database Sync Script ({(isPostgres ? "PostgreSQL Dialect" : "SQLite / Standard Dialect")})");
        sb.AppendLine($"-- Generated At: {DateTimeOffset.UtcNow:O}");
        sb.AppendLine("-- =============================================================================");
        sb.AppendLine();

        // 1. Companies
        if (data.Companies.Count > 0)
        {
            sb.AppendLine("-- 1. Companies");
            foreach (var c in data.Companies)
            {
                AppendUpsert(
                    sb,
                    "companies",
                    "id, name, code, description, address, contact_email, created_at",
                    $"{c.Id}, {SqlEscape(c.Name)}, {SqlEscape(c.Code)}, {SqlEscape(c.Description)}, {SqlEscape(c.Address)}, {SqlEscape(c.ContactEmail)}, {SqlDate(c.CreatedAt)}",
                    new[] { "name", "code", "description", "address", "contact_email", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 2. Users (asp_net_users)
        if (data.Users.Count > 0)
        {
            sb.AppendLine("-- 2. Users");
            foreach (var u in data.Users)
            {
                AppendUpsert(
                    sb,
                    "asp_net_users",
                    "id, user_name, normalized_user_name, email, normalized_email, email_confirmed, password_hash, security_stamp, concurrency_stamp, phone_number, full_name, job_title, avatar_color, profile_picture_url, cover_picture_url, company_id, is_approved, approved_at, approved_by_user_id, created_at",
                    $"{SqlEscape(u.Id)}, {SqlEscape(u.UserName)}, {SqlEscape(u.NormalizedUserName)}, {SqlEscape(u.Email)}, {SqlEscape(u.NormalizedEmail)}, {SqlBool(u.EmailConfirmed, isPostgres)}, {SqlEscape(u.PasswordHash)}, {SqlEscape(u.SecurityStamp)}, {SqlEscape(u.ConcurrencyStamp)}, {SqlEscape(u.PhoneNumber)}, {SqlEscape(u.FullName)}, {SqlEscape(u.JobTitle)}, {SqlEscape(u.AvatarColor)}, {SqlEscape(u.ProfilePictureUrl)}, {SqlEscape(u.CoverPictureUrl)}, {SqlNullableInt(u.CompanyId)}, {SqlBool(u.IsApproved, isPostgres)}, {SqlDate(u.ApprovedAt)}, {SqlEscape(u.ApprovedByUserId)}, {SqlDate(u.CreatedAt)}",
                    new[] { "user_name", "normalized_user_name", "email", "normalized_email", "email_confirmed", "password_hash", "security_stamp", "concurrency_stamp", "phone_number", "full_name", "job_title", "avatar_color", "profile_picture_url", "cover_picture_url", "company_id", "is_approved", "approved_at", "approved_by_user_id", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 3. Categories
        if (data.Categories.Count > 0)
        {
            sb.AppendLine("-- 3. Categories");
            foreach (var cat in data.Categories)
            {
                AppendUpsert(
                    sb,
                    "categories",
                    "id, name, color, description, created_at",
                    $"{cat.Id}, {SqlEscape(cat.Name)}, {SqlEscape(cat.Color)}, {SqlEscape(cat.Description)}, {SqlDate(cat.CreatedAt)}",
                    new[] { "name", "color", "description", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 4. MasterPriorities
        if (data.MasterPriorities.Count > 0)
        {
            sb.AppendLine("-- 4. Master Priorities");
            foreach (var p in data.MasterPriorities)
            {
                AppendUpsert(
                    sb,
                    "master_priorities",
                    "id, name, color, icon, order_index, description, is_default",
                    $"{p.Id}, {SqlEscape(p.Name)}, {SqlEscape(p.Color)}, {SqlEscape(p.Icon)}, {p.OrderIndex}, {SqlEscape(p.Description)}, {SqlBool(p.IsDefault, isPostgres)}",
                    new[] { "name", "color", "icon", "order_index", "description", "is_default" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 5. MasterStatuses
        if (data.MasterStatuses.Count > 0)
        {
            sb.AppendLine("-- 5. Master Statuses");
            foreach (var s in data.MasterStatuses)
            {
                AppendUpsert(
                    sb,
                    "master_statuses",
                    "id, name, color, is_done_state, order_index, description, is_default",
                    $"{s.Id}, {SqlEscape(s.Name)}, {SqlEscape(s.Color)}, {SqlBool(s.IsDoneState, isPostgres)}, {s.OrderIndex}, {SqlEscape(s.Description)}, {SqlBool(s.IsDefault, isPostgres)}",
                    new[] { "name", "color", "is_done_state", "order_index", "description", "is_default" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 6. MasterMilestones
        if (data.MasterMilestones.Count > 0)
        {
            sb.AppendLine("-- 6. Master Milestones");
            foreach (var m in data.MasterMilestones)
            {
                AppendUpsert(
                    sb,
                    "master_milestones",
                    "id, name, phase, color, icon, order_index, description, is_default",
                    $"{m.Id}, {SqlEscape(m.Name)}, {SqlEscape(m.Phase)}, {SqlEscape(m.Color)}, {SqlEscape(m.Icon)}, {m.OrderIndex}, {SqlEscape(m.Description)}, {SqlBool(m.IsDefault, isPostgres)}",
                    new[] { "name", "phase", "color", "icon", "order_index", "description", "is_default" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 6b. Master Badges
        if (data.MasterBadges.Count > 0)
        {
            sb.AppendLine("-- 6b. Master Badges");
            foreach (var b in data.MasterBadges)
            {
                AppendUpsert(
                    sb,
                    "master_badges",
                    "id, code, name, description, category, icon, color, points, rarity, trigger_type, trigger_threshold, is_active, order_index, created_at",
                    $"{b.Id}, {SqlEscape(b.Code)}, {SqlEscape(b.Name)}, {SqlEscape(b.Description)}, {SqlEscape(b.Category)}, {SqlEscape(b.Icon)}, {SqlEscape(b.Color)}, {b.Points}, {(int)b.Rarity}, {b.TriggerType}, {b.TriggerThreshold}, {SqlBool(b.IsActive, isPostgres)}, {b.OrderIndex}, {SqlDate(b.CreatedAt)}",
                    new[] { "code", "name", "description", "category", "icon", "color", "points", "rarity", "trigger_type", "trigger_threshold", "is_active", "order_index", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 6c. Reward Items
        if (data.RewardItems.Count > 0)
        {
            sb.AppendLine("-- 6c. Reward Items");
            foreach (var r in data.RewardItems)
            {
                AppendUpsert(
                    sb,
                    "reward_items",
                    "id, name, description, point_cost, stock, category, image_url, icon, color, is_active, is_monthly_milestone_reward, order_index, created_at",
                    $"{r.Id}, {SqlEscape(r.Name)}, {SqlEscape(r.Description)}, {r.PointCost}, {r.Stock}, {SqlEscape(r.Category)}, {SqlEscape(r.ImageUrl)}, {SqlEscape(r.Icon)}, {SqlEscape(r.Color)}, {SqlBool(r.IsActive, isPostgres)}, {SqlBool(r.IsMonthlyMilestoneReward, isPostgres)}, {r.OrderIndex}, {SqlDate(r.CreatedAt)}",
                    new[] { "name", "description", "point_cost", "stock", "category", "image_url", "icon", "color", "is_active", "is_monthly_milestone_reward", "order_index", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 6d. Email Templates
        if (data.EmailTemplates.Count > 0)
        {
            sb.AppendLine("-- 6d. Email Templates");
            foreach (var e in data.EmailTemplates)
            {
                AppendUpsert(
                    sb,
                    "email_templates",
                    "id, event_code, event_name, category, subject, body_html, available_variables, is_active, updated_by_user_id, created_at, updated_at",
                    $"{e.Id}, {SqlEscape(e.EventCode)}, {SqlEscape(e.EventName)}, {SqlEscape(e.Category)}, {SqlEscape(e.Subject)}, {SqlEscape(e.BodyHtml)}, {SqlEscape(e.AvailableVariables)}, {SqlBool(e.IsActive, isPostgres)}, {SqlEscape(e.UpdatedByUserId)}, {SqlDate(e.CreatedAt)}, {SqlDate(e.UpdatedAt)}",
                    new[] { "event_code", "event_name", "category", "subject", "body_html", "available_variables", "is_active", "updated_by_user_id", "created_at", "updated_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 6e. System Settings
        if (data.SystemSettings.Count > 0)
        {
            sb.AppendLine("-- 6e. System Settings");
            foreach (var s in data.SystemSettings)
            {
                AppendUpsert(
                    sb,
                    "system_settings",
                    "key, value, description, updated_at",
                    $"{SqlEscape(s.Key)}, {SqlEscape(s.Value)}, {SqlEscape(s.Description)}, {SqlDate(s.UpdatedAt)}",
                    new[] { "value", "description", "updated_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 7. Projects
        if (data.Projects.Count > 0)
        {
            sb.AppendLine("-- 7. Projects");
            foreach (var prj in data.Projects)
            {
                AppendUpsert(
                    sb,
                    "projects",
                    "id, name, description, color, status, company_id, client_name, project_manager_id, budget, actual_cost, use_budget, tags, deadline, created_at",
                    $"{prj.Id}, {SqlEscape(prj.Name)}, {SqlEscape(prj.Description)}, {SqlEscape(prj.Color)}, {(int)prj.Status}, {SqlNullableInt(prj.CompanyId)}, {SqlEscape(prj.ClientName)}, {SqlEscape(prj.ProjectManagerId)}, {prj.Budget.ToString(System.Globalization.CultureInfo.InvariantCulture)}, {prj.ActualCost.ToString(System.Globalization.CultureInfo.InvariantCulture)}, {SqlBool(prj.UseBudget, isPostgres)}, {SqlEscape(prj.Tags)}, {SqlDate(prj.Deadline)}, {SqlDate(prj.CreatedAt)}",
                    new[] { "name", "description", "color", "status", "company_id", "client_name", "project_manager_id", "budget", "actual_cost", "use_budget", "tags", "deadline", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 8. Tasks
        if (data.Tasks.Count > 0)
        {
            sb.AppendLine("-- 8. Tasks");
            foreach (var t in data.Tasks)
            {
                AppendUpsert(
                    sb,
                    "tasks",
                    "id, title, description, priority, status, progress, milestone, obstacle, solution, tags, project_id, category_id, assigned_to_user_id, parent_task_id, company_id, start_date, due_date, created_at, updated_at",
                    $"{t.Id}, {SqlEscape(t.Title)}, {SqlEscape(t.Description)}, {(int)t.Priority}, {(int)t.Status}, {t.Progress}, {SqlEscape(t.Milestone)}, {SqlEscape(t.Obstacle)}, {SqlEscape(t.Solution)}, {SqlEscape(t.Tags)}, {SqlNullableInt(t.ProjectId)}, {SqlNullableInt(t.CategoryId)}, {SqlEscape(t.AssignedToUserId)}, {SqlNullableInt(t.ParentTaskId)}, {SqlNullableInt(t.CompanyId)}, {SqlDate(t.StartDate)}, {SqlDate(t.DueDate)}, {SqlDate(t.CreatedAt)}, {SqlDate(t.UpdatedAt)}",
                    new[] { "title", "description", "priority", "status", "progress", "milestone", "obstacle", "solution", "tags", "project_id", "category_id", "assigned_to_user_id", "parent_task_id", "company_id", "start_date", "due_date", "created_at", "updated_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 9. Sessions
        if (data.Sessions.Count > 0)
        {
            sb.AppendLine("-- 9. Work Sessions");
            foreach (var s in data.Sessions)
            {
                AppendUpsert(
                    sb,
                    "sessions",
                    "id, task_id, user_id, start_time, end_time, duration, notes, created_at",
                    $"{s.Id}, {s.TaskId}, {SqlEscape(s.UserId)}, {SqlDate(s.StartTime)}, {SqlDate(s.EndTime)}, {s.Duration}, {SqlEscape(s.Notes)}, {SqlDate(s.CreatedAt)}",
                    new[] { "task_id", "user_id", "start_time", "end_time", "duration", "notes", "created_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 10. Attendances
        if (data.Attendances.Count > 0)
        {
            sb.AppendLine("-- 10. Attendance Records");
            foreach (var a in data.Attendances)
            {
                AppendUpsert(
                    sb,
                    "attendances",
                    "id, user_id, date, type, work_location, status, approved_by_user_id, clock_in, clock_out, total_hours, leave_reason, notes, created_at, updated_at",
                    $"{a.Id}, {SqlEscape(a.UserId)}, '{a.Date:yyyy-MM-dd}', {(int)a.Type}, {(int)a.WorkLocation}, {a.Status}, {SqlEscape(a.ApprovedByUserId)}, {SqlDate(a.ClockIn)}, {SqlDate(a.ClockOut)}, {a.TotalHours.ToString(System.Globalization.CultureInfo.InvariantCulture)}, {SqlEscape(a.LeaveReason)}, {SqlEscape(a.Notes)}, {SqlDate(a.CreatedAt)}, {SqlDate(a.UpdatedAt)}",
                    new[] { "user_id", "date", "type", "work_location", "status", "approved_by_user_id", "clock_in", "clock_out", "total_hours", "leave_reason", "notes", "created_at", "updated_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 11. Notes
        if (data.Notes.Count > 0)
        {
            sb.AppendLine("-- 11. Notes");
            foreach (var n in data.Notes)
            {
                AppendUpsert(
                    sb,
                    "notes",
                    "id, title, content_html, category, color, is_pinned, author_user_id, task_id, company_id, created_at, updated_at",
                    $"{n.Id}, {SqlEscape(n.Title)}, {SqlEscape(n.ContentHtml)}, {SqlEscape(n.Category)}, {SqlEscape(n.Color)}, {SqlBool(n.IsPinned, isPostgres)}, {SqlEscape(n.AuthorUserId)}, {SqlNullableInt(n.TaskId)}, {SqlNullableInt(n.CompanyId)}, {SqlDate(n.CreatedAt)}, {SqlDate(n.UpdatedAt)}",
                    new[] { "title", "content_html", "category", "color", "is_pinned", "author_user_id", "task_id", "company_id", "created_at", "updated_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 12. NoteAttachments
        if (data.NoteAttachments.Count > 0)
        {
            sb.AppendLine("-- 12. Note Attachments");
            foreach (var att in data.NoteAttachments)
            {
                AppendUpsert(
                    sb,
                    "note_attachments",
                    "id, note_id, file_name, file_path, file_size, content_type, file_extension, uploaded_by_user_id, uploaded_at",
                    $"{att.Id}, {att.NoteId}, {SqlEscape(att.FileName)}, {SqlEscape(att.FilePath)}, {att.FileSize}, {SqlEscape(att.ContentType)}, {SqlEscape(att.FileExtension)}, {SqlEscape(att.UploadedByUserId)}, {SqlDate(att.UploadedAt)}",
                    new[] { "note_id", "file_name", "file_path", "file_size", "content_type", "file_extension", "uploaded_by_user_id", "uploaded_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 13. User Badges
        if (data.UserBadges.Count > 0)
        {
            sb.AppendLine("-- 13. User Badges");
            foreach (var ub in data.UserBadges)
            {
                AppendUpsert(
                    sb,
                    "user_badges",
                    "id, user_id, badge_id, unlocked_at, is_featured, awarded_by",
                    $"{ub.Id}, {SqlEscape(ub.UserId)}, {ub.BadgeId}, {SqlDate(ub.UnlockedAt)}, {SqlBool(ub.IsFeatured, isPostgres)}, {SqlEscape(ub.AwardedBy)}",
                    new[] { "user_id", "badge_id", "unlocked_at", "is_featured", "awarded_by" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 14. Daily Check-ins
        if (data.DailyCheckIns.Count > 0)
        {
            sb.AppendLine("-- 14. Daily Check-Ins");
            foreach (var dc in data.DailyCheckIns)
            {
                AppendUpsert(
                    sb,
                    "daily_check_ins",
                    "id, user_id, check_in_date, check_in_time, points_earned, streak_day, is_monthly_milestone, notes",
                    $"{dc.Id}, {SqlEscape(dc.UserId)}, '{dc.CheckInDate:yyyy-MM-dd}', {SqlDate(dc.CheckInTime)}, {dc.PointsEarned}, {dc.StreakDay}, {SqlBool(dc.IsMonthlyMilestone, isPostgres)}, {SqlEscape(dc.Notes)}",
                    new[] { "user_id", "check_in_date", "check_in_time", "points_earned", "streak_day", "is_monthly_milestone", "notes" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 15. Reward Claims
        if (data.RewardClaims.Count > 0)
        {
            sb.AppendLine("-- 15. Reward Claims");
            foreach (var rc in data.RewardClaims)
            {
                AppendUpsert(
                    sb,
                    "reward_claims",
                    "id, user_id, reward_item_id, points_spent, status, claimed_at, processed_at, processed_by_user_id, admin_notes",
                    $"{rc.Id}, {SqlEscape(rc.UserId)}, {rc.RewardItemId}, {rc.PointsSpent}, {(int)rc.Status}, {SqlDate(rc.ClaimedAt)}, {SqlDate(rc.ProcessedAt)}, {SqlEscape(rc.ProcessedByUserId)}, {SqlEscape(rc.AdminNotes)}",
                    new[] { "user_id", "reward_item_id", "points_spent", "status", "claimed_at", "processed_at", "processed_by_user_id", "admin_notes" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        // 16. Announcements
        if (data.Announcements.Count > 0)
        {
            sb.AppendLine("-- 16. Announcements");
            foreach (var a in data.Announcements)
            {
                AppendUpsert(
                    sb,
                    "announcements",
                    "id, title, content, type, start_date, end_date, is_active, company_id, created_by_user_id, created_at, updated_at",
                    $"{a.Id}, {SqlEscape(a.Title)}, {SqlEscape(a.Content)}, {SqlEscape(a.Type)}, {SqlDate(a.StartDate)}, {SqlDate(a.EndDate)}, {SqlBool(a.IsActive, isPostgres)}, {SqlNullableInt(a.CompanyId)}, {SqlEscape(a.CreatedByUserId)}, {SqlDate(a.CreatedAt)}, {SqlDate(a.UpdatedAt)}",
                    new[] { "title", "content", "type", "start_date", "end_date", "is_active", "company_id", "created_by_user_id", "updated_at" },
                    isPostgres);
            }
            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static void AppendUpsert(
        StringBuilder sb,
        string table,
        string columns,
        string values,
        string[] updateColumns,
        bool isPostgres)
    {
        if (isPostgres)
        {
            var conflictTarget = table.Equals("system_settings", StringComparison.OrdinalIgnoreCase) ? "key" : "id";
            var updateSet = string.Join(", ", updateColumns.Select(c => $"{c} = EXCLUDED.{c}"));
            sb.AppendLine($"INSERT INTO {table} ({columns}) VALUES ({values}) ON CONFLICT ({conflictTarget}) DO UPDATE SET {updateSet};");
        }
        else
        {
            sb.AppendLine($"INSERT OR REPLACE INTO {table} ({columns}) VALUES ({values});");
        }
    }

    private async Task<List<string>> GetCandidateApiKeysAsync(string? requestedKey)
    {
        var candidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(requestedKey))
        {
            candidates.Add(requestedKey.Trim());
        }

        if (_context != null)
        {
            try
            {
                var dbSettings = await _context.SystemSettings
                    .Where(s => s.Key == "Sync_ApiKey" || s.Key == "HostSync_ApiKey" || s.Key == "Sync_HostSecret" || s.Key == "SyncApiKey" || s.Key == "SyncSettings:ApiKey")
                    .Select(s => s.Value)
                    .ToListAsync();

                foreach (var val in dbSettings)
                {
                    if (!string.IsNullOrWhiteSpace(val) && !candidates.Contains(val.Trim()))
                    {
                        candidates.Add(val.Trim());
                    }
                }
            }
            catch
            {
                // In case table not yet migrated
            }
        }

        var wellKnown = new[]
        {
            "TK-SYNC-TNEBGVH4EEVMPCQ9",
            "TK-SYNC-VUBKJ5PNX3PHI1WX",
            "TRACKERKERJA_SYNC_SECRET_DEFAULT_2026"
        };
        foreach (var k in wellKnown)
        {
            if (!candidates.Contains(k))
            {
                candidates.Add(k);
            }
        }

        return candidates;
    }

    private async Task PersistWorkingSyncKeyAsync(string hostUrl, string workingKey)
    {
        if (_context == null) return;
        try
        {
            var settingApiKey = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "HostSync_ApiKey" || s.Key == "Sync_ApiKey");
            if (settingApiKey != null)
            {
                settingApiKey.Value = workingKey;
                settingApiKey.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    Key = "HostSync_ApiKey",
                    Value = workingKey,
                    Description = "Kunci otorisasi sinkronisasi host induk aktif",
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }

            var settingTargetUrl = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "HostSync_TargetUrl" || s.Key == "GlobalBaseUrl");
            if (settingTargetUrl != null)
            {
                settingTargetUrl.Value = hostUrl;
                settingTargetUrl.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    Key = "HostSync_TargetUrl",
                    Value = hostUrl,
                    Description = "Target URL Host Induk untuk sinkronisasi",
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Could not auto-persist working sync key");
        }
    }

    private static string? SanitizeAndTranslateSqlStatement(string rawStmt, bool isPostgres)
    {
        var stmt = rawStmt.Trim();
        if (string.IsNullOrWhiteSpace(stmt)) return null;

        // Skip comments
        if (stmt.StartsWith("--")) return null;

        // Skip PRAGMA (SQLite specific)
        if (stmt.StartsWith("PRAGMA ", StringComparison.OrdinalIgnoreCase)) return null;

        // Skip standalone transaction boundaries (handled by EF Core)
        if (stmt.Equals("BEGIN TRANSACTION;", StringComparison.OrdinalIgnoreCase) ||
            stmt.Equals("BEGIN;", StringComparison.OrdinalIgnoreCase) ||
            stmt.Equals("COMMIT;", StringComparison.OrdinalIgnoreCase) ||
            stmt.Equals("COMMIT TRANSACTION;", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // Skip SQLite DDL when target is PostgreSQL (schema is managed by EF Core)
        if (isPostgres && (stmt.StartsWith("CREATE TABLE", StringComparison.OrdinalIgnoreCase) ||
                          stmt.StartsWith("DROP TABLE", StringComparison.OrdinalIgnoreCase)))
        {
            return null;
        }

        if (isPostgres)
        {
            // Convert SQLite 'INSERT [OR REPLACE / OR IGNORE] INTO <table> (<columns>) VALUES (<values>);' to PostgreSQL UPSERT
            var match = System.Text.RegularExpressions.Regex.Match(
                stmt,
                @"^INSERT\s+(?:OR\s+REPLACE\s+|OR\s+IGNORE\s+)?INTO\s+[""`]?([a-zA-Z0-9_]+)[""`]?\s*\((.*?)\)\s*VALUES\s*\((.*?)\)\s*;?$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);

            if (match.Success)
            {
                var tableRaw = match.Groups[1].Value.Trim();
                var columnsRaw = match.Groups[2].Value.Trim();
                var valuesRaw = match.Groups[3].Value.Trim();

                var table = ToPostgresTableName(tableRaw);
                var rawCols = columnsRaw.Split(',').Select(c => c.Trim().Trim('"', '`', '\'', '[', ']')).ToList();
                var snakeCols = rawCols.Select(ToSnakeCase).ToList();
                var joinedSnakeCols = string.Join(", ", snakeCols.Select(c => $"\"{c}\""));

                string conflictTarget;
                if (table.Equals("system_settings", StringComparison.OrdinalIgnoreCase))
                {
                    conflictTarget = "\"key\"";
                }
                else if (table.Equals("asp_net_user_roles", StringComparison.OrdinalIgnoreCase))
                {
                    conflictTarget = "\"user_id\", \"role_id\"";
                }
                else if (table.Equals("user_announcement_reads", StringComparison.OrdinalIgnoreCase))
                {
                    conflictTarget = "\"announcement_id\", \"user_id\"";
                }
                else if (snakeCols.Contains("id"))
                {
                    conflictTarget = "\"id\"";
                }
                else
                {
                    conflictTarget = "";
                }

                if (!string.IsNullOrEmpty(conflictTarget))
                {
                    var nonPkCols = snakeCols.Where(c => !conflictTarget.Contains($"\"{c}\"")).ToList();
                    if (nonPkCols.Count > 0)
                    {
                        var updateSet = string.Join(", ", nonPkCols.Select(c => $"\"{c}\" = EXCLUDED.\"{c}\""));
                        stmt = $"INSERT INTO \"{table}\" ({joinedSnakeCols}) VALUES ({valuesRaw}) ON CONFLICT ({conflictTarget}) DO UPDATE SET {updateSet};";
                    }
                    else
                    {
                        stmt = $"INSERT INTO \"{table}\" ({joinedSnakeCols}) VALUES ({valuesRaw}) ON CONFLICT ({conflictTarget}) DO NOTHING;";
                    }
                }
                else
                {
                    stmt = $"INSERT INTO \"{table}\" ({joinedSnakeCols}) VALUES ({valuesRaw}) ON CONFLICT DO NOTHING;";
                }
            }
        }

        return stmt;
    }

    private static string ToPostgresTableName(string rawTable)
    {
        var clean = rawTable.Trim().Trim('"', '`', '\'', '[', ']');
        return clean.ToLowerInvariant() switch
        {
            "announcements" => "announcements",
            "aspnetroles" => "asp_net_roles",
            "aspnetuserroles" => "asp_net_user_roles",
            "aspnetusers" => "asp_net_users",
            "attendances" => "attendances",
            "auditlogs" => "audit_logs",
            "categories" => "categories",
            "companies" => "companies",
            "dailycheckins" => "daily_check_ins",
            "emailtemplates" => "email_templates",
            "importlogs" => "import_logs",
            "jsonhistories" => "json_histories",
            "masterbadges" => "master_badges",
            "mastermilestones" => "master_milestones",
            "masterpriorities" => "master_priorities",
            "masterstatuses" => "master_statuses",
            "noteattachments" => "note_attachments",
            "notes" => "notes",
            "projects" => "projects",
            "rewardclaims" => "reward_claims",
            "rewarditems" => "reward_items",
            "sessions" => "sessions",
            "sqlhistories" => "sql_histories",
            "systemsettings" => "system_settings",
            "tasks" => "tasks",
            "userbadges" => "user_badges",
            "userannouncementreads" => "user_announcement_reads",
            "userrefreshtokens" => "user_refresh_tokens",
            "userbadgesnapshots" => "user_badge_snapshots",
            _ => ToSnakeCase(clean)
        };
    }

    private static string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        var clean = input.Trim().Trim('"', '`', '\'', '[', ']');
        var sb = new StringBuilder();
        for (var i = 0; i < clean.Length; i++)
        {
            var c = clean[i];
            if (char.IsUpper(c))
            {
                if (i > 0 && clean[i - 1] != '_' && (char.IsLower(clean[i - 1]) || (i + 1 < clean.Length && char.IsLower(clean[i + 1]))))
                {
                    sb.Append('_');
                }
                sb.Append(char.ToLowerInvariant(c));
            }
            else
            {
                sb.Append(c);
            }
        }
        return sb.ToString();
    }

    private async Task UpdatePostgresSequencesAsync()
    {
        var tables = new[]
        {
            "companies", "categories", "master_priorities", "master_statuses",
            "master_milestones", "projects", "tasks", "sessions", "attendances",
            "notes", "note_attachments", "sync_histories"
        };

        foreach (var tbl in tables)
        {
            try
            {
                var sql = $"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1), true);";
                await _context.Database.ExecuteSqlRawAsync(sql);
            }
            catch
            {
                // Sequence might not exist or be named differently, safely ignore
            }
        }
    }

    private static List<string> SplitSqlStatements(string sql)
    {
        var list = new List<string>();
        var lines = sql.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        var sb = new StringBuilder();
        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (line.StartsWith("--") || string.IsNullOrWhiteSpace(line)) continue;
            sb.AppendLine(rawLine);
            if (line.EndsWith(";"))
            {
                var stmt = sb.ToString().Trim();
                if (!string.IsNullOrEmpty(stmt))
                {
                    list.Add(stmt);
                }
                sb.Clear();
            }
        }
        if (sb.Length > 0)
        {
            var remaining = sb.ToString().Trim();
            if (!string.IsNullOrEmpty(remaining)) list.Add(remaining);
        }
        return list;
    }

    private static string SqlEscape(string? val) => val == null ? "NULL" : $"'{val.Replace("'", "''")}'";
    private static string SqlDate(DateTimeOffset? dt) => dt == null ? "NULL" : $"'{dt.Value:O}'";
    private static string SqlBool(bool val, bool isPostgres = false) => isPostgres ? (val ? "TRUE" : "FALSE") : (val ? "1" : "0");
    private static string SqlNullableInt(int? val) => val.HasValue ? val.Value.ToString() : "NULL";

    private static long CalculateDirectorySize(string directoryPath)
    {
        if (!Directory.Exists(directoryPath)) return 0;
        try
        {
            return Directory.GetFiles(directoryPath, "*.*", SearchOption.AllDirectories)
                .Sum(file => new FileInfo(file).Length);
        }
        catch
        {
            return 0;
        }
    }

    private void ConsolidateLocalUploads()
    {
        try
        {
            if (!Directory.Exists(_uploadBasePath))
            {
                Directory.CreateDirectory(_uploadBasePath);
            }

            var candidateSources = new List<string>();

            // 1. Check wwwroot/uploads relative to _uploadBasePath
            var wwwrootUploads = Path.GetFullPath(Path.Combine(_uploadBasePath, "..", "wwwroot", "uploads"));
            if (Directory.Exists(wwwrootUploads) && !wwwrootUploads.Equals(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
            {
                candidateSources.Add(wwwrootUploads);
            }

            // 2. Check AppDomain based wwwroot/uploads
            var baseDirWwwrootUploads = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "uploads"));
            if (Directory.Exists(baseDirWwwrootUploads) && !baseDirWwwrootUploads.Equals(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
            {
                candidateSources.Add(baseDirWwwrootUploads);
            }

            // 3. Search directory parents (up to 6 levels) for frontend/public/uploads, root uploads, etc.
            var currentDir = new DirectoryInfo(_uploadBasePath);
            for (int i = 0; i < 6 && currentDir != null; i++)
            {
                var potentialFrontend = Path.Combine(currentDir.FullName, "frontend", "public", "uploads");
                if (Directory.Exists(potentialFrontend) && !potentialFrontend.Equals(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
                {
                    candidateSources.Add(Path.GetFullPath(potentialFrontend));
                }

                var potentialRootUploads = Path.Combine(currentDir.FullName, "uploads");
                if (Directory.Exists(potentialRootUploads) && !potentialRootUploads.Equals(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
                {
                    candidateSources.Add(Path.GetFullPath(potentialRootUploads));
                }

                currentDir = currentDir.Parent;
            }

            foreach (var sourceDir in candidateSources.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (!Directory.Exists(sourceDir)) continue;

                var files = Directory.GetFiles(sourceDir, "*.*", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    try
                    {
                        var rel = Path.GetRelativePath(sourceDir, file);
                        var targetFile = Path.Combine(_uploadBasePath, rel);

                        var targetDir = Path.GetDirectoryName(targetFile);
                        if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
                        {
                            Directory.CreateDirectory(targetDir);
                        }

                        if (!File.Exists(targetFile) || new FileInfo(file).Length != new FileInfo(targetFile).Length)
                        {
                            File.Copy(file, targetFile, overwrite: true);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogDebug(ex, "Could not consolidate file: {File}", file);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "ConsolidateLocalUploads encountered an error");
        }
    }

    private void MirrorExtractedFile(string relPath, string sourceFilePath)
    {
        try
        {
            if (!File.Exists(sourceFilePath)) return;

            var targetRoots = new List<string>();

            // 1. wwwroot/uploads relative to _uploadBasePath
            var wwwrootUploads = Path.GetFullPath(Path.Combine(_uploadBasePath, "..", "wwwroot", "uploads"));
            targetRoots.Add(wwwrootUploads);

            // 2. AppDomain based wwwroot/uploads
            var baseDirWwwrootUploads = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "uploads"));
            targetRoots.Add(baseDirWwwrootUploads);

            // 3. Search directory parents (up to 6 levels) for frontend/public/uploads and root uploads
            var currentDir = new DirectoryInfo(_uploadBasePath);
            for (int i = 0; i < 6 && currentDir != null; i++)
            {
                var potentialFrontend = Path.Combine(currentDir.FullName, "frontend", "public", "uploads");
                targetRoots.Add(Path.GetFullPath(potentialFrontend));

                var potentialRootUploads = Path.Combine(currentDir.FullName, "uploads");
                targetRoots.Add(Path.GetFullPath(potentialRootUploads));

                currentDir = currentDir.Parent;
            }

            foreach (var targetRoot in targetRoots.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                try
                {
                    var targetFile = Path.GetFullPath(Path.Combine(targetRoot, relPath));
                    if (targetFile.Equals(sourceFilePath, StringComparison.OrdinalIgnoreCase)) continue;

                    var parentDir = Directory.GetParent(targetRoot)?.FullName;
                    if (parentDir != null && (Directory.Exists(targetRoot) || Directory.Exists(parentDir)))
                    {
                        var targetDir = Path.GetDirectoryName(targetFile);
                        if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
                        {
                            Directory.CreateDirectory(targetDir);
                        }
                        File.Copy(sourceFilePath, targetFile, overwrite: true);
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogDebug(ex, "Could not mirror extracted file to {Root}", targetRoot);
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "MirrorExtractedFile encountered an error for {RelPath}", relPath);
        }
    }

    private static bool IsContentEmpty(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return true;
        var trimmed = content.Trim();
        if (trimmed.Equals("<p></p>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<p><br></p>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<p><br/></p>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<p>&nbsp;</p>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<div></div>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<div><br></div>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<br>", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("<br/>", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        var stripped = System.Text.RegularExpressions.Regex.Replace(trimmed, "<.*?>", string.Empty);
        stripped = stripped.Replace("&nbsp;", " ").Trim();
        return string.IsNullOrWhiteSpace(stripped);
    }
}


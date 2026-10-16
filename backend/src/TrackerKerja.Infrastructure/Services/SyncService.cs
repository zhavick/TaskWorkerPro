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
            TotalUploadsSizeBytes = totalUploadsSize,
            Ready = true,
            ResponseLatencyMs = 0
        };
    }

    public async Task<SyncPingResponse> PingRemoteHostAsync(string hostUrl, string apiKey, bool allowUntrustedSsl = false)
    {
        var cleanUrl = hostUrl.TrimEnd('/');
        var client = CreateHttpClient(apiKey, allowUntrustedSsl);

        var stopwatch = Stopwatch.StartNew();
        var response = await client.GetAsync($"{cleanUrl}/api/sync/ping");
        stopwatch.Stop();

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Ping failed with status {response.StatusCode}: {errorBody}");
        }

        var result = await response.Content.ReadFromJsonAsync<SyncPingResponse>(JsonOptions);
        if (result == null)
        {
            throw new InvalidOperationException("Failed to parse ping response from host.");
        }

        return result with { ResponseLatencyMs = stopwatch.ElapsedMilliseconds };
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

            // 4. Add physical files if requested
            if (includeFiles && Directory.Exists(_uploadBasePath))
            {
                var files = Directory.GetFiles(_uploadBasePath, "*.*", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    var relativePath = Path.GetRelativePath(_uploadBasePath, file).Replace('\\', '/');
                    var entryName = $"uploads/{relativePath}";
                    var fileEntry = archive.CreateEntry(entryName, CompressionLevel.Optimal);

                    using var sourceStream = File.OpenRead(file);
                    using var targetStream = fileEntry.Open();
                    await sourceStream.CopyToAsync(targetStream);
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

            // Extract file attachments if present
            var extractedFilesCount = 0;
            foreach (var entry in archive.Entries)
            {
                if (entry.FullName.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(entry.Name))
                {
                    var relPath = entry.FullName.Substring("uploads/".Length);
                    var destinationPath = Path.GetFullPath(Path.Combine(_uploadBasePath, relPath));
                    var destinationDir = Path.GetDirectoryName(destinationPath);
                    if (!string.IsNullOrEmpty(destinationDir))
                    {
                        Directory.CreateDirectory(destinationDir);
                    }
                    entry.ExtractToFile(destinationPath, overwrite: true);
                    extractedFilesCount++;
                }
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
            var statements = SplitSqlStatements(sqlContent);
            var executedStatements = 0;

            if (_context.Database.IsRelational())
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    foreach (var stmt in statements)
                    {
                        if (string.IsNullOrWhiteSpace(stmt)) continue;
                        await _context.Database.ExecuteSqlRawAsync(stmt);
                        executedStatements++;
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
                executedStatements = statements.Count(s => !string.IsNullOrWhiteSpace(s));
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
                FilePath = a.FilePath,
                FileSize = a.FileSize,
                ContentType = a.ContentType,
                FileExtension = a.FileExtension,
                UploadedByUserId = a.UploadedByUserId,
                UploadedAt = a.UploadedAt
            }).ToListAsync();

        var data = new SyncDatabaseData
        {
            Companies = companies,
            Users = users,
            Categories = categories,
            MasterPriorities = priorities,
            MasterStatuses = statuses,
            MasterMilestones = milestones,
            Projects = projects,
            Tasks = tasks,
            Sessions = sessions,
            Attendances = attendances,
            Notes = notes,
            NoteAttachments = attachments
        };

        var entityCount = companies.Count + users.Count + categories.Count + priorities.Count +
                          statuses.Count + milestones.Count + projects.Count + tasks.Count +
                          sessions.Count + attendances.Count + notes.Count + attachments.Count;

        string? filesZipBase64 = null;
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
                    var entry = zip.CreateEntry(relPath, CompressionLevel.Optimal);
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
                "master_statuses", "master_milestones", "projects", "tasks",
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

                // Zip slip check
                foreach (var entry in archive.Entries)
                {
                    if (string.IsNullOrEmpty(entry.Name)) continue;
                    var dest = Path.GetFullPath(Path.Combine(_uploadBasePath, entry.FullName));
                    if (!dest.StartsWith(_uploadBasePath, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException($"Zip Slip detected: {entry.FullName}");
                    }
                    var dir = Path.GetDirectoryName(dest);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    entry.ExtractToFile(dest, overwrite: true);
                    extractedFiles++;
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
        var client = CreateHttpClient(request.ApiKey, request.AllowUntrustedSsl);

        var payload = await PrepareSyncPayloadAsync(request.IncludeFiles);
        var response = await client.PostAsJsonAsync($"{cleanUrl}/api/sync/receive", payload, JsonOptions);

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
        var client = CreateHttpClient(request.ApiKey, request.AllowUntrustedSsl);

        var response = await client.GetAsync($"{cleanUrl}/api/sync/export-package?includeFiles={request.IncludeFiles}");

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            var failMsg = $"Pull from host failed ({response.StatusCode}): {err}";

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

        using var zipStream = await response.Content.ReadAsStreamAsync();
        var importResult = await ImportPackageZipAsync(zipStream, triggeredByUserId);

        _context.SyncHistories.Add(new SyncHistory
        {
            Direction = SyncDirection.Pull,
            Status = importResult.Success ? SyncStatus.Success : SyncStatus.Failed,
            TargetHost = cleanUrl,
            TotalRecordsSynced = importResult.RecordsProcessed,
            FileSizeBytes = importResult.FileSizeBytes,
            SummaryJson = JsonSerializer.Serialize(new { importResult.RecordsProcessed, request.IncludeFiles }),
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
            var existing = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == u.Id);
            if (existing != null)
            {
                existing.FullName = u.FullName;
                existing.JobTitle = u.JobTitle;
                existing.AvatarColor = u.AvatarColor;
                existing.ProfilePictureUrl = u.ProfilePictureUrl;
                existing.CoverPictureUrl = u.CoverPictureUrl;
                existing.CompanyId = u.CompanyId;
                existing.IsApproved = u.IsApproved;
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
        await _context.SaveChangesAsync();

        // 4. Merge Projects
        foreach (var pr in data.Projects)
        {
            var existing = await _context.Projects.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == pr.Id);
            if (existing != null)
            {
                existing.Name = pr.Name;
                existing.Description = pr.Description;
                existing.Color = pr.Color;
                existing.Status = pr.Status;
                existing.CompanyId = pr.CompanyId;
                existing.ClientName = pr.ClientName;
                existing.ProjectManagerId = pr.ProjectManagerId;
                existing.Budget = pr.Budget;
                existing.ActualCost = pr.ActualCost;
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
                    CompanyId = pr.CompanyId,
                    ClientName = pr.ClientName,
                    ProjectManagerId = pr.ProjectManagerId,
                    Budget = pr.Budget,
                    ActualCost = pr.ActualCost,
                    Tags = pr.Tags,
                    Deadline = pr.Deadline,
                    CreatedAt = pr.CreatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 5. Merge Tasks
        foreach (var t in data.Tasks)
        {
            var existing = await _context.Tasks.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == t.Id);
            if (existing != null)
            {
                existing.Title = t.Title;
                existing.Description = t.Description;
                existing.Priority = t.Priority;
                existing.Status = t.Status;
                existing.Progress = t.Progress;
                existing.Milestone = t.Milestone;
                existing.Obstacle = t.Obstacle;
                existing.Solution = t.Solution;
                existing.ProjectId = t.ProjectId;
                existing.CategoryId = t.CategoryId;
                existing.AssignedToUserId = t.AssignedToUserId;
                existing.ParentTaskId = t.ParentTaskId;
                existing.CompanyId = t.CompanyId;
                existing.StartDate = t.StartDate;
                existing.DueDate = t.DueDate;
                existing.UpdatedAt = t.UpdatedAt;
            }
            else
            {
                _context.Tasks.Add(new WorkTask
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
                    ProjectId = t.ProjectId,
                    CategoryId = t.CategoryId,
                    AssignedToUserId = t.AssignedToUserId,
                    ParentTaskId = t.ParentTaskId,
                    CompanyId = t.CompanyId,
                    StartDate = t.StartDate,
                    DueDate = t.DueDate,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 6. Merge Sessions
        foreach (var s in data.Sessions)
        {
            var existing = await _context.Sessions.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == s.Id);
            if (existing != null)
            {
                existing.TaskId = s.TaskId;
                existing.UserId = s.UserId;
                existing.StartTime = s.StartTime;
                existing.EndTime = s.EndTime;
                existing.Duration = s.Duration;
                existing.Notes = s.Notes;
            }
            else
            {
                _context.Sessions.Add(new WorkSession
                {
                    Id = s.Id,
                    TaskId = s.TaskId,
                    UserId = s.UserId,
                    StartTime = s.StartTime,
                    EndTime = s.EndTime,
                    Duration = s.Duration,
                    Notes = s.Notes,
                    CreatedAt = s.CreatedAt
                });
            }
            totalMerged++;
        }

        // 7. Merge Attendances
        foreach (var a in data.Attendances)
        {
            var existing = await _context.Attendances.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == a.Id);
            if (existing != null)
            {
                existing.UserId = a.UserId;
                existing.Date = a.Date;
                existing.Type = a.Type;
                existing.WorkLocation = a.WorkLocation;
                existing.ClockIn = a.ClockIn;
                existing.ClockOut = a.ClockOut;
                existing.TotalHours = a.TotalHours;
                existing.LeaveReason = a.LeaveReason;
                existing.Notes = a.Notes;
                existing.UpdatedAt = a.UpdatedAt;
            }
            else
            {
                _context.Attendances.Add(new Attendance
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Date = a.Date,
                    Type = a.Type,
                    WorkLocation = a.WorkLocation,
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

        // 8. Merge Notes
        foreach (var n in data.Notes)
        {
            var existing = await _context.Notes.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == n.Id);
            if (existing != null)
            {
                existing.Title = n.Title;
                existing.ContentHtml = n.ContentHtml;
                existing.Category = n.Category;
                existing.Color = n.Color;
                existing.IsPinned = n.IsPinned;
                existing.AuthorUserId = n.AuthorUserId;
                existing.TaskId = n.TaskId;
                existing.CompanyId = n.CompanyId;
                existing.UpdatedAt = n.UpdatedAt;
            }
            else
            {
                _context.Notes.Add(new WorkNote
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
                });
            }
            totalMerged++;
        }
        await _context.SaveChangesAsync();

        // 9. Merge NoteAttachments
        foreach (var att in data.NoteAttachments)
        {
            var existing = await _context.NoteAttachments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == att.Id);
            if (existing != null)
            {
                existing.NoteId = att.NoteId;
                existing.FileName = att.FileName;
                existing.FilePath = att.FilePath;
                existing.FileSize = att.FileSize;
                existing.ContentType = att.ContentType;
                existing.FileExtension = att.FileExtension;
                existing.UploadedByUserId = att.UploadedByUserId;
                existing.UploadedAt = att.UploadedAt;
            }
            else
            {
                _context.NoteAttachments.Add(new NoteAttachment
                {
                    Id = att.Id,
                    NoteId = att.NoteId,
                    FileName = att.FileName,
                    FilePath = att.FilePath,
                    FileSize = att.FileSize,
                    ContentType = att.ContentType,
                    FileExtension = att.FileExtension,
                    UploadedByUserId = att.UploadedByUserId,
                    UploadedAt = att.UploadedAt
                });
            }
            totalMerged++;
        }

        await _context.SaveChangesAsync();
        return totalMerged;
    }

    private HttpClient CreateHttpClient(string apiKey, bool allowUntrustedSsl = false)
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
            client.DefaultRequestHeaders.Remove("X-Sync-Key");
            client.DefaultRequestHeaders.Add("X-Sync-Key", apiKey);
        }
        return client;
    }

    public string GenerateSqlScript(SyncDatabaseData data)
    {
        var sb = new StringBuilder();
        sb.AppendLine("-- =============================================================================");
        sb.AppendLine("-- TrackerKerja Modern Database Sync Script (DML Transactions)");
        sb.AppendLine($"-- Generated At: {DateTimeOffset.UtcNow:O}");
        sb.AppendLine("-- =============================================================================");
        sb.AppendLine();

        // 1. Companies
        if (data.Companies.Count > 0)
        {
            sb.AppendLine("-- 1. Companies");
            foreach (var c in data.Companies)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO companies (id, name, code, description, address, contact_email, created_at) VALUES ({c.Id}, {SqlEscape(c.Name)}, {SqlEscape(c.Code)}, {SqlEscape(c.Description)}, {SqlEscape(c.Address)}, {SqlEscape(c.ContactEmail)}, {SqlDate(c.CreatedAt)});");
            }
            sb.AppendLine();
        }

        // 2. Users (asp_net_users)
        if (data.Users.Count > 0)
        {
            sb.AppendLine("-- 2. Users");
            foreach (var u in data.Users)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO asp_net_users (id, user_name, normalized_user_name, email, normalized_email, email_confirmed, password_hash, security_stamp, concurrency_stamp, phone_number, full_name, job_title, avatar_color, profile_picture_url, cover_picture_url, company_id, is_approved, approved_at, approved_by_user_id, created_at) VALUES ({SqlEscape(u.Id)}, {SqlEscape(u.UserName)}, {SqlEscape(u.NormalizedUserName)}, {SqlEscape(u.Email)}, {SqlEscape(u.NormalizedEmail)}, {SqlBool(u.EmailConfirmed)}, {SqlEscape(u.PasswordHash)}, {SqlEscape(u.SecurityStamp)}, {SqlEscape(u.ConcurrencyStamp)}, {SqlEscape(u.PhoneNumber)}, {SqlEscape(u.FullName)}, {SqlEscape(u.JobTitle)}, {SqlEscape(u.AvatarColor)}, {SqlEscape(u.ProfilePictureUrl)}, {SqlEscape(u.CoverPictureUrl)}, {SqlNullableInt(u.CompanyId)}, {SqlBool(u.IsApproved)}, {SqlDate(u.ApprovedAt)}, {SqlEscape(u.ApprovedByUserId)}, {SqlDate(u.CreatedAt)});");
            }
            sb.AppendLine();
        }

        // 3. Categories
        if (data.Categories.Count > 0)
        {
            sb.AppendLine("-- 3. Categories");
            foreach (var cat in data.Categories)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO categories (id, name, color, description, created_at) VALUES ({cat.Id}, {SqlEscape(cat.Name)}, {SqlEscape(cat.Color)}, {SqlEscape(cat.Description)}, {SqlDate(cat.CreatedAt)});");
            }
            sb.AppendLine();
        }

        // 4. MasterPriorities
        if (data.MasterPriorities.Count > 0)
        {
            sb.AppendLine("-- 4. Master Priorities");
            foreach (var p in data.MasterPriorities)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO master_priorities (id, name, color, icon, order_index, description, is_default) VALUES ({p.Id}, {SqlEscape(p.Name)}, {SqlEscape(p.Color)}, {SqlEscape(p.Icon)}, {p.OrderIndex}, {SqlEscape(p.Description)}, {SqlBool(p.IsDefault)});");
            }
            sb.AppendLine();
        }

        // 5. MasterStatuses
        if (data.MasterStatuses.Count > 0)
        {
            sb.AppendLine("-- 5. Master Statuses");
            foreach (var s in data.MasterStatuses)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO master_statuses (id, name, color, is_done_state, order_index, description, is_default) VALUES ({s.Id}, {SqlEscape(s.Name)}, {SqlEscape(s.Color)}, {SqlBool(s.IsDoneState)}, {s.OrderIndex}, {SqlEscape(s.Description)}, {SqlBool(s.IsDefault)});");
            }
            sb.AppendLine();
        }

        // 6. MasterMilestones
        if (data.MasterMilestones.Count > 0)
        {
            sb.AppendLine("-- 6. Master Milestones");
            foreach (var m in data.MasterMilestones)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO master_milestones (id, name, phase, color, icon, order_index, description, is_default) VALUES ({m.Id}, {SqlEscape(m.Name)}, {SqlEscape(m.Phase)}, {SqlEscape(m.Color)}, {SqlEscape(m.Icon)}, {m.OrderIndex}, {SqlEscape(m.Description)}, {SqlBool(m.IsDefault)});");
            }
            sb.AppendLine();
        }

        // 7. Projects
        if (data.Projects.Count > 0)
        {
            sb.AppendLine("-- 7. Projects");
            foreach (var prj in data.Projects)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO projects (id, name, description, color, status, company_id, client_name, project_manager_id, budget, actual_cost, tags, deadline, created_at) VALUES ({prj.Id}, {SqlEscape(prj.Name)}, {SqlEscape(prj.Description)}, {SqlEscape(prj.Color)}, {(int)prj.Status}, {SqlNullableInt(prj.CompanyId)}, {SqlEscape(prj.ClientName)}, {SqlEscape(prj.ProjectManagerId)}, {prj.Budget.ToString(System.Globalization.CultureInfo.InvariantCulture)}, {prj.ActualCost.ToString(System.Globalization.CultureInfo.InvariantCulture)}, {SqlEscape(prj.Tags)}, {SqlDate(prj.Deadline)}, {SqlDate(prj.CreatedAt)});");
            }
            sb.AppendLine();
        }

        // 8. Tasks
        if (data.Tasks.Count > 0)
        {
            sb.AppendLine("-- 8. Tasks");
            foreach (var t in data.Tasks)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO tasks (id, title, description, priority, status, progress, milestone, obstacle, solution, project_id, category_id, assigned_to_user_id, parent_task_id, company_id, start_date, due_date, created_at, updated_at) VALUES ({t.Id}, {SqlEscape(t.Title)}, {SqlEscape(t.Description)}, {(int)t.Priority}, {(int)t.Status}, {t.Progress}, {SqlEscape(t.Milestone)}, {SqlEscape(t.Obstacle)}, {SqlEscape(t.Solution)}, {SqlNullableInt(t.ProjectId)}, {SqlNullableInt(t.CategoryId)}, {SqlEscape(t.AssignedToUserId)}, {SqlNullableInt(t.ParentTaskId)}, {SqlNullableInt(t.CompanyId)}, {SqlDate(t.StartDate)}, {SqlDate(t.DueDate)}, {SqlDate(t.CreatedAt)}, {SqlDate(t.UpdatedAt)});");
            }
            sb.AppendLine();
        }

        // 9. Sessions
        if (data.Sessions.Count > 0)
        {
            sb.AppendLine("-- 9. Work Sessions");
            foreach (var s in data.Sessions)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO sessions (id, task_id, user_id, start_time, end_time, duration, notes, created_at) VALUES ({s.Id}, {s.TaskId}, {SqlEscape(s.UserId)}, {SqlDate(s.StartTime)}, {SqlDate(s.EndTime)}, {s.Duration}, {SqlEscape(s.Notes)}, {SqlDate(s.CreatedAt)});");
            }
            sb.AppendLine();
        }

        // 10. Attendances
        if (data.Attendances.Count > 0)
        {
            sb.AppendLine("-- 10. Attendance Records");
            foreach (var a in data.Attendances)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO attendances (id, user_id, date, type, work_location, clock_in, clock_out, total_hours, leave_reason, notes, created_at, updated_at) VALUES ({a.Id}, {SqlEscape(a.UserId)}, '{a.Date:yyyy-MM-dd}', {(int)a.Type}, {(int)a.WorkLocation}, {SqlDate(a.ClockIn)}, {SqlDate(a.ClockOut)}, {a.TotalHours.ToString(System.Globalization.CultureInfo.InvariantCulture)}, {SqlEscape(a.LeaveReason)}, {SqlEscape(a.Notes)}, {SqlDate(a.CreatedAt)}, {SqlDate(a.UpdatedAt)});");
            }
            sb.AppendLine();
        }

        // 11. Notes
        if (data.Notes.Count > 0)
        {
            sb.AppendLine("-- 11. Notes");
            foreach (var n in data.Notes)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO notes (id, title, content_html, category, color, is_pinned, author_user_id, task_id, company_id, created_at, updated_at) VALUES ({n.Id}, {SqlEscape(n.Title)}, {SqlEscape(n.ContentHtml)}, {SqlEscape(n.Category)}, {SqlEscape(n.Color)}, {SqlBool(n.IsPinned)}, {SqlEscape(n.AuthorUserId)}, {SqlNullableInt(n.TaskId)}, {SqlNullableInt(n.CompanyId)}, {SqlDate(n.CreatedAt)}, {SqlDate(n.UpdatedAt)});");
            }
            sb.AppendLine();
        }

        // 12. NoteAttachments
        if (data.NoteAttachments.Count > 0)
        {
            sb.AppendLine("-- 12. Note Attachments");
            foreach (var att in data.NoteAttachments)
            {
                sb.AppendLine($"INSERT OR REPLACE INTO note_attachments (id, note_id, file_name, file_path, file_size, content_type, file_extension, uploaded_by_user_id, uploaded_at) VALUES ({att.Id}, {att.NoteId}, {SqlEscape(att.FileName)}, {SqlEscape(att.FilePath)}, {att.FileSize}, {SqlEscape(att.ContentType)}, {SqlEscape(att.FileExtension)}, {SqlEscape(att.UploadedByUserId)}, {SqlDate(att.UploadedAt)});");
            }
            sb.AppendLine();
        }

        return sb.ToString();
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
    private static string SqlBool(bool val) => val ? "1" : "0";
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
}

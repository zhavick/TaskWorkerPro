using System.Globalization;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Services;

public class TaskExcelImportService : ITaskExcelImportService
{
    private readonly AppDbContext _context;

    public TaskExcelImportService(AppDbContext context)
    {
        _context = context;
    }

    public byte[] GenerateTemplate(string format)
    {
        using var workbook = new XLWorkbook();
        var isArms = string.Equals(format, "arms", StringComparison.OrdinalIgnoreCase);

        if (isArms)
        {
            var ws = workbook.Worksheets.Add("Template ARMS");
            string[] headers =
            [
                "No", "Kode Tugas", "Kode Induk Tugas", "Nama Proyek", "Modul / Milestone",
                "Judul Tugas (*)", "Deskripsi", "Prioritas", "Status", "Progres (%)",
                "Tanggal Mulai", "Target Selesai", "Nama PIC", "Email PIC", "Kategori",
                "Kendala", "Solusi", "Estimasi Jam", "Jam Aktual", "Dapat Ditagih", "Catatan"
            ];

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E293B");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            // Sample row 1 (Parent task)
            ws.Cell(2, 1).Value = 1;
            ws.Cell(2, 2).Value = "TASK-001";
            ws.Cell(2, 3).Value = "";
            ws.Cell(2, 4).Value = "Website Redesign";
            ws.Cell(2, 5).Value = "Phase 1 - Discovery";
            ws.Cell(2, 6).Value = "Rancangan Arsitektur Frontend";
            ws.Cell(2, 7).Value = "Menyusun skema arsitektur antarmuka dan design system.";
            ws.Cell(2, 8).Value = "Tinggi";
            ws.Cell(2, 9).Value = "InProgress";
            ws.Cell(2, 10).Value = 60;
            ws.Cell(2, 11).Value = DateTime.UtcNow.ToString("yyyy-MM-dd");
            ws.Cell(2, 12).Value = DateTime.UtcNow.AddDays(7).ToString("yyyy-MM-dd");
            ws.Cell(2, 13).Value = "Budi Santoso";
            ws.Cell(2, 14).Value = "budi@perusahaan.com";
            ws.Cell(2, 15).Value = "Frontend";
            ws.Cell(2, 16).Value = "";
            ws.Cell(2, 17).Value = "";
            ws.Cell(2, 18).Value = 16;
            ws.Cell(2, 19).Value = 10;
            ws.Cell(2, 20).Value = "Ya";
            ws.Cell(2, 21).Value = "Arsitektur menggunakan Next.js App Router";

            // Sample row 2 (Child subtask linked to TASK-001)
            ws.Cell(3, 1).Value = 2;
            ws.Cell(3, 2).Value = "TASK-002";
            ws.Cell(3, 3).Value = "TASK-001";
            ws.Cell(3, 4).Value = "Website Redesign";
            ws.Cell(3, 5).Value = "Phase 1 - Discovery";
            ws.Cell(3, 6).Value = "Setup TailwindCSS & Design Tokens";
            ws.Cell(3, 7).Value = "Inisialisasi palet warna dan tipografi Tailgrids.";
            ws.Cell(3, 8).Value = "Sedang";
            ws.Cell(3, 9).Value = "Done";
            ws.Cell(3, 10).Value = 100;
            ws.Cell(3, 11).Value = DateTime.UtcNow.AddDays(-2).ToString("yyyy-MM-dd");
            ws.Cell(3, 12).Value = DateTime.UtcNow.ToString("yyyy-MM-dd");
            ws.Cell(3, 13).Value = "Budi Santoso";
            ws.Cell(3, 14).Value = "budi@perusahaan.com";
            ws.Cell(3, 15).Value = "Frontend";
            ws.Cell(3, 16).Value = "";
            ws.Cell(3, 17).Value = "";
            ws.Cell(3, 18).Value = 8;
            ws.Cell(3, 19).Value = 8;
            ws.Cell(3, 20).Value = "Ya";
            ws.Cell(3, 21).Value = "";

            ws.Columns().AdjustToContents();
        }
        else
        {
            var ws = workbook.Worksheets.Add("Template Standar");
            string[] headers =
            [
                "Kode Tugas", "Judul Tugas (*)", "Deskripsi", "Proyek",
                "Prioritas", "Status", "Progres (%)", "Email / Nama PIC", "Target Selesai"
            ];

            for (int i = 0; i < headers.Length; i++)
            {
                var cell = ws.Cell(1, i + 1);
                cell.Value = headers[i];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#0F766E");
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            // Sample row 1
            ws.Cell(2, 1).Value = "TASK-001";
            ws.Cell(2, 2).Value = "Implementasi Integrasi Kalender Kerja";
            ws.Cell(2, 3).Value = "Menghubungkan kalender dengan deadline tugas";
            ws.Cell(2, 4).Value = "TrackerKerja Modern";
            ws.Cell(2, 5).Value = "Tinggi";
            ws.Cell(2, 6).Value = "Todo";
            ws.Cell(2, 7).Value = 0;
            ws.Cell(2, 8).Value = "developer@perusahaan.com";
            ws.Cell(2, 9).Value = DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd");

            // Sample row 2
            ws.Cell(3, 1).Value = "TASK-002";
            ws.Cell(3, 2).Value = "Uji Coba Ekspor Impor Excel";
            ws.Cell(3, 3).Value = "Verifikasi dukungan template ClosedXML dan validasi baris";
            ws.Cell(3, 4).Value = "TrackerKerja Modern";
            ws.Cell(3, 5).Value = "Sedang";
            ws.Cell(3, 6).Value = "InProgress";
            ws.Cell(3, 7).Value = 50;
            ws.Cell(3, 8).Value = "qa@perusahaan.com";
            ws.Cell(3, 9).Value = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd");

            ws.Columns().AdjustToContents();
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<TaskImportPreviewDto> PreviewImportAsync(
        Stream fileStream,
        string fileName,
        int? companyId,
        CancellationToken cancellationToken = default)
    {
        using var workbook = new XLWorkbook(fileStream);

        var existingProjects = await _context.Projects
            .Where(p => p.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        var existingUsers = await _context.Users
            .Where(u => u.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        var company = companyId.HasValue
            ? await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId.Value, cancellationToken)
            : null;
        var companyDomain = company?.Code != null ? $"{company.Code.ToLowerInvariant()}.local" : "trackerkerja.local";

        var rows = new List<TaskImportRowDto>();
        int rowIndex = 0;

        var sheetsToProcess = workbook.Worksheets.Where(ws =>
        {
            var nameLower = ws.Name.Trim().ToLowerInvariant();
            if (nameLower.Contains("lookup") || nameLower.Contains("dashboard") ||
                nameLower.Contains("template") || nameLower.Contains("panduan") ||
                nameLower.Contains("guide") || nameLower.Contains("readme"))
                return false;
            return ws.FirstRowUsed() != null;
        }).ToList();

        foreach (var ws in sheetsToProcess)
        {
            var headerRow = DetectHeaderRow(ws);
            if (headerRow == null) continue;

            var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            var headers = Enumerable.Range(1, Math.Min(lastCol, 40))
                .Select(c => ws.Cell(headerRow.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                .ToList();

            int codeCol = FindCol(headers, "kode tugas", "task code", "task_code", "code", "kode", "no tugas", "task id", "id");
            int parentCodeCol = FindCol(headers, "kode induk tugas", "parent task code", "parent_code", "parent code", "induk tugas", "parent");
            int projectCol = FindCol(headers, "nama proyek", "project_name", "project", "proyek", "nama project", "aplikasi", "nama aplikasi", "sistem");
            int milestoneCol = FindCol(headers, "modul", "milestone", "jenis_task", "jenis task", "kategori", "fitur", "tahapan");
            int titleCol = FindCol(headers, "judul tugas", "task title", "title", "judul", "aktivitas", "activity", "pekerjaan", "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "nama tugas", "nama task", "task name", "uraian", "kegiatan", "work item");
            int descCol = FindCol(headers, "deskripsi", "description", "keterangan", "detail", "catatan");
            int priorityCol = FindCol(headers, "prioritas", "priority", "urgensi", "level");
            int statusCol = FindCol(headers, "status", "keadaan", "progress status", "kondisi");
            int progressCol = FindCol(headers, "progres", "progress", "%", "persentase", "bobot", "persen");
            int startDateCol = FindCol(headers, "tanggal mulai", "start_date", "start date", "mulai", "tgl mulai", "start");
            int dueDateCol = FindCol(headers, "target selesai", "due_date", "due date", "completed_date", "selesai", "target", "deadline", "tgl selesai", "due");
            int picEmailCol = FindCol(headers, "email pic", "developer_emails", "pic email", "email user", "user email", "email");
            int picNameCol = FindCol(headers, "email / nama pic", "nama pic", "pic", "penanggung jawab", "petugas", "pelaksana", "developer", "assigned to", "assignee", "nama staf", "nama personil", "person", "nama pengguna", "nama user");
            int obstacleCol = FindCol(headers, "kendala", "obstacle", "masalah", "hambatan", "issue");
            int solutionCol = FindCol(headers, "solusi", "solution", "tindakan", "penyelesaian");

            // Jika titleCol tidak terdeteksi via nama umum, gunakan fallback kolom teks pertama yang relevan
            if (titleCol == 0)
            {
                titleCol = FindCol(headers, "uraian", "kegiatan", "aktivitas", "pekerjaan", "item");
                if (titleCol == 0 && headers.Count >= 2)
                {
                    titleCol = headers[0].Contains("no") && headers.Count > 1 ? 2 : 1;
                }
            }

            if (titleCol == 0) continue;

            // Ekstrak nama personil dari nama sheet (misal sheet bernama "Budi", "Dewi Sartika", "Wahana")
            var sheetPerson = ExtractPersonFromSheetName(ws.Name);

            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;

            for (int r = headerRow.RowNumber() + 1; r <= lastRow; r++)
            {
                var title = ws.Cell(r, titleCol).GetString().Trim();
                var taskCode = codeCol > 0 ? ws.Cell(r, codeCol).GetString().Trim() : null;
                var parentTaskCode = parentCodeCol > 0 ? ws.Cell(r, parentCodeCol).GetString().Trim() : null;
                var projectName = projectCol > 0 ? ws.Cell(r, projectCol).GetString().Trim() : null;
                var desc = descCol > 0 ? ws.Cell(r, descCol).GetString().Trim() : null;
                var priorityText = priorityCol > 0 ? ws.Cell(r, priorityCol).GetString().Trim() : null;
                var statusText = statusCol > 0 ? ws.Cell(r, statusCol).GetString().Trim() : null;
                var progress = progressCol > 0 ? ParseProgress(ws.Cell(r, progressCol)) : 0;
                var startDate = startDateCol > 0 ? ParseDate(ws.Cell(r, startDateCol)) : null;
                var dueDate = dueDateCol > 0 ? ParseDate(ws.Cell(r, dueDateCol)) : null;
                var milestone = milestoneCol > 0 ? ws.Cell(r, milestoneCol).GetString().Trim() : null;
                var obstacle = obstacleCol > 0 ? ws.Cell(r, obstacleCol).GetString().Trim() : null;
                var solution = solutionCol > 0 ? ws.Cell(r, solutionCol).GetString().Trim() : null;

                // Tentukan nama/email PIC dari baris, atau fallback ke Nama Sheet
                string? picText = null;
                if (picEmailCol > 0) picText = ws.Cell(r, picEmailCol).GetString().Trim();
                if (string.IsNullOrWhiteSpace(picText) && picNameCol > 0) picText = ws.Cell(r, picNameCol).GetString().Trim();
                if (string.IsNullOrWhiteSpace(picText) && !string.IsNullOrWhiteSpace(sheetPerson)) picText = sheetPerson;

                // Abaikan baris kosong total
                if (string.IsNullOrWhiteSpace(title) && string.IsNullOrWhiteSpace(projectName) && string.IsNullOrWhiteSpace(taskCode))
                {
                    continue;
                }

                rowIndex++;
                var validationMessages = new List<string>();
                var status = ParseStatus(statusText);
                var priority = ParsePriority(priorityText);

                if (status == Domain.Enums.TaskStatus.Done && progress == 0)
                {
                    progress = 100;
                }

                TaskImportValidationStatus validationStatus = TaskImportValidationStatus.Valid;

                if (string.IsNullOrWhiteSpace(title))
                {
                    validationStatus = TaskImportValidationStatus.Error;
                    validationMessages.Add("Judul tugas wajib diisi.");
                }

                // Match project
                int? matchedProjectId = null;
                if (!string.IsNullOrWhiteSpace(projectName))
                {
                    var foundProj = existingProjects.FirstOrDefault(p =>
                        p.Name.Equals(projectName, StringComparison.OrdinalIgnoreCase));
                    if (foundProj != null)
                    {
                        matchedProjectId = foundProj.Id;
                    }
                    else
                    {
                        validationMessages.Add($"Proyek '{projectName}' belum terdaftar (akan otomatis dibuat baru).");
                        if (validationStatus != TaskImportValidationStatus.Error)
                        {
                            validationStatus = TaskImportValidationStatus.Warning;
                        }
                    }
                }

                // Match user / PIC
                string? matchedUserId = null;
                string? matchedUserName = null;
                if (!string.IsNullOrWhiteSpace(picText))
                {
                    var (matchedId, resolvedName, resolvedEmail, isNew) = MatchUser(picText, existingUsers, companyDomain);
                    if (!isNew && matchedId != null)
                    {
                        matchedUserId = matchedId;
                        matchedUserName = resolvedName;
                    }
                    else
                    {
                        matchedUserName = resolvedName;
                        validationMessages.Add($"Personil '{resolvedName}' ({resolvedEmail}) akan otomatis dibuatkan akun pengguna baru.");
                        if (validationStatus != TaskImportValidationStatus.Error)
                        {
                            validationStatus = TaskImportValidationStatus.Warning;
                        }
                    }
                }

                rows.Add(new TaskImportRowDto(
                    rowIndex,
                    string.IsNullOrWhiteSpace(taskCode) ? null : taskCode,
                    string.IsNullOrWhiteSpace(parentTaskCode) ? null : parentTaskCode,
                    title,
                    string.IsNullOrWhiteSpace(desc) ? null : desc,
                    string.IsNullOrWhiteSpace(projectName) ? null : projectName,
                    matchedProjectId,
                    string.IsNullOrWhiteSpace(picText) ? null : picText,
                    matchedUserId,
                    matchedUserName,
                    priority,
                    status,
                    progress,
                    startDate,
                    dueDate,
                    string.IsNullOrWhiteSpace(milestone) ? null : milestone,
                    string.IsNullOrWhiteSpace(obstacle) ? null : obstacle,
                    string.IsNullOrWhiteSpace(solution) ? null : solution,
                    validationStatus,
                    validationMessages
                ));
            }
        }

        int validCount = rows.Count(r => r.ValidationStatus == TaskImportValidationStatus.Valid);
        int warningCount = rows.Count(r => r.ValidationStatus == TaskImportValidationStatus.Warning);
        int errorCount = rows.Count(r => r.ValidationStatus == TaskImportValidationStatus.Error);

        return new TaskImportPreviewDto(
            fileName,
            rows.Count,
            validCount,
            warningCount,
            errorCount,
            rows
        );
    }

    public async Task<TaskImportResultDto> CommitImportAsync(
        TaskImportCommitRequest request,
        int? companyId,
        CancellationToken cancellationToken = default)
    {
        var messages = new List<string>();
        int totalProcessed = 0;
        int totalImported = 0;
        int totalProjectsCreated = 0;
        int totalUsersCreated = 0;

        var selectedIndexes = request.SelectedRowIndexes?.ToHashSet();
        var candidateRows = request.Rows
            .Where(r => r.ValidationStatus != TaskImportValidationStatus.Error)
            .Where(r => selectedIndexes == null || selectedIndexes.Contains(r.RowIndex))
            .ToList();

        if (candidateRows.Count == 0)
        {
            return new TaskImportResultDto(0, 0, 0, ["Tidak ada baris valid yang dipilih untuk diimpor."]);
        }

        var isRelational = _context.Database.IsRelational();
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;

        var existingProjects = await _context.Projects
            .Where(p => p.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        var existingUsers = await _context.Users
            .Where(u => u.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        var company = companyId.HasValue
            ? await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId.Value, cancellationToken)
            : null;
        var companyDomain = company?.Code != null ? $"{company.Code.ToLowerInvariant()}.local" : "trackerkerja.local";

        // Cache lokal user untuk mencegah duplikasi pembuatan user di dalam batch
        var userCache = new Dictionary<string, AppUser>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in existingUsers)
        {
            if (!string.IsNullOrEmpty(u.Email)) userCache[u.Email] = u;
            if (!string.IsNullOrEmpty(u.FullName)) userCache[u.FullName] = u;
            userCache[u.Id] = u;
        }

        var tasksToInsert = new List<WorkTask>();
        var batchTaskMap = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);

        // Preload DefaultProject if specified
        Project? defaultProject = null;
        if (request.DefaultProjectId.HasValue)
        {
            defaultProject = existingProjects.FirstOrDefault(p => p.Id == request.DefaultProjectId.Value);
        }

        foreach (var row in candidateRows)
        {
            totalProcessed++;

            // 1. Resolve Project
            Project? project = null;
            if (row.MatchedProjectId.HasValue)
            {
                project = existingProjects.FirstOrDefault(p => p.Id == row.MatchedProjectId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(row.ProjectName))
            {
                project = existingProjects.FirstOrDefault(p =>
                    p.Name.Equals(row.ProjectName, StringComparison.OrdinalIgnoreCase));

                if (project == null)
                {
                    project = new Project
                    {
                        Name = row.ProjectName.Trim(),
                        CompanyId = companyId,
                        Color = PickColorForProject(row.ProjectName.Trim()),
                        Status = ProjectStatus.Active,
                        CreatedAt = DateTimeOffset.UtcNow
                    };
                    _context.Projects.Add(project);
                    existingProjects.Add(project);
                    totalProjectsCreated++;
                }
            }

            if (project == null && defaultProject != null)
            {
                project = defaultProject;
            }

            // 2. Resolve PIC / Buat User Baru jika belum terdaftar (berdasarkan sheet name / email)
            string? assignedUserId = row.MatchedUserId;

            if (string.IsNullOrEmpty(assignedUserId) && !string.IsNullOrWhiteSpace(row.PicIdentifier))
            {
                var picKey = row.PicIdentifier.Trim();
                if (userCache.TryGetValue(picKey, out var cachedUser))
                {
                    assignedUserId = cachedUser.Id;
                }
                else
                {
                    var (matchedId, resolvedName, resolvedEmail, isNew) = MatchUser(picKey, existingUsers, companyDomain);
                    if (matchedId != null && userCache.TryGetValue(matchedId, out var existingFound))
                    {
                        assignedUserId = existingFound.Id;
                    }
                    else if (!string.IsNullOrEmpty(resolvedEmail) && userCache.TryGetValue(resolvedEmail, out var existingByEmail))
                    {
                        assignedUserId = existingByEmail.Id;
                    }
                    else
                    {
                        // Buat akun pengguna baru secara otomatis
                        var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == resolvedEmail, cancellationToken);
                        if (dbUser != null)
                        {
                            assignedUserId = dbUser.Id;
                            userCache[picKey] = dbUser;
                            userCache[resolvedName!] = dbUser;
                            userCache[resolvedEmail!] = dbUser;
                        }
                        else
                        {
                            var newUser = new AppUser
                            {
                                Id = Guid.NewGuid().ToString(),
                                FullName = resolvedName!,
                                Email = resolvedEmail!,
                                NormalizedEmail = resolvedEmail!.ToUpperInvariant(),
                                UserName = resolvedEmail!,
                                NormalizedUserName = resolvedEmail!.ToUpperInvariant(),
                                EmailConfirmed = true,
                                JobTitle = "Team Member",
                                AvatarColor = PickAvatarColor(resolvedName!),
                                PasswordHash = PasswordHasher.HashPassword("TrackerKerja123!"),
                                CompanyId = companyId,
                                IsApproved = true,
                                ApprovedAt = DateTimeOffset.UtcNow,
                                CreatedAt = DateTimeOffset.UtcNow
                            };

                            _context.Users.Add(newUser);
                            await _context.SaveChangesAsync(cancellationToken);

                            existingUsers.Add(newUser);
                            userCache[picKey] = newUser;
                            userCache[resolvedName!] = newUser;
                            userCache[resolvedEmail!] = newUser;
                            userCache[newUser.Id] = newUser;

                            assignedUserId = newUser.Id;
                            totalUsersCreated++;
                            messages.Add($"Berhasil membuat akun personil baru untuk '{newUser.FullName}' ({newUser.Email}).");
                        }
                    }
                }
            }

            if (string.IsNullOrEmpty(assignedUserId) && !string.IsNullOrEmpty(request.BulkAssignUserId))
            {
                var bulkUser = existingUsers.FirstOrDefault(u => u.Id == request.BulkAssignUserId);
                if (bulkUser != null)
                {
                    assignedUserId = bulkUser.Id;
                }
            }

            var workTask = new WorkTask
            {
                Title = row.Title,
                Description = row.Description,
                Priority = row.Priority,
                Status = row.Status,
                Progress = row.Progress,
                Milestone = row.Milestone,
                Obstacle = row.Obstacle,
                Solution = row.Solution,
                Project = project,
                AssignedToUserId = assignedUserId,
                CompanyId = companyId,
                StartDate = row.StartDate,
                DueDate = row.DueDate,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            tasksToInsert.Add(workTask);

            if (!string.IsNullOrWhiteSpace(row.TaskCode))
            {
                batchTaskMap[row.TaskCode.Trim()] = workTask;
            }
        }

        if (tasksToInsert.Count > 0)
        {
            _context.Tasks.AddRange(tasksToInsert);
            await _context.SaveChangesAsync(cancellationToken);
            totalImported = tasksToInsert.Count;

            // Second pass: resolve parent-child hierarchy within the batch
            bool hasHierarchyUpdates = false;
            for (int i = 0; i < candidateRows.Count; i++)
            {
                var row = candidateRows[i];
                var insertedTask = tasksToInsert[i];

                if (!string.IsNullOrWhiteSpace(row.ParentTaskCode))
                {
                    var parentCode = row.ParentTaskCode.Trim();
                    if (batchTaskMap.TryGetValue(parentCode, out var parentTask) && parentTask.Id != insertedTask.Id)
                    {
                        insertedTask.ParentTaskId = parentTask.Id;
                        hasHierarchyUpdates = true;
                    }
                    else if (int.TryParse(parentCode, out var directParentId))
                    {
                        var parentExists = await _context.Tasks.AnyAsync(t => t.Id == directParentId && t.CompanyId == companyId, cancellationToken);
                        if (parentExists)
                        {
                            insertedTask.ParentTaskId = directParentId;
                            hasHierarchyUpdates = true;
                        }
                    }
                }
            }

            if (hasHierarchyUpdates)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        if (transaction != null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        var resultDetail = totalUsersCreated > 0
            ? $"Berhasil mengimpor {totalImported} tugas dari {totalProcessed} baris data ({totalProjectsCreated} proyek baru, {totalUsersCreated} personil baru dibuat)."
            : $"Berhasil mengimpor {totalImported} tugas dari {totalProcessed} baris data ({totalProjectsCreated} proyek baru dibuat).";
        messages.Add(resultDetail);

            return new TaskImportResultDto(
                totalProcessed,
                totalImported,
                totalProjectsCreated,
                messages
            );
        });
    }

    public async Task<ExcelImportResultDto> ImportTasksFromExcelAsync(
        Stream fileStream,
        int? companyId,
        CancellationToken cancellationToken = default)
    {
        var preview = await PreviewImportAsync(fileStream, "Upload.xlsx", companyId, cancellationToken);
        var commitReq = new TaskImportCommitRequest(null, null, null, preview.Rows);
        var commitRes = await CommitImportAsync(commitReq, companyId, cancellationToken);

        return new ExcelImportResultDto(
            commitRes.TotalProcessed,
            commitRes.TotalImported,
            commitRes.TotalProjectsCreated,
            commitRes.Messages
        );
    }

    private static int FindCol(List<string> headers, params string[] candidates)
    {
        // 1. Prioritize exact matches
        for (int i = 0; i < headers.Count; i++)
        {
            var h = headers[i];
            foreach (var c in candidates)
            {
                if (h.Equals(c, StringComparison.OrdinalIgnoreCase))
                {
                    return i + 1;
                }
            }
        }

        // 2. Contains match with candidate priority
        foreach (var c in candidates)
        {
            for (int i = 0; i < headers.Count; i++)
            {
                var h = headers[i];
                if (h.Contains(c, StringComparison.OrdinalIgnoreCase))
                {
                    if (c == "nama" && (h.Contains("proyek") || h.Contains("project") || h.Contains("aplikasi") || h.Contains("tugas") || h.Contains("task") || h.Contains("modul")))
                    {
                        continue;
                    }
                    return i + 1;
                }
            }
        }

        return 0;
    }

    private static Domain.Enums.TaskStatus ParseStatus(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return Domain.Enums.TaskStatus.Todo;
        var upper = text.Trim().ToUpperInvariant();
        if (upper.Contains("DONE") || upper.Contains("SELESAI") || upper == "2") return Domain.Enums.TaskStatus.Done;
        if (upper.Contains("PROGRESS") || upper.Contains("SEDANG") || upper == "1") return Domain.Enums.TaskStatus.InProgress;
        if (upper.Contains("OVERDUE") || upper.Contains("TERLAMBAT") || upper.Contains("KEDALUWARSA") || upper == "3") return Domain.Enums.TaskStatus.Overdue;
        return Domain.Enums.TaskStatus.Todo;
    }

    private static TaskPriority ParsePriority(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return TaskPriority.Medium;
        var upper = text.Trim().ToUpperInvariant();
        if (upper.Contains("CRITICAL") || upper.Contains("KRITIS") || upper == "3") return TaskPriority.Critical;
        if (upper.Contains("HIGH") || upper.Contains("TINGGI") || upper == "2") return TaskPriority.High;
        if (upper.Contains("LOW") || upper.Contains("RENDAH") || upper == "0") return TaskPriority.Low;
        return TaskPriority.Medium;
    }

    private static int ParseProgress(IXLCell cell)
    {
        if (cell.IsEmpty()) return 0;
        if (cell.DataType == XLDataType.Number)
        {
            var val = cell.GetDouble();
            if (val <= 1.0 && val > 0) return (int)Math.Round(val * 100);
            return (int)Math.Clamp(Math.Round(val), 0, 100);
        }
        var str = cell.GetString().Trim().Replace("%", "");
        if (double.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var d))
        {
            if (d <= 1.0 && d > 0) return (int)Math.Round(d * 100);
            return (int)Math.Clamp(Math.Round(d), 0, 100);
        }
        return 0;
    }

    private static DateTimeOffset? ParseDate(IXLCell cell)
    {
        if (cell.IsEmpty()) return null;
        if (cell.DataType == XLDataType.DateTime)
        {
            try
            {
                return new DateTimeOffset(DateTime.SpecifyKind(cell.GetDateTime(), DateTimeKind.Utc));
            }
            catch
            {
                // ignore
            }
        }
        var str = cell.GetString().Trim();
        if (string.IsNullOrWhiteSpace(str)) return null;

        if (DateTimeOffset.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dto))
        {
            return dto;
        }
        if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
        {
            return new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
        }
        return null;
    }

    private static string PickColorForProject(string name)
    {
        var colors = new[] { "#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#3B82F6" };
        var hash = Math.Abs(name.GetHashCode());
        return colors[hash % colors.Length];
    }

    private static IXLRow? DetectHeaderRow(IXLWorksheet ws)
    {
        var firstRow = ws.FirstRowUsed()?.RowNumber() ?? 1;
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? firstRow;
        var maxScanRow = Math.Min(lastRow, firstRow + 20);

        var headerKeywords = new[]
        {
            "judul", "tugas", "task", "pekerjaan", "uraian", "aktivitas",
            "proyek", "project", "pic", "email", "status", "prioritas",
            "progres", "progress", "deadline", "target", "mulai", "selesai"
        };

        for (int r = firstRow; r <= maxScanRow; r++)
        {
            var row = ws.Row(r);
            int matchedKeywords = 0;
            var lastCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 40);

            for (int c = 1; c <= lastCol; c++)
            {
                var val = row.Cell(c).GetString().Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(val)) continue;

                if (headerKeywords.Any(k => val.Contains(k)))
                {
                    matchedKeywords++;
                }
            }

            // Jika baris memiliki minimal 2 kata kunci header atau kata kunci spesifik task
            if (matchedKeywords >= 2)
            {
                return row;
            }

            for (int c = 1; c <= lastCol; c++)
            {
                var val = row.Cell(c).GetString().Trim().ToLowerInvariant();
                if (val.Contains("judul") || val.Contains("uraian pekerjaan") || val.Contains("task name") || val.Contains("task title"))
                {
                    return row;
                }
            }
        }

        // Fallback ke baris pertama yang terisi
        return ws.FirstRowUsed();
    }

    private static string? ExtractPersonFromSheetName(string sheetName)
    {
        if (string.IsNullOrWhiteSpace(sheetName)) return null;

        var clean = sheetName.Trim();
        var lower = clean.ToLowerInvariant();

        // Abaikan nama sheet yang bersifat umum / bukan personil
        var genericKeywords = new[]
        {
            "sheet", "sheets", "halaman", "rekap", "summary", "dashboard", "lookup",
            "master", "data", "tugas", "tasks", "task", "table", "all", "export",
            "import", "panduan", "guide", "readme", "template", "report", "daftar",
            "list", "project", "projects", "proyek", "item", "items"
        };

        if (genericKeywords.Any(g => lower.Equals(g, StringComparison.OrdinalIgnoreCase) ||
                                     lower.StartsWith(g + " ", StringComparison.OrdinalIgnoreCase) ||
                                     lower.StartsWith(g + "_", StringComparison.OrdinalIgnoreCase) ||
                                     lower.StartsWith(g + "-", StringComparison.OrdinalIgnoreCase)))
        {
            return null;
        }

        // Jika ada prefix atau separator seperti "Tim A - Budi" atau "[PIC] Wahana", ambil nama intinya
        if (clean.Contains('-'))
        {
            var parts = clean.Split('-');
            var candidate = parts[^1].Trim();
            if (candidate.Length >= 2 && !candidate.Any(char.IsDigit))
            {
                clean = candidate;
            }
        }

        clean = clean.Trim('[', ']', '(', ')', '_', ' ');
        return clean.Length >= 2 ? clean : null;
    }

    private static (string? userId, string? userName, string? userEmail, bool isNew) MatchUser(
        string picIdentifier,
        List<AppUser> existingUsers,
        string? companyDomain = null)
    {
        if (string.IsNullOrWhiteSpace(picIdentifier))
        {
            return (null, null, null, false);
        }

        var trimmed = picIdentifier.Trim();
        var domain = string.IsNullOrWhiteSpace(companyDomain) ? "trackerkerja.local" : companyDomain.Trim().ToLowerInvariant();

        // Kasus 1: Input berupa email
        if (trimmed.Contains('@'))
        {
            var foundByEmail = existingUsers.FirstOrDefault(u =>
                u.Email != null && u.Email.Equals(trimmed, StringComparison.OrdinalIgnoreCase));

            if (foundByEmail != null)
            {
                return (foundByEmail.Id, foundByEmail.FullName, foundByEmail.Email, false);
            }

            // Email belum ada -> jadikan calon user baru dengan nama dari user part
            var localPart = trimmed.Split('@')[0];
            var generatedName = FormatDisplayName(localPart);
            return (null, generatedName, trimmed.ToLowerInvariant(), true);
        }

        // Kasus 2: Input berupa Nama Personil
        // Coba cari exact match di FullName atau UserName
        var foundByName = existingUsers.FirstOrDefault(u =>
            (u.FullName != null && u.FullName.Equals(trimmed, StringComparison.OrdinalIgnoreCase)) ||
            (u.UserName != null && u.UserName.Equals(trimmed, StringComparison.OrdinalIgnoreCase)));

        if (foundByName != null)
        {
            return (foundByName.Id, foundByName.FullName, foundByName.Email, false);
        }

        // Coba cari parsial jika panjang kata kunci cukup
        if (trimmed.Length >= 4)
        {
            var partialMatch = existingUsers.FirstOrDefault(u =>
                u.FullName != null && u.FullName.Contains(trimmed, StringComparison.OrdinalIgnoreCase));
            if (partialMatch != null)
            {
                return (partialMatch.Id, partialMatch.FullName, partialMatch.Email, false);
            }
        }

        // Personil belum terdaftar -> format nama dan generate email baru
        var formattedName = FormatDisplayName(trimmed);
        var emailSlug = GenerateEmailSlug(formattedName, domain);

        // Pastikan slug email tidak kebetulan bentrok dengan existing user
        var userWithSameEmail = existingUsers.FirstOrDefault(u =>
            u.Email != null && u.Email.Equals(emailSlug, StringComparison.OrdinalIgnoreCase));
        if (userWithSameEmail != null)
        {
            return (userWithSameEmail.Id, userWithSameEmail.FullName, userWithSameEmail.Email, false);
        }

        return (null, formattedName, emailSlug, true);
    }

    private static string FormatDisplayName(string raw)
    {
        var cleaned = raw.Replace(".", " ").Replace("_", " ").Replace("-", " ").Trim();
        var words = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0) return raw;

        var textInfo = CultureInfo.CurrentCulture.TextInfo;
        return string.Join(" ", words.Select(w => textInfo.ToTitleCase(w.ToLowerInvariant())));
    }

    private static string GenerateEmailSlug(string name, string domain)
    {
        var normalized = new string(name
            .ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c) || c == ' ')
            .ToArray());
        var parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var slug = parts.Length switch
        {
            0 => "personnel",
            1 => parts[0],
            _ => $"{parts[0]}.{parts[^1]}"
        };
        return $"{slug}@{domain}";
    }

    private static string PickAvatarColor(string name)
    {
        var colors = new[] { "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#6366F1" };
        var hash = Math.Abs(name.GetHashCode());
        return colors[hash % colors.Length];
    }
}

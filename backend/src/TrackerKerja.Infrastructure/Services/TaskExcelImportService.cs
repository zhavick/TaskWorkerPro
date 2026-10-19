using System.Globalization;
using System.Text.RegularExpressions;
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

        var existingTasks = await _context.Tasks
            .Include(t => t.Project)
            .Where(t => t.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        // Pre-build existing task lookup indexes
        var dbTaskByCode = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);
        var dbTaskByProjAndTitle = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);
        var dbTaskByTitle = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);

        foreach (var t in existingTasks)
        {
            dbTaskByCode[$"TK-{t.Id:D4}"] = t;
            dbTaskByCode[$"TK-{t.Id}"] = t;
            dbTaskByCode[t.Id.ToString()] = t;
            if (t.ProjectId.HasValue)
            {
                dbTaskByProjAndTitle[$"{t.ProjectId.Value}|{NormalizeTitle(t.Title)}"] = t;
            }
            dbTaskByTitle[NormalizeTitle(t.Title)] = t;
        }

        var company = companyId.HasValue
            ? await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId.Value, cancellationToken)
            : null;
        var companyDomain = company?.Code != null ? $"{company.Code.ToLowerInvariant()}.local" : "trackerkerja.local";

        var rows = new List<TaskImportRowDto>();
        int rowIndex = 0;
        var seenBatchKeys = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        var sheetsToProcess = new List<IXLWorksheet>();
        int totalSheets = workbook.Worksheets.Count;
        for (int sIdx = 1; sIdx <= totalSheets; sIdx++)
        {
            var ws = workbook.Worksheet(sIdx);
            if (!IsIgnoredSheet(ws, sIdx, totalSheets))
            {
                sheetsToProcess.Add(ws);
            }
        }

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

            // Ekstrak nama personil & email yang mereka miliki dari sheet (atau header metadata)
            var sheetPersonnel = ResolveSheetPersonnel(ws, headerRow.RowNumber(), picEmailCol, existingUsers, companyDomain);

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

                // Tentukan nama/email PIC dari baris, atau fallback ke SheetPersonnel
                string? picText = null;
                if (picEmailCol > 0)
                {
                    var rawEmail = ws.Cell(r, picEmailCol).GetString().Trim();
                    if (!IsInvalidPersonValue(rawEmail)) picText = rawEmail;
                }
                if (string.IsNullOrWhiteSpace(picText) && picNameCol > 0)
                {
                    var rawName = ws.Cell(r, picNameCol).GetString().Trim();
                    if (!IsInvalidPersonValue(rawName)) picText = rawName;
                }
                if (string.IsNullOrWhiteSpace(picText) && sheetPersonnel != null)
                {
                    picText = !string.IsNullOrWhiteSpace(sheetPersonnel.Email)
                        ? sheetPersonnel.Email
                        : sheetPersonnel.Name;
                }

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
                if (!string.IsNullOrWhiteSpace(picText) && !IsInvalidPersonValue(picText))
                {
                    var (matchedId, resolvedName, resolvedEmail, isNew) = MatchUser(
                        picText,
                        sheetPersonnel?.Email,
                        existingUsers,
                        companyDomain);

                    if (!isNew && matchedId != null)
                    {
                        matchedUserId = matchedId;
                        matchedUserName = resolvedName;
                    }
                    else if (!string.IsNullOrWhiteSpace(resolvedName) && !IsInvalidPersonValue(resolvedName))
                    {
                        matchedUserName = resolvedName;
                        validationMessages.Add($"Personil '{resolvedName}' ({resolvedEmail}) akan otomatis dibuatkan akun pengguna baru.");
                        if (validationStatus != TaskImportValidationStatus.Error)
                        {
                            validationStatus = TaskImportValidationStatus.Warning;
                        }
                    }
                }

                // Deteksi Duplikasi & Pembaruan (Upsert) terhadap tugas di Database
                bool isUpdate = false;
                int? existingTaskId = null;
                WorkTask? matchedExistingTask = null;

                if (!string.IsNullOrWhiteSpace(taskCode))
                {
                    dbTaskByCode.TryGetValue(taskCode.Trim(), out matchedExistingTask);
                }

                if (matchedExistingTask == null && matchedProjectId.HasValue && !string.IsNullOrWhiteSpace(title))
                {
                    dbTaskByProjAndTitle.TryGetValue($"{matchedProjectId.Value}|{NormalizeTitle(title)}", out matchedExistingTask);
                }

                if (matchedExistingTask == null && !string.IsNullOrWhiteSpace(title))
                {
                    dbTaskByTitle.TryGetValue(NormalizeTitle(title), out matchedExistingTask);
                }

                if (matchedExistingTask != null)
                {
                    isUpdate = true;
                    existingTaskId = matchedExistingTask.Id;
                    var currentProjName = matchedExistingTask.Project?.Name ?? "Tanpa Proyek";
                    if (!string.IsNullOrWhiteSpace(projectName) && !string.Equals(currentProjName, projectName, StringComparison.OrdinalIgnoreCase))
                    {
                        validationMessages.Add($"(Pembaruan & Pindah Proyek) Tugas #{matchedExistingTask.Id} ('{matchedExistingTask.Title}') dipindahkan dari proyek '{currentProjName}' ke '{projectName}'.");
                    }
                    else
                    {
                        validationMessages.Add($"(Pembaruan) Tugas #{matchedExistingTask.Id} ('{matchedExistingTask.Title}') sudah ada di sistem dan nilainya akan diperbarui dengan data ter-update.");
                    }
                }

                // Deteksi Duplikasi di dalam File Excel itu sendiri
                var identityKey = !string.IsNullOrWhiteSpace(taskCode)
                    ? "CODE:" + taskCode.Trim().ToUpperInvariant()
                    : "TITLE:" + (projectName?.Trim().ToUpperInvariant() ?? "DEF") + "|" + NormalizeTitle(title);

                if (seenBatchKeys.TryGetValue(identityKey, out var previousRowIdx))
                {
                    validationMessages.Add($"Duplikasi dengan baris #{previousRowIdx} di file ini terdeteksi; nilai versi ter-update akan digunakan.");
                }
                else
                {
                    seenBatchKeys[identityKey] = rowIndex;
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
                    validationMessages,
                    isUpdate,
                    existingTaskId
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

        var existingTasks = await _context.Tasks
            .Include(t => t.Project)
            .Where(t => t.CompanyId == companyId)
            .ToListAsync(cancellationToken);

        // Pre-build existing task lookup indexes
        var dbTaskByCode = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);
        var dbTaskByProjAndTitle = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);
        var dbTaskByTitle = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);

        foreach (var t in existingTasks)
        {
            dbTaskByCode[$"TK-{t.Id:D4}"] = t;
            dbTaskByCode[$"TK-{t.Id}"] = t;
            dbTaskByCode[t.Id.ToString()] = t;
            if (t.ProjectId.HasValue)
            {
                dbTaskByProjAndTitle[$"{t.ProjectId.Value}|{NormalizeTitle(t.Title)}"] = t;
            }
            dbTaskByTitle[NormalizeTitle(t.Title)] = t;
        }

        var company = companyId.HasValue
            ? await _context.Companies.FirstOrDefaultAsync(c => c.Id == companyId.Value, cancellationToken)
            : null;
        var defaultDomain = company?.Code != null ? $"{company.Code.ToLowerInvariant()}.local" : "trackerkerja.local";
        var companyDomain = !string.IsNullOrWhiteSpace(request.EmailDomain)
            ? request.EmailDomain.Trim().ToLowerInvariant().TrimStart('@')
            : defaultDomain;

        var defaultPassword = !string.IsNullOrWhiteSpace(request.DefaultPassword)
            ? request.DefaultPassword.Trim()
            : "TrackerKerja2026!";
        var defaultJobTitle = !string.IsNullOrWhiteSpace(request.DefaultJobTitle)
            ? request.DefaultJobTitle.Trim()
            : "Staff Pelaksana";

        // Cache lokal user untuk mencegah duplikasi pembuatan user di dalam batch
        var userCache = new Dictionary<string, AppUser>(StringComparer.OrdinalIgnoreCase);
        foreach (var u in existingUsers)
        {
            if (!string.IsNullOrEmpty(u.Email)) userCache[u.Email] = u;
            if (!string.IsNullOrEmpty(u.FullName)) userCache[u.FullName] = u;
            if (!string.IsNullOrEmpty(u.UserName)) userCache[u.UserName] = u;
            userCache[u.Id] = u;

            var local = GetEmailLocalPart(u.Email);
            if (!string.IsNullOrEmpty(local) && !userCache.ContainsKey(local)) userCache[local] = u;
            var normName = NormalizePersonName(u.FullName);
            if (!string.IsNullOrEmpty(normName) && !userCache.ContainsKey(normName)) userCache[normName] = u;
        }

        int totalUpdated = 0;
        var tasksToInsert = new List<WorkTask>();
        var batchTaskMap = new Dictionary<string, WorkTask>(StringComparer.OrdinalIgnoreCase);

        // Preload DefaultProject if specified
        Project? defaultProject = null;
        if (request.DefaultProjectId.HasValue)
        {
            defaultProject = existingProjects.FirstOrDefault(p => p.Id == request.DefaultProjectId.Value);
        }

        // 1. Deduplikasi & Seleksi Data Ter-update di dalam Batch Excel (Requirement 1 & 2)
        var deduplicatedRows = new List<TaskImportRowDto>();
        var batchIdentityMap = new Dictionary<string, TaskImportRowDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var row in candidateRows)
        {
            totalProcessed++;
            var identityKey = !string.IsNullOrWhiteSpace(row.TaskCode)
                ? "CODE:" + row.TaskCode.Trim().ToUpperInvariant()
                : "TITLE:" + (row.ProjectName?.Trim().ToUpperInvariant() ?? "DEF") + "|" + NormalizeTitle(row.Title);

            if (batchIdentityMap.TryGetValue(identityKey, out var existingRowInBatch))
            {
                // Jika ditemukan duplikasi di dalam file, ambil nilai dari versi yang ter-update
                if (IsCandidateMoreUpdated(row, existingRowInBatch))
                {
                    var merged = row with
                    {
                        Description = !string.IsNullOrWhiteSpace(row.Description) ? row.Description : existingRowInBatch.Description,
                        Milestone = !string.IsNullOrWhiteSpace(row.Milestone) ? row.Milestone : existingRowInBatch.Milestone,
                        Obstacle = !string.IsNullOrWhiteSpace(row.Obstacle) ? row.Obstacle : existingRowInBatch.Obstacle,
                        Solution = !string.IsNullOrWhiteSpace(row.Solution) ? row.Solution : existingRowInBatch.Solution
                    };
                    batchIdentityMap[identityKey] = merged;
                    int idx = deduplicatedRows.IndexOf(existingRowInBatch);
                    if (idx >= 0) deduplicatedRows[idx] = merged;
                }
            }
            else
            {
                batchIdentityMap[identityKey] = row;
                deduplicatedRows.Add(row);
            }
        }

        // 2. Proses Setiap Baris yang Sudah Ter-deduplikasi
        foreach (var row in deduplicatedRows)
        {
            // A. Resolve Proyek (Requirement 4: pengguna & tugas dapat ditempatkan ke proyek berbeda)
            Project? project = null;
            if (row.MatchedProjectId.HasValue)
            {
                project = existingProjects.FirstOrDefault(p => p.Id == row.MatchedProjectId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(row.ProjectName))
            {
                var cleanProjName = row.ProjectName.Trim();
                project = existingProjects.FirstOrDefault(p =>
                    p.Name.Equals(cleanProjName, StringComparison.OrdinalIgnoreCase));

                if (project == null)
                {
                    project = new Project
                    {
                        Name = cleanProjName,
                        CompanyId = companyId,
                        Color = PickColorForProject(cleanProjName),
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

            // B. Resolve PIC (Requirement 3: cari alamat email/nama serupa & cegah redundansi akun)
            string? assignedUserId = row.MatchedUserId;

            if (string.IsNullOrEmpty(assignedUserId) && !string.IsNullOrWhiteSpace(row.PicIdentifier))
            {
                var picKey = row.PicIdentifier.Trim();
                if (IsInvalidPersonValue(picKey))
                {
                    assignedUserId = null;
                }
                else if (userCache.TryGetValue(picKey, out var cachedUser))
                {
                    assignedUserId = cachedUser.Id;
                }
                else
                {
                    var (matchedId, resolvedName, resolvedEmail, isNew) = MatchUser(picKey, existingUsers, companyDomain);
                    if (matchedId != null)
                    {
                        assignedUserId = matchedId;
                        if (userCache.TryGetValue(matchedId, out var existingFound))
                        {
                            userCache[picKey] = existingFound;
                        }
                    }
                    else if (!string.IsNullOrEmpty(resolvedEmail) && userCache.TryGetValue(resolvedEmail, out var existingByEmail))
                    {
                        assignedUserId = existingByEmail.Id;
                        userCache[picKey] = existingByEmail;
                    }
                    else if (request.AutoCreateMissingUsers && !string.IsNullOrWhiteSpace(resolvedName) && !string.IsNullOrWhiteSpace(resolvedEmail) && !IsInvalidPersonValue(resolvedName) && !IsInvalidPersonValue(resolvedEmail))
                    {
                        // Buat akun pengguna baru jika benar-benar belum terdaftar
                        var dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == resolvedEmail, cancellationToken);
                        if (dbUser != null)
                        {
                            assignedUserId = dbUser.Id;
                            userCache[picKey] = dbUser;
                            userCache[resolvedName] = dbUser;
                            userCache[resolvedEmail] = dbUser;
                        }
                        else
                        {
                            var newUser = new AppUser
                            {
                                Id = "usr-" + Guid.NewGuid().ToString("N")[..8],
                                FullName = resolvedName,
                                Email = resolvedEmail,
                                NormalizedEmail = resolvedEmail.ToUpperInvariant(),
                                UserName = resolvedEmail,
                                NormalizedUserName = resolvedEmail.ToUpperInvariant(),
                                EmailConfirmed = true,
                                JobTitle = defaultJobTitle,
                                AvatarColor = PickAvatarColor(resolvedName),
                                PasswordHash = PasswordHasher.HashPassword(defaultPassword),
                                CompanyId = companyId,
                                IsApproved = request.AutoApproveNewUsers,
                                ApprovedAt = request.AutoApproveNewUsers ? DateTimeOffset.UtcNow : null,
                                CreatedAt = DateTimeOffset.UtcNow
                            };

                            _context.Users.Add(newUser);
                            await _context.SaveChangesAsync(cancellationToken);

                            existingUsers.Add(newUser);
                            userCache[picKey] = newUser;
                            userCache[resolvedName] = newUser;
                            userCache[resolvedEmail] = newUser;
                            userCache[newUser.Id] = newUser;

                            assignedUserId = newUser.Id;
                            totalUsersCreated++;
                            messages.Add($"Berhasil membuat akun personil baru '{newUser.FullName}' ({newUser.Email}) dengan jabatan '{newUser.JobTitle}'.");
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

            // C. Deteksi apakah tugas sudah ada di Database (Requirement 1 & 2: Cegah Duplikasi & Update Nilai Terbaru)
            WorkTask? targetTask = null;
            if (row.ExistingTaskId.HasValue)
            {
                targetTask = existingTasks.FirstOrDefault(t => t.Id == row.ExistingTaskId.Value);
            }
            if (targetTask == null && !string.IsNullOrWhiteSpace(row.TaskCode))
            {
                dbTaskByCode.TryGetValue(row.TaskCode.Trim(), out targetTask);
            }
            if (targetTask == null && project != null && !string.IsNullOrWhiteSpace(row.Title))
            {
                dbTaskByProjAndTitle.TryGetValue($"{project.Id}|{NormalizeTitle(row.Title)}", out targetTask);
            }
            if (targetTask == null && !string.IsNullOrWhiteSpace(row.Title))
            {
                dbTaskByTitle.TryGetValue(NormalizeTitle(row.Title), out targetTask);
            }

            if (targetTask != null)
            {
                // UPDATE: Perbarui data yang ada dengan data ter-update
                targetTask.Title = row.Title;
                if (!string.IsNullOrWhiteSpace(row.Description)) targetTask.Description = row.Description;
                targetTask.Priority = row.Priority;
                targetTask.Status = row.Status;
                targetTask.Progress = row.Progress;
                if (!string.IsNullOrWhiteSpace(row.Milestone)) targetTask.Milestone = row.Milestone;
                if (!string.IsNullOrWhiteSpace(row.Obstacle)) targetTask.Obstacle = row.Obstacle;
                if (!string.IsNullOrWhiteSpace(row.Solution)) targetTask.Solution = row.Solution;
                if (row.StartDate.HasValue) targetTask.StartDate = row.StartDate;
                if (row.DueDate.HasValue) targetTask.DueDate = row.DueDate;

                // Moveable ke project baru / berbeda jika ditentukan di sheet (Requirement 4)
                if (project != null)
                {
                    targetTask.ProjectId = project.Id;
                    targetTask.Project = project;
                }

                // Assign ke pengguna yang moveable di project tersebut (Requirement 4)
                if (!string.IsNullOrEmpty(assignedUserId))
                {
                    targetTask.AssignedToUserId = assignedUserId;
                }

                targetTask.UpdatedAt = DateTimeOffset.UtcNow;
                totalUpdated++;

                if (!string.IsNullOrWhiteSpace(row.TaskCode))
                {
                    batchTaskMap[row.TaskCode.Trim()] = targetTask;
                }
            }
            else
            {
                // INSERT: Tambahkan tugas baru
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
                    ProjectId = project?.Id,
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
        }

        if (tasksToInsert.Count > 0)
        {
            _context.Tasks.AddRange(tasksToInsert);
        }

        await _context.SaveChangesAsync(cancellationToken);
        totalImported = tasksToInsert.Count + totalUpdated;

        // Resolve relasi hierarki induk-anak tugas dalam batch
        bool hasHierarchyUpdates = false;
        foreach (var row in deduplicatedRows)
        {
            if (!string.IsNullOrWhiteSpace(row.ParentTaskCode))
            {
                WorkTask? currentTask = null;
                if (!string.IsNullOrWhiteSpace(row.TaskCode) && batchTaskMap.TryGetValue(row.TaskCode.Trim(), out var mapped))
                {
                    currentTask = mapped;
                }

                if (currentTask != null)
                {
                    var parentCode = row.ParentTaskCode.Trim();
                    if (batchTaskMap.TryGetValue(parentCode, out var parentTask) && parentTask.Id != currentTask.Id)
                    {
                        currentTask.ParentTaskId = parentTask.Id;
                        hasHierarchyUpdates = true;
                    }
                    else if (int.TryParse(parentCode, out var directParentId))
                    {
                        var parentExists = await _context.Tasks.AnyAsync(t => t.Id == directParentId && t.CompanyId == companyId, cancellationToken);
                        if (parentExists)
                        {
                            currentTask.ParentTaskId = directParentId;
                            hasHierarchyUpdates = true;
                        }
                    }
                }
            }
        }

        if (hasHierarchyUpdates)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (transaction != null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        var resultDetail = totalUsersCreated > 0
            ? $"Berhasil mengimpor {totalImported} tugas dari {totalProcessed} baris data ({totalUpdated} diperbarui, {totalProjectsCreated} proyek baru, {totalUsersCreated} akun personil baru dibuat)."
            : totalUpdated > 0
            ? $"Berhasil mengimpor {totalImported} tugas dari {totalProcessed} baris data ({totalUpdated} diperbarui, {totalProjectsCreated} proyek baru dibuat)."
            : $"Berhasil mengimpor {totalImported} tugas dari {totalProcessed} baris data ({totalProjectsCreated} proyek baru dibuat).";
        messages.Add(resultDetail);

            return new TaskImportResultDto(
                totalProcessed,
                totalImported,
                totalProjectsCreated,
                messages,
                totalUsersCreated,
                totalUpdated
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
            commitRes.Messages,
            commitRes.TotalUpdated
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

    private sealed record SheetPersonnel(string Name, string? Email, string? MatchedUserId);

    private static bool IsInvalidPersonValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        var v = value.Trim().ToLowerInvariant();

        if (v.StartsWith("#n/a") || v.StartsWith("n/a") && (v.Length <= 4 || v.Contains("sheet") || v.Contains("-") || v.Contains(":")))
            return true;

        return v is "n/a" or "#n/a" or "na" or "#na" or "-" or "--" or "---"
            or "null" or "none" or "nil" or "(blank)" or "blank"
            or "unassigned" or "tbd" or "belum ditentukan" or "tidak ada"
            or "kosong" or "0" or "undefined" or "#ref!" or "#value!"
            or "#name?" or "#div/0!" or "sheet" or "sheet1" or "sheet2"
            or "sheet 1" or "sheet 2" or "n.a" or "n.a." or "n/a.";
    }

    private static bool IsIgnoredSheet(IXLWorksheet ws, int sheetIndex, int totalSheets)
    {
        if (ws.FirstRowUsed() == null) return true;

        var nameClean = ws.Name.Trim();
        var nameLower = nameClean.ToLowerInvariant();

        // 1. Explicit generic ignored names (everywhere)
        var ignoredKeywords = new[]
        {
            "dashboard", "summary", "rekap", "ringkasan", "overview", "laporan",
            "master", "master data", "masterdata", "data master", "lookup", "look up",
            "reference", "referensi", "ref", "parameter", "dropdown", "dropdowns", "kamus",
            "template", "panduan", "guide", "readme", "petunjuk", "instruksi",
            "keterangan", "cover", "sampul", "intro", "monitoring", "grafik", "chart"
        };

        if (ignoredKeywords.Any(k => nameLower.Contains(k)))
        {
            // Exception: If this is the ONLY sheet in the workbook and has "template" with task data, allow it
            if (totalSheets == 1 && nameLower.Contains("template"))
            {
                var header = DetectHeaderRow(ws);
                if (header != null) return false;
            }
            return true;
        }

        // 2. Specific check for Sheet 1 (Index 1)
        // "sheet 1 jika berisikan informasi dashboard tidak perlu di ambil"
        if (sheetIndex == 1 && totalSheets > 1)
        {
            int maxRow = Math.Min(ws.LastRowUsed()?.RowNumber() ?? 1, 15);
            int maxCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 20);
            bool hasDashboardClues = false;

            for (int r = 1; r <= maxRow; r++)
            {
                var row = ws.Row(r);
                for (int c = 1; c <= maxCol; c++)
                {
                    var val = row.Cell(c).GetString().Trim().ToLowerInvariant();
                    if (val.Contains("dashboard") || val.Contains("ringkasan") || val.Contains("executive summary") ||
                        val.Contains("rekapitulasi") || val.Contains("total proyek") || val.Contains("total tugas") ||
                        val.Contains("kpi") || val.Contains("monitoring project") || val.Contains("overall progress"))
                    {
                        hasDashboardClues = true;
                        break;
                    }
                }
                if (hasDashboardClues) break;
            }

            var header = DetectHeaderRow(ws);
            if (hasDashboardClues || header == null)
            {
                return true;
            }

            var headers = Enumerable.Range(1, Math.Min(maxCol, 40))
                .Select(c => ws.Cell(header.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                .ToList();
            int titleCol = FindCol(headers, "judul tugas", "task title", "title", "judul", "aktivitas", "activity", "pekerjaan", "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "nama tugas", "nama task", "task name", "uraian", "kegiatan", "work item");
            if (titleCol == 0 && (nameLower.StartsWith("sheet") || hasDashboardClues))
            {
                return true;
            }
        }

        // 3. Specific check for Sheet 2 (Index 2)
        // "jika sheet 2 berisikan master data, juga tidak perlu di ambil"
        if (sheetIndex == 2 && totalSheets > 2)
        {
            int maxRow = Math.Min(ws.LastRowUsed()?.RowNumber() ?? 1, 15);
            int maxCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 20);
            bool hasMasterClues = false;

            for (int r = 1; r <= maxRow; r++)
            {
                var row = ws.Row(r);
                for (int c = 1; c <= maxCol; c++)
                {
                    var val = row.Cell(c).GetString().Trim().ToLowerInvariant();
                    if (val.Contains("master data") || val.Contains("data master") || val.Contains("lookup") ||
                        val.Contains("daftar pilihan") || val.Contains("dropdown") || val.Contains("referensi") ||
                        val.Contains("daftar status") || val.Contains("daftar prioritas") || val.Contains("daftar kategori"))
                    {
                        hasMasterClues = true;
                        break;
                    }
                }
                if (hasMasterClues) break;
            }

            var header = DetectHeaderRow(ws);
            if (hasMasterClues || header == null)
            {
                return true;
            }

            var headers = Enumerable.Range(1, Math.Min(maxCol, 40))
                .Select(c => ws.Cell(header.RowNumber(), c).GetString().Trim().ToLowerInvariant())
                .ToList();
            int titleCol = FindCol(headers, "judul tugas", "task title", "title", "judul", "aktivitas", "activity", "pekerjaan", "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "nama tugas", "nama task", "task name", "uraian", "kegiatan", "work item");
            if (titleCol == 0 && (nameLower.StartsWith("sheet") || hasMasterClues))
            {
                return true;
            }
        }

        // 4. Any sheet without a valid task header or title column should be ignored
        var sheetHeader = DetectHeaderRow(ws);
        if (sheetHeader == null) return true;

        var lastColNum = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 40);
        var hList = Enumerable.Range(1, lastColNum)
            .Select(c => ws.Cell(sheetHeader.RowNumber(), c).GetString().Trim().ToLowerInvariant())
            .ToList();
        int tCol = FindCol(hList, "judul tugas", "task title", "title", "judul", "aktivitas", "activity", "pekerjaan", "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "nama tugas", "nama task", "task name", "uraian", "kegiatan", "work item");
        if (tCol == 0)
        {
            tCol = FindCol(hList, "uraian", "kegiatan", "aktivitas", "pekerjaan", "item");
            if (tCol == 0 && hList.Count >= 2 && hList[0].Contains("no"))
            {
                tCol = 2;
            }
        }

        return tCol == 0;
    }

    private static string? FindEmailInWorksheet(IXLWorksheet ws, int headerRowNum, int emailCol)
    {
        // 1. Check metadata rows above header row
        int maxMetaRow = Math.Min(Math.Max(headerRowNum, 10), ws.LastRowUsed()?.RowNumber() ?? 10);
        int maxMetaCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 10, 20);

        for (int r = 1; r <= maxMetaRow; r++)
        {
            var row = ws.Row(r);
            for (int c = 1; c <= maxMetaCol; c++)
            {
                var cellStr = row.Cell(c).GetString().Trim();
                if (string.IsNullOrWhiteSpace(cellStr) || !cellStr.Contains('@')) continue;

                var match = Regex.Match(cellStr, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                if (match.Success)
                {
                    return match.Value.ToLowerInvariant();
                }
            }
        }

        // 2. Check the email column in the task rows
        if (emailCol > 0)
        {
            int lastRow = ws.LastRowUsed()?.RowNumber() ?? headerRowNum;
            for (int r = headerRowNum + 1; r <= lastRow; r++)
            {
                var cellStr = ws.Cell(r, emailCol).GetString().Trim();
                if (string.IsNullOrWhiteSpace(cellStr) || !cellStr.Contains('@') || IsInvalidPersonValue(cellStr)) continue;

                var match = Regex.Match(cellStr, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                if (match.Success)
                {
                    return match.Value.ToLowerInvariant();
                }
            }
        }

        return null;
    }

    private static SheetPersonnel? ResolveSheetPersonnel(
        IXLWorksheet ws,
        int headerRowNum,
        int emailCol,
        List<AppUser> existingUsers,
        string companyDomain)
    {
        var sheetPersonName = ExtractPersonFromSheetName(ws.Name);
        string? emailInSheet = null;

        // Check metadata rows strictly above header row
        if (headerRowNum > 1)
        {
            int maxMetaRow = Math.Min(headerRowNum - 1, 15);
            int maxCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 10, 15);
            for (int r = 1; r <= maxMetaRow; r++)
            {
                var row = ws.Row(r);
                for (int c = 1; c <= maxCol; c++)
                {
                    var val = row.Cell(c).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(val)) continue;

                    if (string.IsNullOrWhiteSpace(sheetPersonName))
                    {
                        var nameMatch = Regex.Match(val, @"^(?:nama(?:\s*personil|\s*karyawan|\s*user)?|pic|personil|petugas)\s*[:=]\s*(.+)$", RegexOptions.IgnoreCase);
                        if (nameMatch.Success)
                        {
                            var cand = nameMatch.Groups[1].Value.Trim();
                            if (!IsInvalidPersonValue(cand) && cand.Length >= 2)
                            {
                                sheetPersonName = FormatDisplayName(cand);
                            }
                        }
                    }

                    if (string.IsNullOrWhiteSpace(emailInSheet) && val.Contains('@'))
                    {
                        var match = Regex.Match(val, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                        if (match.Success)
                        {
                            emailInSheet = match.Value.ToLowerInvariant();
                        }
                    }
                }
            }
        }

        // If sheet name itself contains an email
        if (string.IsNullOrWhiteSpace(emailInSheet) && sheetPersonName != null && sheetPersonName.Contains('@'))
        {
            emailInSheet = sheetPersonName.ToLowerInvariant();
            sheetPersonName = FormatDisplayName(sheetPersonName.Split('@')[0]);
        }

        // Only treat as personnel sheet if a person's name or metadata was detected
        if (string.IsNullOrWhiteSpace(sheetPersonName))
        {
            return null;
        }

        // If sheet is a personnel sheet, search email column in task rows if not already found in metadata
        if (string.IsNullOrWhiteSpace(emailInSheet) && emailCol > 0)
        {
            int lastRow = ws.LastRowUsed()?.RowNumber() ?? headerRowNum;
            for (int r = headerRowNum + 1; r <= lastRow; r++)
            {
                var cellStr = ws.Cell(r, emailCol).GetString().Trim();
                if (string.IsNullOrWhiteSpace(cellStr) || !cellStr.Contains('@') || IsInvalidPersonValue(cellStr)) continue;

                var match = Regex.Match(cellStr, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                if (match.Success)
                {
                    emailInSheet = match.Value.ToLowerInvariant();
                    break;
                }
            }
        }

        var (matchedId, resolvedName, resolvedEmail, _) = MatchUser(sheetPersonName, emailInSheet, existingUsers, companyDomain);

        var finalName = !string.IsNullOrWhiteSpace(resolvedName)
            ? resolvedName
            : sheetPersonName;

        var finalEmail = !string.IsNullOrWhiteSpace(resolvedEmail)
            ? resolvedEmail
            : emailInSheet;

        return new SheetPersonnel(finalName, finalEmail, matchedId);
    }

    private static string? ExtractPersonFromSheetName(string sheetName)
    {
        if (string.IsNullOrWhiteSpace(sheetName)) return null;

        var clean = sheetName.Trim();
        var lower = clean.ToLowerInvariant();

        var genericKeywords = new[]
        {
            "sheet", "sheets", "halaman", "rekap", "summary", "dashboard", "lookup",
            "master", "data", "tugas", "tasks", "task", "table", "all", "export",
            "import", "panduan", "guide", "readme", "template", "report", "daftar",
            "list", "project", "projects", "proyek", "item", "items", "referensi",
            "reference", "dropdown", "parameter", "grafik", "chart", "monitoring"
        };

        if (genericKeywords.Any(g => lower == g ||
                                     lower.StartsWith(g + " ") ||
                                     lower.StartsWith(g + "_") ||
                                     lower.StartsWith(g + "-") ||
                                     Regex.IsMatch(lower, $"^{g}\\s*\\d+$")))
        {
            var afterHyphen = clean.Split('-', ':');
            if (afterHyphen.Length > 1)
            {
                var candidate = afterHyphen[^1].Trim();
                var candidateLower = candidate.ToLowerInvariant();
                if (candidate.Length >= 2 && !genericKeywords.Contains(candidateLower) && !IsInvalidPersonValue(candidate))
                {
                    clean = candidate;
                }
                else
                {
                    return null;
                }
            }
            else
            {
                var matchParen = Regex.Match(clean, @"\(([^)]+)\)");
                if (matchParen.Success)
                {
                    var candidate = matchParen.Groups[1].Value.Trim();
                    var candidateLower = candidate.ToLowerInvariant();
                    if (candidate.Length >= 2 && !genericKeywords.Contains(candidateLower) && !IsInvalidPersonValue(candidate))
                    {
                        clean = candidate;
                    }
                    else
                    {
                        return null;
                    }
                }
                else
                {
                    return null;
                }
            }
        }

        clean = Regex.Replace(clean, @"^\s*\d+[\s\.\-_/:]+", "").Trim();
        clean = Regex.Replace(clean, @"^\[.*?\]\s*", "").Trim();
        clean = Regex.Replace(clean, @"^PIC\s*[-:_]?\s*", "", RegexOptions.IgnoreCase).Trim();

        if (!clean.Contains('@'))
        {
            clean = Regex.Replace(clean, @"\s*\([^)]*\)$", "").Trim();
        }

        if (clean.Contains('_') && !clean.Contains('@'))
        {
            clean = clean.Replace('_', ' ').Trim();
        }

        clean = clean.Trim('[', ']', '(', ')', '_', '-', ' ', ':');

        if (IsInvalidPersonValue(clean) || clean.Length < 2)
        {
            return null;
        }

        if (!clean.Any(char.IsLetter))
        {
            return null;
        }

        if (genericKeywords.Contains(clean.ToLowerInvariant()))
        {
            return null;
        }

        return clean;
    }

    private static (string? userId, string? userName, string? userEmail, bool isNew) MatchUser(
        string picIdentifier,
        List<AppUser> existingUsers,
        string? companyDomain = null)
    {
        return MatchUser(picIdentifier, null, existingUsers, companyDomain);
    }

    private static (string? userId, string? userName, string? userEmail, bool isNew) MatchUser(
        string picIdentifier,
        string? knownEmail,
        List<AppUser> existingUsers,
        string? companyDomain = null)
    {
        if (IsInvalidPersonValue(picIdentifier))
        {
            if (!string.IsNullOrWhiteSpace(knownEmail) && !IsInvalidPersonValue(knownEmail))
            {
                picIdentifier = knownEmail;
            }
            else
            {
                return (null, null, null, false);
            }
        }

        var trimmed = picIdentifier.Trim();
        var domain = string.IsNullOrWhiteSpace(companyDomain) ? "trackerkerja.local" : companyDomain.Trim().ToLowerInvariant().TrimStart('@');
        var inputNormName = NormalizePersonName(trimmed);
        var inputLocalPart = GetEmailLocalPart(trimmed);

        // Tier 1: Exact match on Id, Email, UserName, or FullName (case-insensitive)
        var foundByExact = existingUsers.FirstOrDefault(u =>
            (!string.IsNullOrEmpty(u.Email) && u.Email.Equals(trimmed, StringComparison.OrdinalIgnoreCase)) ||
            (!string.IsNullOrEmpty(u.UserName) && u.UserName.Equals(trimmed, StringComparison.OrdinalIgnoreCase)) ||
            (!string.IsNullOrEmpty(u.FullName) && u.FullName.Equals(trimmed, StringComparison.OrdinalIgnoreCase)) ||
            u.Id.Equals(trimmed, StringComparison.OrdinalIgnoreCase));

        if (foundByExact != null)
        {
            return (foundByExact.Id, foundByExact.FullName, foundByExact.Email, false);
        }

        // Tier 2: Normalized Name Matching
        if (!string.IsNullOrEmpty(inputNormName))
        {
            var foundByNormName = existingUsers.FirstOrDefault(u =>
                NormalizePersonName(u.FullName) == inputNormName);
            if (foundByNormName != null)
            {
                return (foundByNormName.Id, foundByNormName.FullName, foundByNormName.Email, false);
            }
        }

        // Tier 3: Email Local-Part Cross Matching
        if (!string.IsNullOrEmpty(inputLocalPart))
        {
            var foundByLocal = existingUsers.FirstOrDefault(u =>
            {
                var userLocal = GetEmailLocalPart(u.Email);
                var userNorm = NormalizePersonName(u.FullName);
                return (!string.IsNullOrEmpty(userLocal) && userLocal == inputLocalPart) ||
                       (!string.IsNullOrEmpty(userNorm) && userNorm == inputLocalPart) ||
                       (!string.IsNullOrEmpty(userLocal) && userLocal == inputNormName);
            });

            if (foundByLocal != null)
            {
                return (foundByLocal.Id, foundByLocal.FullName, foundByLocal.Email, false);
            }
        }

        // Tier 4: Token overlap matching (First Name and Last Name)
        var inputTokens = trimmed
            .Split(new[] { ' ', '.', '_', '-', ',' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 2 && !t.Any(char.IsDigit))
            .Select(t => t.ToLowerInvariant())
            .ToList();

        if (inputTokens.Count >= 2)
        {
            foreach (var u in existingUsers)
            {
                if (string.IsNullOrWhiteSpace(u.FullName)) continue;
                var userTokens = u.FullName
                    .Split(new[] { ' ', '.', '_', '-', ',' }, StringSplitOptions.RemoveEmptyEntries)
                    .Where(t => t.Length >= 2 && !t.Any(char.IsDigit))
                    .Select(t => t.ToLowerInvariant())
                    .ToList();

                if (userTokens.Count >= 2 &&
                    inputTokens[0] == userTokens[0] &&
                    inputTokens[^1] == userTokens[^1])
                {
                    return (u.Id, u.FullName, u.Email, false);
                }

                if (inputTokens.All(it => userTokens.Contains(it)) ||
                    userTokens.All(ut => inputTokens.Contains(ut)))
                {
                    return (u.Id, u.FullName, u.Email, false);
                }
            }
        }

        // Tier 5: Levenshtein distance similarity on normalized names
        if (inputNormName.Length >= 4)
        {
            foreach (var u in existingUsers)
            {
                var userNorm = NormalizePersonName(u.FullName);
                if (userNorm.Length >= 4 && CalculateSimilarity(inputNormName, userNorm) >= 0.85)
                {
                    return (u.Id, u.FullName, u.Email, false);
                }
            }
        }

        // Tier 5.5: Check known email match against existing users if picIdentifier did not match
        if (!string.IsNullOrWhiteSpace(knownEmail))
        {
            var foundByKnownEmail = existingUsers.FirstOrDefault(u =>
                !string.IsNullOrEmpty(u.Email) && u.Email.Equals(knownEmail.Trim(), StringComparison.OrdinalIgnoreCase));
            if (foundByKnownEmail != null)
            {
                return (foundByKnownEmail.Id, foundByKnownEmail.FullName, foundByKnownEmail.Email, false);
            }
        }

        // Tier 6: Generate or use known email
        var formattedName = FormatDisplayName(trimmed.Contains('@') ? trimmed.Split('@')[0] : trimmed);
        var emailSlug = !string.IsNullOrWhiteSpace(knownEmail) && knownEmail.Contains('@')
            ? knownEmail.Trim().ToLowerInvariant()
            : (trimmed.Contains('@')
                ? trimmed.ToLowerInvariant()
                : GenerateEmailSlug(formattedName, domain));

        var userWithSameEmail = existingUsers.FirstOrDefault(u =>
            u.Email != null && u.Email.Equals(emailSlug, StringComparison.OrdinalIgnoreCase));
        if (userWithSameEmail != null)
        {
            return (userWithSameEmail.Id, userWithSameEmail.FullName, userWithSameEmail.Email, false);
        }

        return (null, formattedName, emailSlug, true);
    }

    private static string NormalizePersonName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;
        var lower = name.Trim().ToLowerInvariant();

        // Strip email domain if present
        var atIdx = lower.IndexOf('@');
        if (atIdx >= 0) lower = lower[..atIdx];

        // Strip common Indonesian titles and honorifics
        string[] titles = ["ir.", "ir ", "dr.", "dr ", "drs.", "drs ", "prof.", "prof ", "h.", "h ", "hj.", "hj ", "pak ", "ibu ", "sdr.", "sdr ", "sdr/i ", "mas ", "mbak "];
        foreach (var t in titles)
        {
            if (lower.StartsWith(t))
            {
                lower = lower[t.Length..].Trim();
            }
        }

        // Strip common academic suffixes
        string[] suffixes = [", s.kom", " s.kom", ", m.kom", " m.kom", ", s.t.", " s.t", ", m.t.", " m.t", ", s.e.", " s.e", ", m.m.", " m.m", ", b.sc", " b.sc", ", m.sc", " m.sc", ", ph.d", " ph.d", ", s.pd", " s.pd"];
        foreach (var s in suffixes)
        {
            if (lower.EndsWith(s))
            {
                lower = lower[..^s.Length].Trim();
            }
        }

        var chars = lower.Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private static string GetEmailLocalPart(string? emailOrName)
    {
        if (string.IsNullOrWhiteSpace(emailOrName)) return string.Empty;
        var atIdx = emailOrName.IndexOf('@');
        var local = atIdx >= 0 ? emailOrName[..atIdx] : emailOrName;
        var chars = local.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private static string NormalizeTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return string.Empty;
        var chars = title.Trim().ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private static double CalculateSimilarity(string s1, string s2)
    {
        if (string.IsNullOrEmpty(s1) || string.IsNullOrEmpty(s2)) return 0.0;
        if (s1.Equals(s2, StringComparison.OrdinalIgnoreCase)) return 1.0;

        int len1 = s1.Length;
        int len2 = s2.Length;
        var d = new int[len1 + 1, len2 + 1];

        for (int i = 0; i <= len1; i++) d[i, 0] = i;
        for (int j = 0; j <= len2; j++) d[0, j] = j;

        for (int i = 1; i <= len1; i++)
        {
            for (int j = 1; j <= len2; j++)
            {
                int cost = (s1[i - 1] == s2[j - 1]) ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost
                );
            }
        }

        int maxLen = Math.Max(len1, len2);
        return 1.0 - (double)d[len1, len2] / maxLen;
    }

    private static bool IsCandidateMoreUpdated(TaskImportRowDto candidate, TaskImportRowDto current)
    {
        // 1. Progress: higher progress represents more recent state
        if (candidate.Progress > current.Progress) return true;
        if (candidate.Progress < current.Progress) return false;

        // 2. Status: Done > InProgress > Todo
        if (candidate.Status > current.Status) return true;
        if (candidate.Status < current.Status) return false;

        // 3. DueDate or StartDate: later dates are more updated
        if (candidate.DueDate.HasValue && (!current.DueDate.HasValue || candidate.DueDate > current.DueDate)) return true;
        if (!candidate.DueDate.HasValue && current.DueDate.HasValue) return false;

        // 4. Richness of content (description, obstacle, solution)
        int candidateScore = (string.IsNullOrWhiteSpace(candidate.Description) ? 0 : 1)
                           + (string.IsNullOrWhiteSpace(candidate.Solution) ? 0 : 1)
                           + (string.IsNullOrWhiteSpace(candidate.Obstacle) ? 0 : 1);
        int currentScore = (string.IsNullOrWhiteSpace(current.Description) ? 0 : 1)
                         + (string.IsNullOrWhiteSpace(current.Solution) ? 0 : 1)
                         + (string.IsNullOrWhiteSpace(current.Obstacle) ? 0 : 1);
        if (candidateScore > currentScore) return true;
        if (candidateScore < currentScore) return false;

        // 5. Default to latter row index in the spreadsheet
        return candidate.RowIndex > current.RowIndex;
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


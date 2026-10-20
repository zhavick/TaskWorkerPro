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
                "No.", "project_name", "requirement_code", "title", "status",
                "priority", "jenis_task", "module_name", "bug_type", "progress",
                "start_date", "due_date", "completed_date", "developer_emails", "ba_emails",
                "infra_emails", "master_data_emails", "tester_emails", "technical_writer_emails", "quality_assurance_emails",
                "system_analyst_emails", "kendala", "solusi", "evidence", "kode_task", "Milestone"
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
            ws.Cell(2, 1).Value = 1;
            ws.Cell(2, 2).Value = "Integrasi TCES TICS";
            ws.Cell(2, 3).Value = "REQ-001";
            ws.Cell(2, 4).Value = "Sharing knowledge mengenai sistem business flow TCIS dan TCES";
            ws.Cell(2, 5).Value = "DONE";
            ws.Cell(2, 6).Value = "HIGH";
            ws.Cell(2, 7).Value = "NEW_APPLICATION";
            ws.Cell(2, 8).Value = "TCES";
            ws.Cell(2, 9).Value = "";
            ws.Cell(2, 10).Value = 100;
            ws.Cell(2, 11).Value = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
            ws.Cell(2, 12).Value = DateTime.UtcNow.AddDays(-2).ToString("yyyy-MM-dd");
            ws.Cell(2, 13).Value = DateTime.UtcNow.AddDays(-2).ToString("yyyy-MM-dd");
            ws.Cell(2, 14).Value = "haviz.indra@elistec.com";
            ws.Cell(2, 15).Value = "syafix.said@elistec.com";
            ws.Cell(2, 16).Value = "";
            ws.Cell(2, 17).Value = "";
            ws.Cell(2, 18).Value = "";
            ws.Cell(2, 19).Value = "athallah.bariq@elistec.com";
            ws.Cell(2, 20).Value = "mohammad.danang@elistec.com";
            ws.Cell(2, 21).Value = "";
            ws.Cell(2, 22).Value = "";
            ws.Cell(2, 23).Value = "Mempelajari business flow dari TCIS dan TCES";
            ws.Cell(2, 24).Value = "";
            ws.Cell(2, 25).Value = "TASK-001";
            ws.Cell(2, 26).Value = "Sprint 1";

            // Sample row 2
            ws.Cell(3, 1).Value = 2;
            ws.Cell(3, 2).Value = "API Settlement Payment";
            ws.Cell(3, 3).Value = "REQ-002";
            ws.Cell(3, 4).Value = "Implementasi endpoint callback pembayaran virtual account";
            ws.Cell(3, 5).Value = "IN_PROGRESS";
            ws.Cell(3, 6).Value = "HIGH";
            ws.Cell(3, 7).Value = "ENHANCEMENT";
            ws.Cell(3, 8).Value = "Transaksi dan Settlement";
            ws.Cell(3, 9).Value = "";
            ws.Cell(3, 10).Value = 60;
            ws.Cell(3, 11).Value = DateTime.UtcNow.AddDays(-2).ToString("yyyy-MM-dd");
            ws.Cell(3, 12).Value = DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd");
            ws.Cell(3, 13).Value = "";
            ws.Cell(3, 14).Value = "haviz.indra@elistec.com";
            ws.Cell(3, 15).Value = "syafix.said@elistec.com";
            ws.Cell(3, 16).Value = "";
            ws.Cell(3, 17).Value = "";
            ws.Cell(3, 18).Value = "";
            ws.Cell(3, 19).Value = "";
            ws.Cell(3, 20).Value = "mohammad.danang@elistec.com";
            ws.Cell(3, 21).Value = "";
            ws.Cell(3, 22).Value = "Menunggu integrasi payment gateway";
            ws.Cell(3, 23).Value = "Koordinasi dengan penyedia gateway";
            ws.Cell(3, 24).Value = "";
            ws.Cell(3, 25).Value = "TASK-002";
            ws.Cell(3, 26).Value = "Sprint 1";

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
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream, cancellationToken);
        memoryStream.Position = 0;
        using var workbook = new XLWorkbook(memoryStream);

        if (!companyId.HasValue)
        {
            var firstCompany = await _context.Companies.FirstOrDefaultAsync(cancellationToken);
            if (firstCompany != null) companyId = firstCompany.Id;
        }

        var existingProjects = await _context.Projects
            .Where(p => !companyId.HasValue || p.CompanyId == companyId || p.CompanyId == null)
            .ToListAsync(cancellationToken);

        var existingUsers = await _context.Users
            .Where(u => !companyId.HasValue || u.CompanyId == companyId || u.CompanyId == null)
            .ToListAsync(cancellationToken);

        foreach (var u in existingUsers)
        {
            if (!string.IsNullOrEmpty(u.Email) && !IsEmailMatchingPerson(u.Email, u.FullName))
            {
                var synced = DeriveNameFromEmail(u.Email);
                if (!string.IsNullOrWhiteSpace(synced))
                {
                    u.FullName = synced;
                }
            }
        }

        var existingTasks = await _context.Tasks
            .Include(t => t.Project)
            .Where(t => !companyId.HasValue || t.CompanyId == companyId)
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

            var emailCols = new List<int>();
            for (int c = 1; c <= headers.Count; c++)
            {
                var h = headers[c - 1];
                if (h.Contains("email") || h.EndsWith("_emails") || h.Contains("e-mail"))
                {
                    emailCols.Add(c);
                }
            }

            int codeCol = FindCol(headers, "kode_task", "kode task", "kode tugas", "task code", "task_code", "code", "kode", "no tugas", "task id", "id");
            int parentCodeCol = FindCol(headers, "requirement_code", "requirement code", "kode induk tugas", "parent task code", "parent_code", "parent code", "induk tugas", "parent");
            int projectCol = FindCol(headers, "project_name", "nama proyek", "project", "proyek", "nama project", "aplikasi", "nama aplikasi", "sistem");
            int milestoneCol = FindCol(headers, "milestone", "modul", "module_name", "jenis_task", "jenis task", "kategori", "fitur", "tahapan");
            int titleCol = FindCol(headers, "judul tugas", "judul", "task title", "title", "tugas", "task", "tasks", "nama tugas", "nama task", "task name", "aktivitas", "activity", "pekerjaan", "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "uraian", "kegiatan", "work item", "work items", "action item", "fitur", "rincian tugas", "daftar tugas", "item");
            int descCol = FindCol(headers, "deskripsi", "description", "keterangan", "detail", "catatan");
            int priorityCol = FindCol(headers, "prioritas", "priority", "urgensi", "level");
            int statusCol = FindCol(headers, "status", "keadaan", "progress status", "kondisi");
            int progressCol = FindCol(headers, "progres", "progress", "%", "persentase", "bobot", "persen");
            int startDateCol = FindCol(headers, "tanggal mulai", "start_date", "start date", "mulai", "tgl mulai", "start");
            int dueDateCol = FindCol(headers, "due_date", "target selesai", "due date", "selesai", "target", "deadline", "tgl selesai", "due");
            int completedDateCol = FindCol(headers, "completed_date", "completed date", "tanggal selesai", "tgl selesai");
            int picEmailCol = FindCol(headers, "email pic", "developer_emails", "pic email", "email user", "user email", "email");
            int picNameCol = FindCol(headers, "email / nama pic", "nama pic", "pic", "penanggung jawab", "petugas", "pelaksana", "developer", "assigned to", "assignee", "nama staf", "nama personil", "person", "nama pengguna", "nama user");
            int obstacleCol = FindCol(headers, "kendala", "obstacle", "masalah", "hambatan", "issue");
            int solutionCol = FindCol(headers, "solusi", "solution", "tindakan", "penyelesaian");
            int moduleCol = FindCol(headers, "module_name", "modul", "module");
            int jenisTaskCol = FindCol(headers, "jenis_task", "jenis task");
            int bugTypeCol = FindCol(headers, "bug_type", "bug type");
            int evidenceCol = FindCol(headers, "evidence", "bukti");

            // Jika titleCol tidak terdeteksi via nama umum, gunakan fallback kolom teks pertama yang relevan
            if (titleCol == 0)
            {
                titleCol = FindCol(headers, "tugas", "task", "uraian", "kegiatan", "aktivitas", "pekerjaan", "item");
                if (titleCol == 0 && headers.Count >= 2)
                {
                    titleCol = headers[0].Contains("no") && headers.Count > 1 ? 2 : 1;
                }
            }

            if (titleCol == 0) continue;

            // Ekstrak nama personil, email, & proyek dari sheet (atau header metadata)
            var sheetPersonnel = ResolveSheetPersonnel(ws, workbook, headerRow.RowNumber(), emailCols, existingUsers, companyDomain);

            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;

            for (int r = headerRow.RowNumber() + 1; r <= lastRow; r++)
            {
                var title = ws.Cell(r, titleCol).GetString().Trim();
                var taskCode = codeCol > 0 ? ws.Cell(r, codeCol).GetString().Trim() : null;
                var parentTaskCode = parentCodeCol > 0 ? ws.Cell(r, parentCodeCol).GetString().Trim() : null;
                var projectName = projectCol > 0 ? ws.Cell(r, projectCol).GetString().Trim() : null;
                if (string.IsNullOrWhiteSpace(projectName) && !string.IsNullOrWhiteSpace(sheetPersonnel?.DefaultProjectName))
                {
                    projectName = sheetPersonnel.DefaultProjectName;
                }
                var desc = descCol > 0 ? ws.Cell(r, descCol).GetString().Trim() : null;
                if (string.IsNullOrWhiteSpace(desc))
                {
                    var descParts = new List<string>();
                    if (moduleCol > 0)
                    {
                        var mVal = ws.Cell(r, moduleCol).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(mVal)) descParts.Add($"Modul: {mVal}");
                    }
                    if (jenisTaskCol > 0)
                    {
                        var jtVal = ws.Cell(r, jenisTaskCol).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(jtVal)) descParts.Add($"Jenis: {jtVal}");
                    }
                    if (bugTypeCol > 0)
                    {
                        var btVal = ws.Cell(r, bugTypeCol).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(btVal)) descParts.Add($"Bug: {btVal}");
                    }
                    if (evidenceCol > 0)
                    {
                        var evVal = ws.Cell(r, evidenceCol).GetString().Trim();
                        if (!string.IsNullOrWhiteSpace(evVal)) descParts.Add($"Evidence: {evVal}");
                    }
                    if (descParts.Count > 0)
                    {
                        desc = string.Join(" | ", descParts);
                    }
                }
                var priorityText = priorityCol > 0 ? ws.Cell(r, priorityCol).GetString().Trim() : null;
                var statusText = statusCol > 0 ? ws.Cell(r, statusCol).GetString().Trim() : null;
                var progress = progressCol > 0 ? ParseProgress(ws.Cell(r, progressCol)) : 0;
                var startDate = startDateCol > 0 ? ParseDate(ws.Cell(r, startDateCol)) : null;
                var dueDate = dueDateCol > 0 ? ParseDate(ws.Cell(r, dueDateCol)) : null;
                if (!dueDate.HasValue && completedDateCol > 0)
                {
                    dueDate = ParseDate(ws.Cell(r, completedDateCol));
                }
                var milestone = milestoneCol > 0 ? ws.Cell(r, milestoneCol).GetString().Trim() : null;
                var obstacle = obstacleCol > 0 ? ws.Cell(r, obstacleCol).GetString().Trim() : null;
                var solution = solutionCol > 0 ? ws.Cell(r, solutionCol).GetString().Trim() : null;

                // Tentukan nama/email PIC:
                string? picText = null;
                string? rowEmail = null;

                if (picEmailCol > 0)
                {
                    var rawEmail = ws.Cell(r, picEmailCol).GetString().Trim();
                    if (!IsInvalidPersonValue(rawEmail))
                    {
                        picText = rawEmail;
                        if (rawEmail.Contains('@')) rowEmail = rawEmail;
                    }
                }
                if (string.IsNullOrWhiteSpace(picText) && picNameCol > 0)
                {
                    var rawName = ws.Cell(r, picNameCol).GetString().Trim();
                    if (!IsInvalidPersonValue(rawName)) picText = rawName;
                }

                if (sheetPersonnel != null)
                {
                    // Multi-role personnel tracking sheet (such as Task Tracker v2.xlsx with developer_emails, ba_emails, etc.)
                    // or where row has no explicit valid PIC or row PIC matches sheet person:
                    if (emailCols.Count > 1 ||
                        string.IsNullOrWhiteSpace(picText) ||
                        IsInvalidPersonValue(picText) ||
                        sheetPersonnel.Name.Equals(picText, StringComparison.OrdinalIgnoreCase) ||
                        NormalizePersonName(sheetPersonnel.Name) == NormalizePersonName(picText) ||
                        (!string.IsNullOrEmpty(rowEmail) && IsEmailMatchingPerson(rowEmail, sheetPersonnel.Name)))
                    {
                        picText = !string.IsNullOrWhiteSpace(rowEmail) && IsEmailMatchingPerson(rowEmail, sheetPersonnel.Name)
                            ? rowEmail
                            : sheetPersonnel.Name;
                        rowEmail = sheetPersonnel.Email;
                    }
                }

                var effectiveEmail = rowEmail;
                if (string.IsNullOrWhiteSpace(effectiveEmail) && sheetPersonnel != null)
                {
                    effectiveEmail = sheetPersonnel.Email;
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
                string? resolvedPicEmail = effectiveEmail;

                var picToMatch = !string.IsNullOrWhiteSpace(picText) && !IsInvalidPersonValue(picText)
                    ? picText
                    : (!string.IsNullOrWhiteSpace(effectiveEmail) && !IsInvalidPersonValue(effectiveEmail) ? effectiveEmail : null);

                if (!string.IsNullOrWhiteSpace(picToMatch))
                {
                    var (matchedId, resolvedName, resolvedEmail, isNew) = MatchUser(
                        picToMatch,
                        effectiveEmail,
                        existingUsers,
                        companyDomain);

                    if (!string.IsNullOrWhiteSpace(resolvedEmail))
                    {
                        resolvedPicEmail = resolvedEmail;
                    }

                    if (!isNew && matchedId != null)
                    {
                        matchedUserId = matchedId;
                        matchedUserName = resolvedName;
                    }
                    else if (!string.IsNullOrWhiteSpace(resolvedName) && !IsInvalidPersonValue(resolvedName))
                    {
                        matchedUserName = resolvedName;
                        validationMessages.Add($"Personil '{resolvedName}' ({resolvedPicEmail}) akan otomatis dibuatkan akun pengguna baru.");
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
                    existingTaskId,
                    PicEmail: resolvedPicEmail
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

        if (!companyId.HasValue)
        {
            var firstCompany = await _context.Companies.FirstOrDefaultAsync(cancellationToken);
            if (firstCompany != null) companyId = firstCompany.Id;
        }

        var isRelational = _context.Database.IsRelational();
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = isRelational ? await _context.Database.BeginTransactionAsync(cancellationToken) : null;

        var existingProjects = await _context.Projects
            .Where(p => !companyId.HasValue || p.CompanyId == companyId || p.CompanyId == null)
            .ToListAsync(cancellationToken);

        var existingUsers = await _context.Users
            .Where(u => !companyId.HasValue || u.CompanyId == companyId || u.CompanyId == null)
            .ToListAsync(cancellationToken);

        var existingTasks = await _context.Tasks
            .Include(t => t.Project)
            .Where(t => !companyId.HasValue || t.CompanyId == companyId)
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
        bool dbHasMismatchedUsers = false;
        foreach (var u in existingUsers)
        {
            if (!string.IsNullOrEmpty(u.Email) && !IsEmailMatchingPerson(u.Email, u.FullName))
            {
                var synced = DeriveNameFromEmail(u.Email);
                if (!string.IsNullOrWhiteSpace(synced))
                {
                    u.FullName = synced;
                    u.AvatarColor = PickAvatarColor(synced);
                    dbHasMismatchedUsers = true;
                }
            }

            if (!string.IsNullOrEmpty(u.Email)) userCache[u.Email] = u;
            if (!string.IsNullOrEmpty(u.FullName)) userCache[u.FullName] = u;
            if (!string.IsNullOrEmpty(u.UserName)) userCache[u.UserName] = u;
            userCache[u.Id] = u;

            var local = GetEmailLocalPart(u.Email);
            if (!string.IsNullOrEmpty(local) && !userCache.ContainsKey(local)) userCache[local] = u;
            var normName = NormalizePersonName(u.FullName);
            if (!string.IsNullOrEmpty(normName) && !userCache.ContainsKey(normName)) userCache[normName] = u;
        }

        if (dbHasMismatchedUsers)
        {
            await _context.SaveChangesAsync(cancellationToken);
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
                    await _context.SaveChangesAsync(cancellationToken);
                    existingProjects.Add(project);
                    totalProjectsCreated++;
                }
            }

            if (project == null && defaultProject != null)
            {
                project = defaultProject;
            }

            // B. Resolve PIC (Requirement 3: cari alamat email/nama serupa & buatkan user baru dengan nama & email tersebut)
            string? assignedUserId = row.MatchedUserId;

            if (!string.IsNullOrEmpty(assignedUserId))
            {
                var existingFound = userCache.TryGetValue(assignedUserId, out var cached)
                    ? cached
                    : existingUsers.FirstOrDefault(u => u.Id == assignedUserId);
                if (existingFound != null && !string.IsNullOrEmpty(existingFound.Email) && !IsEmailMatchingPerson(existingFound.Email, existingFound.FullName))
                {
                    var syncedName = !string.IsNullOrWhiteSpace(row.MatchedUserName) && IsEmailMatchingPerson(existingFound.Email, row.MatchedUserName)
                        ? row.MatchedUserName
                        : DeriveNameFromEmail(existingFound.Email);
                    if (!string.IsNullOrWhiteSpace(syncedName))
                    {
                        existingFound.FullName = syncedName;
                        existingFound.AvatarColor = PickAvatarColor(syncedName);
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                }
            }

            if (string.IsNullOrEmpty(assignedUserId))
            {
                var picKey = !string.IsNullOrWhiteSpace(row.PicIdentifier) ? row.PicIdentifier.Trim() : null;
                var picEmail = !string.IsNullOrWhiteSpace(row.PicEmail) ? row.PicEmail.Trim().ToLowerInvariant() : null;

                if (!string.IsNullOrEmpty(picEmail) && userCache.TryGetValue(picEmail, out var cachedByEmail))
                {
                    assignedUserId = cachedByEmail.Id;
                }
                else if (!string.IsNullOrEmpty(picKey) && !IsInvalidPersonValue(picKey) && userCache.TryGetValue(picKey, out var cachedByKey))
                {
                    assignedUserId = cachedByKey.Id;
                }
                else
                {
                    var searchKey = !string.IsNullOrWhiteSpace(picKey) && !IsInvalidPersonValue(picKey)
                        ? picKey
                        : (!string.IsNullOrWhiteSpace(row.MatchedUserName) ? row.MatchedUserName : picEmail);

                    if (!string.IsNullOrWhiteSpace(searchKey))
                    {
                        var (matchedId, resolvedName, resolvedEmail, isNew) = MatchUser(searchKey, picEmail, existingUsers, companyDomain);
                        if (matchedId != null)
                        {
                            assignedUserId = matchedId;
                            var existingFound = userCache.TryGetValue(matchedId, out var cached)
                                ? cached
                                : existingUsers.FirstOrDefault(u => u.Id == matchedId);
                            if (existingFound != null)
                            {
                                if (!string.IsNullOrEmpty(existingFound.Email) && !IsEmailMatchingPerson(existingFound.Email, existingFound.FullName))
                                {
                                    var syncedName = !string.IsNullOrWhiteSpace(resolvedName) && IsEmailMatchingPerson(existingFound.Email, resolvedName)
                                        ? resolvedName
                                        : DeriveNameFromEmail(existingFound.Email);
                                    if (!string.IsNullOrWhiteSpace(syncedName))
                                    {
                                        existingFound.FullName = syncedName;
                                        existingFound.AvatarColor = PickAvatarColor(syncedName);
                                        await _context.SaveChangesAsync(cancellationToken);
                                    }
                                }

                                if (!string.IsNullOrEmpty(picKey)) userCache[picKey] = existingFound;
                                if (!string.IsNullOrEmpty(picEmail)) userCache[picEmail] = existingFound;
                            }
                        }
                        else if (!string.IsNullOrEmpty(resolvedEmail) && userCache.TryGetValue(resolvedEmail, out var existingByEmail))
                        {
                            assignedUserId = existingByEmail.Id;
                            if (!string.IsNullOrEmpty(picKey)) userCache[picKey] = existingByEmail;
                        }
                        else if (request.AutoCreateMissingUsers && !string.IsNullOrWhiteSpace(resolvedEmail) && !IsInvalidPersonValue(resolvedEmail))
                        {
                            var finalDisplayName = !string.IsNullOrWhiteSpace(resolvedName) && !IsInvalidPersonValue(resolvedName)
                                ? resolvedName
                                : (!string.IsNullOrWhiteSpace(row.MatchedUserName)
                                    ? row.MatchedUserName
                                    : FormatDisplayName(GetEmailLocalPart(resolvedEmail)));
                            var normTargetName = NormalizePersonName(finalDisplayName);
                            var normEmail = resolvedEmail.ToUpperInvariant();

                            // Rule: "untuk nama pengguna tidak boleh duplikasi, kecuali berbeda perusahaan"
                            // 1. Cek pada existingUsers (sudah ter-filter per companyId)
                            var existingInCompany = existingUsers.FirstOrDefault(u =>
                                (!string.IsNullOrEmpty(u.Email) && u.Email.Equals(resolvedEmail, StringComparison.OrdinalIgnoreCase)) ||
                                (!string.IsNullOrEmpty(u.FullName) && (u.FullName.Equals(finalDisplayName, StringComparison.OrdinalIgnoreCase) || NormalizePersonName(u.FullName) == normTargetName)));

                            // 2. Cek pada Local ChangeTracker EF Core (untuk user baru yang dibuat dalam batch saat ini)
                            if (existingInCompany == null)
                            {
                                existingInCompany = _context.Users.Local.FirstOrDefault(u =>
                                    (!companyId.HasValue || u.CompanyId == companyId || u.CompanyId == null) &&
                                    ((!string.IsNullOrEmpty(u.Email) && u.Email.Equals(resolvedEmail, StringComparison.OrdinalIgnoreCase)) ||
                                     (!string.IsNullOrEmpty(u.FullName) && (u.FullName.Equals(finalDisplayName, StringComparison.OrdinalIgnoreCase) || NormalizePersonName(u.FullName) == normTargetName))));
                            }

                            // 3. Cek pada Database untuk perusahaan ini
                            if (existingInCompany == null)
                            {
                                existingInCompany = await _context.Users.FirstOrDefaultAsync(u =>
                                    (!companyId.HasValue || u.CompanyId == companyId || u.CompanyId == null) &&
                                    (u.NormalizedEmail == normEmail ||
                                     (u.Email != null && u.Email.ToLower() == resolvedEmail.ToLower()) ||
                                     (u.FullName != null && u.FullName.ToLower() == finalDisplayName.ToLower())),
                                    cancellationToken);
                            }

                            if (existingInCompany != null)
                            {
                                // REUSE pengguna yang sudah ada di perusahaan ini (mencegah duplikasi nama di perusahaan yang sama)
                                // Jika nama pengguna di database saat ini tidak sinkron dengan email, update FullName agar sinkron
                                if (!string.IsNullOrEmpty(existingInCompany.Email) &&
                                    !IsEmailMatchingPerson(existingInCompany.Email, existingInCompany.FullName))
                                {
                                    var syncedName = !string.IsNullOrWhiteSpace(finalDisplayName) && IsEmailMatchingPerson(existingInCompany.Email, finalDisplayName)
                                        ? finalDisplayName
                                        : DeriveNameFromEmail(existingInCompany.Email);
                                    if (!string.IsNullOrWhiteSpace(syncedName))
                                    {
                                        existingInCompany.FullName = syncedName;
                                        existingInCompany.AvatarColor = PickAvatarColor(syncedName);
                                        await _context.SaveChangesAsync(cancellationToken);
                                    }
                                }

                                assignedUserId = existingInCompany.Id;
                                if (!string.IsNullOrEmpty(picKey)) userCache[picKey] = existingInCompany;
                                userCache[finalDisplayName] = existingInCompany;
                                if (!string.IsNullOrEmpty(normTargetName)) userCache[normTargetName] = existingInCompany;
                                userCache[resolvedEmail] = existingInCompany;
                                if (!string.IsNullOrWhiteSpace(searchKey)) userCache[searchKey] = existingInCompany;
                                if (!existingUsers.Any(u => u.Id == existingInCompany.Id)) existingUsers.Add(existingInCompany);
                            }
                            else
                            {
                                // Buat pengguna baru untuk perusahaan ini
                                var normUserName = resolvedEmail.ToUpperInvariant();
                                var usernameConflict = await _context.Users.AnyAsync(u => u.NormalizedUserName == normUserName, cancellationToken)
                                    || _context.Users.Local.Any(u => u.NormalizedUserName == normUserName);

                                var finalUserName = usernameConflict
                                    ? $"{resolvedEmail.Split('@')[0]}_c{companyId ?? 0}_{Guid.NewGuid().ToString("N")[..4]}@{companyDomain}"
                                    : resolvedEmail;

                                var newUser = new AppUser
                                {
                                    Id = "usr-" + Guid.NewGuid().ToString("N")[..8],
                                    FullName = finalDisplayName,
                                    Email = resolvedEmail,
                                    NormalizedEmail = normEmail,
                                    UserName = finalUserName,
                                    NormalizedUserName = finalUserName.ToUpperInvariant(),
                                    EmailConfirmed = true,
                                    JobTitle = defaultJobTitle,
                                    AvatarColor = PickAvatarColor(finalDisplayName),
                                    PasswordHash = PasswordHasher.HashPassword(defaultPassword),
                                    CompanyId = companyId,
                                    IsApproved = request.AutoApproveNewUsers,
                                    ApprovedAt = request.AutoApproveNewUsers ? DateTimeOffset.UtcNow : null,
                                    CreatedAt = DateTimeOffset.UtcNow
                                };

                                _context.Users.Add(newUser);
                                await _context.SaveChangesAsync(cancellationToken);

                                existingUsers.Add(newUser);
                                if (!string.IsNullOrEmpty(picKey)) userCache[picKey] = newUser;
                                userCache[finalDisplayName] = newUser;
                                if (!string.IsNullOrEmpty(normTargetName)) userCache[normTargetName] = newUser;
                                userCache[resolvedEmail] = newUser;
                                userCache[newUser.Id] = newUser;
                                if (!string.IsNullOrWhiteSpace(searchKey)) userCache[searchKey] = newUser;

                                assignedUserId = newUser.Id;
                                totalUsersCreated++;
                                messages.Add($"Berhasil membuat akun personil baru '{newUser.FullName}' ({newUser.Email}) dengan jabatan '{newUser.JobTitle}'.");
                            }
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
                if (row.StartDate.HasValue) targetTask.StartDate = row.StartDate.Value.ToUniversalTime();
                if (row.DueDate.HasValue) targetTask.DueDate = row.DueDate.Value.ToUniversalTime();

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
                    StartDate = row.StartDate.HasValue ? row.StartDate.Value.ToUniversalTime() : null,
                    DueDate = row.DueDate.HasValue ? row.DueDate.Value.ToUniversalTime() : null,
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
                    if ((c == "tugas" || c == "task") && (h.Contains("kode") || h.Contains("code") || h.Contains("induk") || h.Contains("parent") || h.Contains("id") || h.Contains("no ") || h.Contains("no.")))
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
            return dto.ToUniversalTime();
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
        var maxScanRow = Math.Min(lastRow, firstRow + 25);

        var taskKeywords = new[]
        {
            "judul tugas", "judul", "task title", "title", "tugas", "task", "tasks",
            "nama tugas", "nama task", "task name", "aktivitas", "activity", "pekerjaan",
            "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "uraian", "kegiatan",
            "work item", "work items", "action item", "fitur", "rincian tugas", "daftar tugas", "item"
        };

        var otherHeaderKeywords = new[]
        {
            "proyek", "project", "pic", "email", "status", "prioritas", "priority",
            "progres", "progress", "deadline", "target", "mulai", "selesai", "kode",
            "no", "nomor", "keterangan", "deskripsi", "description", "milestone", "modul",
            "kendala", "solusi", "estimasi", "jam", "kategori", "bobot", "persen", "%"
        };

        IXLRow? bestRow = null;
        int bestScore = 0;

        for (int r = firstRow; r <= maxScanRow; r++)
        {
            var row = ws.Row(r);
            var lastCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 40);

            int nonEmptyCols = 0;
            bool hasTaskTitleCol = false;
            int otherMatches = 0;
            bool isMetadataRow = false;

            for (int c = 1; c <= lastCol; c++)
            {
                var val = row.Cell(c).GetString().Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(val)) continue;
                nonEmptyCols++;

                // If cell ends with colon or equals, likely a metadata key-value row (e.g. "Nama:", "Proyek =")
                if (val.EndsWith(':') || val.EndsWith('='))
                {
                    isMetadataRow = true;
                }

                if (!hasTaskTitleCol && taskKeywords.Any(k => val.Contains(k)))
                {
                    // Ensure it's not a code or id column like "kode tugas"
                    if (!val.Contains("kode") && !val.Contains("code") && !val.Contains("id") && !val.Contains("induk"))
                    {
                        hasTaskTitleCol = true;
                    }
                }
                else if (otherHeaderKeywords.Any(k => val.Contains(k)))
                {
                    otherMatches++;
                }
            }

            // Exclude single-cell banner titles or obvious metadata rows
            if (nonEmptyCols < 2 || isMetadataRow) continue;

            int score = (hasTaskTitleCol ? 20 : 0) + (otherMatches * 5) + nonEmptyCols;
            if (score > bestScore)
            {
                bestScore = score;
                bestRow = row;
            }
        }

        if (bestRow != null && bestScore >= 15)
        {
            return bestRow;
        }

        // Fallback jika baris pertama memiliki setidaknya 3 kolom terisi
        var first = ws.FirstRowUsed();
        if (first != null && (ws.LastColumnUsed()?.ColumnNumber() ?? 0) >= 3)
        {
            return first;
        }
        return bestRow;
    }

    private sealed record SheetPersonnel(string Name, string? Email, string? MatchedUserId, string? DefaultProjectName = null);

    private static bool IsInvalidPersonValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        var v = value.Trim().ToLowerInvariant();

        if (v.StartsWith("#n/a") || (v.StartsWith("n/a") && (v.Length <= 4 || v.Contains("sheet") || v.Contains("-") || v.Contains(":"))))
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

        // 1. Explicit check for Master Data, Dashboard, Lookups, Reports, and Utility sheets by name
        if (totalSheets > 1)
        {
            if (nameLower.Contains("master data") || nameLower.Contains("data master") ||
                nameLower.Contains("masterdata") || nameLower.Contains("datamaster") ||
                nameLower.Contains("master-data") || nameLower.Contains("master_data") ||
                nameLower.StartsWith("master ") || nameLower.StartsWith("master-") || nameLower.StartsWith("master_") || nameLower == "master" ||
                nameLower.Contains("lookup") || nameLower.Contains("dropdown") ||
                nameLower.Contains("referensi") || nameLower.Contains("reference") ||
                nameLower.Contains("kamus") || nameLower.Contains("parameter") ||
                nameLower.Contains("dashboard") || nameLower.Contains("summary") ||
                nameLower.Contains("ringkasan") || nameLower.Contains("rekapitulasi") ||
                nameLower.Contains("panduan") || nameLower.Contains("guide") ||
                nameLower.Contains("petunjuk") || nameLower.Contains("keterangan") ||
                nameLower.Contains("direktori") || nameLower.Contains("directory") ||
                nameLower == "cover" || nameLower == "sampul")
            {
                return true;
            }
        }
        else if (nameLower.Contains("template"))
        {
            var h = DetectHeaderRow(ws);
            if (h != null) return false;
        }

        // 2. Any sheet without a valid task header or title column should be ignored
        var sheetHeader = DetectHeaderRow(ws);
        if (sheetHeader == null) return true;

        var lastColNum = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 40);
        var hList = Enumerable.Range(1, lastColNum)
            .Select(c => ws.Cell(sheetHeader.RowNumber(), c).GetString().Trim().ToLowerInvariant())
            .ToList();
        int tCol = FindCol(hList, "judul tugas", "task title", "title", "judul", "aktivitas", "activity", "pekerjaan", "uraian pekerjaan", "deskripsi pekerjaan", "uraian tugas", "nama tugas", "nama task", "task name", "uraian", "kegiatan", "work item", "tugas", "task", "tasks", "action item", "fitur");
        if (tCol == 0)
        {
            tCol = FindCol(hList, "uraian", "kegiatan", "aktivitas", "pekerjaan", "item", "tugas", "task", "tasks");
            if (tCol == 0 && hList.Count >= 2 && hList[0].Contains("no"))
            {
                tCol = 2;
            }
        }

        if (tCol == 0) return true;

        // 3. Content scan strictly in banner rows ABOVE header row (do NOT scan task rows below header)
        if (totalSheets > 1 && sheetHeader.RowNumber() > 1)
        {
            for (int r = 1; r < sheetHeader.RowNumber(); r++)
            {
                var row = ws.Row(r);
                for (int c = 1; c <= Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 20); c++)
                {
                    var val = row.Cell(c).GetString().Trim().ToLowerInvariant();
                    if (val.Contains("master data") || val.Contains("data master") || val.Contains("lookup") ||
                        val.Contains("daftar pilihan status") || val.Contains("kamus data") || val.Contains("rekapitulasi proyek") ||
                        val.Contains("total proyek:") || val.Contains("total tugas:") || val.Contains("progres keseluruhan:") ||
                        val.Contains("dashboard monitoring") || val.Contains("ringkasan eksekutif"))
                    {
                        return true;
                    }
                }
            }
        }

        // 4. "cukup dari sheet nama pengguna saja":
        // When workbook has multiple sheets, strictly require that the sheet belongs to a user/personnel
        if (totalSheets > 1)
        {
            var sheetPerson = ExtractPersonFromSheetName(ws.Name);
            bool isUserSheet = !string.IsNullOrWhiteSpace(sheetPerson);

            if (!isUserSheet)
            {
                // Check metadata rows (rows 1 to headerRow - 1) for "Nama:", "PIC:", "Nama Pegawai:", etc.
                int maxMeta = Math.Min(sheetHeader.RowNumber() - 1, 12);
                int maxMetaC = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 15);
                for (int r = 1; r <= maxMeta; r++)
                {
                    var row = ws.Row(r);
                    for (int c = 1; c <= maxMetaC; c++)
                    {
                        var val = row.Cell(c).GetString().Trim();
                        if (string.IsNullOrWhiteSpace(val)) continue;
                        var m = Regex.Match(val, @"^(?:nama(?:\s*personil|\s*karyawan|\s*pengguna|\s*user|\s*pegawai)?|pic|personil|petugas)\s*[:=]\s*(.+)$", RegexOptions.IgnoreCase);
                        if (m.Success && !IsInvalidPersonValue(m.Groups[1].Value.Trim()))
                        {
                            isUserSheet = true;
                            break;
                        }
                    }
                    if (isUserSheet) break;
                }
            }

            if (!isUserSheet)
            {
                int picCol = FindCol(hList, "pic", "nama pic", "email / nama pic", "penanggung jawab", "petugas", "pelaksana", "developer", "assigned to", "assignee", "nama staf", "nama personil", "person", "nama pengguna", "nama user");
                if (picCol > 0)
                {
                    isUserSheet = true;
                }
            }

            if (!isUserSheet)
            {
                return true;
            }
        }

        return false;
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

    private static string? FindAnyEmailInWorksheet(IXLWorksheet ws, string? personName)
    {
        var emailsFound = new List<string>();
        var lastRow = Math.Min(ws.LastRowUsed()?.RowNumber() ?? 1, 100);
        var lastCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 1, 30);

        for (int r = 1; r <= lastRow; r++)
        {
            var row = ws.Row(r);
            for (int c = 1; c <= lastCol; c++)
            {
                var cellStr = row.Cell(c).GetString().Trim();
                if (string.IsNullOrWhiteSpace(cellStr) || !cellStr.Contains('@')) continue;

                var match = Regex.Match(cellStr, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                if (match.Success)
                {
                    var email = match.Value.ToLowerInvariant();
                    if (!emailsFound.Contains(email))
                    {
                        emailsFound.Add(email);
                    }
                }
            }
        }

        if (emailsFound.Count == 0) return null;

        // If personName is specified, strictly check if email matches person
        if (!string.IsNullOrWhiteSpace(personName))
        {
            var matched = emailsFound.FirstOrDefault(e => IsEmailMatchingPerson(e, personName));
            if (matched != null)
            {
                return matched;
            }

            return null;
        }

        return emailsFound[0];
    }

    private static string? FindEmailForPersonInWorkbook(
        IXLWorkbook workbook,
        IXLWorksheet currentWs,
        string personName)
    {
        if (string.IsNullOrWhiteSpace(personName)) return null;

        foreach (var otherWs in workbook.Worksheets)
        {
            if (otherWs == currentWs) continue;

            // 1. Check if the other sheet name matches person
            var otherSheetPerson = ExtractPersonFromSheetName(otherWs.Name);
            if (!string.IsNullOrWhiteSpace(otherSheetPerson))
            {
                var otherNorm = NormalizePersonName(otherSheetPerson);
                var targetNorm = NormalizePersonName(personName);
                if (otherNorm == targetNorm || (otherNorm.Length >= 3 && targetNorm.Length >= 3 && (otherNorm.Contains(targetNorm) || targetNorm.Contains(otherNorm))))
                {
                    var anyEmailOnOther = FindAnyEmailInWorksheet(otherWs, personName);
                    if (!string.IsNullOrWhiteSpace(anyEmailOnOther) && IsEmailMatchingPerson(anyEmailOnOther, personName))
                    {
                        return anyEmailOnOther;
                    }
                }
            }

            var lastRow = Math.Min(otherWs.LastRowUsed()?.RowNumber() ?? 1, 150);
            var lastCol = Math.Min(otherWs.LastColumnUsed()?.ColumnNumber() ?? 1, 30);

            for (int r = 1; r <= lastRow; r++)
            {
                var row = otherWs.Row(r);
                for (int c = 1; c <= lastCol; c++)
                {
                    var cellStr = row.Cell(c).GetString().Trim();
                    if (!cellStr.Contains('@')) continue;

                    var match = Regex.Match(cellStr, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                    if (match.Success)
                    {
                        var email = match.Value.ToLowerInvariant();
                        if (IsEmailMatchingPerson(email, personName))
                        {
                            return email;
                        }
                    }
                }
            }
        }

        return null;
    }

    private static bool IsLikelyProjectName(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var lower = text.Trim().ToLowerInvariant();
        var projectKeywords = new[]
        {
            "proyek", "project", "web", "website", "app", "mobile", "portal",
            "system", "sistem", "redesign", "revamp", "api", "migration",
            "backend", "frontend", "erp", "crm", "iot", "dashboard", "infra",
            "infrastructure", "database", "pos", "hrms", "finance", "hris", "platform"
        };
        return projectKeywords.Any(k => lower.Contains(k));
    }

    private static string? ExtractProjectFromSheetName(string sheetName)
    {
        if (string.IsNullOrWhiteSpace(sheetName)) return null;
        var clean = sheetName.Trim();

        var matchParen = Regex.Match(clean, @"\(([^)]+)\)");
        if (matchParen.Success)
        {
            var inside = matchParen.Groups[1].Value.Trim();
            var outside = clean.Replace(matchParen.Value, "").Trim();

            if (IsLikelyProjectName(inside) && !IsLikelyProjectName(outside)) return inside;
            if (IsLikelyProjectName(outside) && !IsLikelyProjectName(inside)) return outside;
            if (IsLikelyProjectName(inside)) return inside;
        }

        var parts = clean.Split(new[] { '-', ':' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2)
        {
            var part0 = parts[0].Trim();
            var part1 = parts[1].Trim();

            if (IsLikelyProjectName(part0) && !IsLikelyProjectName(part1)) return part0;
            if (IsLikelyProjectName(part1) && !IsLikelyProjectName(part0)) return part1;
        }

        return null;
    }

    private static SheetPersonnel? ResolveSheetPersonnel(
        IXLWorksheet ws,
        IXLWorkbook workbook,
        int headerRowNum,
        List<int> emailCols,
        List<AppUser> existingUsers,
        string companyDomain)
    {
        var sheetPersonName = ExtractPersonFromSheetName(ws.Name);
        var sheetProjectName = ExtractProjectFromSheetName(ws.Name);
        string? emailInSheet = null;

        // Check metadata rows strictly above header row (or first 15 rows)
        int maxMetaRow = Math.Min(Math.Max(headerRowNum - 1, 1), 15);
        int maxCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 10, 15);

        for (int r = 1; r <= maxMetaRow; r++)
        {
            var row = ws.Row(r);
            for (int c = 1; c <= maxCol; c++)
            {
                var val = row.Cell(c).GetString().Trim();
                if (string.IsNullOrWhiteSpace(val)) continue;

                // Pattern 1: Single-cell "Nama: Budi", "PIC = Ahmad"
                var nameMatch = Regex.Match(val, @"^(?:nama(?:\s*personil|\s*karyawan|\s*pengguna|\s*user)?|pic|personil|petugas)\s*[:=]\s*(.+)$", RegexOptions.IgnoreCase);
                if (nameMatch.Success)
                {
                    var cand = nameMatch.Groups[1].Value.Trim();
                    if (!IsInvalidPersonValue(cand) && cand.Length >= 2)
                    {
                        var formatted = FormatDisplayName(cand);
                        if (string.IsNullOrWhiteSpace(sheetPersonName) || formatted.Length > sheetPersonName.Length || (formatted.Contains(' ') && !sheetPersonName.Contains(' ')))
                        {
                            sheetPersonName = formatted;
                        }
                    }
                }

                // Pattern 1: Single-cell "Email: budi@..."
                if (string.IsNullOrWhiteSpace(emailInSheet))
                {
                    var emailMatch = Regex.Match(val, @"^(?:email(?:\s*pic|\s*pengguna|\s*user|\s*karyawan)?|alamat\s*email)\s*[:=]\s*(.+)$", RegexOptions.IgnoreCase);
                    if (emailMatch.Success)
                    {
                        var cand = emailMatch.Groups[1].Value.Trim();
                        var m = Regex.Match(cand, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                        if (m.Success)
                        {
                            emailInSheet = m.Value.ToLowerInvariant();
                        }
                    }
                }

                // Pattern 1: Single-cell "Proyek: ERP", "Project = Website"
                var projMatch = Regex.Match(val, @"^(?:proyek|project|nama\s*proyek|nama\s*project)\s*[:=]\s*(.+)$", RegexOptions.IgnoreCase);
                if (projMatch.Success)
                {
                    var cand = projMatch.Groups[1].Value.Trim();
                    if (!string.IsNullOrWhiteSpace(cand) && cand.Length >= 2)
                    {
                        if (string.IsNullOrWhiteSpace(sheetProjectName) || cand.Length > sheetProjectName.Length)
                        {
                            sheetProjectName = cand;
                        }
                    }
                }

                // Pattern 2: Two-cell horizontal - Cell (r, c) is Label, Cell (r, c+1) is Value
                var valLower = val.TrimEnd(':', '=', ' ').ToLowerInvariant();
                if (c + 1 <= maxCol)
                {
                    var adjacentVal = row.Cell(c + 1).GetString().Trim();
                    if (!string.IsNullOrWhiteSpace(adjacentVal))
                    {
                        if (valLower is "nama" or "nama personil" or "nama karyawan" or "nama pengguna" or "nama user" or "nama lengkap" or "pic" or "nama pic" or "petugas" or "user")
                        {
                            if (!IsInvalidPersonValue(adjacentVal) && adjacentVal.Length >= 2)
                            {
                                var formatted = FormatDisplayName(adjacentVal);
                                if (string.IsNullOrWhiteSpace(sheetPersonName) || formatted.Length > sheetPersonName.Length || (formatted.Contains(' ') && !sheetPersonName.Contains(' ')))
                                {
                                    sheetPersonName = formatted;
                                }
                            }
                        }

                        if (string.IsNullOrWhiteSpace(emailInSheet) &&
                            valLower is "email" or "alamat email" or "email pic" or "email user" or "email karyawan" or "e-mail")
                        {
                            var m = Regex.Match(adjacentVal, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                            if (m.Success)
                            {
                                emailInSheet = m.Value.ToLowerInvariant();
                            }
                        }

                        if (valLower is "proyek" or "project" or "nama proyek" or "nama project")
                        {
                            if (!string.IsNullOrWhiteSpace(adjacentVal) && adjacentVal.Length >= 2)
                            {
                                if (string.IsNullOrWhiteSpace(sheetProjectName) || adjacentVal.Length > sheetProjectName.Length)
                                {
                                    sheetProjectName = adjacentVal;
                                }
                            }
                        }
                    }
                }

                // Pattern 3: Two-cell vertical - Cell (r, c) is Label, Cell (r+1, c) is Value
                if (r + 1 <= maxMetaRow)
                {
                    var belowVal = ws.Cell(r + 1, c).GetString().Trim();
                    if (!string.IsNullOrWhiteSpace(belowVal))
                    {
                        if (valLower is "nama" or "nama personil" or "nama karyawan" or "nama pengguna" or "nama user" or "nama lengkap" or "pic" or "nama pic" or "petugas" or "user")
                        {
                            if (!IsInvalidPersonValue(belowVal) && belowVal.Length >= 2)
                            {
                                var formatted = FormatDisplayName(belowVal);
                                if (string.IsNullOrWhiteSpace(sheetPersonName) || formatted.Length > sheetPersonName.Length || (formatted.Contains(' ') && !sheetPersonName.Contains(' ')))
                                {
                                    sheetPersonName = formatted;
                                }
                            }
                        }

                        if (string.IsNullOrWhiteSpace(emailInSheet) &&
                            valLower is "email" or "alamat email" or "email pic" or "email user" or "email karyawan" or "e-mail")
                        {
                            var m = Regex.Match(belowVal, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                            if (m.Success)
                            {
                                emailInSheet = m.Value.ToLowerInvariant();
                            }
                        }

                        if (valLower is "proyek" or "project" or "nama proyek" or "nama project")
                        {
                            if (!string.IsNullOrWhiteSpace(belowVal) && belowVal.Length >= 2)
                            {
                                if (string.IsNullOrWhiteSpace(sheetProjectName) || belowVal.Length > sheetProjectName.Length)
                                {
                                    sheetProjectName = belowVal;
                                }
                            }
                        }
                    }
                }

                // Catch any email string directly
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

        // If sheet name itself contains an email
        if (string.IsNullOrWhiteSpace(emailInSheet) && sheetPersonName != null && sheetPersonName.Contains('@'))
        {
            emailInSheet = sheetPersonName.ToLowerInvariant();
            sheetPersonName = DeriveNameFromEmail(emailInSheet);
        }

        // A sheet is ONLY a personnel sheet if a person's name or metadata email was detected!
        // Generic sheets (e.g. "Tasks", "Sheet1") have null sheetPersonName and must NOT be treated as personnel sheets.
        if (string.IsNullOrWhiteSpace(sheetPersonName) && string.IsNullOrWhiteSpace(emailInSheet))
        {
            return null;
        }

        // 1. Search ALL email columns in task rows if not already found in metadata
        if (string.IsNullOrWhiteSpace(emailInSheet) && emailCols.Count > 0 && !string.IsNullOrWhiteSpace(sheetPersonName))
        {
            int lastRow = ws.LastRowUsed()?.RowNumber() ?? headerRowNum;
            for (int r = headerRowNum + 1; r <= lastRow; r++)
            {
                foreach (var c in emailCols)
                {
                    var cellStr = ws.Cell(r, c).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(cellStr) || !cellStr.Contains('@') || IsInvalidPersonValue(cellStr)) continue;

                    var match = Regex.Match(cellStr, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}");
                    if (match.Success)
                    {
                        var candEmail = match.Value.ToLowerInvariant();
                        if (IsEmailMatchingPerson(candEmail, sheetPersonName))
                        {
                            emailInSheet = candEmail;
                            break;
                        }
                    }
                }
                if (!string.IsNullOrWhiteSpace(emailInSheet)) break;
            }
        }

        // 2. Scan entire current worksheet for any email
        if (string.IsNullOrWhiteSpace(emailInSheet))
        {
            emailInSheet = FindAnyEmailInWorksheet(ws, sheetPersonName);
        }

        // 3. Scan other worksheets in workbook for this person's email
        if (string.IsNullOrWhiteSpace(emailInSheet) && !string.IsNullOrWhiteSpace(sheetPersonName))
        {
            emailInSheet = FindEmailForPersonInWorkbook(workbook, ws, sheetPersonName);
        }

        // 4. Check existing database users
        if (string.IsNullOrWhiteSpace(emailInSheet) && !string.IsNullOrWhiteSpace(sheetPersonName))
        {
            var dbUser = existingUsers.FirstOrDefault(u =>
                !string.IsNullOrWhiteSpace(u.FullName) &&
                NormalizePersonName(u.FullName) == NormalizePersonName(sheetPersonName));
            if (dbUser != null && !string.IsNullOrWhiteSpace(dbUser.Email))
            {
                emailInSheet = dbUser.Email;
            }
        }

        // If email was found, sync sheetPersonName with email if empty, not matching, or upgrade to full derived name
        if (!string.IsNullOrWhiteSpace(emailInSheet))
        {
            var emailName = DeriveNameFromEmail(emailInSheet);
            if (string.IsNullOrWhiteSpace(sheetPersonName) || !IsEmailMatchingPerson(emailInSheet, sheetPersonName))
            {
                sheetPersonName = emailName;
            }
            else if (!string.IsNullOrWhiteSpace(emailName) && emailName.Length > sheetPersonName.Length)
            {
                sheetPersonName = emailName;
            }
        }

        // Only treat as personnel sheet if a person's name or email was detected
        if (string.IsNullOrWhiteSpace(sheetPersonName) && string.IsNullOrWhiteSpace(emailInSheet))
        {
            return null;
        }

        var (matchedId, resolvedName, resolvedEmail, _) = MatchUser(
            sheetPersonName ?? emailInSheet!,
            emailInSheet,
            existingUsers,
            companyDomain);

        var finalName = !string.IsNullOrWhiteSpace(resolvedName)
            ? resolvedName
            : sheetPersonName;

        var finalEmail = !string.IsNullOrWhiteSpace(resolvedEmail)
            ? resolvedEmail
            : emailInSheet;

        return new SheetPersonnel(finalName!, finalEmail, matchedId, sheetProjectName);
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

        // 1. Check parenthesis: e.g. "Budi (Website)" or "Website (Budi)"
        var matchParen = Regex.Match(clean, @"\(([^)]+)\)");
        if (matchParen.Success)
        {
            var inside = matchParen.Groups[1].Value.Trim();
            var outside = clean.Replace(matchParen.Value, "").Trim();

            if (!IsLikelyProjectName(inside) && !genericKeywords.Contains(inside.ToLowerInvariant()) && !IsInvalidPersonValue(inside) && inside.Length >= 2)
            {
                return FormatDisplayName(inside);
            }
            if (!IsLikelyProjectName(outside) && !genericKeywords.Contains(outside.ToLowerInvariant()) && !IsInvalidPersonValue(outside) && outside.Length >= 2)
            {
                return FormatDisplayName(outside);
            }
        }

        // 2. Check hyphen / colon: e.g. "Budi - Website Redesign" or "Rekap - Budi" or "Website Redesign - Budi"
        var afterHyphen = clean.Split(new[] { '-', ':' }, StringSplitOptions.RemoveEmptyEntries);
        if (afterHyphen.Length >= 2)
        {
            var part0 = afterHyphen[0].Trim();
            var part1 = afterHyphen[1].Trim();

            if ((genericKeywords.Any(g => part0.ToLowerInvariant().StartsWith(g)) || IsLikelyProjectName(part0)) &&
                !genericKeywords.Contains(part1.ToLowerInvariant()) && !IsLikelyProjectName(part1) && !IsInvalidPersonValue(part1) && part1.Length >= 2)
            {
                return FormatDisplayName(part1);
            }

            if ((genericKeywords.Any(g => part1.ToLowerInvariant().StartsWith(g)) || IsLikelyProjectName(part1)) &&
                !genericKeywords.Contains(part0.ToLowerInvariant()) && !IsLikelyProjectName(part0) && !IsInvalidPersonValue(part0) && part0.Length >= 2)
            {
                return FormatDisplayName(part0);
            }

            if (!IsInvalidPersonValue(part0) && part0.Length >= 2 && !genericKeywords.Contains(part0.ToLowerInvariant()))
            {
                return FormatDisplayName(part0);
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

        if (genericKeywords.Contains(clean.ToLowerInvariant()) || IsLikelyProjectName(clean))
        {
            return null;
        }

        return FormatDisplayName(clean);
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

        // Tier 0: Direct match on known email against existing users
        if (!string.IsNullOrWhiteSpace(knownEmail))
        {
            var foundByKnownEmail = existingUsers.FirstOrDefault(u =>
                !string.IsNullOrEmpty(u.Email) && u.Email.Equals(knownEmail.Trim(), StringComparison.OrdinalIgnoreCase));
            if (foundByKnownEmail != null)
            {
                var nameToReturn = foundByKnownEmail.FullName;
                if (!string.IsNullOrEmpty(foundByKnownEmail.Email) && !IsEmailMatchingPerson(foundByKnownEmail.Email, foundByKnownEmail.FullName))
                {
                    nameToReturn = DeriveNameFromEmail(foundByKnownEmail.Email);
                }
                return (foundByKnownEmail.Id, nameToReturn, foundByKnownEmail.Email, false);
            }
        }

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
        string formattedName;
        string emailSlug;

        var cleanTrimmed = trimmed.Contains('@') ? trimmed.Split('@')[0] : trimmed;

        if (!string.IsNullOrWhiteSpace(knownEmail) && knownEmail.Contains('@'))
        {
            emailSlug = knownEmail.Trim().ToLowerInvariant();
            var nameFromEmail = DeriveNameFromEmail(emailSlug);

            if (IsEmailMatchingPerson(emailSlug, cleanTrimmed))
            {
                formattedName = nameFromEmail.Length > cleanTrimmed.Length && nameFromEmail.Contains(' ')
                    ? nameFromEmail
                    : FormatDisplayName(cleanTrimmed);
            }
            else
            {
                // User requirement: "3. buatkan user dengan nama email tersebut"
                // "nama pengguna dengan nama email tidak sinkron"
                // When email and picIdentifier do not match, sync display name with email name!
                formattedName = !string.IsNullOrWhiteSpace(nameFromEmail)
                    ? nameFromEmail
                    : FormatDisplayName(cleanTrimmed);
            }
        }
        else
        {
            formattedName = FormatDisplayName(cleanTrimmed);
            emailSlug = trimmed.Contains('@')
                ? trimmed.ToLowerInvariant()
                : GenerateEmailSlug(formattedName, domain);
        }

        var userWithSameEmail = existingUsers.FirstOrDefault(u =>
            u.Email != null && u.Email.Equals(emailSlug, StringComparison.OrdinalIgnoreCase));
        if (userWithSameEmail != null)
        {
            return (userWithSameEmail.Id, userWithSameEmail.FullName, userWithSameEmail.Email, false);
        }

        // Rule: "untuk nama pengguna tidak boleh duplikasi, kecuali berbeda perusahaan"
        var userWithSameName = existingUsers.FirstOrDefault(u =>
            (!string.IsNullOrEmpty(u.FullName) && u.FullName.Equals(formattedName, StringComparison.OrdinalIgnoreCase)) ||
            (!string.IsNullOrEmpty(u.FullName) && NormalizePersonName(u.FullName) == NormalizePersonName(formattedName)));
        if (userWithSameName != null)
        {
            return (userWithSameName.Id, userWithSameName.FullName, userWithSameName.Email, false);
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

    private static string DeriveNameFromEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return string.Empty;
        var emailClean = email.Trim();
        var atIdx = emailClean.IndexOf('@');
        var local = atIdx >= 0 ? emailClean[..atIdx] : emailClean;

        var withSpaces = local.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Replace('+', ' ').Trim();
        return FormatDisplayName(withSpaces);
    }

    private static bool IsEmailMatchingPerson(string? email, string? personName)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(personName))
            return false;

        if (IsInvalidPersonValue(personName) || IsInvalidPersonValue(email))
            return false;

        var emailClean = email.Trim().ToLowerInvariant();
        var atIdx = emailClean.IndexOf('@');
        var localPart = atIdx >= 0 ? emailClean[..atIdx] : emailClean;

        var personNorm = NormalizePersonName(personName);
        var localNorm = new string(localPart.Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(personNorm) || string.IsNullOrWhiteSpace(localNorm))
            return false;

        // 1. Direct equality of normalized alphanumeric string
        if (personNorm == localNorm)
            return true;

        // 2. Token overlap: e.g. "glenn.hakim" vs "Glenn Hakim", "glenn" vs "Glenn Hakim"
        var localTokens = localPart
            .Split(new[] { '.', '_', '-', '+', ' ' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 2)
            .Select(t => t.ToLowerInvariant())
            .ToList();

        var personTokens = personName
            .Split(new[] { ' ', '.', '_', '-', ',', '(', ')', '[', ']' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 2 && !t.Any(char.IsDigit))
            .Select(t => t.ToLowerInvariant())
            .ToList();

        if (localTokens.Any(lt => personTokens.Contains(lt)))
            return true;

        // 3. Substring match if long enough (>= 3 chars)
        if (personNorm.Length >= 3 && localNorm.Length >= 3)
        {
            if (personNorm.Contains(localNorm) || localNorm.Contains(personNorm))
                return true;
        }

        // 4. Initial + last name matching: e.g. "ghakim" vs "Glenn Hakim", "g.hakim"
        if (personTokens.Count >= 2)
        {
            var initialAndLast = (personTokens[0][0] + personTokens[^1]).ToLowerInvariant();
            if (localNorm == initialAndLast)
                return true;

            if (localTokens.Count >= 2 &&
                localTokens[0].Length == 1 &&
                localTokens[0][0] == personTokens[0][0] &&
                localTokens[^1] == personTokens[^1])
            {
                return true;
            }
        }

        return false;
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


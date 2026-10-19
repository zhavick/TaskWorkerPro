using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class TaskExcelImportServiceTests
{
    private AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);

        var company = new Company { Id = 1, Name = "Wahana Tenant", Code = "WAHANA" };
        context.Companies.Add(company);

        var user1 = new AppUser { Id = "user-budi", FullName = "Budi Santoso", Email = "budi@perusahaan.com", CompanyId = 1 };
        var user2 = new AppUser { Id = "user-dewi", FullName = "Dewi Lestari", Email = "dewi@perusahaan.com", CompanyId = 1 };
        context.Users.AddRange(user1, user2);

        var project = new Project { Id = 10, Name = "Website Redesign", CompanyId = 1, Color = "#4F46E5" };
        context.Projects.Add(project);

        context.SaveChanges();
        return context;
    }

    [Fact]
    public void GenerateTemplate_Standard_ReturnsValidXlsx()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        var bytes = service.GenerateTemplate("standard");
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);

        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheets.FirstOrDefault();

        Assert.NotNull(ws);
        Assert.Equal("Template Standar", ws.Name);
        Assert.Equal("Judul Tugas (*)", ws.Cell(1, 2).GetString());
        Assert.True(ws.LastRowUsed()?.RowNumber() >= 3);
    }

    [Fact]
    public void GenerateTemplate_Arms_ReturnsValidXlsx()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        var bytes = service.GenerateTemplate("arms");
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);

        using var ms = new MemoryStream(bytes);
        using var wb = new XLWorkbook(ms);
        var ws = wb.Worksheets.FirstOrDefault();

        Assert.NotNull(ws);
        Assert.Equal("Template ARMS", ws.Name);
        Assert.Equal("Kode Tugas", ws.Cell(1, 2).GetString());
        Assert.Equal("Judul Tugas (*)", ws.Cell(1, 6).GetString());
        Assert.True(ws.LastRowUsed()?.RowNumber() >= 3);
    }

    [Fact]
    public async Task PreviewImportAsync_ParsesValidWarningAndErrorRows()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Tasks");
        ws.Cell(1, 1).Value = "Kode Tugas";
        ws.Cell(1, 2).Value = "Judul Tugas (*)";
        ws.Cell(1, 3).Value = "Deskripsi";
        ws.Cell(1, 4).Value = "Proyek";
        ws.Cell(1, 5).Value = "Prioritas";
        ws.Cell(1, 6).Value = "Status";
        ws.Cell(1, 7).Value = "Progres (%)";
        ws.Cell(1, 8).Value = "Email / Nama PIC";
        ws.Cell(1, 9).Value = "Target Selesai";

        // Row 2: Valid (existing project and user)
        ws.Cell(2, 1).Value = "T-1";
        ws.Cell(2, 2).Value = "Valid Task";
        ws.Cell(2, 4).Value = "Website Redesign";
        ws.Cell(2, 8).Value = "budi@perusahaan.com";

        // Row 3: Warning (new project, unknown user)
        ws.Cell(3, 1).Value = "T-2";
        ws.Cell(3, 2).Value = "Task with Warnings";
        ws.Cell(3, 4).Value = "New Brand Portal";
        ws.Cell(3, 8).Value = "unknown@random.com";

        // Row 4: Error (missing title)
        ws.Cell(4, 1).Value = "T-3";
        ws.Cell(4, 2).Value = "";
        ws.Cell(4, 4).Value = "Website Redesign";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var preview = await service.PreviewImportAsync(ms, "test.xlsx", 1);

        Assert.Equal(3, preview.TotalRows);
        Assert.Equal(1, preview.ValidCount);
        Assert.Equal(1, preview.WarningCount);
        Assert.Equal(1, preview.ErrorCount);

        var validRow = preview.Rows.First(r => r.TaskCode == "T-1");
        Assert.Equal(TaskImportValidationStatus.Valid, validRow.ValidationStatus);
        Assert.Equal(10, validRow.MatchedProjectId);
        Assert.Equal("user-budi", validRow.MatchedUserId);

        var warningRow = preview.Rows.First(r => r.TaskCode == "T-2");
        Assert.Equal(TaskImportValidationStatus.Warning, warningRow.ValidationStatus);
        Assert.Null(warningRow.MatchedProjectId);
        Assert.Null(warningRow.MatchedUserId);

        var errorRow = preview.Rows.First(r => r.TaskCode == "T-3");
        Assert.Equal(TaskImportValidationStatus.Error, errorRow.ValidationStatus);
    }

    [Fact]
    public async Task CommitImportAsync_PersistsTasksAndResolvesHierarchy()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        var rows = new List<TaskImportRowDto>
        {
            new(
                RowIndex: 1,
                TaskCode: "P-100",
                ParentTaskCode: null,
                Title: "Parent Epic Task",
                Description: "Epic description",
                ProjectName: "Website Redesign",
                MatchedProjectId: 10,
                PicIdentifier: "budi@perusahaan.com",
                MatchedUserId: "user-budi",
                MatchedUserName: "Budi Santoso",
                Priority: TaskPriority.High,
                Status: Domain.Enums.TaskStatus.InProgress,
                Progress: 30,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(7),
                Milestone: "Sprint 1",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new()
            ),
            new(
                RowIndex: 2,
                TaskCode: "C-101",
                ParentTaskCode: "P-100",
                Title: "Child Subtask 1",
                Description: "Subtask description",
                ProjectName: "Website Redesign",
                MatchedProjectId: 10,
                PicIdentifier: null,
                MatchedUserId: null,
                MatchedUserName: null,
                Priority: TaskPriority.Medium,
                Status: Domain.Enums.TaskStatus.Todo,
                Progress: 0,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(3),
                Milestone: "Sprint 1",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new()
            )
        };

        var request = new TaskImportCommitRequest(
            DefaultProjectId: null,
            BulkAssignUserId: "user-dewi", // Should be assigned to C-101 which has null PIC
            SelectedRowIndexes: null,
            Rows: rows
        );

        var result = await service.CommitImportAsync(request, 1);

        Assert.Equal(2, result.TotalProcessed);
        Assert.Equal(2, result.TotalImported);

        var savedParent = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Parent Epic Task");
        var savedChild = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Child Subtask 1");

        Assert.NotNull(savedParent);
        Assert.NotNull(savedChild);
        Assert.Equal(1, savedParent.CompanyId);
        Assert.Equal(1, savedChild.CompanyId);

        // Hierarchy resolution
        Assert.Equal(savedParent.Id, savedChild.ParentTaskId);

        // Bulk PIC assignment check
        Assert.Equal("user-budi", savedParent.AssignedToUserId);
        Assert.Equal("user-dewi", savedChild.AssignedToUserId);
    }

    [Fact]
    public async Task PreviewAndCommit_MultiSheetWithPersonnelSheetNames_AutoCreatesUsersAndAssignsTasks()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();

        // Sheet 1: Metadata / Guideline (should be ignored)
        var wsGuide = wb.Worksheets.Add("Panduan Import");
        wsGuide.Cell(1, 1).Value = "Catatan Penting";
        wsGuide.Cell(2, 1).Value = "Silakan isi data pada tab personil masing-masing.";

        // Sheet 2: Personil "Wahana Pratama" with header on Row 2
        var wsWahana = wb.Worksheets.Add("Wahana Pratama");
        wsWahana.Cell(1, 1).Value = "Rekap Tugas Mingguan"; // Row 1 is a title banner
        wsWahana.Cell(2, 1).Value = "Kode Tugas";
        wsWahana.Cell(2, 2).Value = "Judul Tugas";
        wsWahana.Cell(2, 3).Value = "Nama Proyek";
        wsWahana.Cell(2, 4).Value = "Prioritas";
        wsWahana.Cell(2, 5).Value = "Status";

        wsWahana.Cell(3, 1).Value = "WP-01";
        wsWahana.Cell(3, 2).Value = "Setup Audit Trail System";
        wsWahana.Cell(3, 3).Value = "TrackerKerja Modern";
        wsWahana.Cell(3, 4).Value = "Tinggi";
        wsWahana.Cell(3, 5).Value = "InProgress";

        // Sheet 3: Personil "Siti Rahma" with standard row 1 header
        var wsSiti = wb.Worksheets.Add("Siti Rahma");
        wsSiti.Cell(1, 1).Value = "No";
        wsSiti.Cell(1, 2).Value = "Judul Pekerjaan";
        wsSiti.Cell(1, 3).Value = "Proyek";
        wsSiti.Cell(1, 4).Value = "Status";

        wsSiti.Cell(2, 1).Value = "1";
        wsSiti.Cell(2, 2).Value = "Desain Tampilan Kalender";
        wsSiti.Cell(2, 3).Value = "TrackerKerja Modern";
        wsSiti.Cell(2, 4).Value = "Todo";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        // 1. Preview
        var preview = await service.PreviewImportAsync(ms, "multi-user.xlsx", 1);

        Assert.Equal(2, preview.TotalRows);
        Assert.All(preview.Rows, r => Assert.NotEqual(TaskImportValidationStatus.Error, r.ValidationStatus));

        var rowWahana = preview.Rows.First(r => r.Title == "Setup Audit Trail System");
        Assert.Equal("Wahana Pratama", rowWahana.MatchedUserName);

        var rowSiti = preview.Rows.First(r => r.Title == "Desain Tampilan Kalender");
        Assert.Equal("Siti Rahma", rowSiti.MatchedUserName);

        // 2. Commit
        var commitReq = new TaskImportCommitRequest(null, null, null, preview.Rows);
        var commitRes = await service.CommitImportAsync(commitReq, 1);

        Assert.Equal(2, commitRes.TotalImported);

        // Verify users created in database
        var createdWahana = await context.Users.FirstOrDefaultAsync(u => u.FullName == "Wahana Pratama");
        var createdSiti = await context.Users.FirstOrDefaultAsync(u => u.FullName == "Siti Rahma");

        Assert.NotNull(createdWahana);
        Assert.NotNull(createdSiti);
        Assert.True(createdWahana.IsApproved);
        Assert.True(createdSiti.IsApproved);
        Assert.NotEmpty(createdWahana.PasswordHash);
        Assert.NotEmpty(createdSiti.PasswordHash);

        // Verify tasks are properly assigned to the new user IDs
        var taskWahana = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Setup Audit Trail System");
        var taskSiti = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Desain Tampilan Kalender");

        Assert.NotNull(taskWahana);
        Assert.NotNull(taskSiti);
        Assert.Equal(createdWahana.Id, taskWahana.AssignedToUserId);
        Assert.Equal(createdSiti.Id, taskSiti.AssignedToUserId);
    }

    [Fact]
    public async Task CommitImportAsync_DeduplicatesInBatch_AndTakesMostUpdatedValues()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        var rows = new List<TaskImportRowDto>
        {
            new(
                RowIndex: 1,
                TaskCode: "DEDUP-01",
                ParentTaskCode: null,
                Title: "Integrasi Payment Gateway",
                Description: "Draft awal integrasi",
                ProjectName: "Website Redesign",
                MatchedProjectId: 10,
                PicIdentifier: "budi@perusahaan.com",
                MatchedUserId: "user-budi",
                MatchedUserName: "Budi Santoso",
                Priority: TaskPriority.Medium,
                Status: Domain.Enums.TaskStatus.InProgress,
                Progress: 25,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(3),
                Milestone: null,
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new()
            ),
            new(
                RowIndex: 2,
                TaskCode: "DEDUP-01",
                ParentTaskCode: null,
                Title: "Integrasi Payment Gateway",
                Description: "Integrasi selesai dan diverifikasi",
                ProjectName: "Website Redesign",
                MatchedProjectId: 10,
                PicIdentifier: "budi@perusahaan.com",
                MatchedUserId: "user-budi",
                MatchedUserName: "Budi Santoso",
                Priority: TaskPriority.High,
                Status: Domain.Enums.TaskStatus.Done,
                Progress: 100,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(5),
                Milestone: "Release v1",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new()
            )
        };

        var request = new TaskImportCommitRequest(null, null, null, rows);
        var result = await service.CommitImportAsync(request, 1);

        // Assert: only 1 task inserted, values are from the most updated (row 2)
        Assert.Equal(1, result.TotalImported);
        Assert.Equal(0, result.TotalUpdated);

        var tasks = await context.Tasks.Where(t => t.Title == "Integrasi Payment Gateway").ToListAsync();
        Assert.Single(tasks);

        var task = tasks[0];
        Assert.Equal(100, task.Progress);
        Assert.Equal(Domain.Enums.TaskStatus.Done, task.Status);
        Assert.Equal("Integrasi selesai dan diverifikasi", task.Description);
        Assert.Equal("Release v1", task.Milestone);
    }

    [Fact]
    public async Task CommitImportAsync_UpdatesExistingTaskInDatabase_WithoutDuplication()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        // Pre-create existing task in DB
        var existingTask = new WorkTask
        {
            Title = "Migrasi Basis Data",
            Description = "Skema awal",
            Priority = TaskPriority.Low,
            Status = Domain.Enums.TaskStatus.Todo,
            Progress = 0,
            ProjectId = 10,
            CompanyId = 1,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-5),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-5)
        };
        context.Tasks.Add(existingTask);
        await context.SaveChangesAsync();

        // Import updated row matching existing task by title & project
        var rows = new List<TaskImportRowDto>
        {
            new(
                RowIndex: 1,
                TaskCode: $"TK-{existingTask.Id:D4}",
                ParentTaskCode: null,
                Title: "Migrasi Basis Data",
                Description: "Skema selesai dan diverifikasi",
                ProjectName: "Website Redesign",
                MatchedProjectId: 10,
                PicIdentifier: "budi@perusahaan.com",
                MatchedUserId: "user-budi",
                MatchedUserName: "Budi Santoso",
                Priority: TaskPriority.Critical,
                Status: Domain.Enums.TaskStatus.Done,
                Progress: 100,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(1),
                Milestone: "Selesai",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new(),
                IsUpdate: true,
                ExistingTaskId: existingTask.Id
            )
        };

        var request = new TaskImportCommitRequest(null, null, null, rows);
        var result = await service.CommitImportAsync(request, 1);

        // Total imported is 1, and total updated is 1
        Assert.Equal(1, result.TotalImported);
        Assert.Equal(1, result.TotalUpdated);

        // No new duplicate task created
        var allTasks = await context.Tasks.ToListAsync();
        Assert.Single(allTasks);

        var updatedTask = allTasks[0];
        Assert.Equal(existingTask.Id, updatedTask.Id);
        Assert.Equal(100, updatedTask.Progress);
        Assert.Equal(Domain.Enums.TaskStatus.Done, updatedTask.Status);
        Assert.Equal(TaskPriority.Critical, updatedTask.Priority);
        Assert.Equal("Skema selesai dan diverifikasi", updatedTask.Description);
        Assert.Equal("user-budi", updatedTask.AssignedToUserId);
    }

    [Fact]
    public async Task PreviewImportAsync_MatchesSimilarUserAndEmail_PreventsRedundancy()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Tasks");
        ws.Cell(1, 1).Value = "Judul Tugas";
        ws.Cell(1, 2).Value = "Proyek";
        ws.Cell(1, 3).Value = "PIC";

        // Row 2: Matches "Budi Santoso" via academic title "Ir. Budi Santoso, S.Kom"
        ws.Cell(2, 1).Value = "Task 1";
        ws.Cell(2, 2).Value = "Website Redesign";
        ws.Cell(2, 3).Value = "Ir. Budi Santoso, S.Kom";

        // Row 3: Matches "Dewi Lestari" via email local-part "dewi@otherdomain.com"
        ws.Cell(3, 1).Value = "Task 2";
        ws.Cell(3, 2).Value = "Website Redesign";
        ws.Cell(3, 3).Value = "dewi@otherdomain.com";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var preview = await service.PreviewImportAsync(ms, "similar-users.xlsx", 1);

        Assert.Equal(2, preview.TotalRows);

        var row1 = preview.Rows.First(r => r.Title == "Task 1");
        Assert.Equal("user-budi", row1.MatchedUserId);
        Assert.Equal("Budi Santoso", row1.MatchedUserName);

        var row2 = preview.Rows.First(r => r.Title == "Task 2");
        Assert.Equal("user-dewi", row2.MatchedUserId);
        Assert.Equal("Dewi Lestari", row2.MatchedUserName);
    }

    [Fact]
    public async Task CommitImportAsync_UserIsMoveableAcrossProjects()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        // Pre-create project 2
        var project2 = new Project { Id = 20, Name = "Mobile App ERP", CompanyId = 1, Color = "#10B981" };
        context.Projects.Add(project2);

        // Task originally in Project 10 (Website Redesign)
        var originalTask = new WorkTask
        {
            Title = "Implementasi REST API Auth",
            Description = "Auth module",
            Priority = TaskPriority.Medium,
            Status = Domain.Enums.TaskStatus.InProgress,
            Progress = 50,
            ProjectId = 10,
            AssignedToUserId = "user-budi",
            CompanyId = 1
        };
        context.Tasks.Add(originalTask);
        await context.SaveChangesAsync();

        // Sheet moves this task to Project 20 (Mobile App ERP) and assigns Budi to it
        var rows = new List<TaskImportRowDto>
        {
            new(
                RowIndex: 1,
                TaskCode: $"TK-{originalTask.Id:D4}",
                ParentTaskCode: null,
                Title: "Implementasi REST API Auth",
                Description: "Auth module mobile & web",
                ProjectName: "Mobile App ERP",
                MatchedProjectId: 20,
                PicIdentifier: "Budi Santoso",
                MatchedUserId: "user-budi",
                MatchedUserName: "Budi Santoso",
                Priority: TaskPriority.High,
                Status: Domain.Enums.TaskStatus.Done,
                Progress: 100,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(1),
                Milestone: "Phase 1",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new(),
                IsUpdate: true,
                ExistingTaskId: originalTask.Id
            ),
            // New task in Project 20 also assigned to Budi
            new(
                RowIndex: 2,
                TaskCode: "NEW-02",
                ParentTaskCode: null,
                Title: "Push Notification Setup",
                Description: "Firebase messaging",
                ProjectName: "Mobile App ERP",
                MatchedProjectId: 20,
                PicIdentifier: "Budi Santoso",
                MatchedUserId: "user-budi",
                MatchedUserName: "Budi Santoso",
                Priority: TaskPriority.High,
                Status: Domain.Enums.TaskStatus.Todo,
                Progress: 0,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(7),
                Milestone: "Phase 1",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new()
            )
        };

        var request = new TaskImportCommitRequest(null, null, null, rows);
        var result = await service.CommitImportAsync(request, 1);

        Assert.Equal(2, result.TotalImported);
        Assert.Equal(1, result.TotalUpdated);

        // Verify originalTask was moved to Project 20
        var reloadedOriginal = await context.Tasks.FirstOrDefaultAsync(t => t.Id == originalTask.Id);
        Assert.NotNull(reloadedOriginal);
        Assert.Equal(20, reloadedOriginal.ProjectId);
        Assert.Equal("user-budi", reloadedOriginal.AssignedToUserId);
        Assert.Equal(100, reloadedOriginal.Progress);

        // Verify Budi has 2 tasks in Project 20
        var budiTasksInProj20 = await context.Tasks
            .Where(t => t.ProjectId == 20 && t.AssignedToUserId == "user-budi")
            .ToListAsync();
        Assert.Equal(2, budiTasksInProj20.Count);
    }

    [Fact]
    public async Task PreviewAndCommit_IgnoresDashboardAndMasterSheets_AndExtractsMemberSheetNamesAndEmails_NoNAUsers()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();

        // Sheet 1: Dashboard information (should be skipped!)
        var wsDashboard = wb.Worksheets.Add("Dashboard Project");
        wsDashboard.Cell(1, 1).Value = "DASHBOARD MONITORING & REKAPITULASI PROYEK";
        wsDashboard.Cell(2, 1).Value = "Total Proyek: 5";
        wsDashboard.Cell(2, 2).Value = "Total Tugas: 42";
        wsDashboard.Cell(3, 1).Value = "Progres Keseluruhan: 78%";

        // Sheet 2: Master Data lookup (should be skipped!)
        var wsMaster = wb.Worksheets.Add("Master Data");
        wsMaster.Cell(1, 1).Value = "Kamus Data & Lookup Status";
        wsMaster.Cell(2, 1).Value = "Todo";
        wsMaster.Cell(2, 2).Value = "InProgress";
        wsMaster.Cell(2, 3).Value = "Done";

        // Sheet 3: Personnel "Budi Santoso" with top email metadata and rows containing "N/A" and "#N/A"
        var wsBudi = wb.Worksheets.Add("Budi Santoso");
        wsBudi.Cell(1, 1).Value = "Nama: Budi Santoso";
        wsBudi.Cell(1, 2).Value = "Email: budi@perusahaan.com";
        wsBudi.Cell(3, 1).Value = "No";
        wsBudi.Cell(3, 2).Value = "Judul Tugas";
        wsBudi.Cell(3, 3).Value = "Proyek";
        wsBudi.Cell(3, 4).Value = "Status";
        wsBudi.Cell(3, 5).Value = "PIC";

        wsBudi.Cell(4, 1).Value = 1;
        wsBudi.Cell(4, 2).Value = "Implementasi UI Dashboard Modern";
        wsBudi.Cell(4, 3).Value = "Website Redesign";
        wsBudi.Cell(4, 4).Value = "InProgress";
        wsBudi.Cell(4, 5).Value = "N/A"; // Formula error or N/A placeholder in Excel

        wsBudi.Cell(5, 1).Value = 2;
        wsBudi.Cell(5, 2).Value = "Refactor State Management";
        wsBudi.Cell(5, 3).Value = "Website Redesign";
        wsBudi.Cell(5, 4).Value = "Done";
        wsBudi.Cell(5, 5).Value = "#N/A"; // Formula error in Excel

        // Sheet 4: Personnel "Ahmad Fauzi" (new member) with email in table
        var wsAhmad = wb.Worksheets.Add("Ahmad Fauzi");
        wsAhmad.Cell(1, 1).Value = "Judul Tugas";
        wsAhmad.Cell(1, 2).Value = "Proyek";
        wsAhmad.Cell(1, 3).Value = "Status";
        wsAhmad.Cell(1, 4).Value = "Email PIC";

        wsAhmad.Cell(2, 1).Value = "Setup CI/CD Pipeline Otomatis";
        wsAhmad.Cell(2, 2).Value = "Website Redesign";
        wsAhmad.Cell(2, 3).Value = "Todo";
        wsAhmad.Cell(2, 4).Value = "ahmad.fauzi@perusahaan.com";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        // 1. Preview
        var preview = await service.PreviewImportAsync(ms, "tim-rekap.xlsx", 1);

        // Dashboard (Sheet 1) and Master Data (Sheet 2) MUST be ignored -> Exactly 3 task rows from Sheet 3 & 4
        Assert.Equal(3, preview.TotalRows);

        // Verify Sheet 3 rows took Budi Santoso, and NEVER "N/A"
        var task1 = preview.Rows.First(r => r.Title == "Implementasi UI Dashboard Modern");
        Assert.Equal("user-budi", task1.MatchedUserId);
        Assert.Equal("Budi Santoso", task1.MatchedUserName);
        Assert.NotEqual("N/A", task1.PicIdentifier);

        var task2 = preview.Rows.First(r => r.Title == "Refactor State Management");
        Assert.Equal("user-budi", task2.MatchedUserId);
        Assert.Equal("Budi Santoso", task2.MatchedUserName);
        Assert.NotEqual("#N/A", task2.PicIdentifier);

        // Verify Sheet 4 took Ahmad Fauzi and his email
        var task3 = preview.Rows.First(r => r.Title == "Setup CI/CD Pipeline Otomatis");
        Assert.Equal("Ahmad Fauzi", task3.MatchedUserName);
        Assert.Equal("ahmad.fauzi@perusahaan.com", task3.PicIdentifier);

        // 2. Commit
        var commitReq = new TaskImportCommitRequest(null, null, null, preview.Rows);
        var commitRes = await service.CommitImportAsync(commitReq, 1);

        Assert.Equal(3, commitRes.TotalImported);

        // Assert NO user with "N/A" or "N A" was ever created
        var naUser = await context.Users.FirstOrDefaultAsync(u => u.FullName.Contains("N/A") || u.FullName == "N A" || u.Email.Contains("n.a"));
        Assert.Null(naUser);

        // Assert Ahmad Fauzi was created with correct name and email
        var ahmadUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "ahmad.fauzi@perusahaan.com");
        Assert.NotNull(ahmadUser);
        Assert.Equal("Ahmad Fauzi", ahmadUser.FullName);

        // Assert tasks correctly assigned in DB
        var savedTask1 = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Implementasi UI Dashboard Modern");
        var savedTask3 = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Setup CI/CD Pipeline Otomatis");
        Assert.NotNull(savedTask1);
        Assert.NotNull(savedTask3);
        Assert.Equal("user-budi", savedTask1.AssignedToUserId);
        Assert.Equal(ahmadUser.Id, savedTask3.AssignedToUserId);
    }
}


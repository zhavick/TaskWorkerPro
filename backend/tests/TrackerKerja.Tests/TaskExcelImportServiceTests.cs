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
        Assert.Equal("No.", ws.Cell(1, 1).GetString());
        Assert.Equal("project_name", ws.Cell(1, 2).GetString());
        Assert.Equal("title", ws.Cell(1, 4).GetString());
        Assert.Equal("Milestone", ws.Cell(1, 26).GetString());
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

    [Fact]
    public async Task ImportExcel_SheetPersonnel_TwoCellMetadata_MultiProject_CreatesUserWithExactEmail()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();

        // Sheet 1: Two-cell metadata with person name, email, and default project
        var ws1 = wb.Worksheets.Add("Farhan - ERP");
        ws1.Cell(1, 1).Value = "Nama Karyawan";
        ws1.Cell(1, 2).Value = "Farhan Ramadhan";
        ws1.Cell(2, 1).Value = "Alamat Email";
        ws1.Cell(2, 2).Value = "farhan.ramadhan@wahanagroup.id";
        ws1.Cell(3, 1).Value = "Proyek";
        ws1.Cell(3, 2).Value = "Proyek ERP Logistik";

        ws1.Cell(5, 1).Value = "No";
        ws1.Cell(5, 2).Value = "Judul Tugas";
        ws1.Cell(5, 3).Value = "Proyek";
        ws1.Cell(5, 4).Value = "Status";

        // Task 1: No project specified in row -> inherits "Proyek ERP Logistik" from metadata
        ws1.Cell(6, 1).Value = 1;
        ws1.Cell(6, 2).Value = "Integrasi API Saldo Gudang";
        ws1.Cell(6, 3).Value = "";
        ws1.Cell(6, 4).Value = "InProgress";

        // Task 2: Explicitly specifies a different project -> "Aplikasi Mobile Gudang"
        ws1.Cell(7, 1).Value = 2;
        ws1.Cell(7, 2).Value = "Desain Tampilan Barcode Scanner";
        ws1.Cell(7, 3).Value = "Aplikasi Mobile Gudang";
        ws1.Cell(7, 4).Value = "Todo";

        // Sheet 2: Person name in sheet name and sheet metadata, email omitted on this sheet (found cross-sheet from Sheet 1!)
        var ws2 = wb.Worksheets.Add("Farhan Ramadhan - Sistem CRM");
        ws2.Cell(1, 1).Value = "Nama";
        ws2.Cell(1, 2).Value = "Farhan Ramadhan";
        ws2.Cell(3, 1).Value = "Judul Tugas";
        ws2.Cell(3, 2).Value = "Status";

        // Task 3: Inherits project "Sistem CRM" from sheet name
        ws2.Cell(4, 1).Value = "Implementasi Modul Lead Tracking";
        ws2.Cell(4, 2).Value = "Todo";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        // 1. Preview
        var preview = await service.PreviewImportAsync(ms, "farhan-multi-project.xlsx", 1);

        Assert.Equal(3, preview.TotalRows);

        var task1 = preview.Rows.First(r => r.Title == "Integrasi API Saldo Gudang");
        Assert.Equal("Farhan Ramadhan", task1.MatchedUserName);
        Assert.Equal("farhan.ramadhan@wahanagroup.id", task1.PicEmail);
        Assert.Equal("Proyek ERP Logistik", task1.ProjectName);

        var task2 = preview.Rows.First(r => r.Title == "Desain Tampilan Barcode Scanner");
        Assert.Equal("Farhan Ramadhan", task2.MatchedUserName);
        Assert.Equal("farhan.ramadhan@wahanagroup.id", task2.PicEmail);
        Assert.Equal("Aplikasi Mobile Gudang", task2.ProjectName);

        var task3 = preview.Rows.First(r => r.Title == "Implementasi Modul Lead Tracking");
        Assert.Equal("Farhan Ramadhan", task3.MatchedUserName);
        // Cross-sheet resolution: Sheet 2 found Farhan's email from Sheet 1!
        Assert.Equal("farhan.ramadhan@wahanagroup.id", task3.PicEmail);
        Assert.Equal("Sistem CRM", task3.ProjectName);

        // 2. Commit
        var commitReq = new TaskImportCommitRequest(null, null, null, preview.Rows);
        var commitRes = await service.CommitImportAsync(commitReq, 1);

        Assert.Equal(3, commitRes.TotalImported);

        // Assert user was created with the EXACT email found on the sheet
        var createdUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "farhan.ramadhan@wahanagroup.id");
        Assert.NotNull(createdUser);
        Assert.Equal("Farhan Ramadhan", createdUser.FullName);
        Assert.Equal("farhan.ramadhan@wahanagroup.id", createdUser.UserName);

        // Assert all 3 tasks in 3 different projects are assigned to Farhan Ramadhan
        var savedTask1 = await context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Title == "Integrasi API Saldo Gudang");
        var savedTask2 = await context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Title == "Desain Tampilan Barcode Scanner");
        var savedTask3 = await context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Title == "Implementasi Modul Lead Tracking");

        Assert.NotNull(savedTask1);
        Assert.NotNull(savedTask2);
        Assert.NotNull(savedTask3);

        Assert.Equal(createdUser.Id, savedTask1.AssignedToUserId);
        Assert.Equal(createdUser.Id, savedTask2.AssignedToUserId);
        Assert.Equal(createdUser.Id, savedTask3.AssignedToUserId);

        Assert.Equal("Proyek ERP Logistik", savedTask1.Project?.Name);
        Assert.Equal("Aplikasi Mobile Gudang", savedTask2.Project?.Name);
        Assert.Equal("Sistem CRM", savedTask3.Project?.Name);
    }

    [Fact]
    public async Task CommitImportAsync_WhenUserEmailExistsWithDifferentCasingOrGlobally_ReusesExistingUserWithoutViolation()
    {
        // Arrange: In-memory DbContext
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        // Seed an existing user with mixed-casing email and CompanyId = null (global)
        var existingGlobalUser = new AppUser
        {
            Id = "usr-global-1",
            FullName = "Dewi Lestari",
            Email = "Dewi.Lestari@perusahaan.co.id",
            NormalizedEmail = "DEWI.LESTARI@PERUSAHAAN.CO.ID",
            UserName = "Dewi.Lestari@perusahaan.co.id",
            NormalizedUserName = "DEWI.LESTARI@PERUSAHAAN.CO.ID",
            CompanyId = null
        };
        context.Users.Add(existingGlobalUser);
        await context.SaveChangesAsync();

        var service = new TaskExcelImportService(context);

        // Candidate rows referencing dewi.lestari@perusahaan.co.id (lowercase)
        var rows = new List<TaskImportRowDto>
        {
            new(
                RowIndex: 1,
                TaskCode: "TK-001",
                ParentTaskCode: null,
                Title: "Penyusunan Arsitektur Microservices",
                Description: "Dokumentasi rancangan arsitektur",
                ProjectName: "Core Banking Modernization",
                MatchedProjectId: null,
                PicIdentifier: "Dewi Lestari",
                MatchedUserId: null,
                MatchedUserName: "Dewi Lestari",
                Priority: TaskPriority.High,
                Status: TrackerKerja.Domain.Enums.TaskStatus.InProgress,
                Progress: 60,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(7),
                Milestone: "Arsitektur",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new List<string>(),
                PicEmail: "dewi.lestari@perusahaan.co.id"
            ),
            new(
                RowIndex: 2,
                TaskCode: "TK-002",
                ParentTaskCode: null,
                Title: "Implementasi OAuth2 Server",
                Description: "Otorisasi token JWT",
                ProjectName: "Identity Management Platform",
                MatchedProjectId: null,
                PicIdentifier: "Dewi Lestari",
                MatchedUserId: null,
                MatchedUserName: "Dewi Lestari",
                Priority: TaskPriority.Critical,
                Status: TrackerKerja.Domain.Enums.TaskStatus.Todo,
                Progress: 0,
                StartDate: DateTimeOffset.UtcNow,
                DueDate: DateTimeOffset.UtcNow.AddDays(14),
                Milestone: "Autentikasi",
                Obstacle: null,
                Solution: null,
                ValidationStatus: TaskImportValidationStatus.Valid,
                ValidationMessages: new List<string>(),
                PicEmail: "dewi.lestari@perusahaan.co.id"
            )
        };

        var commitReq = new TaskImportCommitRequest(null, null, null, rows, AutoCreateMissingUsers: true);
        var result = await service.CommitImportAsync(commitReq, companyId: 2);

        // Assert
        Assert.Equal(2, result.TotalImported);
        Assert.Equal(2, result.TotalProjectsCreated);
        // User already existed globally, so NO new user created
        Assert.Equal(0, result.TotalUsersCreated);

        var task1 = await context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Title == "Penyusunan Arsitektur Microservices");
        var task2 = await context.Tasks.Include(t => t.Project).FirstOrDefaultAsync(t => t.Title == "Implementasi OAuth2 Server");

        Assert.NotNull(task1);
        Assert.NotNull(task2);
        Assert.Equal("usr-global-1", task1.AssignedToUserId);
        Assert.Equal("usr-global-1", task2.AssignedToUserId);
        Assert.Equal("Core Banking Modernization", task1.Project?.Name);
        Assert.Equal("Identity Management Platform", task2.Project?.Name);
    }

    [Fact]
    public async Task PreviewImportAsync_ColumnTitledTugas_IsImportedSuccessfully()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Daftar Pekerjaan");
        ws.Cell(1, 1).Value = "No";
        ws.Cell(1, 2).Value = "Tugas";
        ws.Cell(1, 3).Value = "Proyek";
        ws.Cell(1, 4).Value = "Status";
        ws.Cell(1, 5).Value = "PIC";

        ws.Cell(2, 1).Value = 1;
        ws.Cell(2, 2).Value = "Setup Environment Staging";
        ws.Cell(2, 3).Value = "Infra Setup";
        ws.Cell(2, 4).Value = "InProgress";
        ws.Cell(2, 5).Value = "budi@perusahaan.com";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var preview = await service.PreviewImportAsync(ms, "Tasks.xlsx", companyId: 1);

        Assert.NotNull(preview);
        Assert.Single(preview.Rows);
        Assert.Equal("Setup Environment Staging", preview.Rows[0].Title);
        Assert.Equal("Infra Setup", preview.Rows[0].ProjectName);
        Assert.Equal(TrackerKerja.Domain.Enums.TaskStatus.InProgress, preview.Rows[0].Status);
    }

    [Fact]
    public async Task PreviewAndCommit_MultiSheetWithDashboardAndMasterDataAndCrossSheetEmail_WorksCorrectly()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();

        // Sheet 1: Dashboard (Must be ignored)
        var wsDashboard = wb.Worksheets.Add("Dashboard KPI");
        wsDashboard.Cell(1, 1).Value = "Ringkasan Eksekutif";
        wsDashboard.Cell(2, 1).Value = "Total Proyek: 5";
        wsDashboard.Cell(3, 1).Value = "Total Tugas: 100";

        // Sheet 2: Master Data (Must be ignored)
        var wsMaster = wb.Worksheets.Add("Master Data");
        wsMaster.Cell(1, 1).Value = "Daftar Status";
        wsMaster.Cell(2, 1).Value = "Todo";
        wsMaster.Cell(3, 1).Value = "InProgress";
        wsMaster.Cell(4, 1).Value = "Done";

        // Sheet 3: Wahana 24 (Personnel Sheet with tasks)
        var wsWahana = wb.Worksheets.Add("Wahana 24");
        wsWahana.Cell(1, 1).Value = "No";
        wsWahana.Cell(1, 2).Value = "Tugas";
        wsWahana.Cell(1, 3).Value = "Proyek";
        wsWahana.Cell(1, 4).Value = "Status";
        wsWahana.Cell(1, 5).Value = "Target Selesai";

        wsWahana.Cell(2, 1).Value = 1;
        wsWahana.Cell(2, 2).Value = "Implementasi Payment Gateway API";
        wsWahana.Cell(2, 3).Value = "Fintech Modern";
        wsWahana.Cell(2, 4).Value = "InProgress";
        wsWahana.Cell(2, 5).Value = "2026-11-15";

        wsWahana.Cell(3, 1).Value = 2;
        wsWahana.Cell(3, 2).Value = "Integrasi Notifikasi WhatsApp Gateway";
        wsWahana.Cell(3, 3).Value = "Omnichannel Support";
        wsWahana.Cell(3, 4).Value = "Todo";
        wsWahana.Cell(3, 5).Value = "2026-11-20";

        // Sheet 4: Direktori Pegawai (Contains email for Wahana 24)
        var wsDir = wb.Worksheets.Add("Direktori Tim");
        wsDir.Cell(1, 1).Value = "Nama Pegawai";
        wsDir.Cell(1, 2).Value = "Email Resmi";
        wsDir.Cell(2, 1).Value = "Wahana 24";
        wsDir.Cell(2, 2).Value = "wahana24@enterprise.co.id";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        // Preview
        var preview = await service.PreviewImportAsync(ms, "TeamWork.xlsx", companyId: 1);

        Assert.NotNull(preview);
        Assert.Equal(2, preview.TotalRows);
        Assert.Equal("Implementasi Payment Gateway API", preview.Rows[0].Title);
        Assert.Equal("Fintech Modern", preview.Rows[0].ProjectName);
        Assert.Equal("Integrasi Notifikasi WhatsApp Gateway", preview.Rows[1].Title);
        Assert.Equal("Omnichannel Support", preview.Rows[1].ProjectName);

        // Cross-sheet email should be resolved
        Assert.Equal("wahana24@enterprise.co.id", preview.Rows[0].PicEmail);
        Assert.Equal("wahana24@enterprise.co.id", preview.Rows[1].PicEmail);

        // Commit
        var commitReq = new TaskImportCommitRequest(null, null, null, preview.Rows, AutoCreateMissingUsers: true);
        var result = await service.CommitImportAsync(commitReq, companyId: 1);

        Assert.Equal(2, result.TotalImported);
        Assert.Equal(2, result.TotalProjectsCreated);
        Assert.Equal(1, result.TotalUsersCreated);

        var createdUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "wahana24@enterprise.co.id");
        Assert.NotNull(createdUser);
        Assert.Equal("Wahana 24", createdUser.FullName);

        var tasks = await context.Tasks.Where(t => t.AssignedToUserId == createdUser.Id).ToListAsync();
        Assert.Equal(2, tasks.Count);
    }

    [Fact]
    public void TaskImportCommitRequest_JsonWithEmptyDateString_DeserializesSafelyWithoutError()
    {
        var jsonOptions = new System.Text.Json.JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        jsonOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        jsonOptions.Converters.Add(new TrackerKerja.Infrastructure.Converters.NullableDateTimeOffsetJsonConverter());
        jsonOptions.Converters.Add(new TrackerKerja.Infrastructure.Converters.DateTimeOffsetJsonConverter());

        var jsonPayload = """
        {
            "defaultProjectId": null,
            "bulkAssignUserId": null,
            "selectedRowIndexes": [1],
            "rows": [
                {
                    "rowIndex": 1,
                    "title": "Tugas Tanpa Tanggal Selesai",
                    "projectName": "Infra Upgrade",
                    "priority": "High",
                    "status": "InProgress",
                    "progress": 50,
                    "startDate": "",
                    "dueDate": "",
                    "validationStatus": "Valid",
                    "validationMessages": []
                }
            ],
            "autoCreateMissingUsers": true
        }
        """;

        var deserialized = System.Text.Json.JsonSerializer.Deserialize<TaskImportCommitRequest>(jsonPayload, jsonOptions);

        Assert.NotNull(deserialized);
        Assert.Single(deserialized.Rows);
        var row = deserialized.Rows[0];
        Assert.Null(row.StartDate);
        Assert.Null(row.DueDate);
    }

    [Fact]
    public async Task PreviewImportAsync_MasterDataSheetsIgnored_OnlyPersonnelSheetsImported()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();

        // 1. Sheet Master Data (must NOT be imported)
        var wsMaster1 = wb.Worksheets.Add("Master Data");
        wsMaster1.Cell(1, 1).Value = "Daftar Pilihan Status";
        wsMaster1.Cell(2, 1).Value = "Todo";
        wsMaster1.Cell(3, 1).Value = "InProgress";
        wsMaster1.Cell(4, 1).Value = "Done";

        // 2. Sheet Data Master Status (must NOT be imported)
        var wsMaster2 = wb.Worksheets.Add("Data Master Status");
        wsMaster2.Cell(1, 1).Value = "Parameter";
        wsMaster2.Cell(2, 1).Value = "Prioritas";

        // 3. Sheet Dashboard (must NOT be imported)
        var wsDash = wb.Worksheets.Add("Dashboard Summary");
        wsDash.Cell(1, 1).Value = "Ringkasan KPI";
        wsDash.Cell(2, 1).Value = "Total Proyek: 10";

        // 4. Sheet Budi Santoso (Personnel sheet - MUST be imported)
        var wsBudi = wb.Worksheets.Add("Budi Santoso");
        wsBudi.Cell(1, 1).Value = "No";
        wsBudi.Cell(1, 2).Value = "Tugas";
        wsBudi.Cell(1, 3).Value = "Proyek";
        wsBudi.Cell(1, 4).Value = "Status";
        wsBudi.Cell(2, 1).Value = 1;
        wsBudi.Cell(2, 2).Value = "Refactoring Auth Module";
        wsBudi.Cell(2, 3).Value = "Security Revamp";
        wsBudi.Cell(2, 4).Value = "InProgress";
        wsBudi.Cell(3, 1).Value = 2;
        wsBudi.Cell(3, 2).Value = "Penulisan Unit Test Auth";
        wsBudi.Cell(3, 3).Value = "Security Revamp";
        wsBudi.Cell(3, 4).Value = "Todo";

        // 5. Sheet Dewi Lestari (Personnel sheet - MUST be imported)
        var wsDewi = wb.Worksheets.Add("Dewi Lestari");
        wsDewi.Cell(1, 1).Value = "No";
        wsDewi.Cell(1, 2).Value = "Tugas";
        wsDewi.Cell(1, 3).Value = "Proyek";
        wsDewi.Cell(1, 4).Value = "Status";
        wsDewi.Cell(2, 1).Value = 1;
        wsDewi.Cell(2, 2).Value = "Desain Tampilan UI Dashboard";
        wsDewi.Cell(2, 3).Value = "UI Modernization";
        wsDewi.Cell(2, 4).Value = "InProgress";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var preview = await service.PreviewImportAsync(ms, "TeamWork.xlsx", companyId: 1);

        Assert.NotNull(preview);
        // Only 3 rows total from Budi Santoso (2) and Dewi Lestari (1)
        Assert.Equal(3, preview.TotalRows);
        Assert.Contains(preview.Rows, r => r.Title == "Refactoring Auth Module");
        Assert.Contains(preview.Rows, r => r.Title == "Penulisan Unit Test Auth");
        Assert.Contains(preview.Rows, r => r.Title == "Desain Tampilan UI Dashboard");
        Assert.DoesNotContain(preview.Rows, r => r.Title.Contains("Daftar Pilihan Status") || r.Title.Contains("Parameter") || r.Title.Contains("Ringkasan"));
    }

    [Fact]
    public async Task CommitImportAsync_UserDeduplicationPerCompany_SameCompanyReusesUser_DifferentCompanyAllowsSameName()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        // Add Company 2
        var company2 = new Company { Id = 2, Name = "Perusahaan Kedua", Code = "CORP2" };
        context.Companies.Add(company2);
        await context.SaveChangesAsync();

        // Case A: Import task for Company 1 with PIC "Budi Santoso"
        // Company 1 ALREADY has "user-budi" (Budi Santoso). It must NOT create a duplicate user!
        var rowCompany1 = new TaskImportRowDto(
            RowIndex: 1,
            TaskCode: null,
            ParentTaskCode: null,
            Title: "Tugas Untuk Budi Perusahaan 1",
            Description: null,
            ProjectName: "Website Redesign",
            MatchedProjectId: 10,
            PicIdentifier: "Budi Santoso",
            MatchedUserId: null,
            MatchedUserName: "Budi Santoso",
            Priority: TaskPriority.High,
            Status: TrackerKerja.Domain.Enums.TaskStatus.InProgress,
            Progress: 30,
            StartDate: null,
            DueDate: null,
            Milestone: null,
            Obstacle: null,
            Solution: null,
            ValidationStatus: TaskImportValidationStatus.Valid,
            ValidationMessages: new List<string>(),
            PicEmail: "budi.santoso@custom-mail.com" // even with custom email, same name in company 1 reuses existing
        );

        var commitReq1 = new TaskImportCommitRequest(null, null, null, [rowCompany1], AutoCreateMissingUsers: true);
        var result1 = await service.CommitImportAsync(commitReq1, companyId: 1);

        Assert.Equal(1, result1.TotalImported);
        Assert.Equal(0, result1.TotalUsersCreated); // Reused existing user!

        var taskInCompany1 = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Tugas Untuk Budi Perusahaan 1");
        Assert.NotNull(taskInCompany1);
        Assert.Equal("user-budi", taskInCompany1.AssignedToUserId);

        // Case B: Import task for Company 2 with PIC "Budi Santoso"
        // "kecuali berbeda perusahaan": In Company 2, Budi Santoso does NOT exist yet.
        // It MUST create a new user for Company 2!
        var rowCompany2 = new TaskImportRowDto(
            RowIndex: 1,
            TaskCode: null,
            ParentTaskCode: null,
            Title: "Tugas Untuk Budi Perusahaan 2",
            Description: null,
            ProjectName: "Project Corp 2",
            MatchedProjectId: null,
            PicIdentifier: "Budi Santoso",
            MatchedUserId: null,
            MatchedUserName: "Budi Santoso",
            Priority: TaskPriority.Medium,
            Status: TrackerKerja.Domain.Enums.TaskStatus.Todo,
            Progress: 0,
            StartDate: null,
            DueDate: null,
            Milestone: null,
            Obstacle: null,
            Solution: null,
            ValidationStatus: TaskImportValidationStatus.Valid,
            ValidationMessages: new List<string>(),
            PicEmail: "budi@corp2.com"
        );

        var commitReq2 = new TaskImportCommitRequest(null, null, null, [rowCompany2], AutoCreateMissingUsers: true);
        var result2 = await service.CommitImportAsync(commitReq2, companyId: 2);

        Assert.Equal(1, result2.TotalImported);
        Assert.Equal(1, result2.TotalUsersCreated); // Created new user in Company 2!

        var userInCompany2 = await context.Users.FirstOrDefaultAsync(u => u.CompanyId == 2 && u.FullName == "Budi Santoso");
        Assert.NotNull(userInCompany2);
        Assert.NotEqual("user-budi", userInCompany2.Id); // Distinct user entity!

        var taskInCompany2 = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Tugas Untuk Budi Perusahaan 2");
        Assert.NotNull(taskInCompany2);
        Assert.Equal(userInCompany2.Id, taskInCompany2.AssignedToUserId);
    }

    [Fact]
    public async Task PreviewAndCommit_UserNameAndEmailAreStrictlySynchronized_WhenEmailGiven()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        // Row with picIdentifier "Syafix" but email "haviz.indra@elistec.com"
        var row = new TaskImportRowDto(
            RowIndex: 1,
            TaskCode: null,
            ParentTaskCode: null,
            Title: "Desain Sistem Manajemen",
            Description: null,
            ProjectName: "Proyek Modern",
            MatchedProjectId: null,
            PicIdentifier: "Syafix",
            MatchedUserId: null,
            MatchedUserName: "Syafix",
            Priority: TaskPriority.High,
            Status: TrackerKerja.Domain.Enums.TaskStatus.InProgress,
            Progress: 50,
            StartDate: null,
            DueDate: null,
            Milestone: null,
            Obstacle: null,
            Solution: null,
            ValidationStatus: TaskImportValidationStatus.Valid,
            ValidationMessages: new List<string>(),
            PicEmail: "haviz.indra@elistec.com"
        );

        var commitReq = new TaskImportCommitRequest(null, null, null, [row], AutoCreateMissingUsers: true);
        var result = await service.CommitImportAsync(commitReq, companyId: 1);

        Assert.Equal(1, result.TotalImported);
        Assert.Equal(1, result.TotalUsersCreated);

        // Name and Email must be synchronized!
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "haviz.indra@elistec.com");
        Assert.NotNull(user);
        Assert.Equal("Haviz Indra", user.FullName); // NOT "Syafix", display name is synchronized with email!
        Assert.Equal("haviz.indra@elistec.com", user.Email);

        var task = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Desain Sistem Manajemen");
        Assert.NotNull(task);
        Assert.Equal(user.Id, task.AssignedToUserId);
    }

    [Fact]
    public async Task PreviewAndCommit_CrossSheetEmailDoesNotMisattributeUnrelatedEmailToDifferentPerson()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();

        // Sheet 1: Haviz Indra with his email
        var wsHaviz = wb.Worksheets.Add("Haviz Indra");
        wsHaviz.Cell(1, 1).Value = "Judul Tugas";
        wsHaviz.Cell(1, 2).Value = "Proyek";
        wsHaviz.Cell(1, 3).Value = "Status";
        wsHaviz.Cell(1, 4).Value = "Email PIC";
        wsHaviz.Cell(2, 1).Value = "Tugas Haviz";
        wsHaviz.Cell(2, 2).Value = "Fintech Modern";
        wsHaviz.Cell(2, 3).Value = "Done";
        wsHaviz.Cell(2, 4).Value = "haviz.indra@elistec.com";

        // Sheet 2: Syafix with NO email
        var wsSyafix = wb.Worksheets.Add("Syafix");
        wsSyafix.Cell(1, 1).Value = "Judul Tugas";
        wsSyafix.Cell(1, 2).Value = "Proyek";
        wsSyafix.Cell(1, 3).Value = "Status";
        wsSyafix.Cell(2, 1).Value = "Tugas Syafix";
        wsSyafix.Cell(2, 2).Value = "Fintech Modern";
        wsSyafix.Cell(2, 3).Value = "Todo";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var preview = await service.PreviewImportAsync(ms, "tim-elistec.xlsx", companyId: 1);
        Assert.Equal(2, preview.TotalRows);

        var rowHaviz = preview.Rows.First(r => r.Title == "Tugas Haviz");
        Assert.Equal("Haviz Indra", rowHaviz.MatchedUserName);
        Assert.Equal("haviz.indra@elistec.com", rowHaviz.PicEmail);

        var rowSyafix = preview.Rows.First(r => r.Title == "Tugas Syafix");
        Assert.Equal("Syafix", rowSyafix.MatchedUserName);
        // Syafix must NOT steal Haviz Indra's email
        Assert.NotEqual("haviz.indra@elistec.com", rowSyafix.PicEmail);

        var commitReq = new TaskImportCommitRequest(null, null, null, preview.Rows, AutoCreateMissingUsers: true);
        var result = await service.CommitImportAsync(commitReq, companyId: 1);

        Assert.Equal(2, result.TotalImported);

        var userHaviz = await context.Users.FirstOrDefaultAsync(u => u.Email == "haviz.indra@elistec.com");
        Assert.NotNull(userHaviz);
        Assert.Equal("Haviz Indra", userHaviz.FullName);

        var userSyafix = await context.Users.FirstOrDefaultAsync(u => u.FullName == "Syafix");
        Assert.NotNull(userSyafix);
        Assert.NotEqual("haviz.indra@elistec.com", userSyafix.Email);
    }

    [Fact]
    public async Task CommitImport_RepairsExistingMismatchedUserInDatabase_WhenImportRuns()
    {
        using var context = CreateInMemoryContext();
        // Simulate corrupted user in database where FullName is "Syafix" but Email is "haviz.indra@elistec.com"
        var corruptedUser = new AppUser
        {
            Id = "usr-corrupted",
            FullName = "Syafix",
            Email = "haviz.indra@elistec.com",
            NormalizedEmail = "HAVIZ.INDRA@ELISTEC.COM",
            UserName = "haviz.indra@elistec.com",
            CompanyId = 1,
            JobTitle = "Staff Pelaksana",
            AvatarColor = "#3B82F6",
            CreatedAt = DateTimeOffset.UtcNow
        };
        context.Users.Add(corruptedUser);
        await context.SaveChangesAsync();

        var service = new TaskExcelImportService(context);

        var row = new TaskImportRowDto(
            RowIndex: 1,
            TaskCode: null,
            ParentTaskCode: null,
            Title: "Tugas Lanjutan",
            Description: null,
            ProjectName: "Proyek Wahana",
            MatchedProjectId: null,
            PicIdentifier: "Haviz Indra",
            MatchedUserId: null,
            MatchedUserName: "Haviz Indra",
            Priority: TaskPriority.Medium,
            Status: TrackerKerja.Domain.Enums.TaskStatus.Todo,
            Progress: 0,
            StartDate: null,
            DueDate: null,
            Milestone: null,
            Obstacle: null,
            Solution: null,
            ValidationStatus: TaskImportValidationStatus.Valid,
            ValidationMessages: new List<string>(),
            PicEmail: "haviz.indra@elistec.com"
        );

        var commitReq = new TaskImportCommitRequest(null, null, null, [row], AutoCreateMissingUsers: true);
        var result = await service.CommitImportAsync(commitReq, companyId: 1);

        Assert.Equal(1, result.TotalImported);

        // Verify the existing user's FullName in DB was repaired to be synchronized with their email
        var repairedUser = await context.Users.FirstOrDefaultAsync(u => u.Id == "usr-corrupted");
        Assert.NotNull(repairedUser);
        Assert.Equal("Haviz Indra", repairedUser.FullName); // Repaired!
        Assert.Equal("haviz.indra@elistec.com", repairedUser.Email);
    }

    [Fact]
    public async Task PreviewImportAsync_DetectsCompanyInWorksheet_AndAutoResolvesCompany()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Tasks");
        ws.Cell(1, 1).Value = "Perusahaan: PT Sinergi Informatika Nusantara";
        ws.Cell(2, 1).Value = "No.";
        ws.Cell(2, 2).Value = "project_name";
        ws.Cell(2, 3).Value = "pic";
        ws.Cell(2, 4).Value = "title";

        ws.Cell(3, 1).Value = 1;
        ws.Cell(3, 2).Value = "Proyek Cloud Migration";
        ws.Cell(3, 3).Value = "Rudi Hartono";
        ws.Cell(3, 4).Value = "Migrasi Database ke Cloud";

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        var preview = await service.PreviewImportAsync(ms, "MigrasiCloud.xlsx", companyId: null);

        Assert.NotNull(preview);
        Assert.Equal("PT Sinergi Informatika Nusantara", preview.DetectedCompanyName);
        Assert.NotNull(preview.DetectedCompanyId);
        Assert.True(preview.DetectedCompanyId > 0);

        var createdCompany = await context.Companies.FirstOrDefaultAsync(c => c.Name == "PT Sinergi Informatika Nusantara");
        Assert.NotNull(createdCompany);
        Assert.Equal(preview.DetectedCompanyId, createdCompany.Id);
    }

    [Fact]
    public async Task CommitImportAsync_WithAutoCompanyResolution_BindsUsersProjectsAndTasks()
    {
        using var context = CreateInMemoryContext();
        var service = new TaskExcelImportService(context);

        var row = new TaskImportRowDto(
            RowIndex: 1,
            TaskCode: null,
            ParentTaskCode: null,
            Title: "Setup Microservice Architecture",
            Description: "Deskripsi arsitektur",
            ProjectName: "Digital Core Platform",
            MatchedProjectId: null,
            PicIdentifier: "Aris Munandar",
            MatchedUserId: null,
            MatchedUserName: "Aris Munandar",
            Priority: TaskPriority.High,
            Status: TrackerKerja.Domain.Enums.TaskStatus.Todo,
            Progress: 0,
            StartDate: null,
            DueDate: null,
            Milestone: null,
            Obstacle: null,
            Solution: null,
            ValidationStatus: TaskImportValidationStatus.Valid,
            ValidationMessages: new List<string>(),
            PicEmail: "aris.munandar@sinergi.co.id"
        );

        var commitReq = new TaskImportCommitRequest(
            DefaultProjectId: null,
            BulkAssignUserId: null,
            SelectedRowIndexes: null,
            Rows: [row],
            AutoCreateMissingUsers: true,
            CompanyName: "PT Sinergi Jaya Abadi"
        );

        var result = await service.CommitImportAsync(commitReq, companyId: null);

        Assert.Equal(1, result.TotalImported);

        // Verify Company was auto-created
        var company = await context.Companies.FirstOrDefaultAsync(c => c.Name == "PT Sinergi Jaya Abadi");
        Assert.NotNull(company);

        // Verify Project is bound to this Company
        var project = await context.Projects.FirstOrDefaultAsync(p => p.Name == "Digital Core Platform");
        Assert.NotNull(project);
        Assert.Equal(company.Id, project.CompanyId);

        // Verify User is created and bound to this Company
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == "aris.munandar@sinergi.co.id");
        Assert.NotNull(user);
        Assert.Equal(company.Id, user.CompanyId);

        // Verify Task is bound to this Company
        var task = await context.Tasks.FirstOrDefaultAsync(t => t.Title == "Setup Microservice Architecture");
        Assert.NotNull(task);
        Assert.Equal(company.Id, task.CompanyId);
        Assert.Equal(project.Id, task.ProjectId);
        Assert.Equal(user.Id, task.AssignedToUserId);
    }
}




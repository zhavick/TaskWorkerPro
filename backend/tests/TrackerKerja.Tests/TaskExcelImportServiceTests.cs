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
}

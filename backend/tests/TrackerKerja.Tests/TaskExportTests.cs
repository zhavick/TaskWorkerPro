using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class TaskExportTests
{
    private AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);

        // Seed initial company, users, project, category, tasks
        var company = new Company { Id = 1, Name = "Test Company", Code = "TEST" };
        context.Companies.Add(company);

        var user1 = new AppUser { Id = "user-1", FullName = "Budi Santoso", Email = "budi@test.com", CompanyId = 1 };
        var user2 = new AppUser { Id = "user-2", FullName = "Dewi Lestari", Email = "dewi@test.com", CompanyId = 1 };
        context.Users.AddRange(user1, user2);

        var project = new Project { Id = 10, Name = "Portal E-Commerce", CompanyId = 1, Color = "#4F46E5" };
        context.Projects.Add(project);

        var category = new Category { Id = 20, Name = "Backend API" };
        context.Categories.Add(category);

        var task1 = new WorkTask
        {
            Id = 101,
            Title = "API Checkout Payment",
            Description = "Integrasi payment gateway QRIS",
            ProjectId = 10,
            CategoryId = 20,
            AssignedToUserId = "user-1",
            Priority = TaskPriority.High,
            Status = Domain.Enums.TaskStatus.Done,
            Progress = 100,
            Milestone = "Implementation",
            Obstacle = "Latency webhook",
            Solution = "Tambah async queue",
            CompanyId = 1,
            StartDate = DateTimeOffset.UtcNow.AddDays(-5),
            DueDate = DateTimeOffset.UtcNow.AddDays(-1),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-5),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };

        var task2 = new WorkTask
        {
            Id = 102,
            Title = "UI Dashboard Admin",
            Description = "Desain halaman analitik",
            ProjectId = 10,
            AssignedToUserId = "user-2",
            Priority = TaskPriority.Medium,
            Status = Domain.Enums.TaskStatus.InProgress,
            Progress = 60,
            Milestone = "System Design",
            CompanyId = 1,
            StartDate = DateTimeOffset.UtcNow.AddDays(-2),
            DueDate = DateTimeOffset.UtcNow.AddDays(3),
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        };

        context.Tasks.AddRange(task1, task2);
        context.SaveChanges();

        return context;
    }

    [Fact]
    public async Task GenerateTasksExcelAsync_StandardFormat_ProducesValidWorkbookWith9Columns()
    {
        using var context = CreateInMemoryContext();
        var service = new ClosedXmlExportService(context);

        var filter = new TaskExportFilterDto { Format = "standard", Scope = "all" };
        var bytes = await service.GenerateTasksExcelAsync(filter, 1, "user-admin", isAdmin: true);

        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        var ws = workbook.Worksheets.FirstOrDefault(w => w.Name == "Daftar Tugas");
        Assert.NotNull(ws);

        // Header row should be row 3 with 9 columns
        Assert.Equal("No", ws.Cell(3, 1).GetString());
        Assert.Equal("Proyek", ws.Cell(3, 2).GetString());
        Assert.Equal("Judul Tugas", ws.Cell(3, 3).GetString());
        Assert.Equal("Prioritas", ws.Cell(3, 4).GetString());
        Assert.Equal("Status", ws.Cell(3, 5).GetString());
        Assert.Equal("Progres (%)", ws.Cell(3, 6).GetString());
        Assert.Equal("PIC", ws.Cell(3, 7).GetString());
        Assert.Equal("Tenggat Waktu", ws.Cell(3, 8).GetString());
        Assert.Equal("Kendala & Solusi", ws.Cell(3, 9).GetString());

        // Should have 2 task rows
        Assert.Equal("API Checkout Payment", ws.Cell(4, 3).GetString());
        Assert.Equal("UI Dashboard Admin", ws.Cell(5, 3).GetString());
    }

    [Fact]
    public async Task GenerateTasksExcelAsync_ArmsFormat_ProducesSummarySheetAnd21ColumnsDetail()
    {
        using var context = CreateInMemoryContext();
        var service = new ClosedXmlExportService(context);

        var filter = new TaskExportFilterDto { Format = "arms", Scope = "all" };
        var bytes = await service.GenerateTasksExcelAsync(filter, 1, "user-admin", isAdmin: true);

        Assert.NotNull(bytes);
        Assert.NotEmpty(bytes);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        Assert.Equal(2, workbook.Worksheets.Count);
        var wsSummary = workbook.Worksheets.FirstOrDefault(w => w.Name == "Ringkasan Eksekutif");
        var wsDetail = workbook.Worksheets.FirstOrDefault(w => w.Name == "Rincian Tugas ARMS");

        Assert.NotNull(wsSummary);
        Assert.NotNull(wsDetail);

        // 21 columns on detail sheet
        Assert.Equal("No", wsDetail.Cell(3, 1).GetString());
        Assert.Equal("Project Code", wsDetail.Cell(3, 2).GetString());
        Assert.Equal("Project Name", wsDetail.Cell(3, 3).GetString());
        Assert.Equal("Task Code", wsDetail.Cell(3, 4).GetString());
        Assert.Equal("Updated At", wsDetail.Cell(3, 21).GetString());
    }

    [Fact]
    public async Task GenerateTasksExcelAsync_NonAdmin_EnforcesMineScopeOnly()
    {
        using var context = CreateInMemoryContext();
        var service = new ClosedXmlExportService(context);

        // Non-admin user-1 attempts to request scope="all"
        var filter = new TaskExportFilterDto { Format = "standard", Scope = "all" };
        var bytes = await service.GenerateTasksExcelAsync(filter, 1, "user-1", isAdmin: false);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);
        var ws = workbook.Worksheet("Daftar Tugas");

        // Should only contain user-1's task (row 4 only, row 5 empty)
        Assert.Equal("API Checkout Payment", ws.Cell(4, 3).GetString());
        Assert.True(string.IsNullOrEmpty(ws.Cell(5, 3).GetString()));
    }
}

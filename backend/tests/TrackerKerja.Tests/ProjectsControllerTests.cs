using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class ProjectsControllerTests
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;

    public ProjectsControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "WCH", "user-1", true);
        _context = new AppDbContext(options, _tenantService);

        // Seed Company
        _context.Companies.Add(new Company { Id = 10, Name = "Wahana Holding", Code = "WCH" });

        // Seed Projects with varying burn rates
        _context.Projects.AddRange(
            new Project
            {
                Id = 1,
                Name = "Project Safe",
                CompanyId = 10,
                Budget = 100_000_000,
                ActualCost = 50_000_000, // 50% -> Safe
                Color = "#4680FF",
                Status = ProjectStatus.Active
            },
            new Project
            {
                Id = 2,
                Name = "Project Warning",
                CompanyId = 10,
                Budget = 100_000_000,
                ActualCost = 85_000_000, // 85% -> Warning
                Color = "#E58A00",
                Status = ProjectStatus.Active
            },
            new Project
            {
                Id = 3,
                Name = "Project Overbudget",
                CompanyId = 10,
                Budget = 50_000_000,
                ActualCost = 60_000_000, // 120% -> Overbudget
                Color = "#DC2626",
                Status = ProjectStatus.Active
            }
        );

        // Seed Tasks
        _context.Tasks.AddRange(
            new WorkTask
            {
                Id = 101,
                Title = "Task 1 Safe",
                ProjectId = 1,
                CompanyId = 10,
                Status = Domain.Enums.TaskStatus.Done
            },
            new WorkTask
            {
                Id = 102,
                Title = "Task 2 Safe",
                ProjectId = 1,
                CompanyId = 10,
                Status = Domain.Enums.TaskStatus.InProgress
            },
            new WorkTask
            {
                Id = 201,
                Title = "Unassigned Task 1",
                ProjectId = null,
                CompanyId = 10,
                Status = Domain.Enums.TaskStatus.Todo
            },
            new WorkTask
            {
                Id = 202,
                Title = "Unassigned Task 2",
                ProjectId = null,
                CompanyId = 10,
                Status = Domain.Enums.TaskStatus.Todo
            }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task GetProjects_ShouldCalculateBurnRateAndTaskProgressCorrectly()
    {
        // Arrange
        var controller = new ProjectsController(_context, _tenantService);

        // Act
        var result = await controller.GetProjects() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var data = result.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<ProjectListDto>;
        data.Should().NotBeNull();
        data!.Count.Should().Be(3);

        var safeProj = data.First(p => p.Id == 1);
        safeProj.BurnRatePercent.Should().Be(50.0);
        safeProj.BurnRateStatus.Should().Be("Safe");
        safeProj.TotalTasks.Should().Be(2);
        safeProj.CompletedTasks.Should().Be(1);
        safeProj.ProgressPercent.Should().Be(50);

        var warnProj = data.First(p => p.Id == 2);
        warnProj.BurnRatePercent.Should().Be(85.0);
        warnProj.BurnRateStatus.Should().Be("Warning");

        var overProj = data.First(p => p.Id == 3);
        overProj.BurnRatePercent.Should().Be(120.0);
        overProj.BurnRateStatus.Should().Be("Overbudget");
    }

    [Fact]
    public async Task CreateProject_ShouldPersistProjectWithCurrentTenant()
    {
        // Arrange
        var controller = new ProjectsController(_context, _tenantService);
        var request = new CreateProjectRequest(
            "New System 2026",
            "Modernization app",
            "#10B981",
            ProjectStatus.Active,
            "Client PT Maju",
            null,
            200_000_000,
            10_000_000,
            DateTimeOffset.UtcNow.AddMonths(3)
        );

        // Act
        var result = await controller.CreateProject(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var created = await _context.Projects.FirstOrDefaultAsync(p => p.Name == "New System 2026");
        created.Should().NotBeNull();
        created!.CompanyId.Should().Be(10);
        created.Budget.Should().Be(200_000_000);
    }

    [Fact]
    public async Task BulkAssignTasks_ShouldLinkTasksToProject()
    {
        // Arrange
        var controller = new ProjectsController(_context, _tenantService);
        var request = new BulkAssignTasksRequest(new List<int> { 201, 202 });

        // Act
        var result = await controller.AssignTasksToProject(1, request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var task1 = await _context.Tasks.FindAsync(201);
        var task2 = await _context.Tasks.FindAsync(202);

        task1!.ProjectId.Should().Be(1);
        task2!.ProjectId.Should().Be(1);
    }

    [Fact]
    public async Task GetUnassignedTasks_ShouldOnlyReturnTasksWithoutProject()
    {
        // Arrange
        var controller = new ProjectsController(_context, _tenantService);

        // Act
        var result = await controller.GetUnassignedTasks(1) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var dynamicData = result.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as IEnumerable<object>;
        dynamicData.Should().NotBeNull();
        dynamicData!.Count().Should().Be(2);
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

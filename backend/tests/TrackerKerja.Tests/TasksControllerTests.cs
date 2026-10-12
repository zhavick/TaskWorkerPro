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

public class TasksControllerTests
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _tenantService;

    public TasksControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "WCH", "user-1", true);
        _context = new AppDbContext(options, _tenantService);

        // Seed Company and User
        _context.Companies.Add(new Company { Id = 10, Name = "Wahana Holding", Code = "WCH" });
        _context.Users.Add(new AppUser
        {
            Id = "user-1",
            Email = "john@wahana.com",
            FullName = "John Doe",
            CompanyId = 10,
            IsApproved = true
        });

        // Seed initial Project and Tasks
        _context.Projects.Add(new Project { Id = 1, Name = "Alpha", CompanyId = 10 });

        _context.Tasks.AddRange(
            new WorkTask
            {
                Id = 10,
                Title = "Tugas 10",
                CompanyId = 10,
                ProjectId = 1,
                Status = Domain.Enums.TaskStatus.Todo,
                Priority = TaskPriority.Medium,
                Progress = 0
            },
            new WorkTask
            {
                Id = 20,
                Title = "Tugas 20 In Progress",
                CompanyId = 10,
                ProjectId = 1,
                Status = Domain.Enums.TaskStatus.InProgress,
                Priority = TaskPriority.High,
                Progress = 40
            },
            new WorkTask
            {
                Id = 30,
                Title = "Tugas 30 Done",
                CompanyId = 10,
                ProjectId = 1,
                Status = Domain.Enums.TaskStatus.Done,
                Priority = TaskPriority.Low,
                Progress = 100
            },
            new WorkTask
            {
                Id = 40,
                Title = "Tugas 40 Expired",
                CompanyId = 10,
                ProjectId = 1,
                Status = Domain.Enums.TaskStatus.Todo,
                DueDate = DateTimeOffset.UtcNow.AddDays(-2), // Overdue!
                Progress = 10
            }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task GetKanbanTasks_ShouldGroupTasksIntoColumnsCorrectly()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);

        // Act
        var result = await controller.GetKanbanTasks() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var data = result.Value?.GetType().GetProperty("data")?.GetValue(result.Value);
        data.Should().NotBeNull();

        var todo = data!.GetType().GetProperty("Todo")?.GetValue(data) as List<TaskItemDto>;
        var inProg = data.GetType().GetProperty("InProgress")?.GetValue(data) as List<TaskItemDto>;
        var done = data.GetType().GetProperty("Done")?.GetValue(data) as List<TaskItemDto>;
        var overdue = data.GetType().GetProperty("Overdue")?.GetValue(data) as List<TaskItemDto>;

        todo.Should().NotBeNull();
        inProg.Should().NotBeNull();
        done.Should().NotBeNull();
        overdue.Should().NotBeNull();

        done!.Any(t => t.Id == 30).Should().BeTrue();
        inProg!.Any(t => t.Id == 20).Should().BeTrue();
        overdue!.Any(t => t.Id == 40).Should().BeTrue();
    }

    [Fact]
    public async Task UnifiedSave_ShouldUpdateTaskAndCreateManualSessionAtomically()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);
        var startTime = DateTimeOffset.UtcNow.AddHours(-2);
        var endTime = DateTimeOffset.UtcNow;

        var request = new UnifiedSaveTaskRequest(
            "Tugas 10 Refactored",
            "Updated task description",
            TaskPriority.Critical,
            Domain.Enums.TaskStatus.InProgress,
            65,
            "Sprint 1",
            "Kendala API timeout",
            "Solusi tambah retry policy",
            1,
            null,
            "user-1",
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow.AddDays(5),
            true, // LogManualSession
            startTime,
            endTime,
            "Sesi kerja manual 2 jam untuk fix retry"
        );

        // Act
        var result = await controller.UnifiedSave(10, request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        // Verify task updated
        var updatedTask = await _context.Tasks.FindAsync(10);
        updatedTask.Should().NotBeNull();
        updatedTask!.Title.Should().Be("Tugas 10 Refactored");
        updatedTask.Obstacle.Should().Be("Kendala API timeout");
        updatedTask.Solution.Should().Be("Solusi tambah retry policy");
        updatedTask.Progress.Should().Be(65);

        // Verify work session created
        var sessions = await _context.Sessions.Where(s => s.TaskId == 10).ToListAsync();
        sessions.Should().HaveCount(1);
        sessions[0].UserId.Should().Be("user-1");
        sessions[0].Notes.Should().Be("Sesi kerja manual 2 jam untuk fix retry");
        sessions[0].Duration.Should().BeGreaterThan(7000); // ~7200 seconds
    }

    [Fact]
    public async Task UpdateStatus_WhenDone_ShouldSetProgressTo100()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);

        // Act
        var result = await controller.UpdateStatus(10, new UpdateTaskStatusRequest(Domain.Enums.TaskStatus.Done)) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var task = await _context.Tasks.FindAsync(10);
        task!.Status.Should().Be(Domain.Enums.TaskStatus.Done);
        task.Progress.Should().Be(100);
    }

    [Fact]
    public async Task CreateSubtask_ShouldLinkToParentTask()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);
        var request = new CreateSubtaskRequest("Check database connection", TaskPriority.High, "user-1", null);

        // Act
        var result = await controller.CreateSubtask(10, request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var subtasks = await _context.Tasks.Where(t => t.ParentTaskId == 10).ToListAsync();
        subtasks.Should().HaveCount(1);
        subtasks[0].Title.Should().Be("Check database connection");
        subtasks[0].ProjectId.Should().Be(1);
        subtasks[0].CompanyId.Should().Be(10);
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

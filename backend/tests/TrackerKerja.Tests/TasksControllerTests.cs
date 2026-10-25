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
                Status = Domain.Enums.TaskStatus.Overdue,
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

        todo!.Any(t => t.Id == 10).Should().BeTrue();
        done!.Any(t => t.Id == 30).Should().BeTrue();
        inProg!.Any(t => t.Id == 20).Should().BeTrue();
        overdue!.Any(t => t.Id == 40).Should().BeTrue();

        // Ensure task 40 is not duplicated into Todo
        todo!.Any(t => t.Id == 40).Should().BeFalse();
    }

    [Fact]
    public async Task GetTasks_WithFilterMine_ShouldOnlyReturnAssignedTasks()
    {
        // Arrange
        var userTask = new WorkTask
        {
            Id = 50,
            Title = "Tugas Milik Saya",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "user-1",
            Status = Domain.Enums.TaskStatus.Todo
        };
        var otherTask = new WorkTask
        {
            Id = 51,
            Title = "Tugas Staf Lain",
            CompanyId = 10,
            ProjectId = 1,
            AssignedToUserId = "user-2",
            Status = Domain.Enums.TaskStatus.Todo
        };
        _context.Tasks.AddRange(userTask, otherTask);
        await _context.SaveChangesAsync();

        var controller = new TasksController(_context, _tenantService);

        // Act
        var result = await controller.GetTasks(filter: "mine") as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<TaskItemDto>;
        data.Should().NotBeNull();
        data!.Should().Contain(t => t.Id == 50);
        data.Should().NotContain(t => t.Id == 51);
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
    public async Task UnifiedSave_WhenAdminEditsTaskOfAnotherUser_ManualSessionShouldBeAttributedToAssignedUser()
    {
        // Arrange: Admin logged in, editing a task assigned to member-budi
        var adminTenant = new FakeTenantService(10, "WCH", "admin-super-id", true);
        var controller = new TasksController(_context, adminTenant);
        var startTime = DateTimeOffset.UtcNow.AddHours(-1);
        var endTime = DateTimeOffset.UtcNow;

        var request = new UnifiedSaveTaskRequest(
            "Tugas Budi Diperbarui Admin",
            "Admin menambahkan jam kerja untuk Budi",
            TaskPriority.High,
            Domain.Enums.TaskStatus.InProgress,
            80,
            null,
            null,
            null,
            1,
            null,
            "member-budi",
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddDays(2),
            true, // LogManualSession
            startTime,
            endTime,
            "1 jam sesi kerja diinput oleh admin untuk Budi"
        );

        // Act
        var result = await controller.UnifiedSave(10, request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var latestSession = await _context.Sessions
            .Where(s => s.TaskId == 10 && s.Notes == "1 jam sesi kerja diinput oleh admin untuk Budi")
            .FirstOrDefaultAsync();

        latestSession.Should().NotBeNull();
        latestSession!.UserId.Should().Be("member-budi");
        latestSession.UserId.Should().NotBe("admin-super-id");
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

    [Fact]
    public async Task GetKanbanTasks_WithFilter_ReturnsFilteredResults()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);

        // Act
        var result = await controller.GetKanbanTasks(projectId: 1, priority: TaskPriority.Critical) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task GetTasks_WithPaginationAndSorting_ReturnsCorrectPageAndOrder()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);

        // Act - request page 1, pageSize 2, sorted by title asc
        var result = await controller.GetTasks(page: 1, pageSize: 2, sortBy: "title", sortOrder: "asc") as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var dataProp = result.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<TaskItemDto>;
        var totalCount = (int?)result.Value?.GetType().GetProperty("totalCount")?.GetValue(result.Value);
        var totalPages = (int?)result.Value?.GetType().GetProperty("totalPages")?.GetValue(result.Value);

        dataProp.Should().NotBeNull();
        dataProp!.Count.Should().Be(2);
        totalCount.Should().Be(4);
        totalPages.Should().Be(2);
        dataProp[0].Title.Should().Be("Tugas 10");
        dataProp[1].Title.Should().Be("Tugas 20 In Progress");
    }

    [Fact]
    public async Task BulkUpdateStatus_ShouldUpdateMultipleTasks()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);
        var request = new BulkUpdateTaskStatusRequest(new List<int> { 10, 20 }, Domain.Enums.TaskStatus.Done);

        // Act
        var result = await controller.BulkUpdateStatus(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var task10 = await _context.Tasks.FindAsync(10);
        var task20 = await _context.Tasks.FindAsync(20);
        task10!.Status.Should().Be(Domain.Enums.TaskStatus.Done);
        task10.Progress.Should().Be(100);
        task20!.Status.Should().Be(Domain.Enums.TaskStatus.Done);
        task20.Progress.Should().Be(100);
    }

    [Fact]
    public async Task BulkDeleteTasks_ShouldRemoveSelectedTasks()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);
        var request = new BulkDeleteTasksRequest(new List<int> { 10, 20 });

        // Act
        var result = await controller.BulkDeleteTasks(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var task10 = await _context.Tasks.FindAsync(10);
        var task20 = await _context.Tasks.FindAsync(20);
        task10.Should().BeNull();
        task20.Should().BeNull();
    }

    [Fact]
    public async Task GetKanbanTasks_IncludesImportedChildTasksWithParentId()
    {
        // Arrange: seed child task with ParentTaskId
        var childTask = new WorkTask
        {
            Id = 60,
            Title = "Subtask dari Excel Import",
            CompanyId = 10,
            ProjectId = 1,
            ParentTaskId = 10,
            Status = Domain.Enums.TaskStatus.InProgress,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Tasks.Add(childTask);
        await _context.SaveChangesAsync();

        var controller = new TasksController(_context, _tenantService);

        // Act
        var result = await controller.GetKanbanTasks(includeSubtasks: true) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value);
        var inProg = data!.GetType().GetProperty("InProgress")?.GetValue(data) as List<TaskItemDto>;
        inProg.Should().NotBeNull();
        inProg!.Any(t => t.Id == 60).Should().BeTrue();
    }

    [Fact]
    public async Task GetKanbanTasks_FiltersByActiveMonth_Correctly()
    {
        // Arrange: Done tasks in May 2026 vs August 2026, and an active Todo task in August
        var mayDoneTask = new WorkTask
        {
            Id = 70,
            Title = "Tugas Selesai Bulan Mei 2026",
            CompanyId = 10,
            ProjectId = 1,
            Status = Domain.Enums.TaskStatus.Done,
            DueDate = new DateTimeOffset(2026, 5, 15, 12, 0, 0, TimeSpan.Zero),
            CreatedAt = new DateTimeOffset(2026, 5, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2026, 5, 20, 0, 0, 0, TimeSpan.Zero)
        };
        var augustDoneTask = new WorkTask
        {
            Id = 71,
            Title = "Tugas Selesai Bulan Agustus 2026",
            CompanyId = 10,
            ProjectId = 1,
            Status = Domain.Enums.TaskStatus.Done,
            DueDate = new DateTimeOffset(2026, 8, 20, 12, 0, 0, TimeSpan.Zero),
            CreatedAt = new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(2026, 8, 25, 0, 0, 0, TimeSpan.Zero)
        };
        var activeTodoTask = new WorkTask
        {
            Id = 72,
            Title = "Tugas Aktif Todo Selalu Tampil",
            CompanyId = 10,
            ProjectId = 1,
            Status = Domain.Enums.TaskStatus.Todo,
            DueDate = new DateTimeOffset(2026, 8, 20, 12, 0, 0, TimeSpan.Zero),
            CreatedAt = new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero)
        };
        _context.Tasks.AddRange(mayDoneTask, augustDoneTask, activeTodoTask);
        await _context.SaveChangesAsync();

        var controller = new TasksController(_context, _tenantService);

        // Act 1: request month 5 year 2026 (Default Active Month)
        var resultMay = await controller.GetKanbanTasks(month: 5, year: 2026) as OkObjectResult;
        var dataMay = resultMay!.Value?.GetType().GetProperty("data")?.GetValue(resultMay.Value);
        var doneMay = dataMay!.GetType().GetProperty("Done")?.GetValue(dataMay) as List<TaskItemDto>;
        var todoMay = dataMay!.GetType().GetProperty("Todo")?.GetValue(dataMay) as List<TaskItemDto>;

        // Assert 1: May Done is present, August Done is filtered out, but active Todo task 72 is ALWAYS present
        doneMay.Should().NotBeNull();
        doneMay!.Any(t => t.Id == 70).Should().BeTrue();
        doneMay!.Any(t => t.Id == 71).Should().BeFalse();
        todoMay!.Any(t => t.Id == 72).Should().BeTrue();

        // Act 2: request with custom date range (August 2026)
        var startRange = new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero);
        var endRange = new DateTimeOffset(2026, 8, 31, 23, 59, 59, TimeSpan.Zero);
        var resultRange = await controller.GetKanbanTasks(doneStartDate: startRange, doneEndDate: endRange) as OkObjectResult;
        var dataRange = resultRange!.Value?.GetType().GetProperty("data")?.GetValue(resultRange.Value);
        var doneRange = dataRange!.GetType().GetProperty("Done")?.GetValue(dataRange) as List<TaskItemDto>;

        // Assert 2: August Done is included in the custom range
        doneRange.Should().NotBeNull();
        doneRange!.Any(t => t.Id == 71).Should().BeTrue();
        doneRange!.Any(t => t.Id == 70).Should().BeFalse();
    }

    [Fact]
    public async Task GetTasks_NonAdmin_ShouldSeeOtherUsersTasks()
    {
        // Arrange: User-2 is a non-admin
        var nonAdminTenant = new FakeTenantService(10, "WCH", "user-2", false);
        var controller = new TasksController(_context, nonAdminTenant);

        // Seed a task assigned to user-1, created by user-1
        var taskByOther = new WorkTask
        {
            Id = 88,
            Title = "Tugas Milik Rekan",
            CompanyId = 10,
            AssignedToUserId = "user-1",
            CreatedByUserId = "user-1",
            Status = Domain.Enums.TaskStatus.InProgress
        };
        _context.Tasks.Add(taskByOther);
        await _context.SaveChangesAsync();

        // Act: Non-admin fetches tasks
        var result = await controller.GetTasks() as OkObjectResult;

        // Assert: Non-admin can see task 88 belonging to user-1
        result.Should().NotBeNull();
        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<TaskItemDto>;
        data.Should().NotBeNull();
        data!.Any(t => t.Id == 88).Should().BeTrue();
    }

    [Fact]
    public async Task UpdateTask_ByNonCreatorNonAdmin_Returns403Forbidden()
    {
        // Arrange: User-2 (non-admin) tries to edit task created by user-1
        var nonAdminTenant = new FakeTenantService(10, "WCH", "user-2", false);
        var controller = new TasksController(_context, nonAdminTenant);

        var task = new WorkTask
        {
            Id = 91,
            Title = "Tugas Rahasia User 1",
            CompanyId = 10,
            AssignedToUserId = "user-1",
            CreatedByUserId = "user-1",
            Status = Domain.Enums.TaskStatus.Todo
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var updateReq = new UpdateTaskRequest(
            "Tugas Diedit Hacker",
            "Deskripsi hack",
            TaskPriority.High,
            Domain.Enums.TaskStatus.InProgress,
            50,
            null,
            null,
            null,
            null,
            null,
            "user-2",
            null,
            null
        );

        // Act
        var result = await controller.UpdateTask(91, updateReq) as ObjectResult;

        // Assert: 403 Forbidden
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task UpdateTask_ByCreator_ReturnsOk()
    {
        // Arrange: User-2 (non-admin) edits task they created
        var nonAdminTenant = new FakeTenantService(10, "WCH", "user-2", false);
        var controller = new TasksController(_context, nonAdminTenant);

        var task = new WorkTask
        {
            Id = 92,
            Title = "Tugas Buatan User 2",
            CompanyId = 10,
            AssignedToUserId = "user-1",
            CreatedByUserId = "user-2",
            Status = Domain.Enums.TaskStatus.Todo
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var updateReq = new UpdateTaskRequest(
            "Tugas Buatan User 2 - Diperbarui",
            "Deskripsi update",
            TaskPriority.High,
            Domain.Enums.TaskStatus.InProgress,
            50,
            null,
            null,
            null,
            null,
            null,
            "user-1",
            null,
            null
        );

        // Act
        var result = await controller.UpdateTask(92, updateReq) as OkObjectResult;

        // Assert: 200 OK
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task DeleteTask_DoneTaskFromPastMonth_Returns400BadRequest()
    {
        // Arrange: Admin tries to delete a Done task from prior months
        var controller = new TasksController(_context, _tenantService);

        var pastMonthDoneTask = new WorkTask
        {
            Id = 93,
            Title = "Tugas Selesai Bulan Lalu",
            CompanyId = 10,
            Status = Domain.Enums.TaskStatus.Done,
            DueDate = DateTimeOffset.UtcNow.AddMonths(-2), // 2 months ago
            CreatedAt = DateTimeOffset.UtcNow.AddMonths(-2),
            Progress = 100
        };
        _context.Tasks.Add(pastMonthDoneTask);
        await _context.SaveChangesAsync();

        // Act
        var result = await controller.DeleteTask(93) as ObjectResult;

        // Assert: 400 BadRequest with protection message
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(400);
    }

    [Fact]
    public void Test_JsonSerialization_And_Deserialization()
    {
        var options = new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web);
        options.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.Converters.Add(new TrackerKerja.Infrastructure.Converters.NullableDateTimeOffsetJsonConverter());
        options.Converters.Add(new TrackerKerja.Infrastructure.Converters.DateTimeOffsetJsonConverter());

        // 1. Check what task DTO serializes enum to:
        var taskDto = new TaskItemDto(
            1, "Title", "Desc", Domain.Enums.TaskPriority.Medium, Domain.Enums.TaskStatus.InProgress,
            50, null, null, null, null, null, null, null, null, null, null, null, null,
            0, 0, 0, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, null, null
        );
        var jsonOutput = System.Text.Json.JsonSerializer.Serialize(taskDto, options);
        // Does it contain "Medium" or 1?
        jsonOutput.Should().Contain("\"priority\":\"Medium\"");
        jsonOutput.Should().Contain("\"status\":\"InProgress\"");

        // 2. Check deserializing JSON with numbers:
        var validJsonWithNumbers = "{\"title\":\"Test\",\"description\":\"Desc\",\"priority\":1,\"status\":0,\"progress\":0,\"logManualSession\":false}";
        var req1 = System.Text.Json.JsonSerializer.Deserialize<UnifiedSaveTaskRequest>(validJsonWithNumbers, options);
        req1.Should().NotBeNull();
        req1!.Priority.Should().Be(Domain.Enums.TaskPriority.Medium);
        req1.Status.Should().Be(Domain.Enums.TaskStatus.Todo);

        // 3. Check deserializing JSON with null priority & status (e.g. from frontend JS Number("Medium") => NaN => null):
        var jsonWithNulls = "{\"title\":\"Test\",\"description\":\"Desc\",\"priority\":null,\"status\":null,\"progress\":0,\"logManualSession\":false}";
        var reqNulls = System.Text.Json.JsonSerializer.Deserialize<UnifiedSaveTaskRequest>(jsonWithNulls, options);
        reqNulls.Should().NotBeNull();
        reqNulls!.Priority.Should().BeNull();
        reqNulls.Status.Should().BeNull();

        // 4. Check deserializing JSON with strings:
        var jsonWithStrings = "{\"title\":\"Test\",\"description\":\"Desc\",\"priority\":\"High\",\"status\":\"Done\",\"progress\":100,\"logManualSession\":false}";
        var reqStrings = System.Text.Json.JsonSerializer.Deserialize<UnifiedSaveTaskRequest>(jsonWithStrings, options);
        reqStrings.Should().NotBeNull();
        reqStrings!.Priority.Should().Be(Domain.Enums.TaskPriority.High);
        reqStrings.Status.Should().Be(Domain.Enums.TaskStatus.Done);

        // 5. Check deserializing JSON when priority and status are omitted:
        var jsonOmitted = "{\"title\":\"Test\",\"description\":\"Desc\",\"progress\":10}";
        var reqOmitted = System.Text.Json.JsonSerializer.Deserialize<UnifiedSaveTaskRequest>(jsonOmitted, options);
        reqOmitted.Should().NotBeNull();
        reqOmitted!.Priority.Should().Be(Domain.Enums.TaskPriority.Medium); // Default
        reqOmitted.Status.Should().Be(Domain.Enums.TaskStatus.Todo); // Default
    }

    [Fact]
    public async Task UnifiedSave_WithNullPriorityAndStatus_PreservesExistingValues()
    {
        // Arrange
        var controller = new TasksController(_context, _tenantService);
        var existingTask = await _context.Tasks.FindAsync(10);
        existingTask.Should().NotBeNull();
        var origPriority = existingTask!.Priority;
        var origStatus = existingTask.Status;

        var request = new UnifiedSaveTaskRequest(
            "Tugas 10 Judul Baru",
            "Desc Baru",
            null, // null Priority
            null, // null Status
            75,
            null, null, null, 1, null, "user-1", null, null, false, null, null, null
        );

        // Act
        var result = await controller.UnifiedSave(10, request) as OkObjectResult;

        // Assert: 200 OK
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        // Verify task updated title/progress but preserved priority & status
        var updatedTask = await _context.Tasks.FindAsync(10);
        updatedTask!.Title.Should().Be("Tugas 10 Judul Baru");
        updatedTask.Progress.Should().Be(75);
        updatedTask.Priority.Should().Be(origPriority);
        updatedTask.Status.Should().Be(origStatus);
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

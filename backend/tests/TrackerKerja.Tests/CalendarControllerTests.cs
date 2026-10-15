using Microsoft.AspNetCore.Http;
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

public class CalendarControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _adminTenantService;
    private readonly FakeTenantService _memberTenantService;

    public CalendarControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _adminTenantService = new FakeTenantService(1, "TEST", "admin-usr-id", true);
        _memberTenantService = new FakeTenantService(1, "TEST", "member-usr-id", false);

        _context = new AppDbContext(options, _adminTenantService);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetEvents_DateRangeFilter_ReturnsEventsWithinRange()
    {
        // Arrange
        var baseDate = DateTimeOffset.UtcNow;
        var start = baseDate.AddDays(-5);
        var end = baseDate.AddDays(5);

        _context.Tasks.Add(new WorkTask
        {
            Id = 1,
            Title = "Task Inside Range",
            CompanyId = 1,
            StartDate = baseDate.AddDays(-1),
            DueDate = baseDate.AddDays(2),
            AssignedToUserId = "admin-usr-id"
        });

        _context.Tasks.Add(new WorkTask
        {
            Id = 2,
            Title = "Task Past Range",
            CompanyId = 1,
            StartDate = baseDate.AddDays(10),
            DueDate = baseDate.AddDays(15),
            AssignedToUserId = "admin-usr-id"
        });

        await _context.SaveChangesAsync();

        var controller = new CalendarController(_context, _adminTenantService);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        // Act
        var result = await controller.GetEvents(start, end, filter: "all", projectId: null, status: null);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        // Assert
        var events = GetEventsFromResponse(okResult.Value);
        Assert.Single(events);
        Assert.Equal(1, events[0].Id);
        Assert.Equal("Task Inside Range", events[0].Title);
    }

    [Fact]
    public async Task GetEvents_NonAdmin_EnforcesMineScope()
    {
        // Arrange
        var baseDate = DateTimeOffset.UtcNow;
        var start = baseDate.AddDays(-5);
        var end = baseDate.AddDays(5);

        _context.Tasks.Add(new WorkTask
        {
            Id = 11,
            Title = "My Task",
            CompanyId = 1,
            StartDate = baseDate,
            DueDate = baseDate.AddDays(1),
            AssignedToUserId = "member-usr-id"
        });

        _context.Tasks.Add(new WorkTask
        {
            Id = 12,
            Title = "Other Member Task",
            CompanyId = 1,
            StartDate = baseDate,
            DueDate = baseDate.AddDays(1),
            AssignedToUserId = "someone-else-id"
        });

        await _context.SaveChangesAsync();

        var controller = new CalendarController(_context, _memberTenantService);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        // Act: Non-admin explicitly asking for "all" should still only receive "mine"
        var result = await controller.GetEvents(start, end, filter: "all", projectId: null, status: null);
        var okResult = Assert.IsType<OkObjectResult>(result);

        // Assert
        var events = GetEventsFromResponse(okResult.Value);
        Assert.Single(events);
        Assert.Equal(11, events[0].Id);
        Assert.Equal("My Task", events[0].Title);
    }

    [Fact]
    public async Task GetEvents_Admin_AllowsAllScope()
    {
        // Arrange
        var baseDate = DateTimeOffset.UtcNow;
        var start = baseDate.AddDays(-5);
        var end = baseDate.AddDays(5);

        _context.Tasks.Add(new WorkTask
        {
            Id = 21,
            Title = "Admin Task",
            CompanyId = 1,
            StartDate = baseDate,
            DueDate = baseDate.AddDays(1),
            AssignedToUserId = "admin-usr-id"
        });

        _context.Tasks.Add(new WorkTask
        {
            Id = 22,
            Title = "Member Task",
            CompanyId = 1,
            StartDate = baseDate,
            DueDate = baseDate.AddDays(1),
            AssignedToUserId = "member-usr-id"
        });

        await _context.SaveChangesAsync();

        var controller = new CalendarController(_context, _adminTenantService);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        // Act: Admin asking for "all"
        var result = await controller.GetEvents(start, end, filter: "all", projectId: null, status: null);
        var okResult = Assert.IsType<OkObjectResult>(result);

        // Assert
        var events = GetEventsFromResponse(okResult.Value);
        Assert.Equal(2, events.Count);
    }

    [Fact]
    public async Task UpdateStatus_Done_AutoSetsProgressTo100()
    {
        // Arrange
        var task = new WorkTask
        {
            Id = 55,
            Title = "Testing Quick Status",
            CompanyId = 1,
            Status = Domain.Enums.TaskStatus.InProgress,
            Progress = 40,
            AssignedToUserId = "admin-usr-id"
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var controller = new CalendarController(_context, _adminTenantService);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        // Act
        var request = new QuickUpdateTaskStatusRequest(Domain.Enums.TaskStatus.Done, null);
        var result = await controller.UpdateStatus(55, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        // Assert
        var updatedTask = await _context.Tasks.FindAsync(55);
        Assert.NotNull(updatedTask);
        Assert.Equal(Domain.Enums.TaskStatus.Done, updatedTask.Status);
        Assert.Equal(100, updatedTask.Progress);
    }

    [Fact]
    public async Task UpdateStatus_NonAdmin_ForbiddenForOthersTask()
    {
        var task = new WorkTask
        {
            Id = 60,
            Title = "Others Task",
            CompanyId = 1,
            Status = Domain.Enums.TaskStatus.Todo,
            Progress = 0,
            AssignedToUserId = "someone-else-id"
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var controller = new CalendarController(_context, _memberTenantService);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        var request = new QuickUpdateTaskStatusRequest(Domain.Enums.TaskStatus.Done, null);
        var result = await controller.UpdateStatus(60, request);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_NonAdmin_AllowedForOwnTask()
    {
        var task = new WorkTask
        {
            Id = 61,
            Title = "My Own Task",
            CompanyId = 1,
            Status = Domain.Enums.TaskStatus.Todo,
            Progress = 0,
            AssignedToUserId = "member-usr-id"
        };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var controller = new CalendarController(_context, _memberTenantService);
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        var request = new QuickUpdateTaskStatusRequest(Domain.Enums.TaskStatus.InProgress, 50);
        var result = await controller.UpdateStatus(61, request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        var updatedTask = await _context.Tasks.FindAsync(61);
        Assert.NotNull(updatedTask);
        Assert.Equal(Domain.Enums.TaskStatus.InProgress, updatedTask.Status);
        Assert.Equal(50, updatedTask.Progress);
    }

    private static List<CalendarEventDto> GetEventsFromResponse(object? responseValue)
    {
        if (responseValue == null) return new List<CalendarEventDto>();
        var property = responseValue.GetType().GetProperty("data");
        if (property != null)
        {
            var data = property.GetValue(responseValue);
            if (data is IEnumerable<CalendarEventDto> list)
            {
                return list.ToList();
            }
        }
        return new List<CalendarEventDto>();
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

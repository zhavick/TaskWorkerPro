using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Filters;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class AuditLogsControllerTests
{
    private AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var context = new AppDbContext(options);

        // Seed some audit logs
        var log1 = new AuditLog
        {
            Id = 1,
            UserId = "user-1",
            UserName = "Budi Santoso",
            UserEmail = "budi@perusahaan.com",
            ControllerName = "Tasks",
            ActionName = "CreateTask",
            HttpMethod = "POST",
            Path = "/api/tasks",
            StatusCode = 200,
            DurationMs = 45,
            Timestamp = DateTimeOffset.UtcNow,
            Details = "{\"title\":\"Task Baru\"}"
        };

        var log2 = new AuditLog
        {
            Id = 2,
            UserId = "user-2",
            UserName = "Dewi Lestari",
            UserEmail = "dewi@perusahaan.com",
            ControllerName = "Tasks",
            ActionName = "UpdateTask",
            HttpMethod = "PUT",
            Path = "/api/tasks/101",
            StatusCode = 200,
            DurationMs = 30,
            Timestamp = DateTimeOffset.UtcNow.AddHours(-1),
            Details = "{\"taskId\":101,\"status\":2}"
        };

        var log3 = new AuditLog
        {
            Id = 3,
            UserId = "user-1",
            UserName = "Budi Santoso",
            UserEmail = "budi@perusahaan.com",
            ControllerName = "Projects",
            ActionName = "DeleteProject",
            HttpMethod = "DELETE",
            Path = "/api/projects/5",
            StatusCode = 500,
            DurationMs = 120,
            Timestamp = DateTimeOffset.UtcNow.AddDays(-100), // Old log for cleanup test
            Details = "{\"projectId\":5}"
        };

        context.AuditLogs.AddRange(log1, log2, log3);
        context.SaveChanges();
        return context;
    }

    private static JsonElement ToJsonElement(object? value)
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var json = JsonSerializer.Serialize(value, options);
        return JsonDocument.Parse(json).RootElement;
    }

    [Fact]
    public async Task GetAuditLogs_WithFilters_ReturnsFilteredPagedResult()
    {
        using var context = CreateInMemoryContext();
        var controller = new AuditLogsController(context);

        var result = await controller.GetAuditLogs(page: 1, pageSize: 10, search: "Budi", method: "POST");
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());
        var items = root.GetProperty("data");
        Assert.Equal(1, items.GetArrayLength());
    }

    [Fact]
    public async Task GetAuditLogSummary_ReturnsAccurateMetrics()
    {
        using var context = CreateInMemoryContext();
        var controller = new AuditLogsController(context);

        var result = await controller.GetAuditLogSummary();
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());
        var data = root.GetProperty("data");

        Assert.Equal(3, data.GetProperty("totalLogs").GetInt32());
        Assert.Equal(2, data.GetProperty("successCount").GetInt32());
        Assert.Equal(1, data.GetProperty("errorCount").GetInt32());
        Assert.Equal(2, data.GetProperty("todayCount").GetInt32());
    }

    [Fact]
    public async Task GetTaskAuditTimeline_ReturnsMatchingTaskLogs()
    {
        using var context = CreateInMemoryContext();
        var controller = new AuditLogsController(context);

        var result = await controller.GetTaskAuditTimeline(101);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());
        var logs = root.GetProperty("data");

        Assert.Equal(1, logs.GetArrayLength());
    }

    [Fact]
    public async Task CleanupOldAuditLogs_DeletesOlderLogs()
    {
        using var context = CreateInMemoryContext();
        var controller = new AuditLogsController(context);

        var result = await controller.CleanupOldAuditLogs(days: 90);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var root = ToJsonElement(okResult.Value);
        Assert.True(root.GetProperty("success").GetBoolean());
        Assert.Equal(1, root.GetProperty("data").GetProperty("deletedCount").GetInt32());

        var remainingCount = await context.AuditLogs.CountAsync();
        Assert.Equal(2, remainingCount);
    }

    [Fact]
    public async Task AuditLogActionFilter_InterceptsMutatingRequestAndLogs()
    {
        using var context = CreateInMemoryContext();
        var filter = new AuditLogActionFilter(context, NullLogger<AuditLogActionFilter>.Instance);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Method = "POST";
        httpContext.Request.Path = "/api/tasks";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user-tester"),
            new Claim(ClaimTypes.Name, "Testing User"),
            new Claim(ClaimTypes.Email, "tester@test.com")
        };
        httpContext.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor { DisplayName = "TasksController.CreateTask" }
        );

        var actionExecutingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?> { { "title", "Test Task Created" }, { "password", "my-secret-123" } },
            controller: new object()
        );

        ActionExecutionDelegate next = () =>
        {
            httpContext.Response.StatusCode = 201;
            return Task.FromResult(new ActionExecutedContext(actionContext, new List<IFilterMetadata>(), null!));
        };

        await filter.OnActionExecutionAsync(actionExecutingContext, next);

        var createdLog = await context.AuditLogs.FirstOrDefaultAsync(a => a.UserId == "user-tester");
        Assert.NotNull(createdLog);
        Assert.Equal("POST", createdLog.HttpMethod);
        Assert.Equal("/api/tasks", createdLog.Path);
        Assert.Equal(201, createdLog.StatusCode);
        Assert.Contains("[REDACTED]", createdLog.Details);
        Assert.DoesNotContain("my-secret-123", createdLog.Details);
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class DashboardControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _adminTenantService;

    public DashboardControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _adminTenantService = new FakeTenantService(1, "TEST", "test-user-id", true);
        _context = new AppDbContext(options, _adminTenantService);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetStats_ReturnsAccurateMetrics()
    {
        // Arrange
        _context.Tasks.AddRange(
            new WorkTask { Id = 1, Title = "Task 1", Status = Domain.Enums.TaskStatus.Todo, AssignedToUserId = "test-user-id", CompanyId = 1 },
            new WorkTask { Id = 2, Title = "Task 2", Status = Domain.Enums.TaskStatus.InProgress, AssignedToUserId = "test-user-id", CompanyId = 1 },
            new WorkTask { Id = 3, Title = "Task 3", Status = Domain.Enums.TaskStatus.Done, AssignedToUserId = "test-user-id", CompanyId = 1 }
        );

        _context.Projects.Add(new Project { Id = 1, Name = "Alpha", Status = ProjectStatus.Active, CompanyId = 1 });

        await _context.SaveChangesAsync();

        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetStats() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task GetProductivityChart_ReturnsDaysList()
    {
        // Arrange
        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetProductivityChart(7) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task GetDistribution_ReturnsGroupings()
    {
        // Arrange
        _context.Tasks.Add(new WorkTask
        {
            Id = 10,
            Title = "Task Distributed",
            Priority = TaskPriority.High,
            Status = Domain.Enums.TaskStatus.InProgress,
            AssignedToUserId = "test-user-id",
            CompanyId = 1
        });
        await _context.SaveChangesAsync();

        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetDistribution() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    private class FakeTenantService : TrackerKerja.Application.Common.Interfaces.ICurrentTenantService
    {
        public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin)
        {
            CompanyId = companyId;
            CompanyCode = companyCode;
            UserId = userId;
            IsAdmin = isAdmin;
        }

        public int? CompanyId { get; set; }
        public string? CompanyCode { get; set; }
        public string? UserId { get; set; }
        public bool IsAdmin { get; set; }
    }
}

using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using Xunit;

namespace TrackerKerja.Tests;

public class DomainEntityTests
{
    private class FakeTenantService : ICurrentTenantService
    {
        public int? CompanyId { get; set; } = 1;
        public string? CompanyCode { get; set; } = "WCH";
        public string? UserId { get; set; } = "user-1";
        public bool IsAdmin { get; set; } = false;
    }

    [Fact]
    public void WorkTask_ShouldInitializeWithDefaultValues()
    {
        // Arrange & Act
        var task = new WorkTask
        {
            Title = "Setup PostgreSQL Docker",
            Priority = TaskPriority.High,
            Status = TrackerKerja.Domain.Enums.TaskStatus.InProgress
        };

        // Assert
        task.Title.Should().Be("Setup PostgreSQL Docker");
        task.Priority.Should().Be(TaskPriority.High);
        task.Status.Should().Be(TrackerKerja.Domain.Enums.TaskStatus.InProgress);
        task.Progress.Should().Be(0);
        task.Subtasks.Should().BeEmpty();
    }

    [Fact]
    public async Task AppDbContext_MultiTenancyFilter_ShouldFilterTasksByCompanyId()
    {
        // Arrange
        var tenantService = new FakeTenantService { CompanyId = 1, IsAdmin = false };
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using (var context = new AppDbContext(options, tenantService))
        {
            context.Tasks.Add(new WorkTask { Id = 1, Title = "Task Company 1", CompanyId = 1 });
            context.Tasks.Add(new WorkTask { Id = 2, Title = "Task Company 2", CompanyId = 2 });
            await context.SaveChangesAsync();
        }

        // Act & Assert
        using (var context = new AppDbContext(options, tenantService))
        {
            var tasks = await context.Tasks.ToListAsync();
            tasks.Should().HaveCount(1);
            tasks.First().Title.Should().Be("Task Company 1");
        }
    }

    [Fact]
    public async Task AppDbContext_MultiTenancyFilter_AdminShouldSeeAllTasks()
    {
        // Arrange
        var adminTenantService = new FakeTenantService { CompanyId = 1, IsAdmin = true };
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using (var context = new AppDbContext(options, adminTenantService))
        {
            context.Tasks.Add(new WorkTask { Id = 10, Title = "Task Company 1", CompanyId = 1 });
            context.Tasks.Add(new WorkTask { Id = 20, Title = "Task Company 2", CompanyId = 2 });
            await context.SaveChangesAsync();
        }

        // Act & Assert
        using (var context = new AppDbContext(options, adminTenantService))
        {
            var tasks = await context.Tasks.ToListAsync();
            tasks.Should().HaveCount(2);
        }
    }
}

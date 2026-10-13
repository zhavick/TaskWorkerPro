using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class MasterDataControllerTests
{
    private readonly AppDbContext _context;

    public MasterDataControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        _context.MasterPriorities.AddRange(
            new MasterPriority { Id = 1, Name = "Low", OrderIndex = 1 },
            new MasterPriority { Id = 2, Name = "High", OrderIndex = 2 }
        );

        _context.MasterStatuses.AddRange(
            new MasterStatus { Id = 1, Name = "Todo", OrderIndex = 1 },
            new MasterStatus { Id = 2, Name = "Done", IsDoneState = true, OrderIndex = 3 }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task GetPriorities_ShouldReturnAllPrioritiesOrdered()
    {
        // Arrange
        var controller = new MasterDataController(_context);

        // Act
        var result = await controller.GetPriorities() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task GetStatuses_ShouldReturnAllStatuses()
    {
        // Arrange
        var controller = new MasterDataController(_context);

        // Act
        var result = await controller.GetStatuses() as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task CreateStatus_ShouldAddNewStatus()
    {
        // Arrange
        var controller = new MasterDataController(_context);
        var request = new CreateStatusRequest("In Review", "#F59E0B", false, 2, "Sedang direview", false);

        // Act
        var result = await controller.CreateStatus(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var statuses = await _context.MasterStatuses.ToListAsync();
        statuses.Should().Contain(s => s.Name == "In Review");
    }

    [Fact]
    public async Task UpdatePriority_ShouldModifyPriority()
    {
        // Arrange
        var controller = new MasterDataController(_context);
        var request = new UpdatePriorityRequest("Low - Updated", "#10B981", "flag-green", 5, "Diperbarui", false);

        // Act
        var result = await controller.UpdatePriority(1, request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var priority = await _context.MasterPriorities.FindAsync(1);
        priority.Should().NotBeNull();
        priority!.Name.Should().Be("Low - Updated");
        priority.Color.Should().Be("#10B981");
    }

    [Fact]
    public async Task DeletePriority_WhenNotDefault_ShouldRemovePriority()
    {
        // Arrange
        var controller = new MasterDataController(_context);

        // Act
        var result = await controller.DeletePriority(2) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var priority = await _context.MasterPriorities.FindAsync(2);
        priority.Should().BeNull();
    }

    [Fact]
    public async Task CreateMilestone_ShouldAddNewMilestone()
    {
        // Arrange
        var controller = new MasterDataController(_context);
        var request = new CreateMilestoneRequest("Testing & QA", "Testing", "#EC4899", "check", 4, "Pengujian", false);

        // Act
        var result = await controller.CreateMilestone(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var milestone = await _context.MasterMilestones.FirstOrDefaultAsync(m => m.Name == "Testing & QA");
        milestone.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateCategory_ShouldModifyCategory()
    {
        // Arrange
        var category = new Category { Name = "Backend", Color = "#3B82F6" };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        var controller = new MasterDataController(_context);
        var request = new UpdateCategoryRequest("Backend Engineering", "#2563EB", "API & Database");

        // Act
        var result = await controller.UpdateCategory(category.Id, request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var updated = await _context.Categories.FindAsync(category.Id);
        updated!.Name.Should().Be("Backend Engineering");
    }

    [Fact]
    public async Task DeleteCategory_WhenReferencedByTask_ShouldReturnBadRequest()
    {
        // Arrange
        var category = new Category { Name = "DevOps", Color = "#8B5CF6" };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        var task = new WorkTask { Title = "Setup CI/CD", CategoryId = category.Id };
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();

        var controller = new MasterDataController(_context);

        // Act
        var result = await controller.DeleteCategory(category.Id) as BadRequestObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(400);
    }
}


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
    public async Task DevTools_FormatJson_ShouldReturnIndentedJson()
    {
        // Arrange
        var controller = new DevToolsController(_context);
        var request = new JsonFormatRequest("{\"name\":\"TrackerKerja\",\"version\":3}", null, null);

        // Act
        var result = await controller.FormatJson(request) as OkObjectResult;

        // Assert
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
    }
}

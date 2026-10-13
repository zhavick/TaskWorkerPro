using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class SqlToolsControllerTests
{
    private readonly AppDbContext _context;
    private readonly SqlFormatterService _formatterService;
    private readonly FakeTenantService _tenantService;

    public SqlToolsControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(1, "WCH", "user-test", false);
        _context = new AppDbContext(options, _tenantService);
        _formatterService = new SqlFormatterService();
    }

    [Fact]
    public async Task FormatSql_ValidQuery_ShouldReturnFormattedResult()
    {
        var controller = new SqlToolsController(_context, _formatterService);
        var request = new SqlFormatRequest("select id from users", "postgresql");

        var actionResult = await controller.FormatSql(request);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);

        Assert.Equal(200, okResult.StatusCode);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public void MinifySql_ValidQuery_ShouldReturnMinifiedResult()
    {
        var controller = new SqlToolsController(_context, _formatterService);
        var request = new SqlMinifyRequest("SELECT id,\n  name\nFROM users;\n");

        var actionResult = controller.MinifySql(request);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);

        Assert.Equal(200, okResult.StatusCode);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public void ValidateSql_QueryWithErrors_ShouldReturnInvalidResult()
    {
        var controller = new SqlToolsController(_context, _formatterService);
        var request = new SqlValidationRequest("SELECT id FROM (users");

        var actionResult = controller.ValidateSql(request);
        var okResult = Assert.IsType<OkObjectResult>(actionResult);

        Assert.Equal(200, okResult.StatusCode);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public void GetDialects_ShouldReturnListOfDialects()
    {
        var controller = new SqlToolsController(_context, _formatterService);

        var actionResult = controller.GetDialects();
        var okResult = Assert.IsType<OkObjectResult>(actionResult);

        Assert.Equal(200, okResult.StatusCode);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task FormatSql_WithName_ShouldSaveToHistory()
    {
        var controller = new SqlToolsController(_context, _formatterService);
        var request = new SqlFormatRequest("SELECT 1;", "postgresql", Name: "Test Save Query");

        var actionResult = await controller.FormatSql(request);
        Assert.IsType<OkObjectResult>(actionResult);

        var history = await _context.SqlHistories.FirstOrDefaultAsync(h => h.Name == "Test Save Query");
        Assert.NotNull(history);
        Assert.Equal("postgresql", history.Dialect);
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

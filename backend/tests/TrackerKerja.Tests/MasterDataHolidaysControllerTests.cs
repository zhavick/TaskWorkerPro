using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class MasterDataHolidaysControllerTests
{
    private readonly AppDbContext _context;

    public MasterDataHolidaysControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        var company = new Company { Id = 10, Name = "PT Inovasi", Code = "INOVASI" };
        _context.Companies.Add(company);

        _context.Holidays.AddRange(
            new Holiday
            {
                Id = 1,
                Date = new DateOnly(2026, 8, 17),
                Name = "Hari Kemerdekaan",
                IsNational = true,
                CompanyId = null
            },
            new Holiday
            {
                Id = 2,
                Date = new DateOnly(2026, 10, 10),
                Name = "Company Milestone Day",
                IsNational = false,
                CompanyId = 10
            },
            new Holiday
            {
                Id = 3,
                Date = new DateOnly(2025, 12, 25),
                Name = "Natal 2025",
                IsNational = true,
                CompanyId = null
            }
        );

        _context.SaveChanges();
    }

    [Fact]
    public async Task GetHolidays_ShouldFilterByYearAndCompany()
    {
        var controller = new MasterDataController(_context);

        // Filter year 2026 for company 10: should return 2026 national + company 10 holidays (total 2)
        var result = await controller.GetHolidays(year: 2026, companyId: 10) as OkObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        doc.RootElement.GetProperty("success").GetBoolean().Should().BeTrue();
        var dataArray = doc.RootElement.GetProperty("data");
        dataArray.GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task CreateHoliday_ShouldAddNewHoliday()
    {
        var controller = new MasterDataController(_context);
        var request = new CreateHolidayRequest(
            Date: new DateOnly(2026, 5, 1),
            Name: "Hari Buruh",
            Description: "May Day 2026",
            IsNational: true,
            CompanyId: null
        );

        var result = await controller.CreateHoliday(request) as OkObjectResult;
        result.Should().NotBeNull();

        var holidayInDb = await _context.Holidays.FirstOrDefaultAsync(h => h.Date == new DateOnly(2026, 5, 1));
        holidayInDb.Should().NotBeNull();
        holidayInDb!.Name.Should().Be("Hari Buruh");
    }

    [Fact]
    public async Task UpdateHoliday_ShouldUpdateFields()
    {
        var controller = new MasterDataController(_context);
        var request = new UpdateHolidayRequest(
            Date: new DateOnly(2026, 8, 17),
            Name: "HUT RI ke-81 Updated",
            Description: "Proklamasi Kemerdekaan",
            IsNational: true,
            CompanyId: null
        );

        var result = await controller.UpdateHoliday(1, request) as OkObjectResult;
        result.Should().NotBeNull();

        var holiday = await _context.Holidays.FindAsync(1);
        holiday!.Name.Should().Be("HUT RI ke-81 Updated");
    }

    [Fact]
    public async Task DeleteHoliday_ShouldRemoveRecord()
    {
        var controller = new MasterDataController(_context);

        var result = await controller.DeleteHoliday(2) as OkObjectResult;
        result.Should().NotBeNull();

        var holiday = await _context.Holidays.FindAsync(2);
        holiday.Should().BeNull();
    }

    [Fact]
    public async Task SeedNationalHolidays_ShouldSeedDefault2026()
    {
        // Use fresh context for seed test
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        using var freshContext = new AppDbContext(options);
        var controller = new MasterDataController(freshContext);

        var result = await controller.SeedNationalHolidays(2026) as OkObjectResult;
        result.Should().NotBeNull();

        var holidays2026 = await freshContext.Holidays.Where(h => h.Date.Year == 2026).ToListAsync();
        holidays2026.Should().HaveCountGreaterThan(10);
    }
}

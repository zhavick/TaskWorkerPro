using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using Xunit;

namespace TrackerKerja.Tests;

public class TimesheetDomainEntitiesTests
{
    [Fact]
    public async Task CanPersistAndRetrieve_TimesheetPeriod_And_CompanyTimesheetConfig()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var company = new Company { Id = 101, Name = "Elistec Global", Code = "ELISTEC" };
        context.Companies.Add(company);

        var period = new TimesheetPeriod
        {
            CompanyId = 101,
            PeriodCode = "09/26",
            Name = "September 2026",
            StartDate = new DateOnly(2026, 9, 3),
            EndDate = new DateOnly(2026, 10, 2),
            WorkingDaysCount = 21,
            IsClosed = false
        };
        context.TimesheetPeriods.Add(period);

        var config = new CompanyTimesheetConfig
        {
            CompanyId = 101,
            HeaderTitle = "ELISTEC - Timesheet",
            ClientName = "Tugu Insurance",
            SowNumber = "SOW-2026-001",
            ApproverName = "Anton Manager",
            IncludeWeekends = true,
            ColumnsMappingJson = "[]"
        };
        context.CompanyTimesheetConfigs.Add(config);

        await context.SaveChangesAsync();

        var retrievedPeriod = await context.TimesheetPeriods.FirstOrDefaultAsync(p => p.CompanyId == 101);
        retrievedPeriod.Should().NotBeNull();
        retrievedPeriod!.PeriodCode.Should().Be("09/26");
        retrievedPeriod.WorkingDaysCount.Should().Be(21);

        var retrievedConfig = await context.CompanyTimesheetConfigs.FirstOrDefaultAsync(c => c.CompanyId == 101);
        retrievedConfig.Should().NotBeNull();
        retrievedConfig!.ClientName.Should().Be("Tugu Insurance");
        retrievedConfig.IncludeWeekends.Should().BeTrue();
    }
}

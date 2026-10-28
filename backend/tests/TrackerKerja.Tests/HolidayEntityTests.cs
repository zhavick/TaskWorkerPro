using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using Xunit;

namespace TrackerKerja.Tests;

public class HolidayEntityTests
{
    [Fact]
    public async Task CanPersistAndRetrieve_Holiday_WithAppDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        using var context = new AppDbContext(options);

        var company = new Company { Id = 201, Name = "Elistec Global", Code = "ELISTEC" };
        context.Companies.Add(company);

        var nationalHoliday = new Holiday
        {
            Date = new DateOnly(2026, 8, 17),
            Name = "Hari Kemerdekaan RI Ke-81",
            Description = "Hari Libur Nasional Republik Indonesia",
            IsNational = true,
            CompanyId = null,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var companyHoliday = new Holiday
        {
            Date = new DateOnly(2026, 10, 15),
            Name = "Company Anniversary",
            Description = "Hari Ulang Tahun Perusahaan Elistec",
            IsNational = false,
            CompanyId = 201,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        context.Holidays.Add(nationalHoliday);
        context.Holidays.Add(companyHoliday);
        await context.SaveChangesAsync();

        var holidays = await context.Holidays.ToListAsync();
        holidays.Should().HaveCount(2);

        var retrievedNational = await context.Holidays.FirstOrDefaultAsync(h => h.IsNational);
        retrievedNational.Should().NotBeNull();
        retrievedNational!.Date.Should().Be(new DateOnly(2026, 8, 17));
        retrievedNational.Name.Should().Be("Hari Kemerdekaan RI Ke-81");
        retrievedNational.CompanyId.Should().BeNull();

        var retrievedCompany = await context.Holidays.FirstOrDefaultAsync(h => h.CompanyId == 201);
        retrievedCompany.Should().NotBeNull();
        retrievedCompany!.Date.Should().Be(new DateOnly(2026, 10, 15));
        retrievedCompany.Name.Should().Be("Company Anniversary");
        retrievedCompany.IsNational.Should().BeFalse();
    }
}

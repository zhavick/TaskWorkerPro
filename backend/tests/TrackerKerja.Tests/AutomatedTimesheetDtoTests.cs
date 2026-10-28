using FluentAssertions;
using TrackerKerja.Application.DTOs;
using Xunit;

namespace TrackerKerja.Tests;

public class AutomatedTimesheetDtoTests
{
    [Fact]
    public void AutoGenerateTimesheetRequest_ShouldStorePropertiesProperly()
    {
        var request = new AutoGenerateTimesheetRequest(
            CompanyId: 10,
            PeriodId: 5,
            UserId: "all",
            Mode: "Overwrite"
        );

        request.CompanyId.Should().Be(10);
        request.PeriodId.Should().Be(5);
        request.UserId.Should().Be("all");
        request.Mode.Should().Be("Overwrite");
    }

    [Fact]
    public void AutoGenerateTimesheetResultDto_ShouldStoreMetricsProperly()
    {
        var result = new AutoGenerateTimesheetResultDto(
            Success: true,
            Message: "Berhasil",
            UsersProcessedCount: 4,
            WorkingDaysCount: 21,
            GeneratedSessionsCount: 84,
            AttendancesCreatedCount: 84,
            TotalHoursGenerated: 168.0
        );

        result.Success.Should().BeTrue();
        result.UsersProcessedCount.Should().Be(4);
        result.WorkingDaysCount.Should().Be(21);
        result.GeneratedSessionsCount.Should().Be(84);
        result.AttendancesCreatedCount.Should().Be(84);
        result.TotalHoursGenerated.Should().Be(168.0);
    }
}

using FluentAssertions;
using System.Text.Json;
using TrackerKerja.Application.DTOs;
using Xunit;

namespace TrackerKerja.Tests;

public class CompanyTimesheetDtoTests
{
    [Fact]
    public void ElistecDefaultMappings_ShouldContain14StandardColumns()
    {
        var mappings = CompanyTimesheetPresets.GetElistecDefaultMappings();
        mappings.Should().HaveCount(14);
        mappings[0].ColumnLetter.Should().Be("A");
        mappings[0].HeaderTitle.Should().Be("Issue Key");
        mappings[0].SourceField.Should().Be("TaskKey");

        mappings[3].ColumnLetter.Should().Be("D");
        mappings[3].HeaderTitle.Should().Be("MD");
        mappings[3].Formula.Should().Contain("/8");

        var json = JsonSerializer.Serialize(mappings);
        var deserialized = JsonSerializer.Deserialize<List<TimesheetColumnMappingDto>>(json);
        deserialized.Should().HaveCount(14);
    }
}

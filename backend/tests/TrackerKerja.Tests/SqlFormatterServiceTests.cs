using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class SqlFormatterServiceTests
{
    private readonly SqlFormatterService _service = new();

    [Fact]
    public void Format_SimpleSelect_ShouldFormatWithUppercaseKeywordsAndIndent()
    {
        var sql = "select id, name, email from users where is_active = true and status != 2 order by created_at desc";
        var request = new SqlFormatRequest(sql, "postgresql", KeywordCase.Upper, CommaPosition.EndOfLine, 2);

        var result = _service.Format(request);

        Assert.True(result.Success);
        Assert.Contains("SELECT", result.FormattedSql);
        Assert.Contains("FROM", result.FormattedSql);
        Assert.Contains("WHERE", result.FormattedSql);
        Assert.Contains("ORDER BY", result.FormattedSql);
        Assert.True(result.LineCount > 1);
    }

    [Fact]
    public void Format_CommaStartOfLine_ShouldPlaceCommaAtBeginningOfColumns()
    {
        var sql = "select id, name, email from users";
        var request = new SqlFormatRequest(sql, "postgresql", KeywordCase.Upper, CommaPosition.StartOfLine, 2);

        var result = _service.Format(request);

        Assert.True(result.Success);
        Assert.Contains(", name", result.FormattedSql);
    }

    [Fact]
    public void Minify_MultiLineWithComments_ShouldCompressToOneLine()
    {
        var sql = "-- user query\nSELECT id,\n  name\nFROM users;\n";
        var request = new SqlMinifyRequest(sql, PreserveComments: false);

        var result = _service.Minify(request);

        Assert.True(result.Success);
        Assert.DoesNotContain("\n", result.MinifiedSql);
        Assert.DoesNotContain("-- user query", result.MinifiedSql);
        Assert.Equal("SELECT id, name FROM users;", result.MinifiedSql.Trim());
    }

    [Fact]
    public void Validate_UnmatchedParentheses_ShouldReturnErrors()
    {
        var sql = "SELECT id, name FROM (SELECT id FROM users WHERE status = 1";
        var request = new SqlValidationRequest(sql, "postgresql");

        var result = _service.Validate(request);

        Assert.False(result.IsValid);
        Assert.NotEmpty(result.Errors);
        Assert.Contains(result.Errors, e => e.Message.Contains("tanda kurung", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Validate_UnclosedQuote_ShouldReturnErrors()
    {
        var sql = "SELECT id, 'unclosed string from users";
        var request = new SqlValidationRequest(sql, "postgresql");

        var result = _service.Validate(request);

        Assert.False(result.IsValid);
        Assert.NotEmpty(result.Errors);
        Assert.Contains(result.Errors, e => e.Message.Contains("tanda kutip", StringComparison.OrdinalIgnoreCase) || e.Message.Contains("string", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Validate_ValidQuery_ShouldReturnTrueWithStatementType()
    {
        var sql = "SELECT id, name FROM users WHERE is_active = true;";
        var request = new SqlValidationRequest(sql, "postgresql");

        var result = _service.Validate(request);

        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
        Assert.Equal("SELECT", result.StatementType);
    }

    [Fact]
    public void GetSupportedDialects_ShouldReturnAtLeast15Dialects()
    {
        var dialects = _service.GetSupportedDialects();

        Assert.True(dialects.Count >= 15);
        Assert.Contains(dialects, d => d.Code == "postgresql");
        Assert.Contains(dialects, d => d.Code == "bigquery");
        Assert.Contains(dialects, d => d.Code == "snowflake");
        Assert.Contains(dialects, d => d.Code == "tsql");
        Assert.Contains(dialects, d => d.Code == "oracle");
        Assert.Contains(dialects, d => d.Code == "mysql");
        Assert.Contains(dialects, d => d.Code == "sqlite");
    }

    [Fact]
    public void GetSampleQuery_ForDialect_ShouldReturnValidSqlSample()
    {
        var pgSample = _service.GetSampleQuery("postgresql", "cte");
        Assert.False(string.IsNullOrWhiteSpace(pgSample));
        Assert.Contains("WITH", pgSample, StringComparison.OrdinalIgnoreCase);

        var bqSample = _service.GetSampleQuery("bigquery", "basic");
        Assert.False(string.IsNullOrWhiteSpace(bqSample));
    }
}

namespace TrackerKerja.Application.DTOs;

public enum KeywordCase
{
    Upper,
    Lower,
    Preserve
}

public enum CommaPosition
{
    EndOfLine,
    StartOfLine
}

public record SqlFormatRequest(
    string Sql,
    string? Dialect = "postgresql",
    KeywordCase Casing = KeywordCase.Upper,
    CommaPosition Comma = CommaPosition.EndOfLine,
    int IndentSpaces = 2,
    string? Name = null,
    int? TaskId = null
)
{
    public string SqlString => Sql;
}

public record SqlFormatResult(
    bool Success,
    string FormattedSql,
    string Dialect,
    int LineCount,
    int CharacterCount,
    long ElapsedMilliseconds
);

public record SqlMinifyRequest(
    string Sql,
    bool PreserveComments = false
);

public record SqlMinifyResult(
    bool Success,
    string MinifiedSql,
    int OriginalLength,
    int MinifiedLength,
    double CompressionRatio
);

public record SqlDiagnosticError(
    int Line,
    int Column,
    string Message
);

public record SqlValidationRequest(
    string Sql,
    string? Dialect = "postgresql"
);

public record SqlValidationResult(
    bool IsValid,
    string StatementType,
    IReadOnlyList<SqlDiagnosticError> Errors,
    IReadOnlyList<string> DetectedKeywords
);

public record SqlDialectInfo(
    string Code,
    string Name,
    string Family,
    string Description,
    string IconBadge
);

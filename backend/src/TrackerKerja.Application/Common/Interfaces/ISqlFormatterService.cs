using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface ISqlFormatterService
{
    SqlFormatResult Format(SqlFormatRequest request);
    SqlMinifyResult Minify(SqlMinifyRequest request);
    SqlValidationResult Validate(SqlValidationRequest request);
    IReadOnlyList<SqlDialectInfo> GetSupportedDialects();
    string GetSampleQuery(string dialectCode, string sampleType);
}

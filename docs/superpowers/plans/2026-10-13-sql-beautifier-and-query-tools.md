# FSD 5.15 SQL Beautifier, Minifier & Query Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate a high-performance, self-contained SQL Beautifier, Minifier, Syntax Validator, and Query Tools engine (FSD 5.15) supporting 15+ enterprise database dialects with Clean Architecture C# Web API endpoints and an interactive Next.js 16 Studio UI.

**Architecture:** A native C# tokenizing parser and state machine in `TrackerKerja.Infrastructure` implements `ISqlFormatterService` for formatting, minifying, validating, and generating dialect samples. `SqlToolsController` in `TrackerKerja.WebApi` exposes RESTful endpoints with EF Core `SqlHistory` persistence. The frontend provides a split-screen Next.js 16 Studio with real-time error diagnostics and dialect switching.

**Tech Stack:** C# 12, .NET 8.0 SDK, ASP.NET Core Web API, EF Core 8, Npgsql, Next.js 16 (React 19, TypeScript, Tailwind CSS v4, TailGrids UI, Sonner, Lucide React).

**Spec:** [docs/superpowers/specs/2026-10-13-sql-beautifier-and-query-tools-design.md](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docs/superpowers/specs/2026-10-13-sql-beautifier-and-query-tools-design.md)

## Global Constraints
- Target Framework: .NET 8.0 LTS (`net8.0`) and Next.js 16 (React 19, Tailwind CSS v4).
- 15+ Dialects: PostgreSQL, MySQL, T-SQL, Oracle, SQLite, BigQuery, Snowflake, Redshift, IBM DB2, MariaDB, CockroachDB, Couchbase N1QL, Spark SQL, Trino/Presto, and Standard ANSI SQL.
- Formatting Options: Keyword casing (Upper, Lower, Preserve), Comma placement (EndOfLine, StartOfLine), Indent spaces (2, 4, Tab).
- Zero third-party runtime package dependency for the SQL parsing engine — pure native C# tokenizer and state machine.
- Uniform API Response Envelope: `{ "success": true, "data": { ... }, "message": "..." }`.

---

### Task 1: Application Layer DTOs, Enums & Service Interface

**Files:**
- Create: `backend/src/TrackerKerja.Application/DTOs/SqlToolsDtos.cs`
- Create: `backend/src/TrackerKerja.Application/Common/Interfaces/ISqlFormatterService.cs`

**Interfaces:**
- Produces: `ISqlFormatterService`, `SqlFormatRequest`, `SqlFormatResult`, `SqlMinifyRequest`, `SqlMinifyResult`, `SqlValidationRequest`, `SqlValidationResult`, `SqlDialectInfo`, `SqlDiagnosticError`, `KeywordCase`, `CommaPosition`.

- [ ] **Step 1: Create `SqlToolsDtos.cs` in `TrackerKerja.Application/DTOs`**

```csharp
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
);

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
```

- [ ] **Step 2: Create `ISqlFormatterService.cs` in `TrackerKerja.Application/Common/Interfaces`**

```csharp
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
```

- [ ] **Step 3: Run `dotnet build backend/src/TrackerKerja.Application` to verify compilation**

Run: `dotnet build backend/src/TrackerKerja.Application/TrackerKerja.Application.csproj`
Expected: Build succeeded with 0 errors.

- [ ] **Step 4: Commit Application layer changes**

```bash
git add backend/src/TrackerKerja.Application/DTOs/SqlToolsDtos.cs backend/src/TrackerKerja.Application/Common/Interfaces/ISqlFormatterService.cs
git commit -m "feat(sqltools): define application DTOs and ISqlFormatterService interface"
```

---

### Task 2: Infrastructure Layer Native SQL Formatter & Validator Service

**Files:**
- Create: `backend/src/TrackerKerja.Infrastructure/Services/SqlFormatterService.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs`
- Create: `backend/tests/TrackerKerja.Tests/SqlFormatterServiceTests.cs`

**Interfaces:**
- Consumes: `ISqlFormatterService`, `SqlToolsDtos` from Task 1.
- Produces: Concrete `SqlFormatterService` registered in DI as scoped or singleton.

- [ ] **Step 1: Write failing unit tests in `TrackerKerja.Tests/SqlFormatterServiceTests.cs`**

```csharp
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
    public void GetSupportedDialects_ShouldReturnAtLeast15Dialects()
    {
        var dialects = _service.GetSupportedDialects();

        Assert.True(dialects.Count >= 15);
        Assert.Contains(dialects, d => d.Code == "postgresql");
        Assert.Contains(dialects, d => d.Code == "bigquery");
        Assert.Contains(dialects, d => d.Code == "snowflake");
        Assert.Contains(dialects, d => d.Code == "tsql");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SqlFormatterServiceTests"`
Expected: Compilation failure / tests fail because `SqlFormatterService` is not implemented yet.

- [ ] **Step 3: Implement `SqlFormatterService.cs` in `TrackerKerja.Infrastructure/Services`**

Implement complete tokenizing, comment stripping, keyword replacement, indentation engine, minifier, parentheses/string validator, and 15+ dialects metadata & samples in `SqlFormatterService.cs`.

- [ ] **Step 4: Register `ISqlFormatterService` in `DependencyInjection.cs`**

```csharp
services.AddSingleton<ISqlFormatterService, SqlFormatterService>();
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SqlFormatterServiceTests"`
Expected: All tests pass.

- [ ] **Step 6: Commit Infrastructure implementation**

```bash
git add backend/src/TrackerKerja.Infrastructure/Services/SqlFormatterService.cs backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs backend/tests/TrackerKerja.Tests/SqlFormatterServiceTests.cs
git commit -m "feat(sqltools): implement native SqlFormatterService with 15+ dialects and unit tests"
```

---

### Task 3: WebApi Controller & REST Endpoints (`/api/sqltools`)

**Files:**
- Create: `backend/src/TrackerKerja.WebApi/Controllers/SqlToolsController.cs`
- Create: `backend/tests/TrackerKerja.Tests/SqlToolsControllerTests.cs`

**Interfaces:**
- Consumes: `ISqlFormatterService`, `AppDbContext`, `ICurrentTenantService`.
- Produces: REST endpoints `/api/sqltools/format`, `/api/sqltools/minify`, `/api/sqltools/validate`, `/api/sqltools/dialects`, `/api/sqltools/samples/{dialect}`, `/api/sqltools/history`, `/api/sqltools/history/{id}`.

- [ ] **Step 1: Write integration/unit tests for `SqlToolsController`**

Create `SqlToolsControllerTests.cs` verifying format, minify, validate, dialects endpoints return `200 OK` with JSON envelope.

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SqlToolsControllerTests"`
Expected: FAIL because `SqlToolsController` does not exist yet.

- [ ] **Step 3: Implement `SqlToolsController.cs` in `TrackerKerja.WebApi/Controllers`**

Implement endpoints with `[Authorize]`, error handling, `SqlHistory` saving if `Name` provided, and uniform API responses.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "FullyQualifiedName~SqlToolsControllerTests"`
Expected: PASS.

- [ ] **Step 5: Commit WebApi Controller implementation**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/SqlToolsController.cs backend/tests/TrackerKerja.Tests/SqlToolsControllerTests.cs
git commit -m "feat(sqltools): implement SqlToolsController REST endpoints and tests"
```

---

### Task 4: Next.js 16 Studio UI Implementation (`/dev-tools/sql`)

**Files:**
- Modify: `frontend/src/app/(with-layouts)/dev-tools/sql/page.tsx`
- Modify: `frontend/src/components/common/sidebar/data.tsx` (ensure menu item "SQL Query Tools" is active under Dev Tools)

**Interfaces:**
- Consumes: `/api/sqltools/*` endpoints via `apiClient`.
- Produces: Responsive full-featured SQL Studio with 15+ dialect selectors, sample query loader, live validation status, side-by-side code editors, formatting options, copy/download actions, and history drawer.

- [ ] **Step 1: Update `frontend/src/app/(with-layouts)/dev-tools/sql/page.tsx`**

Implement the full UI:
- Dialect selector with 15+ options and family pills (Relational, Cloud DW, NoSQL, Distributed, Big Data).
- Sample Query Dropdown (Basic SELECT, Aggregation & Window Functions, Complex CTE, DDL Schema).
- Formatter Controls: Keyword Casing (`UPPERCASE`, `lowercase`, `As-Is`), Comma Style (`Akhir Baris`, `Awal Baris`), Indent Spaces (`2 Spasi`, `4 Spasi`, `Tab`).
- Action Buttons: `Beautify SQL`, `Minify SQL`, `Validasi Sintaks`, `Salin`, `Unduh .sql`, `Clear`, `Simpan ke Riwayat`.
- Split Dual Editors (Raw Input vs Beautified/Minified Output) with monospaced font, line numbers, and character/line metrics.
- Syntax Diagnostic Box showing green badge for valid queries, or red alert with line/column coordinates for syntax issues.
- Slide-over History Drawer displaying previously saved SQL queries with 1-click restore.

- [ ] **Step 2: Update Sidebar navigation if necessary**

Verify `src/components/common/sidebar/data.tsx` points properly to `/dev-tools/sql` and displays the database icon.

- [ ] **Step 3: Test frontend compilation with `npm run build`**

Run: `npm run build` in `frontend/` directory.
Expected: Build succeeds with 0 TypeScript or linting errors.

- [ ] **Step 4: Commit frontend UI changes**

```bash
git add frontend/src/app/\(with-layouts\)/dev-tools/sql/page.tsx frontend/src/components/common/sidebar/data.tsx
git commit -m "feat(sqltools): implement interactive SQL Studio UI with 15+ dialects, diagnostics, and history drawer"
```

---

### Task 5: Full Integration Verification & Smoke Test

**Files:**
- Test backend solution compilation: `dotnet build backend/TrackerKerja.sln`
- Run all unit tests: `dotnet test backend/TrackerKerja.sln`
- Test frontend production build: `npm --prefix frontend run build`

- [ ] **Step 1: Run complete backend test suite**
- [ ] **Step 2: Run frontend production build**
- [ ] **Step 3: Commit and summarize implementation**

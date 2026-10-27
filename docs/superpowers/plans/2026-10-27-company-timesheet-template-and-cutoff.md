# Modul Mapping Template Timesheet Perusahaan & Periode Cut-Off (Standar ELISTEC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul manajemen periode cut-off bulanan per perusahaan, konfigurasi template Excel fisik dengan dynamic column mapping, serta engine ekspor timesheet resmi per pengguna (individual `.xlsx` dan bulk `.zip`) dengan standar acuan ELISTEC.

**Architecture:** Sistem menggunakan pendekatan *File Template-Based Injection* dengan ClosedXML pada backend .NET 8. Template acuan fisik dimuat, diisi metadata header (Cell E2, B4, G4, B5, L5), disisipkan baris tugas harian beserta baris akhir pekan (Sabtu & Minggu), dikorelasikan dengan data `Attendance` (Clock In, Clock Out, Work Location), diformulasikan Man-Days (`=IF(C8="","",C8/8)`) dan Total (`=SUM(...)`), serta diposisikan blok tanda tangan di bawah tabel. Frontend Next.js menyediakan panel manajemen kalender periode & dynamic column mapping di `/configuration` dan dialog ekspor di `/timesheets`.

**Tech Stack:** .NET 8, C#, ClosedXML, Entity Framework Core, PostgreSQL/InMemory, Next.js 14 App Router, TypeScript, TailwindCSS, TanStack React Query.

**Spec:** `docs/superpowers/specs/2026-10-27-company-timesheet-template-and-cutoff-design.md`

## Global Constraints
- **Framework**: Backend .NET 8 C#, Frontend Next.js 14 App Router TypeScript.
- **Excel Library**: ClosedXML untuk manipulasi `.xlsx`, `System.IO.Compression.ZipArchive` untuk pengemasan `.zip`.
- **Template Default**: Template acuan fisik disimpan di `uploads/templates/timesheet_elistec_default.xlsx`.
- **Format Tanggal Dokumen**: `DD/MM/YYYY` (contoh: `03/09/2026`), Jam: `hh:mm tt` (contoh: `7:30 AM`).
- **Formula**: Kolom MD wajib menggunakan formula `=IF(C{row}="","",C{row}/8)` dan Total `=SUM(...)`.
- **TDD Requirement**: Setiap task backend wajib diawali dengan penulisan test yang gagal, implementasi minimal, verifikasi pass, dan git commit.

---

### Task 1: Domain Entities & Database Persistence

**Files:**
- Create: `backend/src/TrackerKerja.Domain/Entities/TimesheetPeriod.cs`
- Create: `backend/src/TrackerKerja.Domain/Entities/CompanyTimesheetConfig.cs`
- Modify: `backend/src/TrackerKerja.Domain/Entities/Company.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`
- Test: `backend/tests/TrackerKerja.Tests/TimesheetDomainEntitiesTests.cs`

**Interfaces:**
- Produces:
  - `TimesheetPeriod` entity (`Id`, `CompanyId`, `PeriodCode`, `Name`, `StartDate`, `EndDate`, `WorkingDaysCount`, `IsClosed`, `Notes`)
  - `CompanyTimesheetConfig` entity (`Id`, `CompanyId`, `TemplateFilePath`, `HeaderTitle`, `ClientName`, `SowNumber`, `ApproverTitle`, `ApproverName`, `ResourceTitle`, `IncludeWeekends`, `WeekendTaskTextFormat`, `HeaderRowIndex`, `DataStartRowIndex`, `ColumnsMappingJson`)

- [ ] **Step 1: Write failing unit test for Domain Entities & DbContext mapping**

Create `backend/tests/TrackerKerja.Tests/TimesheetDomainEntitiesTests.cs`:
```csharp
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "TimesheetDomainEntitiesTests"
```
Expected: Compilation error / FAIL because `TimesheetPeriod` and `CompanyTimesheetConfig` do not exist yet.

- [ ] **Step 3: Implement Domain Entities and update AppDbContext**

Create `backend/src/TrackerKerja.Domain/Entities/TimesheetPeriod.cs`:
```csharp
namespace TrackerKerja.Domain.Entities;

public class TimesheetPeriod
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public string PeriodCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int WorkingDaysCount { get; set; }
    public bool IsClosed { get; set; } = false;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company Company { get; set; } = null!;
}
```

Create `backend/src/TrackerKerja.Domain/Entities/CompanyTimesheetConfig.cs`:
```csharp
namespace TrackerKerja.Domain.Entities;

public class CompanyTimesheetConfig
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    
    public string? TemplateFilePath { get; set; }
    public string HeaderTitle { get; set; } = "ELISTEC - Timesheet";
    public string ClientName { get; set; } = "Tugu Insurance";
    public string? SowNumber { get; set; }
    public string ApproverTitle { get; set; } = "Mengetahui,";
    public string ApproverName { get; set; } = "xxxx";
    public string ResourceTitle { get; set; } = "Resource,";

    public bool IncludeWeekends { get; set; } = true;
    public string WeekendTaskTextFormat { get; set; } = "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task";

    public int HeaderRowIndex { get; set; } = 7;
    public int DataStartRowIndex { get; set; } = 8;
    public string ColumnsMappingJson { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company Company { get; set; } = null!;
}
```

Modify `backend/src/TrackerKerja.Domain/Entities/Company.cs`: Add navigation properties:
```csharp
    public ICollection<TimesheetPeriod> TimesheetPeriods { get; set; } = new List<TimesheetPeriod>();
    public CompanyTimesheetConfig? TimesheetConfig { get; set; }
```

Modify `backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs`:
Add DbSets:
```csharp
    public DbSet<TimesheetPeriod> TimesheetPeriods => Set<TimesheetPeriod>();
    public DbSet<CompanyTimesheetConfig> CompanyTimesheetConfigs => Set<CompanyTimesheetConfig>();
```
In `OnModelCreating`, configure relationships with cascade delete on `CompanyId`.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "TimesheetDomainEntitiesTests"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/TrackerKerja.Domain/Entities/TimesheetPeriod.cs backend/src/TrackerKerja.Domain/Entities/CompanyTimesheetConfig.cs backend/src/TrackerKerja.Domain/Entities/Company.cs backend/src/TrackerKerja.Infrastructure/Persistence/AppDbContext.cs backend/tests/TrackerKerja.Tests/TimesheetDomainEntitiesTests.cs
git commit -m "feat: add TimesheetPeriod and CompanyTimesheetConfig domain entities and db mappings"
```

---

### Task 2: Default Template Asset Setup & DTO Models

**Files:**
- Create: `uploads/templates/timesheet_elistec_default.xlsx` (Copy from source template)
- Create: `backend/src/TrackerKerja.Application/DTOs/CompanyTimesheetDtos.cs`
- Test: `backend/tests/TrackerKerja.Tests/CompanyTimesheetDtoTests.cs`

**Interfaces:**
- Produces:
  - `TimesheetPeriodDto`, `CreateTimesheetPeriodRequest`, `UpdateTimesheetPeriodRequest`
  - `CompanyTimesheetConfigDto`, `UpdateCompanyTimesheetConfigRequest`
  - `TimesheetColumnMappingDto`
  - Helper `CompanyTimesheetPresets.GetElistecDefaultMappings()`

- [ ] **Step 1: Copy sample Excel file to uploads/templates directory**

Run command to ensure `uploads/templates` directory exists and copy the sample template:
```powershell
New-Item -ItemType Directory -Force -Path "uploads/templates"
Copy-Item "C:\Users\WAHANA 24\Downloads\Timesheet Elistec - September 2026 - Syafix Said (2).xlsx" -Destination "uploads/templates/timesheet_elistec_default.xlsx"
```

- [ ] **Step 2: Write failing unit test for DTOs and Default Preset mapping**

Create `backend/tests/TrackerKerja.Tests/CompanyTimesheetDtoTests.cs`:
```csharp
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
```

- [ ] **Step 3: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "CompanyTimesheetDtoTests"
```
Expected: FAIL because `CompanyTimesheetDtos.cs` does not exist yet.

- [ ] **Step 4: Implement DTOs and Preset Helper**

Create `backend/src/TrackerKerja.Application/DTOs/CompanyTimesheetDtos.cs`:
```csharp
namespace TrackerKerja.Application.DTOs;

public record TimesheetColumnMappingDto(
    string ColumnLetter,
    string HeaderTitle,
    string SourceField,
    string? Formula = null,
    string? DefaultValue = null
);

public record TimesheetPeriodDto(
    int Id,
    int CompanyId,
    string PeriodCode,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkingDaysCount,
    bool IsClosed,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CreateTimesheetPeriodRequest(
    string PeriodCode,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    int? WorkingDaysCount = null,
    string? Notes = null
);

public record UpdateTimesheetPeriodRequest(
    string PeriodCode,
    string Name,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkingDaysCount,
    bool IsClosed,
    string? Notes = null
);

public record CompanyTimesheetConfigDto(
    int Id,
    int CompanyId,
    string? TemplateFileName,
    string HeaderTitle,
    string ClientName,
    string? SowNumber,
    string ApproverTitle,
    string ApproverName,
    string ResourceTitle,
    bool IncludeWeekends,
    string WeekendTaskTextFormat,
    int HeaderRowIndex,
    int DataStartRowIndex,
    List<TimesheetColumnMappingDto> ColumnsMapping,
    DateTimeOffset UpdatedAt
);

public record UpdateCompanyTimesheetConfigRequest(
    string HeaderTitle,
    string ClientName,
    string? SowNumber,
    string ApproverTitle,
    string ApproverName,
    string ResourceTitle,
    bool IncludeWeekends,
    string WeekendTaskTextFormat,
    int HeaderRowIndex,
    int DataStartRowIndex,
    List<TimesheetColumnMappingDto> ColumnsMapping
);

public static class CompanyTimesheetPresets
{
    public static List<TimesheetColumnMappingDto> GetElistecDefaultMappings()
    {
        return new List<TimesheetColumnMappingDto>
        {
            new("A", "Issue Key", "TaskKey", null, ""),
            new("B", "Issue Summary", "TaskSummary", null, ""),
            new("C", "Hours", "Hours", null, "0"),
            new("D", "MD", "ManDaysFormula", "=IF(C{row}=\"\",\"\",C{row}/8)", ""),
            new("E", "Work Date", "WorkDate", null, ""),
            new("F", "Clock In", "ClockIn", null, "-"),
            new("G", "Clock Out", "ClockOut", null, "-"),
            new("H", "Username", "Username", null, ""),
            new("I", "Full Name", "FullName", null, ""),
            new("J", "Period", "PeriodCode", null, ""),
            new("K", "Project Name", "ProjectName", null, "-"),
            new("L", "Activity Type", "ActivityType", null, "-"),
            new("M", "Working Place", "WorkingPlace", null, "WFO"),
            new("N", "Evidence", "Evidence", null, "")
        };
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "CompanyTimesheetDtoTests"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add uploads/templates/timesheet_elistec_default.xlsx backend/src/TrackerKerja.Application/DTOs/CompanyTimesheetDtos.cs backend/tests/TrackerKerja.Tests/CompanyTimesheetDtoTests.cs
git commit -m "feat: setup default ELISTEC template asset and company timesheet DTOs"
```

---

### Task 3: Backend TimesheetPeriodsController (Master Kalender Periode)

**Files:**
- Create: `backend/src/TrackerKerja.WebApi/Controllers/TimesheetPeriodsController.cs`
- Test: `backend/tests/TrackerKerja.Tests/TimesheetPeriodsControllerTests.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`
- Produces:
  - `GET /api/companies/{companyId}/timesheet-periods`
  - `POST /api/companies/{companyId}/timesheet-periods`
  - `PUT /api/companies/{companyId}/timesheet-periods/{periodId}`
  - `DELETE /api/companies/{companyId}/timesheet-periods/{periodId}`
  - `POST /api/companies/{companyId}/timesheet-periods/{periodId}/toggle-close`

- [ ] **Step 1: Write failing controller test for TimesheetPeriods**

Create `backend/tests/TrackerKerja.Tests/TimesheetPeriodsControllerTests.cs`:
```csharp
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class TimesheetPeriodsControllerTests
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public TimesheetPeriodsControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "ELISTEC", "admin-1", true);
        _context = new AppDbContext(options, _tenantService);
        _context.Companies.Add(new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" });
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateAndGetPeriods_ShouldCalculateWorkingDaysAutomatically()
    {
        var controller = new TimesheetPeriodsController(_context, _tenantService);

        var request = new CreateTimesheetPeriodRequest(
            PeriodCode: "09/26",
            Name: "September 2026",
            StartDate: new DateOnly(2026, 9, 3),
            EndDate: new DateOnly(2026, 10, 2),
            WorkingDaysCount: null, // Auto calculate
            Notes: "Periode Cut-Off September ELISTEC"
        );

        var createResult = await controller.CreatePeriod(10, request) as OkObjectResult;
        createResult.Should().NotBeNull();
        createResult!.StatusCode.Should().Be(200);

        var listResult = await controller.GetPeriods(10) as OkObjectResult;
        listResult.Should().NotBeNull();
        var data = listResult!.Value?.GetType().GetProperty("data")?.GetValue(listResult.Value) as List<TimesheetPeriodDto>;
        data.Should().NotBeNull();
        data!.Count.Should().Be(1);
        data[0].PeriodCode.Should().Be("09/26");
        data[0].WorkingDaysCount.Should().Be(22); // Auto working days (non sat/sun)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "TimesheetPeriodsControllerTests"
```
Expected: FAIL because `TimesheetPeriodsController` does not exist yet.

- [ ] **Step 3: Implement TimesheetPeriodsController**

Create `backend/src/TrackerKerja.WebApi/Controllers/TimesheetPeriodsController.cs`:
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/companies/{companyId}/timesheet-periods")]
[Authorize]
public class TimesheetPeriodsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public TimesheetPeriodsController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    private static int CalculateWorkingDays(DateOnly start, DateOnly end)
    {
        int count = 0;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
            {
                count++;
            }
        }
        return count;
    }

    [HttpGet]
    public async Task<IActionResult> GetPeriods(int companyId)
    {
        var periods = await _context.TimesheetPeriods
            .AsNoTracking()
            .Where(p => p.CompanyId == companyId)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();

        var dtos = periods.Select(p => new TimesheetPeriodDto(
            p.Id,
            p.CompanyId,
            p.PeriodCode,
            p.Name,
            p.StartDate,
            p.EndDate,
            p.WorkingDaysCount,
            p.IsClosed,
            p.Notes,
            p.CreatedAt,
            p.UpdatedAt
        )).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpPost]
    public async Task<IActionResult> CreatePeriod(int companyId, [FromBody] CreateTimesheetPeriodRequest request)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        if (request.EndDate < request.StartDate)
        {
            return BadRequest(new { success = false, message = "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        }

        int workingDays = request.WorkingDaysCount ?? CalculateWorkingDays(request.StartDate, request.EndDate);

        var period = new TimesheetPeriod
        {
            CompanyId = companyId,
            PeriodCode = request.PeriodCode.Trim(),
            Name = request.Name.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            WorkingDaysCount = workingDays,
            IsClosed = false,
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.TimesheetPeriods.Add(period);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Periode cut-off timesheet berhasil dibuat.", data = period });
    }

    [HttpPut("{periodId}")]
    public async Task<IActionResult> UpdatePeriod(int companyId, int periodId, [FromBody] UpdateTimesheetPeriodRequest request)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) return NotFound(new { success = false, message = "Periode tidak ditemukan." });

        if (request.EndDate < request.StartDate)
        {
            return BadRequest(new { success = false, message = "Tanggal selesai tidak boleh sebelum tanggal mulai." });
        }

        period.PeriodCode = request.PeriodCode.Trim();
        period.Name = request.Name.Trim();
        period.StartDate = request.StartDate;
        period.EndDate = request.EndDate;
        period.WorkingDaysCount = request.WorkingDaysCount;
        period.IsClosed = request.IsClosed;
        period.Notes = request.Notes?.Trim();
        period.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Periode cut-off timesheet berhasil diperbarui." });
    }

    [HttpDelete("{periodId}")]
    public async Task<IActionResult> DeletePeriod(int companyId, int periodId)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) return NotFound(new { success = false, message = "Periode tidak ditemukan." });

        _context.TimesheetPeriods.Remove(period);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Periode berhasil dihapus." });
    }

    [HttpPost("{periodId}/toggle-close")]
    public async Task<IActionResult> ToggleClosePeriod(int companyId, int periodId)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var period = await _context.TimesheetPeriods.FirstOrDefaultAsync(p => p.Id == periodId && p.CompanyId == companyId);
        if (period == null) return NotFound(new { success = false, message = "Periode tidak ditemukan." });

        period.IsClosed = !period.IsClosed;
        period.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Periode sekarang {(period.IsClosed ? "ditutup" : "dibuka")}." });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "TimesheetPeriodsControllerTests"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/TimesheetPeriodsController.cs backend/tests/TrackerKerja.Tests/TimesheetPeriodsControllerTests.cs
git commit -m "feat: implement TimesheetPeriodsController for cut-off calendar management"
```

---

### Task 4: Backend CompanyTimesheetConfigController (Template & Column Mapping)

**Files:**
- Create: `backend/src/TrackerKerja.WebApi/Controllers/CompanyTimesheetConfigController.cs`
- Test: `backend/tests/TrackerKerja.Tests/CompanyTimesheetConfigControllerTests.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `ICurrentTenantService`
- Produces:
  - `GET /api/companies/{companyId}/timesheet-config`
  - `PUT /api/companies/{companyId}/timesheet-config`
  - `POST /api/companies/{companyId}/timesheet-config/upload-template`
  - `POST /api/companies/{companyId}/timesheet-config/reset-default`

- [ ] **Step 1: Write failing controller test for CompanyTimesheetConfig**

Create `backend/tests/TrackerKerja.Tests/CompanyTimesheetConfigControllerTests.cs`:
```csharp
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class CompanyTimesheetConfigControllerTests
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public CompanyTimesheetConfigControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _tenantService = new FakeTenantService(10, "ELISTEC", "admin-1", true);
        _context = new AppDbContext(options, _tenantService);
        _context.Companies.Add(new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" });
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetConfig_WhenNotConfigured_ShouldReturnElistecDefaults()
    {
        var controller = new CompanyTimesheetConfigController(_context, _tenantService);

        var result = await controller.GetConfig(10) as OkObjectResult;
        result.Should().NotBeNull();
        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as CompanyTimesheetConfigDto;
        data.Should().NotBeNull();
        data!.HeaderTitle.Should().Be("ELISTEC - Timesheet");
        data.ColumnsMapping.Should().HaveCount(14);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "CompanyTimesheetConfigControllerTests"
```
Expected: FAIL because `CompanyTimesheetConfigController` does not exist yet.

- [ ] **Step 3: Implement CompanyTimesheetConfigController**

Create `backend/src/TrackerKerja.WebApi/Controllers/CompanyTimesheetConfigController.cs`:
```csharp
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/companies/{companyId}/timesheet-config")]
[Authorize]
public class CompanyTimesheetConfigController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public CompanyTimesheetConfigController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet]
    public async Task<IActionResult> GetConfig(int companyId)
    {
        var config = await _context.CompanyTimesheetConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CompanyId == companyId);

        if (config == null)
        {
            var defaultMappings = CompanyTimesheetPresets.GetElistecDefaultMappings();
            var defaultDto = new CompanyTimesheetConfigDto(
                Id: 0,
                CompanyId: companyId,
                TemplateFileName: "timesheet_elistec_default.xlsx (Preset)",
                HeaderTitle: "ELISTEC - Timesheet",
                ClientName: "Tugu Insurance",
                SowNumber: "",
                ApproverTitle: "Mengetahui,",
                ApproverName: "xxxx",
                ResourceTitle: "Resource,",
                IncludeWeekends: true,
                WeekendTaskTextFormat: "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task",
                HeaderRowIndex: 7,
                DataStartRowIndex: 8,
                ColumnsMapping: defaultMappings,
                UpdatedAt: DateTimeOffset.UtcNow
            );
            return Ok(new { success = true, data = defaultDto });
        }

        List<TimesheetColumnMappingDto> mappings;
        try
        {
            mappings = JsonSerializer.Deserialize<List<TimesheetColumnMappingDto>>(config.ColumnsMappingJson) 
                       ?? CompanyTimesheetPresets.GetElistecDefaultMappings();
        }
        catch
        {
            mappings = CompanyTimesheetPresets.GetElistecDefaultMappings();
        }

        var dto = new CompanyTimesheetConfigDto(
            config.Id,
            config.CompanyId,
            string.IsNullOrEmpty(config.TemplateFilePath) ? "timesheet_elistec_default.xlsx (Preset)" : Path.GetFileName(config.TemplateFilePath),
            config.HeaderTitle,
            config.ClientName,
            config.SowNumber,
            config.ApproverTitle,
            config.ApproverName,
            config.ResourceTitle,
            config.IncludeWeekends,
            config.WeekendTaskTextFormat,
            config.HeaderRowIndex,
            config.DataStartRowIndex,
            mappings,
            config.UpdatedAt
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateConfig(int companyId, [FromBody] UpdateCompanyTimesheetConfigRequest request)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var config = await _context.CompanyTimesheetConfigs
            .FirstOrDefaultAsync(c => c.CompanyId == companyId);

        var mappingsJson = JsonSerializer.Serialize(request.ColumnsMapping ?? CompanyTimesheetPresets.GetElistecDefaultMappings());

        if (config == null)
        {
            config = new CompanyTimesheetConfig
            {
                CompanyId = companyId,
                HeaderTitle = request.HeaderTitle.Trim(),
                ClientName = request.ClientName.Trim(),
                SowNumber = request.SowNumber?.Trim(),
                ApproverTitle = request.ApproverTitle.Trim(),
                ApproverName = request.ApproverName.Trim(),
                ResourceTitle = request.ResourceTitle.Trim(),
                IncludeWeekends = request.IncludeWeekends,
                WeekendTaskTextFormat = request.WeekendTaskTextFormat.Trim(),
                HeaderRowIndex = request.HeaderRowIndex > 0 ? request.HeaderRowIndex : 7,
                DataStartRowIndex = request.DataStartRowIndex > 0 ? request.DataStartRowIndex : 8,
                ColumnsMappingJson = mappingsJson,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _context.CompanyTimesheetConfigs.Add(config);
        }
        else
        {
            config.HeaderTitle = request.HeaderTitle.Trim();
            config.ClientName = request.ClientName.Trim();
            config.SowNumber = request.SowNumber?.Trim();
            config.ApproverTitle = request.ApproverTitle.Trim();
            config.ApproverName = request.ApproverName.Trim();
            config.ResourceTitle = request.ResourceTitle.Trim();
            config.IncludeWeekends = request.IncludeWeekends;
            config.WeekendTaskTextFormat = request.WeekendTaskTextFormat.Trim();
            config.HeaderRowIndex = request.HeaderRowIndex > 0 ? request.HeaderRowIndex : 7;
            config.DataStartRowIndex = request.DataStartRowIndex > 0 ? request.DataStartRowIndex : 8;
            config.ColumnsMappingJson = mappingsJson;
            config.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Konfigurasi template timesheet berhasil disimpan." });
    }

    [HttpPost("upload-template")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadTemplate(int companyId, IFormFile file)
    {
        if (!_tenantService.IsAdmin) return Forbid();
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "Silakan unggah file template .xlsx." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
        {
            return BadRequest(new { success = false, message = "Format file harus .xlsx." });
        }

        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "templates");
        Directory.CreateDirectory(uploadsFolder);

        var safeFileName = $"template_comp_{companyId}_{Guid.NewGuid():N}.xlsx";
        var fullPath = Path.Combine(uploadsFolder, safeFileName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var config = await _context.CompanyTimesheetConfigs.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        if (config == null)
        {
            config = new CompanyTimesheetConfig
            {
                CompanyId = companyId,
                TemplateFilePath = fullPath,
                ColumnsMappingJson = JsonSerializer.Serialize(CompanyTimesheetPresets.GetElistecDefaultMappings()),
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _context.CompanyTimesheetConfigs.Add(config);
        }
        else
        {
            config.TemplateFilePath = fullPath;
            config.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "File template kustom berhasil diunggah dan disimpan.", fileName = file.FileName });
    }

    [HttpPost("reset-default")]
    public async Task<IActionResult> ResetDefault(int companyId)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        var config = await _context.CompanyTimesheetConfigs.FirstOrDefaultAsync(c => c.CompanyId == companyId);
        if (config != null)
        {
            config.TemplateFilePath = null;
            config.HeaderTitle = "ELISTEC - Timesheet";
            config.ClientName = "Tugu Insurance";
            config.SowNumber = "";
            config.ApproverTitle = "Mengetahui,";
            config.ApproverName = "xxxx";
            config.ResourceTitle = "Resource,";
            config.IncludeWeekends = true;
            config.WeekendTaskTextFormat = "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task";
            config.HeaderRowIndex = 7;
            config.DataStartRowIndex = 8;
            config.ColumnsMappingJson = JsonSerializer.Serialize(CompanyTimesheetPresets.GetElistecDefaultMappings());
            config.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, message = "Konfigurasi dan template berhasil direset ke standar bawaan ELISTEC." });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "CompanyTimesheetConfigControllerTests"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/TrackerKerja.WebApi/Controllers/CompanyTimesheetConfigController.cs backend/tests/TrackerKerja.Tests/CompanyTimesheetConfigControllerTests.cs
git commit -m "feat: implement CompanyTimesheetConfigController for template and dynamic mapping"
```

---

### Task 5: ClosedXML Company Timesheet Export Service & Bulk ZIP

**Files:**
- Create: `backend/src/TrackerKerja.Application/Common/Interfaces/ICompanyTimesheetExportService.cs`
- Create: `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlCompanyTimesheetExportService.cs`
- Modify: `backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs`
- Modify: `backend/src/TrackerKerja.WebApi/Controllers/TimesheetsController.cs`
- Test: `backend/tests/TrackerKerja.Tests/CompanyTimesheetExportServiceTests.cs`

**Interfaces:**
- Produces:
  - `Task<byte[]> ExportUserTimesheetAsync(int companyId, int periodId, string userId)`
  - `Task<byte[]> ExportBulkCompanyTimesheetsZipAsync(int companyId, int periodId)`
  - `GET /api/timesheets/export/company-template?periodId={periodId}&userId={userId}&companyId={companyId}`

- [ ] **Step 1: Write failing unit test for ClosedXmlCompanyTimesheetExportService**

Create `backend/tests/TrackerKerja.Tests/CompanyTimesheetExportServiceTests.cs`:
```csharp
using ClosedXML.Excel;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using Xunit;

namespace TrackerKerja.Tests;

public class CompanyTimesheetExportServiceTests
{
    private readonly AppDbContext _context;
    private readonly ClosedXmlCompanyTimesheetExportService _service;

    public CompanyTimesheetExportServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);

        // Seed Company, Users, Tasks, Sessions, Attendance
        var company = new Company { Id = 10, Name = "ELISTEC Corporation", Code = "ELISTEC" };
        _context.Companies.Add(company);

        var user = new AppUser { Id = "syafix", Email = "syafix@elistec.com", FullName = "Syafix Said", UserName = "Syafix", CompanyId = 10 };
        _context.Users.Add(user);

        var period = new TimesheetPeriod
        {
            Id = 1,
            CompanyId = 10,
            PeriodCode = "09/26",
            Name = "September 2026",
            StartDate = new DateOnly(2026, 9, 3),
            EndDate = new DateOnly(2026, 9, 7),
            WorkingDaysCount = 3
        };
        _context.TimesheetPeriods.Add(period);

        var project = new Project { Id = 1, Name = "Integrasi TCES TICS", CompanyId = 10 };
        _context.Projects.Add(project);

        var task = new WorkTask { Id = 836, Title = "Update Draft BRD (BA) - Update", ProjectId = 1, CompanyId = 10 };
        _context.Tasks.Add(task);

        // Friday 2026-09-04
        _context.Sessions.Add(new WorkSession
        {
            Id = 1,
            TaskId = 836,
            UserId = "syafix",
            StartTime = new DateTimeOffset(2026, 9, 4, 8, 0, 0, TimeSpan.FromHours(7)),
            EndTime = new DateTimeOffset(2026, 9, 4, 10, 0, 0, TimeSpan.FromHours(7)),
            Duration = 7200
        });

        // Attendance on 2026-09-04
        _context.Attendances.Add(new Attendance
        {
            UserId = "syafix",
            Date = new DateOnly(2026, 9, 4),
            ClockIn = new DateTimeOffset(2026, 9, 4, 8, 0, 0, TimeSpan.FromHours(7)),
            ClockOut = new DateTimeOffset(2026, 9, 4, 17, 10, 0, TimeSpan.FromHours(7)),
            WorkLocation = Domain.Enums.WorkLocation.WFO
        });

        _context.SaveChanges();

        _service = new ClosedXmlCompanyTimesheetExportService(_context);
    }

    [Fact]
    public async Task ExportUserTimesheet_ShouldGenerateValidExcel_WithMetadataAndFormulas()
    {
        var bytes = await _service.ExportUserTimesheetAsync(10, 1, "syafix");
        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(0);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        var ws = workbook.Worksheet(1);
        ws.Cell("B4").GetString().Should().Contain("3 DAYS");
        ws.Cell("B5").GetString().Should().Be("Syafix Said");

        // Verify task row on row 8
        ws.Cell("A8").GetString().Should().Be("TSK-0836");
        ws.Cell("C8").GetDouble().Should().Be(2.0);
        ws.Cell("D8").FormulaA1.Should().Be("IF(C8=\"\",\"\",C8/8)");

        // Verify weekend row (Saturday 2026-09-05) exists
        var foundWeekend = false;
        for (int r = 8; r <= ws.LastRowUsed().RowNumber(); r++)
        {
            if (ws.Cell(r, 2).GetString().Contains("Hari Libur Akhir Pekan (Sabtu)"))
            {
                foundWeekend = true;
                ws.Cell(r, 3).GetDouble().Should().Be(0.0);
                ws.Cell(r, 6).GetString().Should().Be("-");
                break;
            }
        }
        foundWeekend.Should().BeTrue();
    }

    [Fact]
    public async Task ExportBulkCompanyTimesheetsZip_ShouldProduceZipWithEntries()
    {
        var zipBytes = await _service.ExportBulkCompanyTimesheetsZipAsync(10, 1);
        zipBytes.Should().NotBeNull();
        zipBytes.Length.Should().BeGreaterThan(0);

        using var ms = new MemoryStream(zipBytes);
        using var archive = new System.IO.Compression.ZipArchive(ms);
        archive.Entries.Should().HaveCount(1);
        archive.Entries[0].Name.Should().Contain("Syafix Said");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "CompanyTimesheetExportServiceTests"
```
Expected: FAIL because `ClosedXmlCompanyTimesheetExportService` does not exist yet.

- [ ] **Step 3: Implement ICompanyTimesheetExportService & ClosedXmlCompanyTimesheetExportService**

Create `backend/src/TrackerKerja.Application/Common/Interfaces/ICompanyTimesheetExportService.cs`:
```csharp
namespace TrackerKerja.Application.Common.Interfaces;

public interface ICompanyTimesheetExportService
{
    Task<byte[]> ExportUserTimesheetAsync(int companyId, int periodId, string userId);
    Task<byte[]> ExportBulkCompanyTimesheetsZipAsync(int companyId, int periodId);
}
```

Create `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlCompanyTimesheetExportService.cs`:
Implement full logic:
- Load template (either `config.TemplateFilePath` or `uploads/templates/timesheet_elistec_default.xlsx`).
- Populate Header metadata (Title, Duration, Client Name, SOW, User Name).
- Generate dates from `period.StartDate` to `period.EndDate`.
- Query tasks, sessions, attendances.
- Populate data rows and weekends with thin borders and Calibri formatting.
- Set formulas `=IF(C{r}="","",C{r}/8)`.
- Set Total row with `=SUM(C8:C{lastRow})` and `=SUM(D8:D{lastRow})`.
- Reposition Resource and Mengetahui signature blocks.
- Implement Zip packing using `ZipArchive`.

Modify `backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs`:
Register `services.AddScoped<ICompanyTimesheetExportService, ClosedXmlCompanyTimesheetExportService>();`.

Modify `backend/src/TrackerKerja.WebApi/Controllers/TimesheetsController.cs`:
Inject `ICompanyTimesheetExportService` and add endpoint `GET export/company-template`.

- [ ] **Step 4: Run test to verify it passes**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj --filter "CompanyTimesheetExportServiceTests"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/TrackerKerja.Application/Common/Interfaces/ICompanyTimesheetExportService.cs backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlCompanyTimesheetExportService.cs backend/src/TrackerKerja.Infrastructure/DependencyInjection.cs backend/src/TrackerKerja.WebApi/Controllers/TimesheetsController.cs backend/tests/TrackerKerja.Tests/CompanyTimesheetExportServiceTests.cs
git commit -m "feat: implement ClosedXmlCompanyTimesheetExportService and bulk zip packaging"
```

---

### Task 6: Frontend Master Data UI for Template & Cut-Off Periods

**Files:**
- Modify: `frontend/src/app/(with-layouts)/configuration/page.tsx`
- Create: `frontend/src/components/configuration/timesheet-template-manager.tsx`

**Interfaces:**
- Consumes:
  - `GET/POST/PUT/DELETE /api/companies/{companyId}/timesheet-periods`
  - `GET/PUT /api/companies/{companyId}/timesheet-config`
  - `POST /api/companies/{companyId}/timesheet-config/upload-template`
  - `POST /api/companies/{companyId}/timesheet-config/reset-default`
- Produces:
  - Master Data Subtab **"Template & Periode Timesheet"**
  - Panel Kalender Periode Cut-off (CRUD Modal, toggle status)
  - Panel Konfigurasi Metadata Dokumen & Upload File .xlsx fisik
  - Dynamic Column Mapper Editor (Urutan kolom, Label, Source Field, Add/Delete Column)

- [ ] **Step 1: Create timesheet-template-manager.tsx component**

Build component with:
- Sub-tab header / switcher if needed or dual panel layout.
- Periods Table with "Tambah Periode Baru" modal.
- Config Form with Client Name, SOW No, Approver, Weekend toggle.
- Column Mapping drag/order/edit table with preset buttons.
- File upload input for `.xlsx` template.

- [ ] **Step 2: Integrate into configuration/page.tsx**

Add `"timesheet"` to `masterSubTab` state:
`type MasterSubTab = "companies" | "priorities" | "statuses" | "milestones" | "categories" | "timesheet";`
Render `TimesheetTemplateManager` when `masterSubTab === "timesheet"`.

- [ ] **Step 3: Run TypeScript build check on frontend**

Run:
```powershell
cd frontend; npm run build
```
Expected: Build succeeds without TypeScript or bundling errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/configuration/timesheet-template-manager.tsx frontend/src/app/\(with-layouts\)/configuration/page.tsx
git commit -m "feat: add frontend timesheet template and cut-off period manager in configuration"
```

---

### Task 7: Frontend Timesheet Export Dialog on /timesheets

**Files:**
- Create: `frontend/src/components/timesheets/company-timesheet-export-modal.tsx`
- Modify: `frontend/src/app/(with-layouts)/timesheets/page.tsx`

**Interfaces:**
- Produces:
  - Tombol **"Ekspor Standar ELISTEC"** di samping tombol ekspor lama di `/timesheets`.
  - Modal Dialog dengan:
    - Dropdown Pilih Perusahaan (Default: Company aktif)
    - Dropdown Pilih Periode Cut-Off (diambil dari API periods)
    - Dropdown Pilih Pengguna (Pilih Pengguna Individual atau "Semua Anggota Tim (Bulk ZIP)")
    - Tombol Download dengan progress status loading dan toast notification.

- [ ] **Step 1: Implement company-timesheet-export-modal.tsx**

Build component with React Query queries for companies, periods, and users, handling single `.xlsx` and bulk `.zip` download blobs.

- [ ] **Step 2: Add modal trigger button to timesheets/page.tsx**

Add button with `FileSpreadsheet` icon: "Ekspor Standar Perusahaan".

- [ ] **Step 3: Run TypeScript build check on frontend**

Run:
```powershell
cd frontend; npm run build
```
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/timesheets/company-timesheet-export-modal.tsx frontend/src/app/\(with-layouts\)/timesheets/page.tsx
git commit -m "feat: integrate ELISTEC company timesheet export modal on timesheets page"
```

---

### Task 8: End-to-End Verification & Real Excel Output Test

**Files:**
- Test: Full backend test suite `dotnet test`
- Verification script: Test output generated file against actual template columns using openpyxl.

- [ ] **Step 1: Run full backend test suite**

Run:
```powershell
dotnet test backend/tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj
```
Expected: All tests PASS.

- [ ] **Step 2: Run verification script to generate sample ELISTEC export and inspect with openpyxl**

Run Python script to verify columns, formula calculations (`IF(C8="","",C8/8)`), and signature positioning.

- [ ] **Step 3: Final Git Commit and Review**

```bash
git status
git commit -am "chore: verify end-to-end ELISTEC company timesheet export module"
```

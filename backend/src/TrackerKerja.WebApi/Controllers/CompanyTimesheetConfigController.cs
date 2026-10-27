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

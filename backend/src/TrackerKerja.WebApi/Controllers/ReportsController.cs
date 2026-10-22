using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;

namespace TrackerKerja.WebApi.Controllers;

/// <summary>
/// Modul pelaporan: timesheet &amp; tugas (grouping Project → Milestone) serta achievement anggota.
/// Administrator melihat seluruh data perusahaan; user biasa hanya melihat data miliknya.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private const string XlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private readonly IReportService _reportService;
    private readonly ICurrentTenantService _tenantService;

    public ReportsController(IReportService reportService, ICurrentTenantService tenantService)
    {
        _reportService = reportService;
        _tenantService = tenantService;
    }

    private string CurrentUserId => _tenantService.UserId ?? string.Empty;

    private bool IsAdmin =>
        _tenantService.IsAdmin || (User?.Identity?.IsAuthenticated == true && User.IsInRole("Administrator"));

    [HttpGet("filters")]
    public async Task<IActionResult> GetFilters(CancellationToken ct)
    {
        var data = await _reportService.GetFilterOptionsAsync(_tenantService.CompanyId, CurrentUserId, IsAdmin, ct);
        return Ok(new { success = true, isAdmin = IsAdmin, data });
    }

    [HttpGet("timesheet")]
    public async Task<IActionResult> GetTimesheetReport(
        [FromQuery] DateTimeOffset? startDate, [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? projectId, [FromQuery] string? milestone, [FromQuery] string? userId,
        CancellationToken ct)
    {
        var filter = new ReportFilter(startDate, endDate, projectId, milestone, userId);
        var data = await _reportService.GetTimesheetReportAsync(filter, _tenantService.CompanyId, CurrentUserId, IsAdmin, ct);
        return Ok(new { success = true, data });
    }

    [HttpGet("tasks")]
    public async Task<IActionResult> GetTaskReport(
        [FromQuery] DateTimeOffset? startDate, [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? projectId, [FromQuery] string? milestone, [FromQuery] string? userId,
        CancellationToken ct)
    {
        var filter = new ReportFilter(startDate, endDate, projectId, milestone, userId);
        var data = await _reportService.GetTaskReportAsync(filter, _tenantService.CompanyId, CurrentUserId, IsAdmin, ct);
        return Ok(new { success = true, data });
    }

    [HttpGet("members")]
    public async Task<IActionResult> GetMemberReport(
        [FromQuery] DateTimeOffset? startDate, [FromQuery] DateTimeOffset? endDate,
        [FromQuery] int? projectId, [FromQuery] string? milestone, [FromQuery] string? userId,
        CancellationToken ct)
    {
        var filter = new ReportFilter(startDate, endDate, projectId, milestone, userId);
        var data = await _reportService.GetMemberReportAsync(filter, _tenantService.CompanyId, CurrentUserId, IsAdmin, ct);
        return Ok(new { success = true, data });
    }

    /// <param name="type">timesheet | tasks | members</param>
    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] string type = "timesheet",
        [FromQuery] DateTimeOffset? startDate = null, [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] int? projectId = null, [FromQuery] string? milestone = null, [FromQuery] string? userId = null,
        CancellationToken ct = default)
    {
        var normalized = type.ToLowerInvariant();
        if (normalized is not ("timesheet" or "tasks" or "members"))
        {
            return BadRequest(new { success = false, message = "Tipe laporan tidak valid. Gunakan: timesheet, tasks, members." });
        }

        var filter = new ReportFilter(startDate, endDate, projectId, milestone, userId);
        var bytes = await _reportService.ExportExcelAsync(normalized, filter, _tenantService.CompanyId, CurrentUserId, IsAdmin, ct);
        return File(bytes, XlsxMime, $"Laporan_{normalized}_{DateTimeOffset.UtcNow:yyyyMMdd_HHmmss}.xlsx");
    }
}

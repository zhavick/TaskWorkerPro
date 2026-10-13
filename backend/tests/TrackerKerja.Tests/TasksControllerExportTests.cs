using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class TasksControllerExportTests
{
    [Fact]
    public async Task ExportTasks_ReturnsFileResult_WithCorrectContentType()
    {
        var fakeExportService = new FakeExportService(new byte[] { 0x50, 0x4B, 0x03, 0x04 });
        var fakeTenantService = new FakeTenantService(1);

        var controller = new TasksController(
            null!, // context
            fakeTenantService,
            null!, // taskImportService
            fakeExportService);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "user-123"),
            new Claim(ClaimTypes.Role, "Administrator")
        }, "mock"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var filter = new TaskExportFilterDto { Format = "arms" };
        var result = await controller.ExportTasks(filter, CancellationToken.None);

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileResult.ContentType);
        Assert.Contains("Laporan_ARMS_Enterprise", fileResult.FileDownloadName);
        Assert.Contains(".xlsx", fileResult.FileDownloadName);
    }

    private class FakeExportService : IExcelExportService
    {
        private readonly byte[] _bytes;
        public FakeExportService(byte[] bytes) => _bytes = bytes;

        public Task<byte[]> GenerateTimesheetExcelAsync(TimesheetExportFilter filter, int? companyId)
            => Task.FromResult(_bytes);

        public Task<byte[]> GenerateTasksExcelAsync(
            TaskExportFilterDto filter,
            int? companyId,
            string currentUserId,
            bool isAdmin,
            CancellationToken cancellationToken = default)
            => Task.FromResult(_bytes);
    }

    private class FakeTenantService : ICurrentTenantService
    {
        public FakeTenantService(int? companyId) => CompanyId = companyId;
        public int? CompanyId { get; }
        public string? CompanyCode => "TEST";
        public string? UserId => "user-123";
        public bool IsAdmin => true;
    }
}

using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System.Text;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class NewEnterpriseModulesTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _adminTenantService;
    private readonly FakeTenantService _pmTenantService;
    private readonly FakeTenantService _staffTenantService;
    private readonly FakeWebHostEnvironment _env;
    private readonly string _testTempDir;

    public NewEnterpriseModulesTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _adminTenantService = new FakeTenantService(1, "WCH", "usr-admin", true, false);
        _pmTenantService = new FakeTenantService(1, "WCH", "usr-pm", false, true);
        _staffTenantService = new FakeTenantService(1, "WCH", "usr-staff", false, false);

        _context = new AppDbContext(options, _adminTenantService);

        _testTempDir = Path.Combine(Path.GetTempPath(), "TrackerKerjaTest_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_testTempDir);
        _env = new FakeWebHostEnvironment { ContentRootPath = _testTempDir };

        // Seed Company
        var company = new Company { Id = 1, Name = "Wahana Central Holding", Code = "WCH" };
        var otherCompany = new Company { Id = 2, Name = "Other Corp", Code = "OTH" };
        _context.Companies.AddRange(company, otherCompany);

        // Seed Users
        var adminUser = new AppUser { Id = "usr-admin", FullName = "System Admin", Email = "admin@trackerkerja.local", CompanyId = 1, IsApproved = true };
        var pmUser = new AppUser { Id = "usr-pm", FullName = "Project Manager 1", Email = "pm@trackerkerja.local", CompanyId = 1, IsApproved = true };
        var staffUser = new AppUser { Id = "usr-staff", FullName = "Staff User 1", Email = "staff@trackerkerja.local", CompanyId = 1, IsApproved = true };
        _context.Users.AddRange(adminUser, pmUser, staffUser);

        // Seed Project
        var project = new Project
        {
            Id = 101,
            Name = "Core Banking Revamp",
            CompanyId = 1,
            ProjectManagerId = "usr-pm",
            Budget = 100000000,
            ActualCost = 25000000
        };
        _context.Projects.Add(project);

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
        if (Directory.Exists(_testTempDir))
        {
            try { Directory.Delete(_testTempDir, true); } catch { }
        }
    }

    // ==========================================
    // 1. ISSUES TICKETING SYSTEM TESTS
    // ==========================================

    [Fact]
    public async Task CreateIssue_WithValidData_ShouldCreateTicketAndReturnCode()
    {
        var controller = new IssuesController(_context, _staffTenantService);

        var request = new CreateIssueTicketRequest(
            "Database Connection Timeout",
            "Koneksi ke db timeout saat traffic tinggi",
            IssuePriority.High,
            "Incident",
            1,
            101,
            "usr-pm"
        );

        var result = await controller.CreateIssue(request) as OkObjectResult;
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var issue = await _context.IssueTickets.FirstOrDefaultAsync(i => i.Title == "Database Connection Timeout");
        issue.Should().NotBeNull();
        issue!.TicketCode.Should().StartWith("TCK-");
        issue.Status.Should().Be(IssueStatus.Open);
        issue.Priority.Should().Be(IssuePriority.High);
        issue.ReportedByUserId.Should().Be("usr-staff");
        issue.AssignedToUserId.Should().Be("usr-pm");
    }

    [Fact]
    public async Task GetIssues_FilteredByCompanyAndStatus_ShouldReturnMatchingTickets()
    {
        _context.IssueTickets.AddRange(
            new IssueTicket { TicketCode = "TCK-2026-0001", Title = "Bug A", CompanyId = 1, Status = IssueStatus.Open, Priority = IssuePriority.Low, ReportedByUserId = "usr-staff" },
            new IssueTicket { TicketCode = "TCK-2026-0002", Title = "Bug B", CompanyId = 1, Status = IssueStatus.Resolved, Priority = IssuePriority.High, ReportedByUserId = "usr-staff" },
            new IssueTicket { TicketCode = "TCK-2026-0003", Title = "Bug C", CompanyId = 2, Status = IssueStatus.Open, Priority = IssuePriority.Medium, ReportedByUserId = "usr-staff" }
        );
        await _context.SaveChangesAsync();

        var controller = new IssuesController(_context, _staffTenantService);

        var result = await controller.GetIssues(status: IssueStatus.Open) as OkObjectResult;
        result.Should().NotBeNull();

        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<IssueTicketDto>;
        data.Should().NotBeNull();
        data!.Should().HaveCount(1);
        data[0].Title.Should().Be("Bug A");
    }

    [Fact]
    public async Task UpdateIssue_StatusResolved_ShouldSetResolvedAt()
    {
        var ticket = new IssueTicket
        {
            TicketCode = "TCK-2026-0010",
            Title = "UI Button Misaligned",
            CompanyId = 1,
            Status = IssueStatus.Open,
            Priority = IssuePriority.Low,
            ReportedByUserId = "usr-staff"
        };
        _context.IssueTickets.Add(ticket);
        await _context.SaveChangesAsync();

        var controller = new IssuesController(_context, _pmTenantService);

        var updateReq = new UpdateIssueTicketRequest(
            "UI Button Misaligned",
            "Fixed in PR #42",
            IssueStatus.Resolved,
            IssuePriority.Low,
            "Bug",
            null,
            "usr-pm"
        );

        var result = await controller.UpdateIssue(ticket.Id, updateReq) as OkObjectResult;
        result.Should().NotBeNull();

        var updated = await _context.IssueTickets.FindAsync(ticket.Id);
        updated!.Status.Should().Be(IssueStatus.Resolved);
        updated.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task AddComment_ToIssue_ShouldAddCommentAndReturnDto()
    {
        var ticket = new IssueTicket
        {
            TicketCode = "TCK-2026-0020",
            Title = "Memory Leak in Worker",
            CompanyId = 1,
            Status = IssueStatus.Open,
            ReportedByUserId = "usr-staff"
        };
        _context.IssueTickets.Add(ticket);
        await _context.SaveChangesAsync();

        var controller = new IssuesController(_context, _pmTenantService);

        var commentResult = await controller.AddComment(ticket.Id, new CreateIssueCommentRequest("Sedang diinvestigasi di log worker.")) as OkObjectResult;
        commentResult.Should().NotBeNull();

        var comments = await _context.IssueTicketComments.Where(c => c.TicketId == ticket.Id).ToListAsync();
        comments.Should().HaveCount(1);
        comments[0].Message.Should().Be("Sedang diinvestigasi di log worker.");
        comments[0].UserId.Should().Be("usr-pm");
    }

    [Fact]
    public async Task DeleteIssue_ByReporter_ShouldSucceed()
    {
        var ticket = new IssueTicket
        {
            TicketCode = "TCK-2026-0030",
            Title = "Duplicate Ticket",
            CompanyId = 1,
            Status = IssueStatus.Open,
            ReportedByUserId = "usr-staff"
        };
        _context.IssueTickets.Add(ticket);
        await _context.SaveChangesAsync();

        var controller = new IssuesController(_context, _staffTenantService);

        var delResult = await controller.DeleteIssue(ticket.Id) as OkObjectResult;
        delResult.Should().NotBeNull();

        var exists = await _context.IssueTickets.AnyAsync(i => i.Id == ticket.Id);
        exists.Should().BeFalse();
    }

    // ==========================================
    // 2. INVOICE MANAGEMENT TESTS
    // ==========================================

    [Fact]
    public async Task CreateInvoice_WithLineItems_ShouldCalculateSubtotalTaxAndTotal()
    {
        var controller = new InvoicesController(_context, _pmTenantService);

        var request = new CreateInvoiceRequest(
            null, // auto generate
            1,
            101,
            "PT Bank Sentosa",
            "finance@sentosa.co.id",
            "Jl. Sudirman Kav 20, Jakarta",
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddDays(30),
            11.0m, // PPN 11%
            1000000m, // Diskon Rp 1.000.000
            "Transfer ke rekening BCA",
            new List<CreateInvoiceItemRequest>
            {
                new CreateInvoiceItemRequest("Modul Otentikasi & SSO", 1, 20000000m),
                new CreateInvoiceItemRequest("Setup Server Deployment", 2, 5000000m) // 10 jt
            }
        );

        var result = await controller.CreateInvoice(request) as OkObjectResult;
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var inv = await _context.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.ClientName == "PT Bank Sentosa");
        inv.Should().NotBeNull();
        inv!.InvoiceNumber.Should().StartWith("INV-");
        inv.SubTotal.Should().Be(30000000m); // 20m + 10m
        inv.TaxAmount.Should().Be(3300000m); // 11% of 30m
        inv.DiscountAmount.Should().Be(1000000m);
        inv.TotalAmount.Should().Be(32300000m); // 30m + 3.3m - 1m
        inv.Items.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetInvoices_AndSummary_ShouldReturnCorrectMetrics()
    {
        _context.Invoices.AddRange(
            new Invoice { InvoiceNumber = "INV-001", CompanyId = 1, ClientName = "Client A", SubTotal = 10000000, TotalAmount = 11100000, Status = InvoiceStatus.Paid, CreatedByUserId = "usr-pm" },
            new Invoice { InvoiceNumber = "INV-002", CompanyId = 1, ClientName = "Client B", SubTotal = 5000000, TotalAmount = 5550000, Status = InvoiceStatus.Sent, CreatedByUserId = "usr-pm" },
            new Invoice { InvoiceNumber = "INV-003", CompanyId = 1, ClientName = "Client C", SubTotal = 4000000, TotalAmount = 4440000, Status = InvoiceStatus.Overdue, CreatedByUserId = "usr-pm" }
        );
        await _context.SaveChangesAsync();

        var controller = new InvoicesController(_context, _pmTenantService);

        var summaryRes = await controller.GetSummary() as OkObjectResult;
        summaryRes.Should().NotBeNull();

        var data = summaryRes!.Value;
        var totalAmount = (decimal)data!.GetType().GetProperty("data")!.GetValue(data)!.GetType().GetProperty("totalAmount")!.GetValue(data.GetType().GetProperty("data")!.GetValue(data))!;
        var paidAmount = (decimal)data.GetType().GetProperty("data")!.GetValue(data)!.GetType().GetProperty("paidAmount")!.GetValue(data.GetType().GetProperty("data")!.GetValue(data))!;

        totalAmount.Should().Be(21090000m);
        paidAmount.Should().Be(11100000m);
    }

    [Fact]
    public async Task UpdateInvoiceStatus_ToPaid_ShouldSetPaidAt()
    {
        var inv = new Invoice
        {
            InvoiceNumber = "INV-005",
            CompanyId = 1,
            ClientName = "Client Pay",
            SubTotal = 10000000,
            TotalAmount = 11000000,
            Status = InvoiceStatus.Sent,
            CreatedByUserId = "usr-pm"
        };
        _context.Invoices.Add(inv);
        await _context.SaveChangesAsync();

        var controller = new InvoicesController(_context, _pmTenantService);

        var updateRes = await controller.UpdateInvoiceStatus(inv.Id, new UpdateInvoiceStatusRequest(InvoiceStatus.Paid)) as OkObjectResult;
        updateRes.Should().NotBeNull();

        var updated = await _context.Invoices.FindAsync(inv.Id);
        updated!.Status.Should().Be(InvoiceStatus.Paid);
        updated.PaidAt.Should().NotBeNull();
    }

    // ==========================================
    // 3. DOCUMENT MANAGEMENT SYSTEM (DMS) TESTS
    // ==========================================

    [Fact]
    public async Task UploadDocument_ValidFile_ShouldSaveFileAndRecord()
    {
        var controller = new DocumentsController(_context, _pmTenantService, _env);

        var fileContent = "Ini adalah konten dokumen SOP Standar Operasional Prosedur 2026";
        var fileBytes = Encoding.UTF8.GetBytes(fileContent);
        var stream = new MemoryStream(fileBytes);
        var formFile = new FormFile(stream, 0, fileBytes.Length, "file", "sop_keamanan_2026.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        var result = await controller.UploadDocument(
            formFile,
            "SOP Keamanan Sistem",
            "Standar keamanan akses server",
            "SOP",
            1,
            101
        ) as OkObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        var doc = await _context.Documents.FirstOrDefaultAsync(d => d.Title == "SOP Keamanan Sistem");
        doc.Should().NotBeNull();
        doc!.Category.Should().Be("SOP");
        doc.FileSize.Should().Be(fileBytes.Length);
        doc.ContentType.Should().Be("application/pdf");
        doc.CompanyId.Should().Be(1);
        doc.ProjectId.Should().Be(101);
        File.Exists(doc.FileStoragePath).Should().BeTrue();
    }

    [Fact]
    public async Task GetDocuments_FilteredByCategory_ShouldReturnMatching()
    {
        _context.Documents.AddRange(
            new CompanyDocument { Title = "Doc 1", FileName = "sop.pdf", FileStoragePath = "/tmp/1", Category = "SOP", CompanyId = 1, UploadedByUserId = "usr-pm" },
            new CompanyDocument { Title = "Doc 2", FileName = "kontrak.pdf", FileStoragePath = "/tmp/2", Category = "Kontrak", CompanyId = 1, UploadedByUserId = "usr-pm" }
        );
        await _context.SaveChangesAsync();

        var controller = new DocumentsController(_context, _pmTenantService, _env);

        var result = await controller.GetDocuments(category: "SOP") as OkObjectResult;
        result.Should().NotBeNull();

        var data = result!.Value?.GetType().GetProperty("data")?.GetValue(result.Value) as List<CompanyDocumentDto>;
        data.Should().NotBeNull();
        data!.Should().HaveCount(1);
        data[0].Title.Should().Be("Doc 1");
    }

    [Fact]
    public async Task DownloadDocument_ExistingFile_ShouldReturnFileResult()
    {
        var dummyPath = Path.Combine(_testTempDir, "test_download.pdf");
        await File.WriteAllTextAsync(dummyPath, "PDF dummy content");

        var doc = new CompanyDocument
        {
            Title = "Download Test Doc",
            FileName = "test_download.pdf",
            FileStoragePath = dummyPath,
            ContentType = "application/pdf",
            Category = "Laporan",
            CompanyId = 1,
            UploadedByUserId = "usr-pm"
        };
        _context.Documents.Add(doc);
        await _context.SaveChangesAsync();

        var controller = new DocumentsController(_context, _pmTenantService, _env);

        var fileResult = await controller.DownloadDocument(doc.Id) as FileContentResult;
        fileResult.Should().NotBeNull();
        fileResult!.ContentType.Should().Be("application/pdf");
        fileResult.FileDownloadName.Should().Be("test_download.pdf");
        Encoding.UTF8.GetString(fileResult.FileContents).Should().Be("PDF dummy content");
    }

    [Fact]
    public async Task PreviewDocument_ExistingFile_ShouldReturnInlineFileResult()
    {
        var dummyPath = Path.Combine(_testTempDir, "test_preview.png");
        await File.WriteAllBytesAsync(dummyPath, new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });

        var doc = new CompanyDocument
        {
            Title = "Preview Test Image",
            FileName = "test_preview.png",
            FileStoragePath = dummyPath,
            ContentType = "image/png",
            Category = "Desain",
            CompanyId = 1,
            UploadedByUserId = "usr-pm"
        };
        _context.Documents.Add(doc);
        await _context.SaveChangesAsync();

        var controller = new DocumentsController(_context, _pmTenantService, _env);

        var fileResult = await controller.PreviewDocument(doc.Id) as FileContentResult;
        fileResult.Should().NotBeNull();
        fileResult!.ContentType.Should().Be("image/png");
        fileResult.FileDownloadName.Should().BeNullOrEmpty();
        fileResult.FileContents.Length.Should().Be(8);
    }

    [Fact]
    public async Task DeleteDocument_ShouldRemovePhysicalFileAndRecord()
    {
        var dummyPath = Path.Combine(_testTempDir, "to_delete.txt");
        await File.WriteAllTextAsync(dummyPath, "akan dihapus");

        var doc = new CompanyDocument
        {
            Title = "Hapus Berkas",
            FileName = "to_delete.txt",
            FileStoragePath = dummyPath,
            ContentType = "text/plain",
            Category = "Umum",
            CompanyId = 1,
            UploadedByUserId = "usr-pm"
        };
        _context.Documents.Add(doc);
        await _context.SaveChangesAsync();

        var controller = new DocumentsController(_context, _pmTenantService, _env);

        var delResult = await controller.DeleteDocument(doc.Id) as OkObjectResult;
        delResult.Should().NotBeNull();

        var exists = await _context.Documents.AnyAsync(d => d.Id == doc.Id);
        exists.Should().BeFalse();
        File.Exists(dummyPath).Should().BeFalse();
    }

    [Fact]
    public async Task GetModuleMatrix_And_UpdateCompanyModules_WorksCorrectly()
    {
        var controller = new CompaniesController(_context, _adminTenantService);

        // Get initial matrix
        var matrixResult = await controller.GetModuleMatrix() as OkObjectResult;
        matrixResult.Should().NotBeNull();
        var items = matrixResult!.Value?.GetType().GetProperty("data")?.GetValue(matrixResult.Value) as List<CompanyModuleMatrixDto>;
        items.Should().NotBeNull();
        items!.Should().HaveCount(2);

        // Update company 1 modules (disable ticketing and invoicing)
        var updateRequest = new UpdateCompanyModulesRequest(
            EnableDms: true,
            EnableTicketing: false,
            EnableInvoicing: false
        );

        var updateResult = await controller.UpdateCompanyModules(1, updateRequest) as OkObjectResult;
        updateResult.Should().NotBeNull();

        var updatedCompany = await _context.Companies.FindAsync(1);
        updatedCompany.Should().NotBeNull();
        updatedCompany!.EnableDms.Should().BeTrue();
        updatedCompany.EnableTicketing.Should().BeFalse();
        updatedCompany.EnableInvoicing.Should().BeFalse();
    }

    [Fact]
    public async Task CreateIssue_WhenTicketingDisabled_Returns403Forbidden()
    {
        var company = await _context.Companies.FindAsync(1);
        company!.EnableTicketing = false;
        await _context.SaveChangesAsync();

        var controller = new IssuesController(_context, _pmTenantService);
        var request = new CreateIssueTicketRequest(
            "Bug Ticket Saat Modul Disabled",
            "Deskripsi",
            IssuePriority.High,
            "Bug",
            1,
            101,
            "usr-pm"
        );

        var result = await controller.CreateIssue(request) as ObjectResult;
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(StatusCodes.Status403Forbidden);

        // Restore
        company.EnableTicketing = true;
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateInvoice_WhenInvoicingDisabled_Returns403Forbidden()
    {
        var company = await _context.Companies.FindAsync(1);
        company!.EnableInvoicing = false;
        await _context.SaveChangesAsync();

        var controller = new InvoicesController(_context, _pmTenantService);
        var request = new CreateInvoiceRequest(
            null,
            1,
            101,
            "PT Klien",
            "client@test.com",
            "Jakarta",
            DateTimeOffset.UtcNow,
            DateTimeOffset.UtcNow.AddDays(14),
            11.0m,
            0m,
            "Catatan",
            new List<CreateInvoiceItemRequest> { new CreateInvoiceItemRequest("Item 1", 1, 5000000m) }
        );

        var result = await controller.CreateInvoice(request) as ObjectResult;
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(StatusCodes.Status403Forbidden);

        // Restore
        company.EnableInvoicing = true;
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task UploadDocument_WhenDmsDisabled_Returns403Forbidden()
    {
        var company = await _context.Companies.FindAsync(1);
        company!.EnableDms = false;
        await _context.SaveChangesAsync();

        var controller = new DocumentsController(_context, _pmTenantService, _env);
        var bytes = Encoding.UTF8.GetBytes("Konten tes");
        using var stream = new MemoryStream(bytes);
        var mockFormFile = new FormFile(stream, 0, bytes.Length, "file", "test_disabled.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        var result = await controller.UploadDocument(
            mockFormFile,
            "Dokumen Saat Disabled",
            "Deskripsi",
            "Kontrak",
            1,
            101
        ) as ObjectResult;
        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(StatusCodes.Status403Forbidden);

        // Restore
        company.EnableDms = true;
        await _context.SaveChangesAsync();
    }

    // Helper fake classes
    private class FakeTenantService : ICurrentTenantService
    {
        public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin, bool isProjectManager)
        {
            CompanyId = companyId;
            CompanyCode = companyCode;
            UserId = userId;
            IsAdmin = isAdmin;
            IsProjectManager = isProjectManager;
        }

        public int? CompanyId { get; }
        public string? CompanyCode { get; }
        public string? UserId { get; }
        public bool IsAdmin { get; }
        public bool IsProjectManager { get; }
        public bool IsPurgeAdmin => IsAdmin;
    }

    private class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Directory.GetCurrentDirectory();
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ApplicationName { get; set; } = "TrackerKerja.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; } = Directory.GetCurrentDirectory();
        public string EnvironmentName { get; set; } = "Development";
    }
}


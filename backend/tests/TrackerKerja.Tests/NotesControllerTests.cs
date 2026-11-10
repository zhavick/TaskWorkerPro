using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class NotesControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly string _tempUploadDir;
    private readonly FakeWebHostEnv _env;

    public NotesControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantService = new FakeTenantService(companyId: 2, companyCode: "CABANG", userId: "usr-cabang", isAdmin: false);
        _context = new AppDbContext(options, tenantService);

        _tempUploadDir = Path.Combine(Path.GetTempPath(), "TrackerKerjaNotesTests_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempUploadDir);

        _env = new FakeWebHostEnv(_tempUploadDir);
    }

    public void Dispose()
    {
        _context.Dispose();
        if (Directory.Exists(_tempUploadDir))
        {
            try { Directory.Delete(_tempUploadDir, recursive: true); } catch { /* ignore */ }
        }
    }

    [Fact]
    public async Task GetNotes_WhenUserIsFromChildCompany_ShouldSeeGlobalSOPsAndCompanyNotes()
    {
        // Arrange
        // Note 1: SOP Teknis Global (CompanyId = null)
        _context.Notes.Add(new WorkNote
        {
            Id = 1,
            Title = "SOP Keamanan Sistem & Jaringan",
            ContentHtml = "<p>Standard Operating Procedure Jaringan</p>",
            Category = "SOP",
            CompanyId = null
        });

        // Note 2: SOP Teknis Perusahaan Induk (CompanyId = 1)
        _context.Notes.Add(new WorkNote
        {
            Id = 2,
            Title = "SOP Backup & Recovery Induk",
            ContentHtml = "<p>Prosedur pemulihan bencana</p>",
            Category = "SOP",
            CompanyId = 1
        });

        // Note 3: Catatan Khusus Perusahaan Cabang (CompanyId = 2)
        _context.Notes.Add(new WorkNote
        {
            Id = 3,
            Title = "Catatan Operasional Cabang",
            ContentHtml = "<p>Inventaris cabang</p>",
            Category = "General",
            CompanyId = 2
        });

        // Note 4: Catatan Rahasia Perusahaan Lain (Bukan SOP, CompanyId = 99)
        _context.Notes.Add(new WorkNote
        {
            Id = 4,
            Title = "Catatan Privat Perusahaan Lain",
            ContentHtml = "<p>Rahasia</p>",
            Category = "General",
            CompanyId = 99
        });

        await _context.SaveChangesAsync();

        // User dari Company 2 (Cabang)
        var tenantCabang = new FakeTenantService(companyId: 2, companyCode: "CABANG", userId: "usr-cabang", isAdmin: false);
        var controller = new NotesController(_context, tenantCabang, _env);

        // Act
        var actionResult = await controller.GetNotes();
        var okResult = actionResult as OkObjectResult;

        // Assert
        Assert.NotNull(okResult);
        var dataProperty = okResult.Value?.GetType().GetProperty("data")?.GetValue(okResult.Value) as IEnumerable<dynamic>;
        Assert.NotNull(dataProperty);

        var titles = dataProperty.Select(x => (string)x.Title).ToList();

        // Global SOP (CompanyId = null) dan SOP Induk (Category = SOP) serta catatan Cabang harus terlihat
        Assert.Contains("SOP Keamanan Sistem & Jaringan", titles);
        Assert.Contains("SOP Backup & Recovery Induk", titles);
        Assert.Contains("Catatan Operasional Cabang", titles);

        // Catatan non-SOP dari perusahaan lain tidak boleh terlihat
        Assert.DoesNotContain("Catatan Privat Perusahaan Lain", titles);
    }

    [Fact]
    public async Task DownloadAttachment_WithTimestampedFileOnDisk_ShouldSuccessfullyServeFile()
    {
        // Arrange
        var note = new WorkNote
        {
            Id = 50,
            Title = "Dokumentasi Arsitektur Database",
            Category = "SOP",
            CompanyId = 2
        };
        _context.Notes.Add(note);

        var sanitizedFileName = "20261105_180000_skema_database.pdf";
        var noteDir = Path.Combine(_tempUploadDir, "uploads", "notes", note.Id.ToString());
        Directory.CreateDirectory(noteDir);
        var filePath = Path.Combine(noteDir, sanitizedFileName);
        await File.WriteAllTextAsync(filePath, "PDF_CONTENT_DATABASE_SCHEMA");

        var attachment = new NoteAttachment
        {
            Id = 101,
            NoteId = note.Id,
            FileName = "skema_database.pdf",
            FilePath = $"/uploads/notes/{note.Id}/{sanitizedFileName}",
            ContentType = "application/pdf",
            FileSize = 1024
        };
        _context.NoteAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        var tenant = new FakeTenantService(companyId: 2, companyCode: "CABANG", userId: "usr-cabang", isAdmin: false);
        var controller = new NotesController(_context, tenant, _env);

        // Act
        var result = await controller.DownloadAttachment(attachment.Id);

        // Assert
        var fileResult = result as FileStreamResult;
        Assert.NotNull(fileResult);
        Assert.Equal("application/pdf", fileResult.ContentType);
        Assert.Equal("skema_database.pdf", fileResult.FileDownloadName);

        using var ms = new MemoryStream();
        await fileResult.FileStream.CopyToAsync(ms);
        var content = System.Text.Encoding.UTF8.GetString(ms.ToArray());
        Assert.Equal("PDF_CONTENT_DATABASE_SCHEMA", content);
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

    private class FakeWebHostEnv : IWebHostEnvironment
    {
        public FakeWebHostEnv(string contentRoot)
        {
            ContentRootPath = contentRoot;
            WebRootPath = Path.Combine(contentRoot, "wwwroot");
        }

        public string EnvironmentName { get; set; } = "Testing";
        public string ApplicationName { get; set; } = "TrackerKerja.Tests";
        public string WebRootPath { get; set; }
        public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = null!;
        public string ContentRootPath { get; set; }
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}


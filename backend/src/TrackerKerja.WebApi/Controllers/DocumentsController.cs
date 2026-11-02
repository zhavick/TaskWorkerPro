using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly IWebHostEnvironment _environment;

    public DocumentsController(AppDbContext context, ICurrentTenantService tenantService, IWebHostEnvironment environment)
    {
        _context = context;
        _tenantService = tenantService;
        _environment = environment;
    }

    private async Task<int?> GetUserCompanyIdAsync()
    {
        if (_tenantService.CompanyId.HasValue) return _tenantService.CompanyId.Value;
        if (!string.IsNullOrEmpty(_tenantService.UserId))
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == _tenantService.UserId);
            return user?.CompanyId;
        }
        return null;
    }

    [HttpGet]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] int? companyId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null)
    {
        var userCompanyId = await GetUserCompanyIdAsync();
        var query = _context.Documents
            .Include(d => d.Company)
            .Include(d => d.Project)
            .Include(d => d.UploadedByUser)
            .AsNoTracking()
            .AsQueryable();

        if (!_tenantService.IsAdmin && userCompanyId.HasValue)
        {
            query = query.Where(d => d.CompanyId == userCompanyId.Value);
        }
        else if (companyId.HasValue)
        {
            query = query.Where(d => d.CompanyId == companyId.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(d => d.ProjectId == projectId.Value);
        }

        if (!string.IsNullOrWhiteSpace(category) && category != "all")
        {
            query = query.Where(d => d.Category == category.Trim());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d => d.Title.ToLower().Contains(s) || 
                                     d.FileName.ToLower().Contains(s) || 
                                     (d.Description != null && d.Description.ToLower().Contains(s)));
        }

        var docs = await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var dtos = docs.Select(d => new CompanyDocumentDto(
            d.Id,
            d.Title,
            d.Description,
            d.FileName,
            d.FileSize,
            d.ContentType,
            d.Category,
            d.CompanyId,
            d.Company?.Name,
            d.ProjectId,
            d.Project?.Name,
            d.UploadedByUserId,
            d.UploadedByUser?.FullName,
            d.CreatedAt
        )).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument(
        [FromForm] IFormFile file,
        [FromForm] string title,
        [FromForm] string? description,
        [FromForm] string? category,
        [FromForm] int? companyId,
        [FromForm] int? projectId)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File berkas wajib diunggah." });
        }

        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        int? targetCompanyId = companyId ?? userCompanyId;

        if (!targetCompanyId.HasValue)
        {
            return BadRequest(new { success = false, message = "Perusahaan wajib ditentukan untuk mengunggah berkas." });
        }

        var companyExists = await _context.Companies.AnyAsync(c => c.Id == targetCompanyId.Value);
        if (!companyExists)
        {
            return BadRequest(new { success = false, message = "Perusahaan tidak valid." });
        }

        if (projectId.HasValue)
        {
            var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == projectId.Value);
            if (project == null || (project.CompanyId.HasValue && project.CompanyId.Value != targetCompanyId.Value))
            {
                return BadRequest(new { success = false, message = "Proyek tidak sesuai dengan perusahaan dokumen." });
            }
        }

        // Prepare physical storage directory
        var uploadRoot = Path.Combine(_environment.ContentRootPath, "uploads", "documents", targetCompanyId.Value.ToString());
        if (!Directory.Exists(uploadRoot))
        {
            Directory.CreateDirectory(uploadRoot);
        }

        var safeFileName = Path.GetFileName(file.FileName);
        var uniqueFileName = $"{Guid.NewGuid():N}_{safeFileName}";
        var fullFilePath = Path.Combine(uploadRoot, uniqueFileName);

        using (var stream = new FileStream(fullFilePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var docTitle = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(safeFileName) : title.Trim();

        var document = new CompanyDocument
        {
            Title = docTitle,
            Description = description?.Trim(),
            FileName = safeFileName,
            FileStoragePath = fullFilePath,
            FileSize = file.Length,
            ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            Category = string.IsNullOrWhiteSpace(category) ? "Umum" : category.Trim(),
            CompanyId = targetCompanyId.Value,
            ProjectId = projectId,
            UploadedByUserId = currentUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Dokumen berhasil diunggah.", data = document });
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> DownloadDocument(int id)
    {
        var doc = await _context.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null)
        {
            return NotFound(new { success = false, message = "Dokumen tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsAdmin && userCompanyId.HasValue && doc.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengunduh dokumen ini." });
        }

        if (!System.IO.File.Exists(doc.FileStoragePath))
        {
            return NotFound(new { success = false, message = "Berkas fisik tidak ditemukan di server." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(doc.FileStoragePath);
        return File(fileBytes, doc.ContentType, doc.FileName);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateDocument(int id, [FromBody] UpdateDocumentRequest request)
    {
        var doc = await _context.Documents.FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null)
        {
            return NotFound(new { success = false, message = "Dokumen tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsAdmin && userCompanyId.HasValue && doc.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengubah dokumen ini." });
        }

        doc.Title = request.Title.Trim();
        doc.Description = request.Description?.Trim();
        doc.Category = string.IsNullOrWhiteSpace(request.Category) ? "Umum" : request.Category.Trim();
        doc.ProjectId = request.ProjectId;
        doc.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Data dokumen berhasil diperbarui.", data = doc });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        var doc = await _context.Documents.FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null)
        {
            return NotFound(new { success = false, message = "Dokumen tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        var currentUserId = _tenantService.UserId;
        var isUploader = doc.UploadedByUserId == currentUserId;
        var canDelete = _tenantService.IsAdmin || _tenantService.IsProjectManager || isUploader;

        if (!canDelete || (!_tenantService.IsAdmin && userCompanyId.HasValue && doc.CompanyId != userCompanyId.Value))
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak menghapus dokumen ini." });
        }

        if (System.IO.File.Exists(doc.FileStoragePath))
        {
            try
            {
                System.IO.File.Delete(doc.FileStoragePath);
            }
            catch
            {
                // Ignore physical file delete error if locked
            }
        }

        _context.Documents.Remove(doc);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Dokumen berhasil dihapus." });
    }
}

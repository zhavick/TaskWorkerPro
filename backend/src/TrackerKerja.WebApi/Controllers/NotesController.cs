using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly IWebHostEnvironment _env;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp",
        ".zip", ".rar", ".7z", ".txt", ".md", ".markdown", ".json", ".sql", ".csv", ".xml", ".yaml", ".yml",
        ".ts", ".js", ".cs", ".html", ".css", ".log"
    };

    public NotesController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        IWebHostEnvironment env)
    {
        _context = context;
        _tenantService = tenantService;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotes(
        [FromQuery] int? taskId = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isPinned = null,
        [FromQuery] string? search = null)
    {
        var query = _context.Notes
            .Include(n => n.AuthorUser)
            .Include(n => n.Task)
            .Include(n => n.Attachments)
            .AsNoTracking()
            .AsQueryable();

        if (taskId.HasValue) query = query.Where(n => n.TaskId == taskId.Value);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(n => n.Category == category);
        if (isPinned.HasValue) query = query.Where(n => n.IsPinned == isPinned.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(n => n.Title.ToLower().Contains(searchLower) ||
                                     n.ContentHtml.ToLower().Contains(searchLower));
        }

        var notes = await query
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.CreatedAt)
            .ToListAsync();

        var result = notes.Select(n => new NoteItemDto(
            n.Id,
            n.Title,
            n.ContentHtml,
            n.Category,
            n.Color,
            n.IsPinned,
            n.AuthorUserId,
            n.AuthorUser?.FullName,
            n.TaskId,
            n.Task?.Title,
            n.Attachments.Count,
            n.CreatedAt,
            n.UpdatedAt
        )).ToList();

        return Ok(new { success = true, data = result });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetNoteById(int id)
    {
        var note = await _context.Notes
            .Include(n => n.AuthorUser)
            .Include(n => n.Task)
            .Include(n => n.Attachments).ThenInclude(a => a.UploadedByUser)
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id);

        if (note == null) return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

        var attachments = note.Attachments.Select(a => new NoteAttachmentDto(
            a.Id,
            a.FileName,
            a.FileSize,
            a.ContentType,
            a.FileExtension,
            a.UploadedByUser?.FullName ?? a.UploadedByUserId,
            a.UploadedAt
        )).ToList();

        var dto = new NoteDetailDto(
            note.Id,
            note.Title,
            note.ContentHtml,
            note.Category,
            note.Color,
            note.IsPinned,
            note.AuthorUserId,
            note.AuthorUser?.FullName,
            note.TaskId,
            note.Task?.Title,
            note.CreatedAt,
            note.UpdatedAt,
            attachments
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost]
    public async Task<IActionResult> CreateNote([FromBody] CreateNoteRequest request)
    {
        var note = new WorkNote
        {
            Title = request.Title.Trim(),
            ContentHtml = request.ContentHtml,
            Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#6366F1" : request.Color,
            IsPinned = request.IsPinned,
            TaskId = request.TaskId,
            CompanyId = _tenantService.CompanyId,
            AuthorUserId = _tenantService.UserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Notes.Add(note);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Catatan berhasil dibuat.", data = note });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateNote(int id, [FromBody] UpdateNoteRequest request)
    {
        var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

        note.Title = request.Title.Trim();
        note.ContentHtml = request.ContentHtml;
        note.Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category.Trim();
        note.Color = string.IsNullOrWhiteSpace(request.Color) ? "#6366F1" : request.Color;
        note.IsPinned = request.IsPinned;
        note.TaskId = request.TaskId;
        note.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Catatan berhasil diperbarui.", data = note });
    }

    [HttpPatch("{id:int}/pin")]
    public async Task<IActionResult> TogglePin(int id)
    {
        var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

        note.IsPinned = !note.IsPinned;
        note.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = note.IsPinned ? "Catatan disematkan." : "Semat catatan dilepas.", isPinned = note.IsPinned });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        var note = await _context.Notes
            .Include(n => n.Attachments)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (note == null) return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

        // Remove physical files
        foreach (var attachment in note.Attachments)
        {
            if (System.IO.File.Exists(attachment.FilePath))
            {
                try { System.IO.File.Delete(attachment.FilePath); } catch { /* ignore */ }
            }
        }

        _context.Notes.Remove(note);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Catatan dan seluruh lampiran berhasil dihapus." });
    }

    [HttpPost("{id:int}/attachments")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAttachment(int id, IFormFile? file)
    {
        var note = await _context.Notes.FirstOrDefaultAsync(n => n.Id == id);
        if (note == null) return NotFound(new { success = false, message = "Catatan tidak ditemukan." });

        if (file == null || file.Length == 0)
        {
            if (Request.HasFormContentType && Request.Form.Files.Count > 0)
            {
                file = Request.Form.Files["file"] ?? Request.Form.Files.FirstOrDefault();
            }
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "Berkas lampiran tidak valid atau kosong." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
        {
            return BadRequest(new { success = false, message = $"Format berkas {ext} tidak diizinkan." });
        }

        var sanitizedFileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Path.GetFileName(file.FileName)}";

        // 1. Simpan pada ContentRootPath/uploads/notes/{note.Id}/{sanitizedFileName}
        var noteUploadDir = Path.Combine(_env.ContentRootPath, "uploads", "notes", note.Id.ToString());
        Directory.CreateDirectory(noteUploadDir);
        var noteFullPath = Path.Combine(noteUploadDir, sanitizedFileName);
        using (var stream = new FileStream(noteFullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 2. Simpan juga pada ContentRootPath/uploads/companies/{companyId}/notes/{note.Id}/{sanitizedFileName}
        var companyId = _tenantService.CompanyId ?? 1;
        try
        {
            var companyFolderPath = Path.Combine(_env.ContentRootPath, "uploads", "companies", companyId.ToString(), "notes", note.Id.ToString());
            Directory.CreateDirectory(companyFolderPath);
            var companyFullPath = Path.Combine(companyFolderPath, sanitizedFileName);
            if (!System.IO.File.Exists(companyFullPath))
            {
                System.IO.File.Copy(noteFullPath, companyFullPath, true);
            }
        }
        catch { /* ignore */ }

        // 3. Simpan juga pada candidate frontend/public/uploads/notes/{noteId} jika ada
        var candidateFrontendDirs = new[]
        {
            Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "..", "frontend", "public", "uploads", "notes", note.Id.ToString())),
            Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "frontend", "public", "uploads", "notes", note.Id.ToString())),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "frontend", "public", "uploads", "notes", note.Id.ToString())),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "frontend", "public", "uploads", "notes", note.Id.ToString())),
            @"c:\TEMP\VSCODE\TrackerKerjaModern\frontend\public\uploads\notes\" + note.Id
        };

        foreach (var dir in candidateFrontendDirs)
        {
            try
            {
                var parentDir = Directory.GetParent(dir)?.FullName;
                if (parentDir != null && (Directory.Exists(parentDir) || parentDir.Contains("frontend")))
                {
                    Directory.CreateDirectory(dir);
                    var fPath = Path.Combine(dir, sanitizedFileName);
                    if (!System.IO.File.Exists(fPath))
                    {
                        System.IO.File.Copy(noteFullPath, fPath, true);
                    }
                    break;
                }
            }
            catch { /* fallback */ }
        }

        // Relative URL konsisten yang dapat di binding di host induk mana pun
        var relativeUrl = $"/uploads/notes/{note.Id}/{sanitizedFileName}";

        var attachment = new NoteAttachment
        {
            NoteId = note.Id,
            FileName = file.FileName,
            FilePath = relativeUrl,
            FileSize = file.Length,
            ContentType = file.ContentType,
            FileExtension = ext,
            UploadedByUserId = _tenantService.UserId,
            UploadedAt = DateTimeOffset.UtcNow
        };

        _context.NoteAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Berkas berhasil diunggah.",
            data = new NoteAttachmentDto(
                attachment.Id,
                attachment.FileName,
                attachment.FileSize,
                attachment.ContentType,
                attachment.FileExtension,
                _tenantService.UserId,
                attachment.UploadedAt
            )
        });
    }

    [HttpGet("attachments/{attachmentId:int}/download")]
    [HttpGet("{id:int}/attachments/{attachmentId:int}/download")]
    public async Task<IActionResult> DownloadAttachment(int attachmentId, int? id = null)
    {
        var attachment = await _context.NoteAttachments
            .Include(a => a.Note)
            .FirstOrDefaultAsync(a => a.Id == attachmentId);

        if (attachment == null) return NotFound(new { success = false, message = "Lampiran tidak ditemukan." });

        var fileName = Path.GetFileName(attachment.FilePath);
        var candidatePaths = new List<string>
        {
            attachment.FilePath,
            Path.Combine(_env.ContentRootPath, attachment.FilePath.TrimStart('/', '\\')),
            Path.Combine(_env.ContentRootPath, "uploads", "notes", attachment.NoteId.ToString(), fileName),
            Path.Combine(_env.ContentRootPath, "uploads", "companies", (attachment.Note?.CompanyId ?? _tenantService.CompanyId ?? 1).ToString(), "notes", attachment.NoteId.ToString(), fileName),
            Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", "notes", attachment.NoteId.ToString(), fileName),
            Path.Combine(Directory.GetCurrentDirectory(), "frontend", "public", "uploads", "notes", attachment.NoteId.ToString(), fileName),
            Path.Combine(@"c:\TEMP\VSCODE\TrackerKerjaModern\frontend\public\uploads\notes", attachment.NoteId.ToString(), fileName),
            Path.Combine(@"c:\TEMP\VSCODE\TrackerKerjaModern\uploads\notes", attachment.NoteId.ToString(), fileName)
        };

        string? activePath = candidatePaths.FirstOrDefault(p => !string.IsNullOrWhiteSpace(p) && System.IO.File.Exists(p));

        if (activePath == null)
        {
            // Deep search di direktori uploads jika file berada di subfolder berbeda setelah sinkronisasi
            var uploadsRoot = Path.Combine(_env.ContentRootPath, "uploads");
            if (Directory.Exists(uploadsRoot))
            {
                var matches = Directory.GetFiles(uploadsRoot, fileName, SearchOption.AllDirectories);
                if (matches.Length > 0)
                {
                    activePath = matches[0];
                }
            }
        }

        if (activePath == null)
        {
            return NotFound(new { success = false, message = "Berkas fisik tidak ditemukan di server." });
        }

        var memory = new MemoryStream();
        using (var stream = new FileStream(activePath, FileMode.Open, FileAccess.Read))
        {
            await stream.CopyToAsync(memory);
        }
        memory.Position = 0;

        return File(memory, attachment.ContentType ?? "application/octet-stream", attachment.FileName);
    }

    [HttpDelete("attachments/{attachmentId:int}")]
    [HttpDelete("{id:int}/attachments/{attachmentId:int}")]
    public async Task<IActionResult> DeleteAttachment(int attachmentId, int? id = null)
    {
        var attachment = await _context.NoteAttachments.FirstOrDefaultAsync(a => a.Id == attachmentId);
        if (attachment == null) return NotFound(new { success = false, message = "Lampiran tidak ditemukan." });

        if (System.IO.File.Exists(attachment.FilePath))
        {
            try { System.IO.File.Delete(attachment.FilePath); } catch { /* ignore */ }
        }

        var fileName = Path.GetFileName(attachment.FilePath);
        var fallbackPath = Path.Combine(_env.ContentRootPath, "uploads", "companies", (_tenantService.CompanyId ?? 1).ToString(), "notes", attachment.NoteId.ToString(), fileName);
        if (System.IO.File.Exists(fallbackPath))
        {
            try { System.IO.File.Delete(fallbackPath); } catch { /* ignore */ }
        }

        _context.NoteAttachments.Remove(attachment);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Lampiran berhasil dihapus." });
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompaniesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public CompaniesController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    private bool CheckIsAdmin()
    {
        return _tenantService.IsAdmin ||
               (User?.Identity?.IsAuthenticated == true && (User?.IsInRole("Administrator") ?? false));
    }

    [HttpGet]
    public async Task<IActionResult> GetCompanies([FromQuery] string? search = null)
    {
        var query = _context.Companies
            .Include(c => c.Users)
            .Include(c => c.Projects)
            .Include(c => c.Tasks)
            .AsNoTracking()
            .AsQueryable();

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue)
        {
            query = query.Where(c => c.Id == _tenantService.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(s) || c.Code.ToLower().Contains(s));
        }

        var companies = await query
            .OrderBy(c => c.Name)
            .Select(c => new CompanyDto(
                c.Id,
                c.Name,
                c.Code,
                c.Description,
                c.Address,
                c.ContactEmail,
                c.CreatedAt,
                c.Users.Count(u => u.IsApproved),
                c.Projects.Count(),
                c.Tasks.Count(),
                c.EnableDms,
                c.EnableTicketing,
                c.EnableInvoicing,
                c.MaxStorageSizeBytes,
                c.MaxUploadFileSizeBytes
            ))
            .ToListAsync();

        return Ok(new { success = true, data = companies });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetCompanyById(int id)
    {
        var company = await _context.Companies
            .Include(c => c.Users)
            .Include(c => c.Projects)
            .Include(c => c.Tasks)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
        {
            return NotFound(new { success = false, message = "Perusahaan tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && id != _tenantService.CompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses data perusahaan lain." });
        }

        var dto = new CompanyDto(
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.Address,
            company.ContactEmail,
            company.CreatedAt,
            company.Users.Count(u => u.IsApproved),
            company.Projects.Count(),
            company.Tasks.Count(),
            company.EnableDms,
            company.EnableTicketing,
            company.EnableInvoicing,
            company.MaxStorageSizeBytes,
            company.MaxUploadFileSizeBytes
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest request)
    {
        if (!_tenantService.IsSuperAdmin)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Nama perusahaan wajib diisi." });
        }

        var cleanCode = (request.Code ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(cleanCode))
        {
            cleanCode = new string(request.Name.Split(' ').Select(w => w.FirstOrDefault()).Where(ch => char.IsLetterOrDigit(ch)).Take(4).ToArray()).ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(cleanCode)) cleanCode = "COMP";
        }

        var exists = await _context.Companies.AnyAsync(c => c.Code == cleanCode || c.Name.ToLower() == request.Name.Trim().ToLower());
        if (exists)
        {
            return BadRequest(new { success = false, message = $"Perusahaan dengan kode '{cleanCode}' atau nama tersebut sudah terdaftar." });
        }

        var company = new Company
        {
            Name = request.Name.Trim(),
            Code = cleanCode,
            Description = request.Description?.Trim(),
            Address = request.Address?.Trim(),
            ContactEmail = request.ContactEmail?.Trim(),
            EnableDms = request.EnableDms,
            EnableTicketing = request.EnableTicketing,
            EnableInvoicing = request.EnableInvoicing,
            MaxStorageSizeBytes = request.MaxStorageSizeBytes ?? 1073741824,
            MaxUploadFileSizeBytes = request.MaxUploadFileSizeBytes ?? 52428800,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Companies.Add(company);
        await _context.SaveChangesAsync();

        var dto = new CompanyDto(
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.Address,
            company.ContactEmail,
            company.CreatedAt,
            0,
            0,
            0,
            company.EnableDms,
            company.EnableTicketing,
            company.EnableInvoicing,
            company.MaxStorageSizeBytes,
            company.MaxUploadFileSizeBytes
        );

        return CreatedAtAction(nameof(GetCompanyById), new { id = company.Id }, new { success = true, data = dto, message = "Perusahaan berhasil ditambahkan." });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCompany(int id, [FromBody] UpdateCompanyRequest request)
    {
        if (!CheckIsAdmin())
        {
            return Forbid();
        }

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == id);
        if (company == null)
        {
            return NotFound(new { success = false, message = "Perusahaan tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && id != _tenantService.CompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses data perusahaan lain." });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Nama perusahaan wajib diisi." });
        }

        var cleanCode = (request.Code ?? company.Code).Trim().ToUpperInvariant();
        var codeExists = await _context.Companies.AnyAsync(c => c.Id != id && c.Code == cleanCode);
        if (codeExists)
        {
            return BadRequest(new { success = false, message = $"Kode perusahaan '{cleanCode}' telah digunakan oleh perusahaan lain." });
        }

        company.Name = request.Name.Trim();
        company.Code = cleanCode;
        company.Description = request.Description?.Trim();
        company.Address = request.Address?.Trim();
        company.ContactEmail = request.ContactEmail?.Trim();
        if (request.MaxStorageSizeBytes.HasValue) company.MaxStorageSizeBytes = request.MaxStorageSizeBytes.Value;
        if (request.MaxUploadFileSizeBytes.HasValue) company.MaxUploadFileSizeBytes = request.MaxUploadFileSizeBytes.Value;

        await _context.SaveChangesAsync();

        var dto = new CompanyDto(
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.Address,
            company.ContactEmail,
            company.CreatedAt,
            company.Users.Count(u => u.IsApproved),
            company.Projects.Count(),
            company.Tasks.Count(),
            company.EnableDms,
            company.EnableTicketing,
            company.EnableInvoicing,
            company.MaxStorageSizeBytes,
            company.MaxUploadFileSizeBytes
        );

        return Ok(new { success = true, data = dto, message = "Data perusahaan berhasil diperbarui." });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        if (!_tenantService.IsSuperAdmin)
        {
            return Forbid();
        }

        var company = await _context.Companies
            .Include(c => c.Users)
            .Include(c => c.Tasks)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
        {
            return NotFound(new { success = false, message = "Perusahaan tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && id != _tenantService.CompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses data perusahaan lain." });
        }

        if (company.Users.Any() || company.Tasks.Any())
        {
            return BadRequest(new
            {
                success = false,
                message = "Tidak dapat menghapus perusahaan yang masih memiliki anggota terdaftar atau tugas aktif."
            });
        }

        _context.Companies.Remove(company);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Perusahaan berhasil dihapus." });
    }
    [HttpGet("module-matrix")]
    public async Task<IActionResult> GetModuleMatrix()
    {
        var query = _context.Companies
            .Include(c => c.Users)
            .Include(c => c.Projects)
            .AsNoTracking()
            .AsQueryable();

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue)
        {
            query = query.Where(c => c.Id == _tenantService.CompanyId.Value);
        }

        var matrix = await query
            .OrderBy(c => c.Name)
            .Select(c => new CompanyModuleMatrixDto(
                c.Id,
                c.Name,
                c.Code,
                c.EnableDms,
                c.EnableTicketing,
                c.EnableInvoicing,
                c.Users.Count(u => u.IsApproved),
                c.Projects.Count()
            ))
            .ToListAsync();

        return Ok(new { success = true, data = matrix });
    }

    [HttpPut("{id:int}/modules")]
    public async Task<IActionResult> UpdateCompanyModules(int id, [FromBody] UpdateCompanyModulesRequest request)
    {
        if (!CheckIsAdmin() && !_tenantService.IsProjectManager)
        {
            return Forbid();
        }

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == id);
        if (company == null)
        {
            return NotFound(new { success = false, message = "Perusahaan tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && id != _tenantService.CompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses data perusahaan lain." });
        }

        company.EnableDms = request.EnableDms;
        company.EnableTicketing = request.EnableTicketing;
        company.EnableInvoicing = request.EnableInvoicing;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Pengaturan modul perusahaan '{company.Name}' berhasil diperbarui.",
            data = new CompanyModuleMatrixDto(
                company.Id,
                company.Name,
                company.Code,
                company.EnableDms,
                company.EnableTicketing,
                company.EnableInvoicing
            )
        });
    }

    [HttpPut("module-matrix")]
    public async Task<IActionResult> BulkUpdateModuleMatrix([FromBody] BulkUpdateCompanyModuleMatrixRequest request)
    {
        if (!_tenantService.IsSuperAdmin)
        {
            return Forbid();
        }

        if (request?.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new { success = false, message = "Data matriks tidak boleh kosong." });
        }

        var companyIds = request.Items.Select(i => i.CompanyId).ToList();
        var companies = await _context.Companies.Where(c => companyIds.Contains(c.Id)).ToListAsync();

        foreach (var item in request.Items)
        {
            var company = companies.FirstOrDefault(c => c.Id == item.CompanyId);
            if (company != null)
            {
                company.EnableDms = item.EnableDms;
                company.EnableTicketing = item.EnableTicketing;
                company.EnableInvoicing = item.EnableInvoicing;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Matriks modul untuk {companies.Count} perusahaan berhasil diperbarui."
        });
    }

    [HttpGet("storage-quota")]
    public async Task<IActionResult> GetStorageQuotas()
    {
        var query = _context.Companies
            .AsNoTracking()
            .AsQueryable();

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue)
        {
            query = query.Where(c => c.Id == _tenantService.CompanyId.Value);
        }

        var companies = await query.OrderBy(c => c.Name).ToListAsync();

        var result = new List<CompanyStorageUsageDto>();
        foreach (var c in companies)
        {
            var usedDocBytes = await _context.Documents.Where(d => d.CompanyId == c.Id).SumAsync(d => (long)d.FileSize);
            var usedNoteBytes = await _context.Notes.Where(n => n.CompanyId == c.Id).SelectMany(n => n.Attachments).SumAsync(na => (long)na.FileSize);
            var totalUsedBytes = usedDocBytes + usedNoteBytes;
            var docCount = await _context.Documents.CountAsync(d => d.CompanyId == c.Id);
            var noteAttCount = await _context.Notes.Where(n => n.CompanyId == c.Id).SelectMany(n => n.Attachments).CountAsync();
            var totalFiles = docCount + noteAttCount;

            var maxStorageMb = Math.Round((double)c.MaxStorageSizeBytes / (1024 * 1024), 1);
            var maxUploadMb = Math.Round((double)c.MaxUploadFileSizeBytes / (1024 * 1024), 1);
            var usedMb = Math.Round((double)totalUsedBytes / (1024 * 1024), 2);
            var usedPct = c.MaxStorageSizeBytes > 0 ? Math.Round((double)totalUsedBytes / c.MaxStorageSizeBytes * 100, 1) : 0;
            var isExceeded = c.MaxStorageSizeBytes > 0 && totalUsedBytes >= c.MaxStorageSizeBytes;

            result.Add(new CompanyStorageUsageDto(
                c.Id,
                c.Name,
                c.Code,
                c.MaxStorageSizeBytes,
                maxStorageMb,
                c.MaxUploadFileSizeBytes,
                maxUploadMb,
                totalUsedBytes,
                usedMb,
                usedPct,
                totalFiles,
                isExceeded
            ));
        }

        return Ok(new { success = true, data = result });
    }

    [HttpPut("{id:int}/storage-quota")]
    public async Task<IActionResult> UpdateCompanyStorageQuota(int id, [FromBody] UpdateCompanyStorageQuotaRequest request)
    {
        if (!CheckIsAdmin() && !_tenantService.IsProjectManager)
        {
            return Forbid();
        }

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == id);
        if (company == null)
        {
            return NotFound(new { success = false, message = "Perusahaan tidak ditemukan." });
        }

        if (!_tenantService.IsSuperAdmin && _tenantService.CompanyId.HasValue && id != _tenantService.CompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses data perusahaan lain." });
        }

        if (request.MaxStorageMb < 0 || request.MaxUploadFileSizeMb < 0)
        {
            return BadRequest(new { success = false, message = "Nilai kuota atau ukuran berkas tidak boleh negatif." });
        }

        company.MaxStorageSizeBytes = (long)(request.MaxStorageMb * 1024 * 1024);
        company.MaxUploadFileSizeBytes = (long)(request.MaxUploadFileSizeMb * 1024 * 1024);

        await _context.SaveChangesAsync();

        var usedDocBytes = await _context.Documents.Where(d => d.CompanyId == company.Id).SumAsync(d => (long)d.FileSize);
        var usedNoteBytes = await _context.Notes.Where(n => n.CompanyId == company.Id).SelectMany(n => n.Attachments).SumAsync(na => (long)na.FileSize);
        var totalUsedBytes = usedDocBytes + usedNoteBytes;
        var docCount = await _context.Documents.CountAsync(d => d.CompanyId == company.Id);
        var noteAttCount = await _context.Notes.Where(n => n.CompanyId == company.Id).SelectMany(n => n.Attachments).CountAsync();
        var totalFiles = docCount + noteAttCount;

        var maxStorageMb = Math.Round((double)company.MaxStorageSizeBytes / (1024 * 1024), 1);
        var maxUploadMb = Math.Round((double)company.MaxUploadFileSizeBytes / (1024 * 1024), 1);
        var usedMb = Math.Round((double)totalUsedBytes / (1024 * 1024), 2);
        var usedPct = company.MaxStorageSizeBytes > 0 ? Math.Round((double)totalUsedBytes / company.MaxStorageSizeBytes * 100, 1) : 0;
        var isExceeded = company.MaxStorageSizeBytes > 0 && totalUsedBytes >= company.MaxStorageSizeBytes;

        return Ok(new
        {
            success = true,
            message = $"Batas kuota penyimpanan untuk perusahaan '{company.Name}' berhasil diperbarui.",
            data = new CompanyStorageUsageDto(
                company.Id,
                company.Name,
                company.Code,
                company.MaxStorageSizeBytes,
                maxStorageMb,
                company.MaxUploadFileSizeBytes,
                maxUploadMb,
                totalUsedBytes,
                usedMb,
                usedPct,
                totalFiles,
                isExceeded
            )
        });
    }

    [HttpPut("storage-quota/bulk")]
    public async Task<IActionResult> BulkUpdateStorageQuotas([FromBody] BulkUpdateCompanyStorageQuotaRequest request)
    {
        if (!_tenantService.IsSuperAdmin)
        {
            return Forbid();
        }

        if (request?.Items == null || request.Items.Count == 0)
        {
            return BadRequest(new { success = false, message = "Data kuota tidak boleh kosong." });
        }

        var ids = request.Items.Select(i => i.CompanyId).ToList();
        var companies = await _context.Companies.Where(c => ids.Contains(c.Id)).ToListAsync();

        foreach (var item in request.Items)
        {
            var comp = companies.FirstOrDefault(c => c.Id == item.CompanyId);
            if (comp != null)
            {
                if (item.MaxStorageMb >= 0) comp.MaxStorageSizeBytes = (long)(item.MaxStorageMb * 1024 * 1024);
                if (item.MaxUploadFileSizeMb >= 0) comp.MaxUploadFileSizeBytes = (long)(item.MaxUploadFileSizeMb * 1024 * 1024);
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Batas kuota penyimpanan untuk {companies.Count} perusahaan berhasil diperbarui."
        });
    }
}

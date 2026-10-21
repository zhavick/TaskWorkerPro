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
                c.Tasks.Count()
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
            company.Tasks.Count()
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest request)
    {
        if (!CheckIsAdmin())
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
            0
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

        await _context.SaveChangesAsync();

        var dto = new CompanyDto(
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.Address,
            company.ContactEmail,
            company.CreatedAt
        );

        return Ok(new { success = true, data = dto, message = "Data perusahaan berhasil diperbarui." });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCompany(int id)
    {
        if (!CheckIsAdmin())
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
}

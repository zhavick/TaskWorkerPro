using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/members")]
[Authorize]
public class MembersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    public MembersController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMembers(
        [FromQuery] int? companyId = null,
        [FromQuery] bool? isApproved = null,
        [FromQuery] string? search = null)
    {
        var query = _context.Users
            .Include(u => u.Company)
            .AsNoTracking()
            .AsQueryable();

        // Isolasi multi-tenant jika bukan admin
        if (!_tenantService.IsAdmin)
        {
            query = query.Where(u => u.CompanyId == _tenantService.CompanyId);
        }
        else if (companyId.HasValue)
        {
            query = query.Where(u => u.CompanyId == companyId.Value);
        }

        if (isApproved.HasValue)
        {
            query = query.Where(u => u.IsApproved == isApproved.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(searchLower) ||
                                     (u.Email != null && u.Email.ToLower().Contains(searchLower)) ||
                                     u.JobTitle.ToLower().Contains(searchLower));
        }

        var members = await query
            .OrderBy(u => u.FullName)
            .Select(u => new MemberListItemDto(
                u.Id,
                u.FullName,
                u.Email ?? string.Empty,
                u.JobTitle,
                u.AvatarColor,
                u.ProfilePictureUrl,
                u.CompanyId,
                u.Company != null ? u.Company.Name : null,
                u.Company != null ? u.Company.Code : null,
                u.IsApproved,
                u.ApprovedAt,
                u.CreatedAt,
                new List<string> { u.JobTitle.Contains("Admin") ? "Administrator" : "Member" }
            ))
            .ToListAsync();

        return Ok(new { success = true, data = members });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMemberById(string id)
    {
        var user = await _context.Users
            .Include(u => u.Company)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { success = false, message = "Anggota tidak ditemukan." });
        }

        // Validasi isolasi tenant
        if (!_tenantService.IsAdmin && user.CompanyId != _tenantService.CompanyId)
        {
            return Forbid();
        }

        var profile = new UserProfileDto(
            user.Id,
            user.FullName,
            user.Email ?? string.Empty,
            user.JobTitle,
            user.AvatarColor,
            user.ProfilePictureUrl,
            user.CoverPictureUrl,
            user.CompanyId,
            user.Company?.Name,
            user.Company?.Code,
            user.IsApproved,
            new List<string> { user.JobTitle.Contains("Admin") ? "Administrator" : "Member" }
        );

        return Ok(new { success = true, data = profile });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> ApproveMember(string id, [FromBody] ApproveMemberRequest? request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        user.IsApproved = true;
        user.ApprovedAt = DateTimeOffset.UtcNow;
        user.ApprovedByUserId = _tenantService.UserId;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Akun {user.FullName} berhasil disetujui." });
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> RejectMember(string id, [FromBody] RejectMemberRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        user.RejectionReason = request.RejectionReason;
        user.IsApproved = false;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Pendaftaran {user.FullName} telah ditolak." });
    }

    [HttpPost("{id}/unlock")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UnlockMember(string id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        user.AccessFailedCount = 0;
        user.LockoutEnd = null;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Kunci akun {user.FullName} berhasil dibuka." });
    }

    [HttpDelete("{id}/permanent")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteMemberPermanently(string id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Akun {user.FullName} telah dihapus permanen dari sistem." });
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

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

        var now = DateTimeOffset.UtcNow;
        var users = await query
            .Include(u => u.AssignedTasks)
            .Include(u => u.WorkSessions)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var members = users.Select(u => new MemberListItemDto(
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
            new List<string> { u.JobTitle.Contains("Admin") ? "Administrator" : "Member" },
            u.LockoutEnd.HasValue && u.LockoutEnd.Value > now,
            u.AssignedTasks.Count,
            u.AssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done),
            Math.Round(u.WorkSessions.Where(s => s.EndTime != null).Sum(s => s.Duration) / 3600.0, 1),
            u.PhoneNumber
        )).ToList();

        var groups = members
            .GroupBy(m => new { m.CompanyId, CompanyName = m.CompanyName ?? "Perusahaan Default", CompanyCode = m.CompanyCode ?? "WCH" })
            .Select(g => new CompanyMemberGroupDto(
                g.Key.CompanyId,
                g.Key.CompanyName,
                g.Key.CompanyCode,
                g.Count(),
                g.Sum(m => m.TotalTasks),
                g.Sum(m => m.CompletedTasks),
                Math.Round(g.Sum(m => m.TotalHours), 1),
                g.ToList()
            ))
            .OrderBy(g => g.CompanyName)
            .ToList();

        return Ok(new { success = true, data = members, groups });
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
            new List<string> { user.JobTitle.Contains("Admin") ? "Administrator" : "Member" },
            user.PhoneNumber,
            user.CreatedAt
        );

        return Ok(new { success = true, data = profile });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMember(string id, [FromBody] UpdateMemberRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { success = false, message = "Nama lengkap tidak boleh kosong." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
        {
            return NotFound(new { success = false, message = "Anggota tidak ditemukan." });
        }

        // Validasi hak akses: Hanya Administrator atau pemilik akun sendiri
        if (!_tenantService.IsAdmin && _tenantService.UserId != id)
        {
            return Forbid();
        }

        // Validasi tenant bagi non-admin
        if (!_tenantService.IsAdmin && user.CompanyId != _tenantService.CompanyId)
        {
            return Forbid();
        }

        user.FullName = request.FullName.Trim();
        user.JobTitle = request.JobTitle.Trim();
        if (request.PhoneNumber != null)
        {
            user.PhoneNumber = request.PhoneNumber.Trim();
        }
        if (!string.IsNullOrWhiteSpace(request.AvatarColor))
        {
            user.AvatarColor = request.AvatarColor;
        }

        // Hanya Admin yang dapat memindahkan / mengubah CompanyId
        if (_tenantService.IsAdmin && request.CompanyId.HasValue && request.CompanyId.Value > 0)
        {
            var companyExists = await _context.Companies.AnyAsync(c => c.Id == request.CompanyId.Value);
            if (!companyExists)
            {
                return BadRequest(new { success = false, message = "Perusahaan target tidak valid." });
            }
            user.CompanyId = request.CompanyId.Value;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Data profil {user.FullName} berhasil diperbarui.",
            data = new
            {
                user.Id,
                user.FullName,
                user.JobTitle,
                user.PhoneNumber,
                user.AvatarColor,
                user.CompanyId
            }
        });
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

    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] AdminResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new { success = false, message = "Kata sandi baru minimal 6 karakter." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Kata sandi untuk {user.FullName} berhasil direset." });
    }

    [HttpDelete("{id}/permanent")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteMemberPermanently(string id, [FromBody] DeleteMemberConfirmationRequest? request = null)
    {
        if (id == "usr-superadmin" || id == _tenantService.UserId)
        {
            return BadRequest(new { success = false, message = "Akun Administrator aktif / Superadmin tidak dapat dihapus." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        if (request != null && !string.IsNullOrWhiteSpace(request.TargetFullName))
        {
            if (!string.Equals(request.TargetFullName.Trim(), user.FullName.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = "Konfirmasi nama lengkap tidak sesuai." });
            }
        }

        // Bebaskan tugas yang terikat dengan pengguna target
        var userTasks = await _context.Tasks.Where(t => t.AssignedToUserId == id).ToListAsync();
        foreach (var t in userTasks)
        {
            t.AssignedToUserId = null;
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Akun {user.FullName} telah dihapus permanen dari sistem." });
    }
}

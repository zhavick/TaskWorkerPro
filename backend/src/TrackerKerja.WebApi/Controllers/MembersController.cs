using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
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

        var adminUserIds = await _context.UserRoles
            .Where(ur => ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator"))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var members = users.Select(u => {
            var isUserAdmin = u.Id == "usr-superadmin" ||
                              adminUserIds.Contains(u.Id) ||
                              (u.Email != null && u.Email.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase)) ||
                              u.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase);

            return new MemberListItemDto(
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
                new List<string> { isUserAdmin ? "Administrator" : "Member" },
                u.LockoutEnd.HasValue && u.LockoutEnd.Value > now,
                u.AssignedTasks.Count,
                u.AssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done),
                Math.Round(u.WorkSessions.Where(s => s.EndTime != null).Sum(s => s.Duration) / 3600.0, 1),
                u.PhoneNumber
            );
        }).ToList();

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

        var isUserAdmin = user.Id == "usr-superadmin" ||
                          await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator"))) ||
                          (user.Email != null && user.Email.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase)) ||
                          user.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase);

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
            new List<string> { isUserAdmin ? "Administrator" : "Member" },
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

    [HttpGet("admin-group")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetAdminGroup()
    {
        var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Administrator" || r.Id == "r-admin");
        var adminRoleId = adminRole?.Id ?? "r-admin";

        var adminUserIds = await _context.UserRoles
            .Where(ur => ur.RoleId == adminRoleId)
            .Select(ur => ur.UserId)
            .ToListAsync();

        var adminUsers = await _context.Users
            .AsNoTracking()
            .Where(u => adminUserIds.Contains(u.Id) || u.Id == "usr-superadmin" || (u.Email != null && u.Email.ToLower() == "admin@trackerkerja.local") || u.JobTitle.Contains("Admin"))
            .OrderBy(u => u.FullName)
            .Select(u => new AdminGroupMemberDto(
                u.Id,
                u.FullName,
                u.Email ?? string.Empty,
                u.JobTitle,
                u.AvatarColor,
                u.CreatedAt
            ))
            .ToListAsync();

        return Ok(new { success = true, data = adminUsers });
    }

    [HttpPost("admin-group/add")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> AddToAdminGroup([FromBody] AdminGroupEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Email))
        {
            return BadRequest(new { success = false, message = "Email pengguna tidak boleh kosong." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normalizedEmail);

        if (targetUser == null)
        {
            return NotFound(new { success = false, message = $"Pengguna dengan email '{request.Email}' tidak ditemukan dalam sistem." });
        }

        var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Administrator" || r.Id == "r-admin");
        if (adminRole == null)
        {
            adminRole = new AppRole
            {
                Id = "r-admin",
                Name = "Administrator",
                NormalizedName = "ADMINISTRATOR"
            };
            _context.Roles.Add(adminRole);
            await _context.SaveChangesAsync();
        }

        var isAlreadyAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == targetUser.Id && ur.RoleId == adminRole.Id);
        if (!isAlreadyAdmin)
        {
            _context.UserRoles.Add(new AppUserRole
            {
                UserId = targetUser.Id,
                RoleId = adminRole.Id
            });
        }

        if (!targetUser.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase))
        {
            targetUser.JobTitle = string.IsNullOrWhiteSpace(targetUser.JobTitle) ? "Administrator" : $"{targetUser.JobTitle} (Admin)";
        }
        targetUser.IsApproved = true;
        targetUser.ApprovedAt ??= DateTimeOffset.UtcNow;
        targetUser.ConcurrencyStamp = Guid.NewGuid().ToString();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Hak akses Administrator berhasil diberikan kepada {targetUser.FullName} ({targetUser.Email}).",
            data = new AdminGroupMemberDto(
                targetUser.Id,
                targetUser.FullName,
                targetUser.Email ?? string.Empty,
                targetUser.JobTitle,
                targetUser.AvatarColor,
                targetUser.CreatedAt
            )
        });
    }

    [HttpPost("admin-group/remove")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> RemoveFromAdminGroup([FromBody] AdminGroupEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Email))
        {
            return BadRequest(new { success = false, message = "Email pengguna tidak boleh kosong." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (normalizedEmail == "admin@trackerkerja.local")
        {
            return BadRequest(new { success = false, message = "Akun Super Administrator utama sistem tidak dapat dicabut hak aksesnya." });
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == normalizedEmail);
        if (targetUser == null)
        {
            return NotFound(new { success = false, message = $"Pengguna dengan email '{request.Email}' tidak ditemukan." });
        }

        if (targetUser.Id == "usr-superadmin" || targetUser.Id == _tenantService.UserId)
        {
            return BadRequest(new { success = false, message = "Anda tidak dapat mencabut hak akses administrator akun Anda sendiri." });
        }

        var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Administrator" || r.Id == "r-admin");
        var adminRoleId = adminRole?.Id ?? "r-admin";

        var userRole = await _context.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == targetUser.Id && ur.RoleId == adminRoleId);
        if (userRole != null)
        {
            _context.UserRoles.Remove(userRole);
        }

        if (targetUser.JobTitle.EndsWith(" (Admin)", StringComparison.OrdinalIgnoreCase))
        {
            targetUser.JobTitle = targetUser.JobTitle.Substring(0, targetUser.JobTitle.Length - " (Admin)".Length).Trim();
        }
        else if (targetUser.JobTitle.Equals("Administrator", StringComparison.OrdinalIgnoreCase))
        {
            targetUser.JobTitle = "Staff Member";
        }
        targetUser.ConcurrencyStamp = Guid.NewGuid().ToString();

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Hak akses Administrator untuk {targetUser.FullName} ({targetUser.Email}) telah berhasil dicabut."
        });
    }
}

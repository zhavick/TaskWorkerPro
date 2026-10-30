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

        // Isolasi multi-tenant jika bukan admin (1 perusahaan yang sama)
        if (!_tenantService.IsAdmin)
        {
            var userCompanyId = _tenantService.CompanyId;
            if (!userCompanyId.HasValue && !string.IsNullOrEmpty(_tenantService.UserId))
            {
                var me = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == _tenantService.UserId);
                userCompanyId = me?.CompanyId;
            }
            query = query.Where(u => u.CompanyId == userCompanyId);
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
                .ThenInclude(t => t.Project)
            .Include(u => u.WorkSessions)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var adminUserIds = await _context.UserRoles
            .Where(ur => ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator"))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var purgeAdminUserIds = await _context.UserRoles
            .Where(ur => ur.RoleId == "r-purge-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "DataPurgeAdmin"))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var pmUserIds = await _context.UserRoles
            .Where(ur => ur.RoleId == "r-pm" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Project Manager" || r.Name == "ProjectManager")))
            .Select(ur => ur.UserId)
            .ToListAsync();

        var members = users.Select(u => {
            var isUserAdmin = u.Id == "usr-superadmin" ||
                              adminUserIds.Contains(u.Id) ||
                              (u.Email != null && u.Email.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase)) ||
                              u.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase);
            var isUserPm = pmUserIds.Contains(u.Id) || u.JobTitle.Contains("Project Manager", StringComparison.OrdinalIgnoreCase);
            var isUserPurgeAdmin = purgeAdminUserIds.Contains(u.Id);
            var memberRoles = new List<string>();
            if (isUserAdmin) memberRoles.Add("Administrator");
            if (isUserPm && !isUserAdmin) memberRoles.Add("Project Manager");
            if (isUserPurgeAdmin && !isUserAdmin && !isUserPm) memberRoles.Add("DataPurgeAdmin");
            if (memberRoles.Count == 0) {
                memberRoles.Add("Staff");
                memberRoles.Add("Member");
            }

            var memberProjects = u.AssignedTasks
                .Where(t => t.Project != null)
                .Select(t => t.Project!.Name)
                .Distinct()
                .OrderBy(p => p)
                .ToList();

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
                memberRoles,
                u.LockoutEnd.HasValue && u.LockoutEnd.Value > now,
                u.AssignedTasks.Count,
                u.AssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done),
                Math.Round(u.WorkSessions.Where(s => s.EndTime != null).Sum(s => s.Duration) / 3600.0, 1),
                u.PhoneNumber,
                memberProjects,
                u.CoverPictureUrl,
                CanPurgeData: isUserAdmin || isUserPurgeAdmin
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
            .Include(u => u.AssignedTasks)
                .ThenInclude(t => t.Project)
            .Include(u => u.WorkSessions)
                .ThenInclude(s => s.Task)
                    .ThenInclude(t => t.Project)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { success = false, message = "Anggota tidak ditemukan." });
        }

        // Validasi isolasi tenant
        if (!_tenantService.IsAdmin)
        {
            var userCompanyId = _tenantService.CompanyId;
            if (!userCompanyId.HasValue && !string.IsNullOrEmpty(_tenantService.UserId))
            {
                var me = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == _tenantService.UserId);
                userCompanyId = me?.CompanyId;
            }
            if (userCompanyId.HasValue && user.CompanyId.HasValue && user.CompanyId != userCompanyId)
            {
                return Forbid();
            }
        }

        var isUserAdmin = user.Id == "usr-superadmin" ||
                          await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator"))) ||
                          (user.Email != null && user.Email.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase)) ||
                          user.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase);

        var isUserPurgeAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-purge-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "DataPurgeAdmin")));
        var isUserPm = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-pm" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Project Manager" || r.Name == "ProjectManager")))) || user.JobTitle.Contains("Project Manager", StringComparison.OrdinalIgnoreCase);
        var memberRoles = new List<string>();
        if (isUserAdmin) memberRoles.Add("Administrator");
        if (isUserPm && !isUserAdmin) memberRoles.Add("Project Manager");
        if (isUserPurgeAdmin && !isUserAdmin && !isUserPm) memberRoles.Add("DataPurgeAdmin");
        if (memberRoles.Count == 0) {
            memberRoles.Add("Staff");
            memberRoles.Add("Member");
        }

        var totalTasks = user.AssignedTasks.Count;
        var completedTasks = user.AssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
        var inProgressTasks = user.AssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
        var todoTasks = user.AssignedTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Todo);
        var totalHours = Math.Round(user.WorkSessions.Where(s => s.EndTime != null).Sum(s => s.Duration) / 3600.0, 1);
        var completionRate = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;

        var tasksList = user.AssignedTasks
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                id = t.Id,
                title = t.Title,
                description = t.Description,
                status = t.Status.ToString(),
                priority = t.Priority.ToString(),
                progress = t.Progress,
                projectId = t.ProjectId,
                projectName = t.Project != null ? t.Project.Name : null,
                projectColor = t.Project != null ? t.Project.Color : "#6366F1",
                dueDate = t.DueDate,
                createdAt = t.CreatedAt
            })
            .ToList();

        var projectsList = user.AssignedTasks
            .Where(t => t.Project != null)
            .Select(t => t.Project!)
            .DistinctBy(p => p.Id)
            .Select(p => {
                var pTasks = user.AssignedTasks.Where(t => t.ProjectId == p.Id).ToList();
                var pCompleted = pTasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
                var pDurationSec = user.WorkSessions.Where(s => s.Task != null && s.Task.ProjectId == p.Id && s.EndTime != null).Sum(s => s.Duration);
                return new
                {
                    id = p.Id,
                    name = p.Name,
                    description = p.Description,
                    color = p.Color,
                    status = p.Status.ToString(),
                    clientName = p.ClientName,
                    totalTasks = pTasks.Count,
                    completedTasks = pCompleted,
                    totalHours = Math.Round(pDurationSec / 3600.0, 1),
                    deadline = p.Deadline
                };
            })
            .OrderBy(p => p.name)
            .ToList();

        var recentSessions = user.WorkSessions
            .Where(s => s.EndTime != null)
            .OrderByDescending(s => s.StartTime)
            .Take(20)
            .Select(s => new
            {
                id = s.Id,
                taskId = s.TaskId,
                taskTitle = s.Task != null ? s.Task.Title : "Tugas #" + s.TaskId,
                projectName = s.Task?.Project != null ? s.Task.Project.Name : null,
                projectColor = s.Task?.Project != null ? s.Task.Project.Color : "#6366F1",
                startTime = s.StartTime,
                endTime = s.EndTime,
                duration = s.Duration,
                durationHours = Math.Round(s.Duration / 3600.0, 2),
                notes = s.Notes
            })
            .ToList();

        return Ok(new
        {
            success = true,
            data = new
            {
                id = user.Id,
                fullName = user.FullName,
                email = user.Email ?? string.Empty,
                jobTitle = user.JobTitle,
                avatarColor = user.AvatarColor,
                profilePictureUrl = user.ProfilePictureUrl,
                coverPictureUrl = user.CoverPictureUrl,
                companyId = user.CompanyId,
                companyName = user.Company?.Name,
                companyCode = user.Company?.Code,
                isApproved = user.IsApproved,
                roles = memberRoles,
                canPurgeData = isUserAdmin || isUserPurgeAdmin,
                phoneNumber = user.PhoneNumber,
                createdAt = user.CreatedAt,
                kpi = new
                {
                    totalTasks,
                    completedTasks,
                    inProgressTasks,
                    todoTasks,
                    totalHours,
                    completionRate
                },
                tasks = tasksList,
                projects = projectsList,
                recentSessions
            }
        });
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

        // Admin dapat memperbarui alamat email pengguna
        if (_tenantService.IsAdmin && !string.IsNullOrWhiteSpace(request.Email))
        {
            var cleanEmail = request.Email.Trim().ToLowerInvariant();
            if (!cleanEmail.Contains('@'))
            {
                return BadRequest(new { success = false, message = "Format alamat email tidak valid." });
            }
            var emailExists = await _context.Users.AnyAsync(u => u.Id != id && u.Email != null && u.Email.ToLower() == cleanEmail);
            if (emailExists)
            {
                return BadRequest(new { success = false, message = $"Alamat email '{cleanEmail}' sudah digunakan oleh pengguna lain." });
            }
            user.Email = cleanEmail;
            user.NormalizedEmail = cleanEmail.ToUpperInvariant();
            user.UserName = cleanEmail;
            user.NormalizedUserName = cleanEmail.ToUpperInvariant();
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

            // Selaraskan juga seluruh tugas (tasks) yang ditugaskan kepada anggota ini ke perusahaan yang baru
            var memberTasks = await _context.Tasks.Where(t => t.AssignedToUserId == id).ToListAsync();
            foreach (var t in memberTasks)
            {
                t.CompanyId = request.CompanyId.Value;
            }
        }

        // Admin dapat memberikan hak akses khusus: Administrator, DataPurgeAdmin (khusus cleaning/purging), atau Member
        if (_tenantService.IsAdmin && (!string.IsNullOrWhiteSpace(request.Role) || request.CanPurgeData.HasValue))
        {
            var isTargetSuperAdmin = id == "usr-superadmin" || (user.Email != null && user.Email.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase));
            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Id == "r-admin" || r.Name == "Administrator");
            var adminRoleId = adminRole?.Id ?? "r-admin";
            
            var purgeRole = await _context.Roles.FirstOrDefaultAsync(r => r.Id == "r-purge-admin" || r.Name == "DataPurgeAdmin");
            if (purgeRole == null)
            {
                purgeRole = new AppRole
                {
                    Id = "r-purge-admin",
                    Name = "DataPurgeAdmin",
                    NormalizedName = "DATAPURGEADMIN"
                };
                _context.Roles.Add(purgeRole);
                await _context.SaveChangesAsync();
            }

            var currentAdminRole = await _context.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == id && ur.RoleId == adminRoleId);
            var currentPurgeRole = await _context.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == id && ur.RoleId == purgeRole.Id);

            var pmRole = await _context.Roles.FirstOrDefaultAsync(r => r.Id == "r-pm" || r.Name == "Project Manager" || r.Name == "ProjectManager");
            if (pmRole == null)
            {
                pmRole = new AppRole { Id = "r-pm", Name = "Project Manager", NormalizedName = "PROJECT MANAGER" };
                _context.Roles.Add(pmRole);
                await _context.SaveChangesAsync();
            }
            var currentPmRole = await _context.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == id && ur.RoleId == pmRole.Id);

            var reqRole = request.Role?.Trim();
            if (string.Equals(reqRole, "Administrator", StringComparison.OrdinalIgnoreCase) || string.Equals(reqRole, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                if (currentAdminRole == null)
                {
                    _context.UserRoles.Add(new AppUserRole { UserId = id, RoleId = adminRoleId });
                }
                if (currentPmRole != null) _context.UserRoles.Remove(currentPmRole);
                if (currentPurgeRole != null) _context.UserRoles.Remove(currentPurgeRole);
            }
            else if (string.Equals(reqRole, "Project Manager", StringComparison.OrdinalIgnoreCase) || string.Equals(reqRole, "ProjectManager", StringComparison.OrdinalIgnoreCase) || string.Equals(reqRole, "PM", StringComparison.OrdinalIgnoreCase))
            {
                if (currentPmRole == null)
                {
                    _context.UserRoles.Add(new AppUserRole { UserId = id, RoleId = pmRole.Id });
                }
                if (currentAdminRole != null && !isTargetSuperAdmin) _context.UserRoles.Remove(currentAdminRole);
                if (currentPurgeRole != null) _context.UserRoles.Remove(currentPurgeRole);
            }
            else if (string.Equals(reqRole, "DataPurgeAdmin", StringComparison.OrdinalIgnoreCase) || (request.CanPurgeData == true && reqRole != "Administrator"))
            {
                if (currentPurgeRole == null)
                {
                    _context.UserRoles.Add(new AppUserRole { UserId = id, RoleId = purgeRole.Id });
                }
                if (currentAdminRole != null && !isTargetSuperAdmin) _context.UserRoles.Remove(currentAdminRole);
                if (currentPmRole != null) _context.UserRoles.Remove(currentPmRole);
            }
            else if (string.Equals(reqRole, "Staff", StringComparison.OrdinalIgnoreCase) || string.Equals(reqRole, "Member", StringComparison.OrdinalIgnoreCase) || request.CanPurgeData == false)
            {
                if (currentPurgeRole != null) _context.UserRoles.Remove(currentPurgeRole);
                if (currentPmRole != null) _context.UserRoles.Remove(currentPmRole);
                if (currentAdminRole != null && !isTargetSuperAdmin) _context.UserRoles.Remove(currentAdminRole);
            }
        }

        await _context.SaveChangesAsync();

        var updatedIsAdmin = user.Id == "usr-superadmin" ||
                             await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator"))) ||
                             (user.Email != null && user.Email.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase)) ||
                             user.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase);
        var updatedIsPurgeAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-purge-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "DataPurgeAdmin")));
        var updatedRoles = new List<string>();
        if (updatedIsAdmin) updatedRoles.Add("Administrator");
        if (updatedIsPurgeAdmin && !updatedIsAdmin) updatedRoles.Add("DataPurgeAdmin");
        if (updatedRoles.Count == 0) updatedRoles.Add("Member");

        return Ok(new
        {
            success = true,
            message = $"Data profil {user.FullName} berhasil diperbarui.",
            data = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.JobTitle,
                user.PhoneNumber,
                user.AvatarColor,
                user.CompanyId,
                roles = updatedRoles,
                canPurgeData = updatedIsAdmin || updatedIsPurgeAdmin
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

    [HttpPost("bulk-change-company")]
    public async Task<IActionResult> BulkChangeCompany([FromBody] BulkChangeCompanyRequest request)
    {
        if (!_tenantService.IsAdmin) return Forbid();

        if (request.UserIds == null || request.UserIds.Count == 0)
        {
            return BadRequest(new { success = false, message = "Daftar pengguna tidak boleh kosong." });
        }

        var targetCompany = await _context.Companies.FirstOrDefaultAsync(c => c.Id == request.TargetCompanyId);
        if (targetCompany == null)
        {
            return BadRequest(new { success = false, message = "Perusahaan tujuan tidak ditemukan." });
        }

        var users = await _context.Users
            .Where(u => request.UserIds.Contains(u.Id))
            .ToListAsync();

        if (users.Count == 0)
        {
            return BadRequest(new { success = false, message = "Tidak ada pengguna valid yang ditemukan." });
        }

        foreach (var u in users)
        {
            u.CompanyId = request.TargetCompanyId;
        }

        // Perbarui seluruh tugas dari anggota-anggota tersebut ke perusahaan tujuan
        var tasks = await _context.Tasks
            .Where(t => t.AssignedToUserId != null && request.UserIds.Contains(t.AssignedToUserId))
            .ToListAsync();

        foreach (var t in tasks)
        {
            t.CompanyId = request.TargetCompanyId;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"{users.Count} anggota dan {tasks.Count} tugas berhasil dipindahkan ke {targetCompany.Name} ({targetCompany.Code}).",
            updatedUserCount = users.Count,
            updatedTaskCount = tasks.Count
        });
    }
}

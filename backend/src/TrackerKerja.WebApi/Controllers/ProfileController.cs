using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/profile")]
[Route("api/api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly IWebHostEnvironment? _environment;

    public ProfileController(AppDbContext context, ICurrentTenantService tenantService, IWebHostEnvironment? environment = null)
    {
        _context = context;
        _tenantService = tenantService;
        _environment = environment;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Company)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound(new { success = false, message = "Profil tidak ditemukan." });

        var isUserRoleAdmin = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator")));
        var isAdmin = _tenantService.IsAdmin
            || user.Id == "usr-superadmin"
            || isUserRoleAdmin
            || user.Email?.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase) == true
            || user.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase)
            || user.JobTitle.Contains("Architect", StringComparison.OrdinalIgnoreCase);

        var roles = new List<string> { isAdmin ? "Administrator" : "Member" };

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
            roles,
            user.PhoneNumber,
            user.CreatedAt
        );

        return Ok(new { success = true, data = profile });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        user.FullName = request.FullName.Trim();
        user.JobTitle = request.JobTitle.Trim();
        if (!string.IsNullOrWhiteSpace(request.AvatarColor))
        {
            user.AvatarColor = request.AvatarColor;
        }
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

        // Update avatar if explicitly provided (allow explicit clearing with empty string)
        if (request.ProfilePictureUrl != null)
        {
            user.ProfilePictureUrl = string.IsNullOrWhiteSpace(request.ProfilePictureUrl) ? null : request.ProfilePictureUrl.Trim();
        }

        // Update cover if explicitly provided (allow explicit clearing with empty string)
        if (request.CoverPictureUrl != null)
        {
            user.CoverPictureUrl = string.IsNullOrWhiteSpace(request.CoverPictureUrl) ? null : request.CoverPictureUrl.Trim();
        }

        user.ConcurrencyStamp = Guid.NewGuid().ToString();

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Profil berhasil diperbarui." });
    }

    [HttpPut("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || string.IsNullOrEmpty(user.PasswordHash)) return NotFound();

        if (!PasswordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { success = false, message = "Kata sandi lama tidak cocok." });
        }

        user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Kata sandi berhasil diubah." });
    }

    [HttpPost("avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile? file)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File gambar avatar tidak ditemukan." });
        }

        // Validasi ukuran max 2MB
        if (file.Length > 2 * 1024 * 1024)
        {
            return BadRequest(new { success = false, message = "Ukuran file avatar maksimal 2MB." });
        }

        // Validasi ekstensi
        var allowedExts = new[] { ".png", ".jpg", ".jpeg", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExts.Contains(ext))
        {
            return BadRequest(new { success = false, message = "Format file tidak didukung. Harap unggah PNG, JPG, atau WEBP." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var safeUserName = SanitizeUserNameForFolder(user.UserName ?? user.Email ?? user.Id);
        var fileName = $"{safeUserName}_avatar_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

        // 1. Simpan di backend wwwroot/uploads/users/{safeUserName}/avatar/
        var rootPath = _environment?.WebRootPath ?? Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "wwwroot");
        var avatarsDir = Path.Combine(rootPath, "uploads", "users", safeUserName, "avatar");
        Directory.CreateDirectory(avatarsDir);
        var filePath = Path.Combine(avatarsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 2. Simpan juga di folder frontend/public/uploads/users/{safeUserName}/avatar/
        var candidateFrontendDirs = new[]
        {
            Path.GetFullPath(Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "..", "..", "..", "frontend", "public", "uploads", "users", safeUserName, "avatar")),
            Path.GetFullPath(Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "..", "..", "frontend", "public", "uploads", "users", safeUserName, "avatar")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "frontend", "public", "uploads", "users", safeUserName, "avatar")),
            Path.Combine(@"c:\TEMP\VSCODE\TrackerKerjaModern\frontend\public\uploads\users", safeUserName, "avatar")
        };

        foreach (var dir in candidateFrontendDirs)
        {
            try
            {
                var parentDir = Directory.GetParent(dir)?.FullName;
                if (parentDir != null && (Directory.Exists(parentDir) || parentDir.Contains("frontend")))
                {
                    Directory.CreateDirectory(dir);
                    var fPath = Path.Combine(dir, fileName);
                    System.IO.File.Copy(filePath, fPath, true);
                    break;
                }
            }
            catch { /* fallback */ }
        }

        var relativeUrl = $"/uploads/users/{safeUserName}/avatar/{fileName}";
        user.ProfilePictureUrl = relativeUrl;
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Foto profil berhasil diperbarui.",
            url = relativeUrl
        });
    }

    [HttpPost("cover")]
    public async Task<IActionResult> UploadCover(IFormFile? file)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File gambar cover tidak ditemukan." });
        }

        // Validasi ukuran max 5MB
        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { success = false, message = "Ukuran file banner cover maksimal 5MB." });
        }

        // Validasi ekstensi
        var allowedExts = new[] { ".png", ".jpg", ".jpeg", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExts.Contains(ext))
        {
            return BadRequest(new { success = false, message = "Format file tidak didukung. Harap unggah PNG, JPG, atau WEBP." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var safeUserName = SanitizeUserNameForFolder(user.UserName ?? user.Email ?? user.Id);
        var fileName = $"{safeUserName}_cover_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

        // 1. Simpan di backend wwwroot/uploads/users/{safeUserName}/cover/
        var rootPath = _environment?.WebRootPath ?? Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "wwwroot");
        var coversDir = Path.Combine(rootPath, "uploads", "users", safeUserName, "cover");
        Directory.CreateDirectory(coversDir);
        var filePath = Path.Combine(coversDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 2. Simpan juga di folder frontend/public/uploads/users/{safeUserName}/cover/
        var candidateFrontendDirs = new[]
        {
            Path.GetFullPath(Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "..", "..", "..", "frontend", "public", "uploads", "users", safeUserName, "cover")),
            Path.GetFullPath(Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "..", "..", "frontend", "public", "uploads", "users", safeUserName, "cover")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "frontend", "public", "uploads", "users", safeUserName, "cover")),
            Path.Combine(@"c:\TEMP\VSCODE\TrackerKerjaModern\frontend\public\uploads\users", safeUserName, "cover")
        };

        foreach (var dir in candidateFrontendDirs)
        {
            try
            {
                var parentDir = Directory.GetParent(dir)?.FullName;
                if (parentDir != null && (Directory.Exists(parentDir) || parentDir.Contains("frontend")))
                {
                    Directory.CreateDirectory(dir);
                    var fPath = Path.Combine(dir, fileName);
                    System.IO.File.Copy(filePath, fPath, true);
                    break;
                }
            }
            catch { /* fallback */ }
        }

        var relativeUrl = $"/uploads/users/{safeUserName}/cover/{fileName}";
        user.CoverPictureUrl = relativeUrl;
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Banner sampul profil berhasil diperbarui.",
            url = relativeUrl
        });
    }

    private static string SanitizeUserNameForFolder(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "user_default";
        var safe = raw.Trim().Replace("@", "_").Replace(".", "_");
        var invalids = Path.GetInvalidFileNameChars();
        foreach (var c in invalids)
        {
            safe = safe.Replace(c, '_');
        }
        return safe.ToLowerInvariant();
    }
}

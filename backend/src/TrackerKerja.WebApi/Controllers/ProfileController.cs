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
        var isPurgeRole = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-purge-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "DataPurgeAdmin")));
        var isPmRole = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && (ur.RoleId == "r-pm" || _context.Roles.Any(r => r.Id == ur.RoleId && (r.Name == "Project Manager" || r.Name == "ProjectManager")))) || user.JobTitle.Contains("Project Manager", StringComparison.OrdinalIgnoreCase);
        var isAdmin = _tenantService.IsAdmin
            || user.Id == "usr-superadmin"
            || isUserRoleAdmin
            || user.Email?.Equals("admin@trackerkerja.local", StringComparison.OrdinalIgnoreCase) == true
            || (user.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase) && !isPmRole)
            || user.JobTitle.Contains("Architect", StringComparison.OrdinalIgnoreCase);

        var roles = new List<string>();
        if (isAdmin) roles.Add("Administrator");
        if (isPmRole && !isAdmin) roles.Add("Project Manager");
        if (isPurgeRole && !isAdmin && !isPmRole) roles.Add("DataPurgeAdmin");
        if (roles.Count == 0) {
            roles.Add("Staff");
            roles.Add("Member");
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
            var trimmed = request.ProfilePictureUrl.Trim();
            if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                var safe = SanitizeUserNameForFolder(user.UserName ?? user.Email ?? user.Id);
                user.ProfilePictureUrl = await TrySaveBase64ImageAsync(trimmed, safe, "avatar", "avatar");
            }
            else
            {
                user.ProfilePictureUrl = string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
            }
        }

        // Update cover if explicitly provided (allow explicit clearing with empty string)
        if (request.CoverPictureUrl != null)
        {
            var trimmed = request.CoverPictureUrl.Trim();
            if (trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                var safe = SanitizeUserNameForFolder(user.UserName ?? user.Email ?? user.Id);
                user.CoverPictureUrl = await TrySaveBase64ImageAsync(trimmed, safe, "cover", "cover");
            }
            else
            {
                user.CoverPictureUrl = string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
            }
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
            if (Request.HasFormContentType && Request.Form.Files.Count > 0)
            {
                file = Request.Form.Files["file"] ?? Request.Form.Files["avatar"] ?? Request.Form.Files.FirstOrDefault();
            }
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File gambar avatar tidak ditemukan." });
        }

        // Validasi ukuran max 5MB
        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { success = false, message = "Ukuran file avatar maksimal 5MB." });
        }

        // Validasi ekstensi
        var allowedExts = new[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExts.Contains(ext))
        {
            return BadRequest(new { success = false, message = "Format file tidak didukung. Harap unggah PNG, JPG, atau WEBP." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var safeUserName = SanitizeUserNameForFolder(user.UserName ?? user.Email ?? user.Id);
        var relativeUrl = await SaveUserMediaFileAsync(file, safeUserName, "avatar", "avatar");

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
            if (Request.HasFormContentType && Request.Form.Files.Count > 0)
            {
                file = Request.Form.Files["file"] ?? Request.Form.Files["cover"] ?? Request.Form.Files.FirstOrDefault();
            }
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { success = false, message = "File gambar cover tidak ditemukan." });
        }

        // Validasi ukuran max 10MB
        if (file.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new { success = false, message = "Ukuran file banner cover maksimal 10MB." });
        }

        // Validasi ekstensi
        var allowedExts = new[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExts.Contains(ext))
        {
            return BadRequest(new { success = false, message = "Format file tidak didukung. Harap unggah PNG, JPG, atau WEBP." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        var safeUserName = SanitizeUserNameForFolder(user.UserName ?? user.Email ?? user.Id);
        var relativeUrl = await SaveUserMediaFileAsync(file, safeUserName, "cover", "cover");

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

    private async Task<string> SaveUserMediaFileAsync(IFormFile file, string safeUserName, string subFolder, string prefix)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".png";
        var fileName = $"{safeUserName}_{prefix}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

        var contentRoot = _environment?.ContentRootPath ?? Directory.GetCurrentDirectory();

        // 1. Backend ContentRootPath/uploads/... (served by StaticFiles in Program.cs)
        var primaryUploadDir = Path.Combine(contentRoot, "uploads", "users", safeUserName, subFolder);
        Directory.CreateDirectory(primaryUploadDir);
        var primaryFilePath = Path.Combine(primaryUploadDir, fileName);

        using (var stream = new FileStream(primaryFilePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 2. Backend wwwroot/uploads/...
        try
        {
            var wwwrootDir = Path.Combine(_environment?.WebRootPath ?? Path.Combine(contentRoot, "wwwroot"), "uploads", "users", safeUserName, subFolder);
            Directory.CreateDirectory(wwwrootDir);
            var wwwrootFile = Path.Combine(wwwrootDir, fileName);
            if (!System.IO.File.Exists(wwwrootFile))
            {
                System.IO.File.Copy(primaryFilePath, wwwrootFile, true);
            }
        }
        catch { /* ignore */ }

        // 3. Frontend public/uploads/...
        var candidateFrontendDirs = new[]
        {
            @"c:\TEMP\VSCODE\TrackerKerjaModern\frontend\public\uploads\users",
            Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "..", "frontend", "public", "uploads", "users")),
            Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "frontend", "public", "uploads", "users")),
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "frontend", "public", "uploads", "users"))
        };

        foreach (var baseDir in candidateFrontendDirs)
        {
            try
            {
                if (Directory.Exists(baseDir) || Directory.Exists(Path.GetDirectoryName(baseDir) ?? ""))
                {
                    var targetDir = Path.Combine(baseDir, safeUserName, subFolder);
                    Directory.CreateDirectory(targetDir);
                    var targetFile = Path.Combine(targetDir, fileName);
                    System.IO.File.Copy(primaryFilePath, targetFile, true);
                    break;
                }
            }
            catch { /* ignore */ }
        }

        return $"/uploads/users/{safeUserName}/{subFolder}/{fileName}";
    }

    private async Task<string?> TrySaveBase64ImageAsync(string? dataUrl, string safeUserName, string subFolder, string prefix)
    {
        if (string.IsNullOrWhiteSpace(dataUrl) || !dataUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            return dataUrl;
        }

        try
        {
            var parts = dataUrl.Split(',');
            if (parts.Length < 2) return dataUrl;

            var meta = parts[0];
            var ext = ".png";
            if (meta.Contains("jpeg") || meta.Contains("jpg")) ext = ".jpg";
            else if (meta.Contains("webp")) ext = ".webp";
            else if (meta.Contains("gif")) ext = ".gif";

            var bytes = Convert.FromBase64String(parts[1]);
            var fileName = $"{safeUserName}_{prefix}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";

            var contentRoot = _environment?.ContentRootPath ?? Directory.GetCurrentDirectory();
            var primaryUploadDir = Path.Combine(contentRoot, "uploads", "users", safeUserName, subFolder);
            Directory.CreateDirectory(primaryUploadDir);
            var primaryFilePath = Path.Combine(primaryUploadDir, fileName);
            await System.IO.File.WriteAllBytesAsync(primaryFilePath, bytes);

            // Copy to wwwroot
            try
            {
                var wwwrootDir = Path.Combine(_environment?.WebRootPath ?? Path.Combine(contentRoot, "wwwroot"), "uploads", "users", safeUserName, subFolder);
                Directory.CreateDirectory(wwwrootDir);
                System.IO.File.Copy(primaryFilePath, Path.Combine(wwwrootDir, fileName), true);
            }
            catch { }

            // Copy to frontend/public
            try
            {
                var feDir = Path.Combine(@"c:\TEMP\VSCODE\TrackerKerjaModern\frontend\public\uploads\users", safeUserName, subFolder);
                Directory.CreateDirectory(feDir);
                System.IO.File.Copy(primaryFilePath, Path.Combine(feDir, fileName), true);
            }
            catch { }

            return $"/uploads/users/{safeUserName}/{subFolder}/{fileName}";
        }
        catch
        {
            return dataUrl;
        }
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

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
        if (request.PhoneNumber != null)
        {
            user.PhoneNumber = request.PhoneNumber.Trim();
        }
        if (request.ProfilePictureUrl != null)
        {
            user.ProfilePictureUrl = request.ProfilePictureUrl;
        }
        if (request.CoverPictureUrl != null)
        {
            user.CoverPictureUrl = request.CoverPictureUrl;
        }

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

        var rootPath = _environment?.WebRootPath ?? Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "wwwroot");
        var avatarsDir = Path.Combine(rootPath, "uploads", "avatars");
        if (!Directory.Exists(avatarsDir))
        {
            Directory.CreateDirectory(avatarsDir);
        }

        var fileName = $"{userId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";
        var filePath = Path.Combine(avatarsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/uploads/avatars/{fileName}";
        user.ProfilePictureUrl = relativeUrl;
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

        var rootPath = _environment?.WebRootPath ?? Path.Combine(_environment?.ContentRootPath ?? Directory.GetCurrentDirectory(), "wwwroot");
        var coversDir = Path.Combine(rootPath, "uploads", "covers");
        if (!Directory.Exists(coversDir))
        {
            Directory.CreateDirectory(coversDir);
        }

        var fileName = $"{userId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ext}";
        var filePath = Path.Combine(coversDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var relativeUrl = $"/uploads/covers/{fileName}";
        user.CoverPictureUrl = relativeUrl;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Banner sampul profil berhasil diperbarui.",
            url = relativeUrl
        });
    }
}

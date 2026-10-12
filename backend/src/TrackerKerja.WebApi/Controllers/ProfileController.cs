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

    public ProfileController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
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
            new List<string> { user.JobTitle.Contains("Admin") ? "Administrator" : "Member" }
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
        user.AvatarColor = request.AvatarColor;

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
}

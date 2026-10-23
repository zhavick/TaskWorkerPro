using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/configuration/status")]
[Route("api/status")]
[AllowAnonymous]
public class SystemStatusController : ControllerBase
{
    private const string TargetAdminEmail = "admin@trackerkerja.com";
    private const string TargetAdminPassword = "AdminSecure@2026!!";

    private readonly AppDbContext _context;
    private readonly IJwtTokenService _jwtService;
    private readonly IConfiguration _configuration;

    public SystemStatusController(
        AppDbContext context,
        IJwtTokenService jwtService,
        IConfiguration configuration)
    {
        _context = context;
        _jwtService = jwtService;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();

        // 1. Cek Koneksi Database
        bool dbConnected = false;
        long dbLatencyMs = 0;
        string? dbError = null;
        int totalUsers = 0;
        int totalCompanies = 0;
        int totalTasks = 0;
        int totalBadges = 0;

        try
        {
            var dbSw = Stopwatch.StartNew();
            dbConnected = await _context.Database.CanConnectAsync(ct);
            dbLatencyMs = dbSw.ElapsedMilliseconds;

            if (dbConnected)
            {
                totalUsers = await _context.Users.CountAsync(ct);
                totalCompanies = await _context.Companies.CountAsync(ct);
                totalTasks = await _context.Tasks.CountAsync(ct);
                totalBadges = await _context.MasterBadges.CountAsync(ct);
            }
        }
        catch (Exception ex)
        {
            dbConnected = false;
            dbError = ex.Message;
        }

        // 2. Cek Akun Admin admin@trackerkerja.com
        AppUser? targetAdmin = null;
        bool hasTargetAdmin = false;
        bool passwordMatches = false;
        bool hasAdminRole = false;

        if (dbConnected)
        {
            targetAdmin = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == TargetAdminEmail, ct);

            if (targetAdmin != null)
            {
                hasTargetAdmin = true;
                passwordMatches = !string.IsNullOrEmpty(targetAdmin.PasswordHash) &&
                    (PasswordHasher.VerifyPassword(TargetAdminPassword, targetAdmin.PasswordHash) ||
                     targetAdmin.PasswordHash == TargetAdminPassword);

                hasAdminRole = await _context.UserRoles.AnyAsync(ur =>
                    ur.UserId == targetAdmin.Id &&
                    (ur.RoleId == "r-admin" || _context.Roles.Any(r => r.Id == ur.RoleId && r.Name == "Administrator")), ct)
                    || targetAdmin.JobTitle.Contains("Admin", StringComparison.OrdinalIgnoreCase);
            }
        }

        // 3. Evaluasi Kelengkapan Seeding
        bool isSeeded = totalCompanies > 0 && totalBadges >= 40 && hasTargetAdmin && passwordMatches;

        sw.Stop();

        return Ok(new
        {
            success = true,
            timestamp = DateTimeOffset.UtcNow,
            executionTimeMs = sw.ElapsedMilliseconds,
            services = new
            {
                frontend = new
                {
                    name = "TaskWorker Pro Modern Frontend (Next.js 16)",
                    status = "Online",
                    isHealthy = true,
                    description = "Aplikasi frontend siap melayani request pengguna"
                },
                backend = new
                {
                    name = "TrackerKerja Modern Web API (.NET 8)",
                    status = "Online",
                    isHealthy = true,
                    environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                    framework = ".NET 8.0 ASP.NET Core",
                    serverTime = DateTimeOffset.UtcNow
                },
                database = new
                {
                    name = "PostgreSQL Database Engine",
                    status = dbConnected ? "Connected" : "Disconnected",
                    isHealthy = dbConnected,
                    latencyMs = dbLatencyMs,
                    error = dbError,
                    metrics = new
                    {
                        companies = totalCompanies,
                        users = totalUsers,
                        tasks = totalTasks,
                        badges = totalBadges
                    }
                }
            },
            admin = new
            {
                targetEmail = TargetAdminEmail,
                expectedPassword = TargetAdminPassword,
                exists = hasTargetAdmin,
                fullName = targetAdmin?.FullName,
                isApproved = targetAdmin?.IsApproved ?? false,
                hasRole = hasAdminRole,
                passwordValid = passwordMatches,
                canLogin = hasTargetAdmin && passwordMatches && (targetAdmin?.IsApproved ?? false)
            },
            seeding = new
            {
                isSeeded,
                statusText = isSeeded 
                    ? "Seeding data awal telah lengkap dan akun admin siap digunakan." 
                    : (!hasTargetAdmin 
                        ? $"Akun admin ({TargetAdminEmail}) belum ditemukan dalam database. Klik tombol 'Jalankan Seeding Data Awal' untuk menginisialisasi." 
                        : "Data master belum lengkap atau kata sandi admin belum terkonfigurasi dengan benar.")
            }
        });
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedInitialData(CancellationToken ct)
    {
        try
        {
            // 1. Jalankan Skema DDL dan Master Data Seeder
            await DbInitializer.SeedAsync(_context);

            // 1b. Buat tabel user_notifications jika belum ada
            if (_context.Database.IsRelational())
            {
                try
                {
                    await _context.Database.ExecuteSqlRawAsync(@"
                        CREATE TABLE IF NOT EXISTS user_notifications (
                            id SERIAL PRIMARY KEY,
                            user_id VARCHAR(450) NOT NULL,
                            company_id INTEGER NOT NULL DEFAULT 1,
                            title VARCHAR(255) NOT NULL,
                            message TEXT NOT NULL,
                            category VARCHAR(50) NOT NULL DEFAULT 'Task',
                            action_url VARCHAR(500),
                            is_read BOOLEAN NOT NULL DEFAULT FALSE,
                            read_at TIMESTAMPTZ,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            created_by_user_id VARCHAR(450)
                        );
                        CREATE INDEX IF NOT EXISTS ix_user_notifications_user_id ON user_notifications(user_id);
                    ", ct);
                }
                catch
                {
                    // Abaikan jika tabel telah dikelola
                }
            }

            // 2. Pastikan Perusahaan Default Ada
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.Code == "WCH", ct);
            if (company == null)
            {
                company = new Company
                {
                    Name = "Wahana Central Holding",
                    Code = "WCH",
                    Description = "Headquarter Enterprise Organization",
                    Address = "Jakarta, Indonesia",
                    ContactEmail = TargetAdminEmail,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.Companies.Add(company);
                await _context.SaveChangesAsync(ct);
            }

            // 3. Pastikan Role Administrator Terdaftar
            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Id == "r-admin" || r.Name == "Administrator", ct);
            if (adminRole == null)
            {
                adminRole = new AppRole
                {
                    Id = "r-admin",
                    Name = "Administrator",
                    NormalizedName = "ADMINISTRATOR"
                };
                _context.Roles.Add(adminRole);
                await _context.SaveChangesAsync(ct);
            }

            // 4. Inisialisasi atau Perbarui Akun Admin: admin@trackerkerja.com
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == TargetAdminEmail, ct);
            string actionTaken;

            if (user == null)
            {
                user = new AppUser
                {
                    Id = "usr-admin-trackerkerja",
                    UserName = TargetAdminEmail,
                    NormalizedUserName = TargetAdminEmail.ToUpperInvariant(),
                    Email = TargetAdminEmail,
                    NormalizedEmail = TargetAdminEmail.ToUpperInvariant(),
                    EmailConfirmed = true,
                    FullName = "Administrator TrackerKerja",
                    JobTitle = "System Administrator",
                    AvatarColor = "#4F46E5",
                    CompanyId = company.Id,
                    IsApproved = true,
                    ApprovedAt = DateTimeOffset.UtcNow,
                    PasswordHash = PasswordHasher.HashPassword(TargetAdminPassword),
                    CreatedAt = DateTimeOffset.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync(ct);

                // Tambahkan relasi role Administrator
                var userRole = new AppUserRole
                {
                    UserId = user.Id,
                    RoleId = adminRole.Id
                };
                _context.UserRoles.Add(userRole);
                await _context.SaveChangesAsync(ct);

                actionTaken = "Akun administrator baru berhasil dibuat.";
            }
            else
            {
                user.PasswordHash = PasswordHasher.HashPassword(TargetAdminPassword);
                user.IsApproved = true;
                user.ApprovedAt ??= DateTimeOffset.UtcNow;
                user.JobTitle = "System Administrator";
                user.CompanyId ??= company.Id;

                var hasRole = await _context.UserRoles.AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == adminRole.Id, ct);
                if (!hasRole)
                {
                    _context.UserRoles.Add(new AppUserRole { UserId = user.Id, RoleId = adminRole.Id });
                }

                await _context.SaveChangesAsync(ct);
                actionTaken = "Akun administrator yang sudah ada berhasil diperbarui kata sandi dan status approval-nya.";
            }

            return Ok(new
            {
                success = true,
                message = "Proses seeding data awal dan inisialisasi akun admin berhasil diselesaikan.",
                action = actionTaken,
                adminAccount = new
                {
                    email = TargetAdminEmail,
                    password = TargetAdminPassword,
                    fullName = user.FullName,
                    role = "Administrator",
                    isApproved = user.IsApproved
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                success = false,
                message = "Gagal menjalankan seeding data: " + ex.Message,
                detail = ex.StackTrace
            });
        }
    }

    [HttpPost("test-login")]
    public async Task<IActionResult> TestLogin(CancellationToken ct)
    {
        var user = await _context.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email == TargetAdminEmail, ct);

        if (user == null)
        {
            return NotFound(new
            {
                success = false,
                message = $"User {TargetAdminEmail} tidak ditemukan. Silakan jalankan seeding terlebih dahulu."
            });
        }

        var isPasswordValid = !string.IsNullOrEmpty(user.PasswordHash) &&
            (PasswordHasher.VerifyPassword(TargetAdminPassword, user.PasswordHash) ||
             user.PasswordHash == TargetAdminPassword);

        if (!isPasswordValid)
        {
            return BadRequest(new
            {
                success = false,
                message = "Kata sandi tidak cocok. Harap jalankan seeding untuk memperbarui hash kata sandi."
            });
        }

        if (!user.IsApproved)
        {
            return StatusCode(403, new
            {
                success = false,
                message = "User ditemukan namun status IsApproved = false."
            });
        }

        var roles = new List<string> { "Administrator" };
        var accessToken = _jwtService.GenerateAccessToken(user, roles, user.Company?.Code);

        return Ok(new
        {
            success = true,
            message = "Uji coba login akun admin BERHASIL! Kredensial valid dan token autentikasi dapat digenerate.",
            user = new
            {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName,
                role = "Administrator",
                companyCode = user.Company?.Code ?? "WCH"
            },
            tokenSample = accessToken.Substring(0, Math.Min(40, accessToken.Length)) + "..."
        });
    }
}

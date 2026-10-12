using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context)
    {
        // 1. Pastikan Perusahaan Default (HQ Tenant)
        var company = await context.Companies.FirstOrDefaultAsync(c => c.Code == "WCH");
        if (company == null)
        {
            company = new Company
            {
                Name = "Wahana Central Holding",
                Code = "WCH",
                Description = "Headquarter Enterprise Organization",
                Address = "Jakarta, Indonesia",
                ContactEmail = "admin@trackerkerja.local",
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.Companies.Add(company);
            await context.SaveChangesAsync();
        }

        // 2. Pastikan Akun Administrator Bawaan (admin@trackerkerja.local / AdminSecurePassword2026!)
        var adminEmail = "admin@trackerkerja.local";
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (adminUser == null)
        {
            adminUser = new AppUser
            {
                Id = "usr-superadmin",
                UserName = adminEmail,
                NormalizedUserName = adminEmail.ToUpperInvariant(),
                Email = adminEmail,
                NormalizedEmail = adminEmail.ToUpperInvariant(),
                EmailConfirmed = true,
                FullName = "Super Administrator",
                JobTitle = "Lead Systems Architect & Administrator",
                AvatarColor = "#6366F1",
                CompanyId = company.Id,
                IsApproved = true,
                ApprovedAt = DateTimeOffset.UtcNow,
                PasswordHash = PasswordHasher.HashPassword("AdminSecurePassword2026!"),
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
        else if (string.IsNullOrEmpty(adminUser.PasswordHash) || !adminUser.PasswordHash.Contains(':'))
        {
            adminUser.PasswordHash = PasswordHasher.HashPassword("AdminSecurePassword2026!");
            adminUser.IsApproved = true;
            await context.SaveChangesAsync();
        }
    }
}

# 🔒 FASE 2: KONFIGURASI DAN KEAMANAN SISTEM
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Teknis Konfigurasi Runtime, Pipeline Keamanan, Autentikasi JWT, Multi-Tenancy Scoping, dan Proteksi Sesi**  
> **Target Framework**: ASP.NET Core 8.0/9.0 Web API, PostgreSQL 16, Next.js 16  
> **Status**: Ready for Implementation  

---

## 1. Konfigurasi Aplikasi (`appsettings.json`)

Pada proyek `TrackerKerja.WebApi`, buat file `appsettings.json` dengan struktur komprehensif berikut:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=trackerkerja_db;Username=tracker_admin;Password=TrackerSecurePassword2026!;Maximum Pool Size=100;Minimum Pool Size=10;Connection Lifetime=300;Include Error Detail=true;"
  },
  "JwtSettings": {
    "SecretKey": "SUPER_SECRET_KEY_FOR_TRACKER_KERJA_2026_MINIMUM_32_BYTES_STRONG!",
    "Issuer": "https://api.trackerkerja.local",
    "Audience": "https://app.trackerkerja.local",
    "AccessTokenExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7,
    "ClockSkewMinutes": 1
  },
  "CorsSettings": {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://localhost:3000",
      "http://127.0.0.1:3000"
    ]
  },
  "SecuritySettings": {
    "SessionTimeoutMinutes": 60,
    "SessionWarningBeforeMinutes": 5,
    "MaxFailedLoginAttempts": 3,
    "LockoutDurationMinutes": 30,
    "PasswordResetTokenLifespanMinutes": 15
  },
  "SmtpSettings": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "EnableSsl": true,
    "SenderName": "Work Tracker Pro Notification",
    "SenderEmail": "no-reply@trackerkerja.local",
    "Username": "",
    "Password": "",
    "IsActive": false
  },
  "UploadSettings": {
    "StorageBasePath": "uploads",
    "MaxFileSizeBytes": 52428800,
    "AllowedExtensions": [
      ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".docx", ".xlsx", ".zip", ".txt", ".sql"
    ]
  }
}
```

---

## 2. Pipeline Autentikasi Ganda: JWT Bearer & Refresh Token Rotation

Aplikasi menggunakan arsitektur autentikasi stateless dengan token JWT:
1. **Access Token (JWT)**:
   - Disertakan dalam header `Authorization: Bearer <access_token>`.
   - Masa berlaku: **60 Menit**.
   - Berisi klaim:
     - `sub` (User ID / GUID)
     - `email` (Alamat Email)
     - `name` (Nama Lengkap)
     - `role` (Role: Administrator, System Analyst, Technical Writer, User Biasa)
     - `companyId` (ID Perusahaan / Tenant)
     - `companyCode` (Kode Unik Perusahaan)
     - `jobTitle` (Jabatan)
2. **Refresh Token**:
   - Disimpan di tabel database `UserRefreshTokens`.
   - Masa berlaku: **7 Hari**.
   - Dikirimkan via Cookie `HttpOnly`, `Secure`, `SameSite=Lax` untuk mencegah XSS.
   - Rotasi otomatis: Setiap kali token di-refresh, refresh token lama dibatalkan (*revoked*) dan token baru diterbitkan.

### Registrasi Authentication & JWT di `Program.cs`:
```csharp
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Dev environment
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});
```

---

## 3. Isolasi Multi-Tenancy (Strict `CompanyId` Scoping)

Sistem menjamin data antar perusahaan tidak akan pernah bocor satu sama lain.

### A. Tenant Context Provider
Buat interface `ICurrentTenantService` di layer `Application`:
```csharp
public interface ICurrentTenantService
{
    int? CompanyId { get; }
    string? CompanyCode { get; }
    string? UserId { get; }
    bool IsAdmin { get; }
}
```

Implementasi di layer `Infrastructure` memanfaatkan `IHttpContextAccessor`:
```csharp
public class CurrentTenantService : ICurrentTenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? CompanyId => int.TryParse(
        _httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value, out var id) ? id : null;

    public string? CompanyCode => _httpContextAccessor.HttpContext?.User?.FindFirst("companyCode")?.Value;
    public string? UserId => _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    public bool IsAdmin => _httpContextAccessor.HttpContext?.User?.IsInRole("Administrator") ?? false;
}
```

### B. EF Core Global Query Filter
Pada `AppDbContext.cs`, daftarkan query filter otomatis pada seluruh entitas yang memiliki relasi `CompanyId`:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

    // Otomatis terapkan filter: jika bukan Admin, hanya tampilkan data milik CompanyId login
    modelBuilder.Entity<WorkTask>().HasQueryFilter(t => 
        _tenantService.IsAdmin || t.CompanyId == _tenantService.CompanyId);

    modelBuilder.Entity<Project>().HasQueryFilter(p => 
        _tenantService.IsAdmin || p.CompanyId == _tenantService.CompanyId);

    modelBuilder.Entity<WorkNote>().HasQueryFilter(n => 
        _tenantService.IsAdmin || n.CompanyId == _tenantService.CompanyId);
}
```

---

## 4. Kebijakan CORS (Cross-Origin Resource Sharing)

Agar Next.js (port 3000) dapat berkomunikasi lancar dengan .NET Web API (port 5000):

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("NextJsClientPolicy", policy =>
    {
        policy.WithOrigins(
            builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:3000" }
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials() // Diperlukan untuk transfer cookie Refresh Token
        .WithExposedHeaders("Content-Disposition", "X-Pagination");
    });
});

// Middleware pipeline (letakkan sebelum UseAuthentication)
app.UseCors("NextJsClientPolicy");
```

---

## 5. Keamanan Sesi & Auto-Logout Inaktivitas 1 Jam

Mengikuti spesifikasi TSD & FSD:
1. **Batas Inaktivitas Sesi**: **60 Menit** tanpa ada aktivitas pengguna.
2. **Peringatan Dini Interaktif (Warning Modal)**: Pada **menit ke-55** (5 menit sebelum auto-logout), frontend Next.js menampilkan dialog modal dengan hitung mundur detik visual (`5:00`, `4:59`, ...).
3. **Tombol "Lanjutkan Sesi"**: Jika pengguna menekan tombol ini, frontend memanggil endpoint `POST /api/auth/refresh-token`, memperbarui token JWT, dan me-reset timer idle.
4. **Auto-Redirect Timeout**: Jika hitung mundur berakhir, frontend otomatis menghapus token lokal dan mengarahkan pengguna ke `/login?reason=timeout`.

---

## 6. Kebijakan Proteksi Lockout Akun (Strict Security Policy)

1. **Max Salah Password**: 3 kali berturut-turut.
2. **Durasi Terkunci**: **30 Menit** secara otomatis (`LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(30)`).
3. **Bypass Admin**: Administrator dapat membuka kunci akun secara instan melalui API `POST /api/members/{id}/unlock`.
4. **Masa Berlaku Token Reset**: Berlaku ketat selama **15 menit**. Jika SMTP tidak aktif, sistem menyediakan **Fallback Claim Link** (`/reset-password-claim?token=...`).

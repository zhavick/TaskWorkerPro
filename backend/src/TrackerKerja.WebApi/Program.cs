using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;
using TrackerKerja.WebApi.Middlewares;

var builder = WebApplication.CreateBuilder(args);

// 1. Controller Services
builder.Services.AddControllers(options =>
{
    options.Filters.Add<TrackerKerja.Infrastructure.Filters.AuditLogActionFilter>();
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddScoped<TrackerKerja.Infrastructure.Filters.AuditLogActionFilter>();
builder.Services.AddHttpContextAccessor();

// Form & Request Size Limits (200MB for Sync Packages & Uploads)
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 209715200; // 200 MB
});
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.Limits.MaxRequestBodySize = 209715200; // 200 MB
});

// 2. Database Context (PostgreSQL via Npgsql)
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(3);
    })
    .UseSnakeCaseNamingConvention();
});

// 3. Application & Infrastructure Services
builder.Services.AddScoped<ICurrentTenantService, CurrentTenantService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IExcelExportService, ClosedXmlExportService>();
builder.Services.AddScoped<ITaskExcelImportService, TaskExcelImportService>();
builder.Services.AddSingleton<ISqlFormatterService, SqlFormatterService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<IBadgeEvaluationService, BadgeEvaluationService>();

// 4. JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"] ?? "SUPER_SECRET_KEY_FOR_TRACKER_KERJA_2026_MINIMUM_32_BYTES_STRONG!");

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
        ValidIssuer = jwtSettings["Issuer"] ?? "https://api.trackerkerja.local",
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"] ?? "https://app.trackerkerja.local",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

// 5. CORS Policy for Next.js Client
builder.Services.AddCors(options =>
{
    options.AddPolicy("NextJsClientPolicy", policy =>
    {
        var origins = builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() 
            ?? new[] { "http://localhost:3000", "http://127.0.0.1:3000" };

        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithExposedHeaders("Content-Disposition", "X-Pagination");
    });
});

// 6. Swagger OpenAPI with JWT Bearer Definition
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TrackerKerja Modern RESTful Web API",
        Version = "v1",
        Description = "Enterprise Work Task Management, Multi-Timer Timesheet, Attendance & Team Analytics API"
    });

    // Add JWT Bearer Security Scheme
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Masukkan token JWT dengan format: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 7. HTTP Pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseStaticFiles();

// Always enable Swagger for testing/development
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TrackerKerja API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("NextJsClientPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// 8. Inisialisasi & Seeding Akun Bawaan (Admin & Default Tenant)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await DbInitializer.SeedAsync(context);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "DbInitializer gagal menjalankan seed pada startup.");
    }
}

app.Run();

using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.Infrastructure.Filters;

public class AuditLogActionFilter : IAsyncActionFilter
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuditLogActionFilter> _logger;

    private static readonly HashSet<string> SensitiveKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "secret", "token", "refreshToken", "authorization", "apiKey", "credential"
    };

    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "DELETE", "PATCH"
    };

    public AuditLogActionFilter(AppDbContext context, ILogger<AuditLogActionFilter> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpMethod = context.HttpContext.Request.Method;
        var path = context.HttpContext.Request.Path.Value ?? string.Empty;

        // Skip non-mutating requests and diagnostic/health endpoints
        if (!MutatingMethods.Contains(httpMethod) || path.StartsWith("/health", StringComparison.OrdinalIgnoreCase))
        {
            await next();
            return;
        }

        var stopwatch = Stopwatch.StartNew();

        // Capture sanitized action arguments before execution
        string? details = null;
        try
        {
            if (context.ActionArguments.Count > 0)
            {
                var sanitizedArgs = new Dictionary<string, object?>();
                foreach (var (k, v) in context.ActionArguments)
                {
                    if (SensitiveKeys.Any(s => k.Contains(s, StringComparison.OrdinalIgnoreCase)))
                    {
                        sanitizedArgs[k] = "[REDACTED]";
                    }
                    else if (v != null && v.GetType().Name.Contains("FormFile", StringComparison.OrdinalIgnoreCase))
                    {
                        sanitizedArgs[k] = "[FILE_UPLOAD]";
                    }
                    else
                    {
                        sanitizedArgs[k] = v;
                    }
                }
                details = JsonSerializer.Serialize(sanitizedArgs, new JsonSerializerOptions
                {
                    WriteIndented = false,
                    MaxDepth = 3
                });
            }
        }
        catch
        {
            details = "[Serialization Error]";
        }

        // Execute action
        var executedContext = await next();
        stopwatch.Stop();

        // Record audit log asynchronously
        try
        {
            var user = context.HttpContext.User;
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? user.FindFirst("sub")?.Value;
            var userEmail = user.FindFirst(ClaimTypes.Email)?.Value
                           ?? user.FindFirst("email")?.Value;
            var userName = user.FindFirst(ClaimTypes.Name)?.Value
                          ?? user.FindFirst("name")?.Value
                          ?? userEmail;

            var controllerName = context.Controller?.GetType().Name.Replace("Controller", "") ?? "Unknown";
            var actionName = context.ActionDescriptor.RouteValues.TryGetValue("action", out var act) ? act : context.ActionDescriptor.DisplayName;

            var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString();
            var statusCode = executedContext.HttpContext.Response.StatusCode;

            var auditLog = new AuditLog
            {
                UserId = userId,
                UserEmail = userEmail,
                UserName = userName,
                ControllerName = controllerName,
                ActionName = actionName,
                HttpMethod = httpMethod,
                Path = path,
                QueryString = context.HttpContext.Request.QueryString.Value,
                IpAddress = ipAddress,
                StatusCode = statusCode,
                DurationMs = (int)stopwatch.ElapsedMilliseconds,
                Timestamp = DateTimeOffset.UtcNow,
                Details = details
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist audit log entry for {Method} {Path}", httpMethod, path);
        }
    }
}

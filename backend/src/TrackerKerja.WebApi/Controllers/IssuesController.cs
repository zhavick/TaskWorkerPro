using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    private static bool _tablesChecked = false;
    private static readonly SemaphoreSlim _tableLock = new(1, 1);

    public IssuesController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    private async Task EnsureIssueTablesAsync()
    {
        if (_tablesChecked) return;
        await _tableLock.WaitAsync();
        try
        {
            if (_tablesChecked) return;
            if (_context.Database.IsRelational())
            {
                await _context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS issue_tickets (
                        id SERIAL PRIMARY KEY,
                        ticket_code VARCHAR(50) NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        status INTEGER NOT NULL DEFAULT 0,
                        priority INTEGER NOT NULL DEFAULT 1,
                        category VARCHAR(100),
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                        reported_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
                        assigned_to_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
                        resolved_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_issue_tickets_company_id ON issue_tickets(company_id);
                    CREATE INDEX IF NOT EXISTS ix_issue_tickets_project_id ON issue_tickets(project_id);
                    CREATE INDEX IF NOT EXISTS ix_issue_tickets_status ON issue_tickets(status);

                    CREATE TABLE IF NOT EXISTS issue_ticket_comments (
                        id SERIAL PRIMARY KEY,
                        ticket_id INTEGER NOT NULL REFERENCES issue_tickets(id) ON DELETE CASCADE,
                        user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
                        message TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_issue_ticket_comments_ticket_id ON issue_ticket_comments(ticket_id);
                ");
            }
            _tablesChecked = true;
        }
        catch
        {
            // Ignore if already created or using in-memory provider
        }
        finally
        {
            _tableLock.Release();
        }
    }

    private async Task<int?> GetUserCompanyIdAsync()
    {
        if (_tenantService.CompanyId.HasValue) return _tenantService.CompanyId.Value;
        if (!string.IsNullOrEmpty(_tenantService.UserId))
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == _tenantService.UserId);
            return user?.CompanyId;
        }
        return null;
    }

    [HttpGet]
    public async Task<IActionResult> GetIssues(
        [FromQuery] int? companyId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] IssueStatus? status = null,
        [FromQuery] IssuePriority? priority = null,
        [FromQuery] string? search = null)
    {
        await EnsureIssueTablesAsync();
        var userCompanyId = await GetUserCompanyIdAsync();
        var query = _context.IssueTickets
            .Include(i => i.Company)
            .Include(i => i.Project)
            .Include(i => i.ReportedByUser)
            .Include(i => i.AssignedToUser)
            .Include(i => i.Comments)
            .AsNoTracking()
            .AsQueryable();

        // Multi-tenant isolation
        if (!_tenantService.IsAdmin && userCompanyId.HasValue)
        {
            query = query.Where(i => i.CompanyId == userCompanyId.Value);
        }
        else if (companyId.HasValue)
        {
            query = query.Where(i => i.CompanyId == companyId.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(i => i.ProjectId == projectId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(i => i.Status == status.Value);
        }

        if (priority.HasValue)
        {
            query = query.Where(i => i.Priority == priority.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i => i.Title.ToLower().Contains(s) || 
                                     i.TicketCode.ToLower().Contains(s) ||
                                     (i.Description != null && i.Description.ToLower().Contains(s)));
        }

        var tickets = await query
            .OrderByDescending(i => i.Priority)
            .ThenByDescending(i => i.CreatedAt)
            .ToListAsync();

        var dtos = tickets.Select(i => new IssueTicketDto(
            i.Id,
            i.TicketCode,
            i.Title,
            i.Description,
            i.Status,
            i.Priority,
            i.Category,
            i.CompanyId,
            i.Company?.Name,
            i.ProjectId,
            i.Project?.Name,
            i.ReportedByUserId,
            i.ReportedByUser?.FullName,
            i.AssignedToUserId,
            i.AssignedToUser?.FullName,
            i.ResolvedAt,
            i.CreatedAt,
            i.UpdatedAt,
            i.Comments.Count
        )).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetIssueById(int id)
    {
        var issue = await _context.IssueTickets
            .Include(i => i.Company)
            .Include(i => i.Project)
            .Include(i => i.ReportedByUser)
            .Include(i => i.AssignedToUser)
            .Include(i => i.Comments)
                .ThenInclude(c => c.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id);

        if (issue == null)
        {
            return NotFound(new { success = false, message = "Tiket issue tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsAdmin && userCompanyId.HasValue && issue.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak memiliki akses ke tiket perusahaan lain." });
        }

        var commentDtos = issue.Comments
            .OrderBy(c => c.CreatedAt)
            .Select(c => new IssueTicketCommentDto(
                c.Id,
                c.TicketId,
                c.UserId,
                c.User?.FullName,
                c.User?.AvatarColor,
                c.Message,
                c.CreatedAt
            )).ToList();

        var detailDto = new IssueTicketDetailDto(
            issue.Id,
            issue.TicketCode,
            issue.Title,
            issue.Description,
            issue.Status,
            issue.Priority,
            issue.Category,
            issue.CompanyId,
            issue.Company?.Name,
            issue.ProjectId,
            issue.Project?.Name,
            issue.ReportedByUserId,
            issue.ReportedByUser?.FullName,
            issue.AssignedToUserId,
            issue.AssignedToUser?.FullName,
            issue.ResolvedAt,
            issue.CreatedAt,
            issue.UpdatedAt,
            commentDtos
        );

        return Ok(new { success = true, data = detailDto });
    }

    [HttpPost]
    public async Task<IActionResult> CreateIssue([FromBody] CreateIssueTicketRequest request)
    {
        await EnsureIssueTablesAsync();

        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });
        }

        string? validReportedByUserId = null;
        var userExists = await _context.Users.AnyAsync(u => u.Id == currentUserId);
        if (userExists)
        {
            validReportedByUserId = currentUserId;
        }
        else
        {
            var emailClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(emailClaim))
            {
                var userByEmail = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == emailClaim);
                if (userByEmail != null) validReportedByUserId = userByEmail.Id;
            }
        }

        string? validAssignedToUserId = null;
        if (!string.IsNullOrEmpty(request.AssignedToUserId))
        {
            var assignedExists = await _context.Users.AnyAsync(u => u.Id == request.AssignedToUserId);
            if (assignedExists) validAssignedToUserId = request.AssignedToUserId;
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        int? targetCompanyId = request.CompanyId ?? userCompanyId;

        if (!targetCompanyId.HasValue)
        {
            return BadRequest(new { success = false, message = "Perusahaan wajib ditentukan untuk membuat tiket." });
        }

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == targetCompanyId.Value);
        if (company == null)
        {
            return BadRequest(new { success = false, message = "Perusahaan tidak valid." });
        }
        if (!company.EnableTicketing)
        {
            return StatusCode(403, new { success = false, message = "Modul Issues & Ticketing System dinonaktifkan untuk perusahaan ini. Hubungi Administrator untuk mengaktifkan modul." });
        }

        if (request.ProjectId.HasValue)
        {
            var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.ProjectId.Value);
            if (project == null || (project.CompanyId.HasValue && project.CompanyId.Value != targetCompanyId.Value))
            {
                return BadRequest(new { success = false, message = "Proyek yang dipilih tidak berasal dari perusahaan yang sama." });
            }
        }

        // Generate Ticket Code
        var currentYear = DateTime.UtcNow.Year;
        var totalExisting = await _context.IssueTickets.CountAsync(i => i.CompanyId == targetCompanyId.Value) + 1;
        var ticketCode = $"TCK-{currentYear}-{totalExisting:D4}";

        var ticket = new IssueTicket
        {
            TicketCode = ticketCode,
            Title = request.Title.Trim(),
            Description = request.Description,
            Status = IssueStatus.Open,
            Priority = request.Priority,
            Category = request.Category?.Trim() ?? "Bug",
            CompanyId = targetCompanyId.Value,
            ProjectId = request.ProjectId,
            ReportedByUserId = validReportedByUserId,
            AssignedToUserId = validAssignedToUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        try
        {
            _context.IssueTickets.Add(ticket);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Tiket issue berhasil dibuat.", data = ticket });
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new
            {
                success = false,
                message = $"Gagal menyimpan tiket issue: {innerMsg}",
                detail = ex.ToString()
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateIssue(int id, [FromBody] UpdateIssueTicketRequest request)
    {
        var ticket = await _context.IssueTickets.FirstOrDefaultAsync(i => i.Id == id);
        if (ticket == null)
        {
            return NotFound(new { success = false, message = "Tiket issue tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsAdmin && userCompanyId.HasValue && ticket.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berwenang memperbarui tiket ini." });
        }

        ticket.Title = request.Title.Trim();
        ticket.Description = request.Description;
        ticket.Priority = request.Priority;
        ticket.Category = request.Category?.Trim();
        ticket.ProjectId = request.ProjectId;
        ticket.AssignedToUserId = request.AssignedToUserId;

        if (ticket.Status != request.Status)
        {
            ticket.Status = request.Status;
            if (request.Status == IssueStatus.Resolved || request.Status == IssueStatus.Closed)
            {
                ticket.ResolvedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                ticket.ResolvedAt = null;
            }
        }

        ticket.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Data tiket berhasil diperbarui.", data = ticket });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteIssue(int id)
    {
        var ticket = await _context.IssueTickets.FirstOrDefaultAsync(i => i.Id == id);
        if (ticket == null)
        {
            return NotFound(new { success = false, message = "Tiket issue tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        var currentUserId = _tenantService.UserId;
        var isReporter = ticket.ReportedByUserId == currentUserId;
        var canDelete = _tenantService.IsAdmin || _tenantService.IsProjectManager || isReporter;

        if (!canDelete || (!_tenantService.IsAdmin && userCompanyId.HasValue && ticket.CompanyId != userCompanyId.Value))
        {
            return StatusCode(403, new { success = false, message = "Anda tidak memiliki wewenang untuk menghapus tiket ini." });
        }

        _context.IssueTickets.Remove(ticket);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tiket issue berhasil dihapus." });
    }

    [HttpPost("{id:int}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateIssueCommentRequest request)
    {
        var ticket = await _context.IssueTickets.FirstOrDefaultAsync(i => i.Id == id);
        if (ticket == null)
        {
            return NotFound(new { success = false, message = "Tiket issue tidak ditemukan." });
        }

        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { success = false, message = "Pesan komentar tidak boleh kosong." });
        }

        var comment = new IssueTicketComment
        {
            TicketId = ticket.Id,
            UserId = currentUserId,
            Message = request.Message.Trim(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.IssueTicketComments.Add(comment);
        ticket.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);

        var dto = new IssueTicketCommentDto(
            comment.Id,
            comment.TicketId,
            comment.UserId,
            user?.FullName,
            user?.AvatarColor,
            comment.Message,
            comment.CreatedAt
        );

        return Ok(new { success = true, message = "Komentar berhasil ditambahkan.", data = dto });
    }
}


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

    public IssuesController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
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
        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        int? targetCompanyId = request.CompanyId ?? userCompanyId;

        if (!targetCompanyId.HasValue)
        {
            return BadRequest(new { success = false, message = "Perusahaan wajib ditentukan untuk membuat tiket." });
        }

        var companyExists = await _context.Companies.AnyAsync(c => c.Id == targetCompanyId.Value);
        if (!companyExists)
        {
            return BadRequest(new { success = false, message = "Perusahaan tidak valid." });
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
            ReportedByUserId = currentUserId,
            AssignedToUserId = request.AssignedToUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.IssueTickets.Add(ticket);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tiket issue berhasil dibuat.", data = ticket });
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

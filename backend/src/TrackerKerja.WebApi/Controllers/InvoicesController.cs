using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;

    private static bool _tablesChecked = false;
    private static readonly SemaphoreSlim _tableLock = new(1, 1);

    public InvoicesController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    private async Task EnsureInvoiceTablesAsync()
    {
        if (_tablesChecked) return;
        await _tableLock.WaitAsync();
        try
        {
            if (_tablesChecked) return;
            if (_context.Database.IsRelational())
            {
                await _context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS invoices (
                        id SERIAL PRIMARY KEY,
                        invoice_number VARCHAR(50) NOT NULL,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                        client_name VARCHAR(255) NOT NULL,
                        client_email VARCHAR(255),
                        client_address TEXT,
                        issue_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        due_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        status INTEGER NOT NULL DEFAULT 0,
                        tax_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 11.00,
                        discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
                        sub_total NUMERIC(18,2) NOT NULL DEFAULT 0.00,
                        tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
                        total_amount NUMERIC(18,2) NOT NULL DEFAULT 0.00,
                        notes TEXT,
                        created_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
                        paid_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_invoices_company_id ON invoices(company_id);
                    CREATE INDEX IF NOT EXISTS ix_invoices_status ON invoices(status);

                    CREATE TABLE IF NOT EXISTS invoice_items (
                        id SERIAL PRIMARY KEY,
                        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                        description VARCHAR(500) NOT NULL,
                        quantity NUMERIC(18,2) NOT NULL DEFAULT 1.00,
                        unit_price NUMERIC(18,2) NOT NULL DEFAULT 0.00,
                        amount NUMERIC(18,2) NOT NULL DEFAULT 0.00
                    );
                    CREATE INDEX IF NOT EXISTS ix_invoice_items_invoice_id ON invoice_items(invoice_id);
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
    public async Task<IActionResult> GetInvoices(
        [FromQuery] int? companyId = null,
        [FromQuery] int? projectId = null,
        [FromQuery] InvoiceStatus? status = null,
        [FromQuery] string? search = null)
    {
        await EnsureInvoiceTablesAsync();
        var userCompanyId = await GetUserCompanyIdAsync();
        var query = _context.Invoices
            .Include(inv => inv.Company)
            .Include(inv => inv.Project)
            .Include(inv => inv.CreatedByUser)
            .Include(inv => inv.Items)
            .AsNoTracking()
            .AsQueryable();

        if (!_tenantService.IsSuperAdmin)
        {
            if (userCompanyId.HasValue)
            {
                query = query.Where(inv => inv.CompanyId == userCompanyId.Value);
            }
        }
        else if (companyId.HasValue)
        {
            query = query.Where(inv => inv.CompanyId == companyId.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(inv => inv.ProjectId == projectId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(inv => inv.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(inv => inv.InvoiceNumber.ToLower().Contains(s) || 
                                       inv.ClientName.ToLower().Contains(s) ||
                                       (inv.ClientEmail != null && inv.ClientEmail.ToLower().Contains(s)));
        }

        var invoices = await query
            .OrderByDescending(inv => inv.CreatedAt)
            .ToListAsync();

        var dtos = invoices.Select(inv => new InvoiceDto(
            inv.Id,
            inv.InvoiceNumber,
            inv.CompanyId,
            inv.Company?.Name,
            inv.ProjectId,
            inv.Project?.Name,
            inv.ClientName,
            inv.ClientEmail,
            inv.ClientAddress,
            inv.IssueDate,
            inv.DueDate,
            inv.Status,
            inv.TaxRatePercent,
            inv.DiscountAmount,
            inv.SubTotal,
            inv.TaxAmount,
            inv.TotalAmount,
            inv.Notes,
            inv.CreatedByUserId,
            inv.CreatedByUser?.FullName,
            inv.PaidAt,
            inv.CreatedAt,
            inv.Items.Select(item => new InvoiceItemDto(
                item.Id,
                item.Description,
                item.Quantity,
                item.UnitPrice,
                item.Amount
            )).ToList()
        )).ToList();

        return Ok(new { success = true, data = dtos });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] int? companyId = null)
    {
        var userCompanyId = await GetUserCompanyIdAsync();
        var query = _context.Invoices.AsNoTracking().AsQueryable();

        if (!_tenantService.IsSuperAdmin)
        {
            if (userCompanyId.HasValue)
            {
                query = query.Where(inv => inv.CompanyId == userCompanyId.Value);
            }
        }
        else if (companyId.HasValue)
        {
            query = query.Where(inv => inv.CompanyId == companyId.Value);
        }

        var invoices = await query.ToListAsync();
        var totalCount = invoices.Count;
        var totalAmount = invoices.Sum(i => i.TotalAmount);
        var paidAmount = invoices.Where(i => i.Status == InvoiceStatus.Paid).Sum(i => i.TotalAmount);
        var pendingAmount = invoices.Where(i => i.Status == InvoiceStatus.Sent || i.Status == InvoiceStatus.Draft).Sum(i => i.TotalAmount);
        var overdueAmount = invoices.Where(i => i.Status == InvoiceStatus.Overdue).Sum(i => i.TotalAmount);

        return Ok(new
        {
            success = true,
            data = new
            {
                totalCount,
                totalAmount,
                paidAmount,
                pendingAmount,
                overdueAmount
            }
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetInvoiceById(int id)
    {
        var inv = await _context.Invoices
            .Include(i => i.Company)
            .Include(i => i.Project)
            .Include(i => i.CreatedByUser)
            .Include(i => i.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id);

        if (inv == null)
        {
            return NotFound(new { success = false, message = "Invoice tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsSuperAdmin && userCompanyId.HasValue && inv.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengakses invoice ini." });
        }

        var dto = new InvoiceDto(
            inv.Id,
            inv.InvoiceNumber,
            inv.CompanyId,
            inv.Company?.Name,
            inv.ProjectId,
            inv.Project?.Name,
            inv.ClientName,
            inv.ClientEmail,
            inv.ClientAddress,
            inv.IssueDate,
            inv.DueDate,
            inv.Status,
            inv.TaxRatePercent,
            inv.DiscountAmount,
            inv.SubTotal,
            inv.TaxAmount,
            inv.TotalAmount,
            inv.Notes,
            inv.CreatedByUserId,
            inv.CreatedByUser?.FullName,
            inv.PaidAt,
            inv.CreatedAt,
            inv.Items.Select(item => new InvoiceItemDto(
                item.Id,
                item.Description,
                item.Quantity,
                item.UnitPrice,
                item.Amount
            )).ToList()
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        await EnsureInvoiceTablesAsync();

        var currentUserId = _tenantService.UserId;
        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new { success = false, message = "Pengguna tidak terautentikasi." });
        }

        // Validasi keberadaan pengguna di database agar relasi FK aman
        string? validUserId = null;
        var userExists = await _context.Users.AnyAsync(u => u.Id == currentUserId);
        if (userExists)
        {
            validUserId = currentUserId;
        }
        else
        {
            var emailClaim = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(emailClaim))
            {
                var userByEmail = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == emailClaim);
                if (userByEmail != null)
                {
                    validUserId = userByEmail.Id;
                }
            }
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        int? targetCompanyId;
        if (!_tenantService.IsSuperAdmin)
        {
            if (!userCompanyId.HasValue)
            {
                return BadRequest(new { success = false, message = "Pengguna tidak terhubung dengan perusahaan manapun." });
            }
            if (request.CompanyId.HasValue && request.CompanyId.Value != userCompanyId.Value)
            {
                return StatusCode(403, new { success = false, message = "Anda tidak diizinkan membuat invoice untuk perusahaan lain." });
            }
            targetCompanyId = userCompanyId.Value;
        }
        else
        {
            targetCompanyId = request.CompanyId ?? userCompanyId;
        }

        if (!targetCompanyId.HasValue)
        {
            return BadRequest(new { success = false, message = "Perusahaan wajib ditentukan untuk membuat invoice." });
        }

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == targetCompanyId.Value);
        if (company == null)
        {
            return BadRequest(new { success = false, message = "Perusahaan tidak valid." });
        }
        if (!company.EnableInvoicing)
        {
            return StatusCode(403, new { success = false, message = "Modul Invoice Management dinonaktifkan untuk perusahaan ini. Hubungi Administrator untuk mengaktifkan modul." });
        }

        if (request.ProjectId.HasValue)
        {
            var project = await _context.Projects.AsNoTracking().FirstOrDefaultAsync(p => p.Id == request.ProjectId.Value);
            if (project == null || (project.CompanyId.HasValue && project.CompanyId.Value != targetCompanyId.Value))
            {
                return BadRequest(new { success = false, message = "Proyek tidak sesuai dengan perusahaan invoice." });
            }
        }

        // Generate Invoice Number if not provided
        var invoiceNumber = request.InvoiceNumber?.Trim();
        if (string.IsNullOrEmpty(invoiceNumber))
        {
            var count = await _context.Invoices.CountAsync(i => i.CompanyId == targetCompanyId.Value) + 1;
            invoiceNumber = $"INV-{DateTime.UtcNow.Year}-{count:D4}";
        }

        // Calculate Items & Totals
        decimal subTotal = 0.00m;
        var invoiceItems = new List<InvoiceItem>();

        if (request.Items != null && request.Items.Count > 0)
        {
            foreach (var itemReq in request.Items)
            {
                var lineAmount = itemReq.Quantity * itemReq.UnitPrice;
                subTotal += lineAmount;
                invoiceItems.Add(new InvoiceItem
                {
                    Description = itemReq.Description.Trim(),
                    Quantity = itemReq.Quantity,
                    UnitPrice = itemReq.UnitPrice,
                    Amount = lineAmount
                });
            }
        }

        var taxRate = request.TaxRatePercent >= 0 ? request.TaxRatePercent : 11.00m;
        var taxAmount = Math.Round(subTotal * (taxRate / 100.00m), 2);
        var discount = request.DiscountAmount >= 0 ? request.DiscountAmount : 0.00m;
        var totalAmount = Math.Max(0, subTotal + taxAmount - discount);

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            CompanyId = targetCompanyId.Value,
            ProjectId = request.ProjectId,
            ClientName = request.ClientName.Trim(),
            ClientEmail = request.ClientEmail?.Trim(),
            ClientAddress = request.ClientAddress?.Trim(),
            IssueDate = request.IssueDate.ToUniversalTime(),
            DueDate = request.DueDate.ToUniversalTime(),
            Status = InvoiceStatus.Draft,
            TaxRatePercent = taxRate,
            DiscountAmount = discount,
            SubTotal = subTotal,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            Notes = request.Notes?.Trim(),
            CreatedByUserId = validUserId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Items = invoiceItems
        };

        try
        {
            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Invoice berhasil dibuat.", data = invoice });
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new
            {
                success = false,
                message = $"Gagal menyimpan invoice ke basis data: {innerMsg}",
                detail = ex.ToString()
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateInvoice(int id, [FromBody] UpdateInvoiceRequest request)
    {
        var invoice = await _context.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = "Invoice tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsSuperAdmin && userCompanyId.HasValue && invoice.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengubah invoice ini." });
        }

        if (!string.IsNullOrWhiteSpace(request.InvoiceNumber))
        {
            invoice.InvoiceNumber = request.InvoiceNumber.Trim();
        }

        invoice.ProjectId = request.ProjectId;
        invoice.ClientName = request.ClientName.Trim();
        invoice.ClientEmail = request.ClientEmail?.Trim();
        invoice.ClientAddress = request.ClientAddress?.Trim();
        invoice.IssueDate = request.IssueDate.ToUniversalTime();
        invoice.DueDate = request.DueDate.ToUniversalTime();
        invoice.Status = request.Status;
        invoice.Notes = request.Notes?.Trim();

        if (request.Status == InvoiceStatus.Paid && invoice.PaidAt == null)
        {
            invoice.PaidAt = DateTimeOffset.UtcNow;
        }

        // Replace Items
        _context.InvoiceItems.RemoveRange(invoice.Items);

        decimal subTotal = 0.00m;
        var newItems = new List<InvoiceItem>();
        if (request.Items != null && request.Items.Count > 0)
        {
            foreach (var itemReq in request.Items)
            {
                var lineAmount = itemReq.Quantity * itemReq.UnitPrice;
                subTotal += lineAmount;
                newItems.Add(new InvoiceItem
                {
                    InvoiceId = invoice.Id,
                    Description = itemReq.Description.Trim(),
                    Quantity = itemReq.Quantity,
                    UnitPrice = itemReq.UnitPrice,
                    Amount = lineAmount
                });
            }
        }

        invoice.Items = newItems;
        invoice.SubTotal = subTotal;
        invoice.TaxRatePercent = request.TaxRatePercent >= 0 ? request.TaxRatePercent : 11.00m;
        invoice.TaxAmount = Math.Round(subTotal * (invoice.TaxRatePercent / 100.00m), 2);
        invoice.DiscountAmount = request.DiscountAmount >= 0 ? request.DiscountAmount : 0.00m;
        invoice.TotalAmount = Math.Max(0, subTotal + invoice.TaxAmount - invoice.DiscountAmount);
        invoice.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Invoice berhasil diperbarui.", data = invoice });
        }
        catch (Exception ex)
        {
            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new
            {
                success = false,
                message = $"Gagal memperbarui invoice: {innerMsg}",
                detail = ex.ToString()
            });
        }
    }

    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateInvoiceStatus(int id, [FromBody] UpdateInvoiceStatusRequest request)
    {
        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = "Invoice tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsSuperAdmin && userCompanyId.HasValue && invoice.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak mengubah status invoice ini." });
        }

        invoice.Status = request.Status;
        if (request.Status == InvoiceStatus.Paid)
        {
            invoice.PaidAt = DateTimeOffset.UtcNow;
        }
        else if (request.Status != InvoiceStatus.Paid)
        {
            invoice.PaidAt = null;
        }

        invoice.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Status invoice berhasil diperbarui.", data = invoice });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteInvoice(int id)
    {
        var invoice = await _context.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
        {
            return NotFound(new { success = false, message = "Invoice tidak ditemukan." });
        }

        var userCompanyId = await GetUserCompanyIdAsync();
        if (!_tenantService.IsSuperAdmin && userCompanyId.HasValue && invoice.CompanyId != userCompanyId.Value)
        {
            return StatusCode(403, new { success = false, message = "Anda tidak berhak menghapus invoice ini." });
        }

        _context.Invoices.Remove(invoice);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Invoice berhasil dihapus." });
    }
}


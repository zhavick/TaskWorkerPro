using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/master")]
[Route("api/masterdata")]
[Route("api/master-data")]
public class MasterDataController : ControllerBase
{
    private readonly AppDbContext _context;

    public MasterDataController(AppDbContext context)
    {
        _context = context;
    }

    // ==========================================
    // PRIORITIES
    // ==========================================

    [HttpGet("priorities")]
    public async Task<IActionResult> GetPriorities()
    {
        var priorities = await _context.MasterPriorities
            .AsNoTracking()
            .OrderBy(p => p.OrderIndex)
            .Select(p => new MasterPriorityDto(p.Id, p.Name, p.Color, p.Icon, p.OrderIndex, p.Description, p.IsDefault))
            .ToListAsync();

        if (priorities.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            priorities = await _context.MasterPriorities
                .AsNoTracking()
                .OrderBy(p => p.OrderIndex)
                .Select(p => new MasterPriorityDto(p.Id, p.Name, p.Color, p.Icon, p.OrderIndex, p.Description, p.IsDefault))
                .ToListAsync();
        }

        return Ok(new { success = true, data = priorities });
    }

    [HttpPost("priorities")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreatePriority([FromBody] CreatePriorityRequest request)
    {
        var priority = new MasterPriority
        {
            Name = request.Name,
            Color = request.Color,
            Icon = request.Icon,
            OrderIndex = request.OrderIndex,
            Description = request.Description,
            IsDefault = request.IsDefault
        };

        _context.MasterPriorities.Add(priority);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = priority });
    }

    [HttpPut("priorities/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdatePriority(int id, [FromBody] UpdatePriorityRequest request)
    {
        var priority = await _context.MasterPriorities.FindAsync(id);
        if (priority == null)
            return NotFound(new { success = false, message = "Prioritas tidak ditemukan" });

        priority.Name = request.Name;
        priority.Color = request.Color;
        priority.Icon = request.Icon;
        priority.OrderIndex = request.OrderIndex;
        priority.Description = request.Description;
        priority.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = priority });
    }

    [HttpDelete("priorities/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeletePriority(int id)
    {
        var priority = await _context.MasterPriorities.FindAsync(id);
        if (priority == null)
            return NotFound(new { success = false, message = "Prioritas tidak ditemukan" });

        if (priority.IsDefault)
            return BadRequest(new { success = false, message = "Prioritas default sistem tidak dapat dihapus." });

        _context.MasterPriorities.Remove(priority);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Prioritas berhasil dihapus" });
    }

    // ==========================================
    // STATUSES
    // ==========================================

    [HttpGet("statuses")]
    public async Task<IActionResult> GetStatuses()
    {
        var statuses = await _context.MasterStatuses
            .AsNoTracking()
            .OrderBy(s => s.OrderIndex)
            .Select(s => new MasterStatusDto(s.Id, s.Name, s.Color, s.IsDoneState, s.OrderIndex, s.Description, s.IsDefault))
            .ToListAsync();

        if (statuses.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            statuses = await _context.MasterStatuses
                .AsNoTracking()
                .OrderBy(s => s.OrderIndex)
                .Select(s => new MasterStatusDto(s.Id, s.Name, s.Color, s.IsDoneState, s.OrderIndex, s.Description, s.IsDefault))
                .ToListAsync();
        }

        return Ok(new { success = true, data = statuses });
    }

    [HttpPost("statuses")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateStatus([FromBody] CreateStatusRequest request)
    {
        var status = new MasterStatus
        {
            Name = request.Name,
            Color = request.Color,
            IsDoneState = request.IsDoneState,
            OrderIndex = request.OrderIndex,
            Description = request.Description,
            IsDefault = request.IsDefault
        };

        _context.MasterStatuses.Add(status);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = status });
    }

    [HttpPut("statuses/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var status = await _context.MasterStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { success = false, message = "Status tidak ditemukan" });

        status.Name = request.Name;
        status.Color = request.Color;
        status.IsDoneState = request.IsDoneState;
        status.OrderIndex = request.OrderIndex;
        status.Description = request.Description;
        status.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = status });
    }

    [HttpDelete("statuses/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteStatus(int id)
    {
        var status = await _context.MasterStatuses.FindAsync(id);
        if (status == null)
            return NotFound(new { success = false, message = "Status tidak ditemukan" });

        if (status.IsDefault)
            return BadRequest(new { success = false, message = "Status default sistem tidak dapat dihapus." });

        _context.MasterStatuses.Remove(status);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Status berhasil dihapus" });
    }

    // ==========================================
    // MILESTONES
    // ==========================================

    [HttpGet("milestones")]
    public async Task<IActionResult> GetMilestones()
    {
        var milestones = await _context.MasterMilestones
            .AsNoTracking()
            .OrderBy(m => m.OrderIndex)
            .Select(m => new MasterMilestoneDto(m.Id, m.Name, m.Phase, m.Color, m.Icon, m.OrderIndex, m.Description, m.IsDefault))
            .ToListAsync();

        if (milestones.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            milestones = await _context.MasterMilestones
                .AsNoTracking()
                .OrderBy(m => m.OrderIndex)
                .Select(m => new MasterMilestoneDto(m.Id, m.Name, m.Phase, m.Color, m.Icon, m.OrderIndex, m.Description, m.IsDefault))
                .ToListAsync();
        }

        return Ok(new { success = true, data = milestones });
    }

    [HttpPost("milestones")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> CreateMilestone([FromBody] CreateMilestoneRequest request)
    {
        var milestone = new MasterMilestone
        {
            Name = request.Name,
            Phase = request.Phase,
            Color = request.Color,
            Icon = request.Icon,
            OrderIndex = request.OrderIndex,
            Description = request.Description,
            IsDefault = request.IsDefault
        };

        _context.MasterMilestones.Add(milestone);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = milestone });
    }

    [HttpPut("milestones/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> UpdateMilestone(int id, [FromBody] UpdateMilestoneRequest request)
    {
        var milestone = await _context.MasterMilestones.FindAsync(id);
        if (milestone == null)
            return NotFound(new { success = false, message = "Milestone tidak ditemukan" });

        milestone.Name = request.Name;
        milestone.Phase = request.Phase;
        milestone.Color = request.Color;
        milestone.Icon = request.Icon;
        milestone.OrderIndex = request.OrderIndex;
        milestone.Description = request.Description;
        milestone.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = milestone });
    }

    [HttpDelete("milestones/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> DeleteMilestone(int id)
    {
        var milestone = await _context.MasterMilestones.FindAsync(id);
        if (milestone == null)
            return NotFound(new { success = false, message = "Milestone tidak ditemukan" });

        if (milestone.IsDefault)
            return BadRequest(new { success = false, message = "Milestone default sistem tidak dapat dihapus." });

        _context.MasterMilestones.Remove(milestone);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Milestone berhasil dihapus" });
    }

    // ==========================================
    // CATEGORIES
    // ==========================================

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Color, c.Description))
            .ToListAsync();

        if (categories.Count == 0)
        {
            await DbInitializer.SeedAsync(_context);
            categories = await _context.Categories
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new CategoryDto(c.Id, c.Name, c.Color, c.Description))
                .ToListAsync();
        }

        return Ok(new { success = true, data = categories });
    }

    [HttpPost("categories")]
    [Authorize]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name,
            Color = request.Color,
            Description = request.Description
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = category });
    }

    [HttpPut("categories/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { success = false, message = "Kategori tidak ditemukan" });

        category.Name = request.Name;
        category.Color = request.Color;
        category.Description = request.Description;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = category });
    }

    [HttpDelete("categories/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { success = false, message = "Kategori tidak ditemukan" });

        var isReferenced = await _context.Tasks.AnyAsync(t => t.CategoryId == id);
        if (isReferenced)
        {
            return BadRequest(new { success = false, message = "Kategori tidak dapat dihapus karena masih digunakan oleh tugas aktif." });
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Kategori berhasil dihapus" });
    }

    [HttpGet("job-titles")]
    public async Task<IActionResult> GetJobTitles()
    {
        var titles = await _context.Users
            .AsNoTracking()
            .Where(u => !string.IsNullOrEmpty(u.JobTitle))
            .Select(u => u.JobTitle!)
            .Distinct()
            .ToListAsync();
        return Ok(new { success = true, data = titles });
    }

    // ==========================================
    // HOLIDAYS (HARI LIBUR)
    // ==========================================

    [HttpGet("holidays")]
    public async Task<IActionResult> GetHolidays([FromQuery] int? year = null, [FromQuery] int? companyId = null)
    {
        var query = _context.Holidays
            .AsNoTracking()
            .Include(h => h.Company)
            .AsQueryable();

        if (year.HasValue)
        {
            query = query.Where(h => h.Date.Year == year.Value);
        }

        if (companyId.HasValue)
        {
            query = query.Where(h => h.IsNational || h.CompanyId == companyId.Value);
        }

        var holidays = await query
            .OrderBy(h => h.Date)
            .Select(h => new HolidayDto(
                h.Id,
                h.Date,
                h.Name,
                h.Description,
                h.IsNational,
                h.CompanyId,
                h.Company != null ? h.Company.Name : null
            ))
            .ToListAsync();

        return Ok(new { success = true, data = holidays });
    }

    [HttpGet("holidays/{id:int}")]
    public async Task<IActionResult> GetHolidayById(int id)
    {
        var h = await _context.Holidays
            .AsNoTracking()
            .Include(x => x.Company)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (h == null)
            return NotFound(new { success = false, message = "Hari libur tidak ditemukan" });

        var dto = new HolidayDto(
            h.Id,
            h.Date,
            h.Name,
            h.Description,
            h.IsNational,
            h.CompanyId,
            h.Company != null ? h.Company.Name : null
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost("holidays")]
    public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Nama hari libur wajib diisi." });

        var holiday = new Holiday
        {
            Date = request.Date,
            Name = request.Name.Trim(),
            Description = request.Description,
            IsNational = request.IsNational,
            CompanyId = request.IsNational ? null : request.CompanyId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Holidays.Add(holiday);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = holiday });
    }

    [HttpPut("holidays/{id:int}")]
    public async Task<IActionResult> UpdateHoliday(int id, [FromBody] UpdateHolidayRequest request)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
            return NotFound(new { success = false, message = "Hari libur tidak ditemukan" });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Nama hari libur wajib diisi." });

        holiday.Date = request.Date;
        holiday.Name = request.Name.Trim();
        holiday.Description = request.Description;
        holiday.IsNational = request.IsNational;
        holiday.CompanyId = request.IsNational ? null : request.CompanyId;
        holiday.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = holiday });
    }

    [HttpDelete("holidays/{id:int}")]
    public async Task<IActionResult> DeleteHoliday(int id)
    {
        var holiday = await _context.Holidays.FindAsync(id);
        if (holiday == null)
            return NotFound(new { success = false, message = "Hari libur tidak ditemukan" });

        _context.Holidays.Remove(holiday);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Hari libur berhasil dihapus" });
    }

    [HttpPost("holidays/seed-national")]
    public async Task<IActionResult> SeedNationalHolidays([FromQuery] int year = 2026)
    {
        var defaults = DbInitializer.GetDefaultNationalHolidays(year);
        if (!defaults.Any())
        {
            return BadRequest(new { success = false, message = $"Tidak ada data master libur nasional bawaan untuk tahun {year}." });
        }

        var existingDates = await _context.Holidays
            .Where(h => h.IsNational && h.Date.Year == year)
            .Select(h => h.Date)
            .ToListAsync();

        var toAdd = defaults.Where(d => !existingDates.Contains(d.Date)).ToList();
        if (toAdd.Any())
        {
            _context.Holidays.AddRange(toAdd);
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, message = $"Berhasil menambahkan {toAdd.Count} hari libur nasional untuk tahun {year}.", addedCount = toAdd.Count });
    }

    // ==========================================
    // CLIENTS (MASTER DATA KLIEN)
    // ==========================================

    private static bool _clientTableChecked = false;
    private static readonly SemaphoreSlim _clientTableLock = new(1, 1);

    private async Task EnsureClientsTableAsync()
    {
        if (_clientTableChecked) return;
        await _clientTableLock.WaitAsync();
        try
        {
            if (_clientTableChecked) return;
            if (_context.Database.IsRelational())
            {
                await _context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS clients (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        code VARCHAR(50) NOT NULL DEFAULT '',
                        email VARCHAR(255),
                        phone VARCHAR(100),
                        contact_person VARCHAR(150),
                        address TEXT,
                        tax_id VARCHAR(100),
                        notes TEXT,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
                        source_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_clients_company_id ON clients(company_id);
                    CREATE INDEX IF NOT EXISTS ix_clients_name ON clients(name);
                ");
            }
            _clientTableChecked = true;
        }
        catch
        {
            // Ignore if already created or using in-memory provider
        }
        finally
        {
            _clientTableLock.Release();
        }
    }

    [HttpGet("clients")]
    public async Task<IActionResult> GetClients(
        [FromQuery] string? search = null,
        [FromQuery] int? companyId = null,
        [FromQuery] bool? onlyActive = null)
    {
        await EnsureClientsTableAsync();

        if (!await _context.Clients.IgnoreQueryFilters().AnyAsync())
        {
            await DbInitializer.SeedAsync(_context);
        }

        var query = _context.Clients
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(c => c.Company)
            .Include(c => c.SourceCompany)
            .AsQueryable();

        if (companyId.HasValue)
        {
            query = query.Where(c => c.CompanyId == null || c.CompanyId == companyId.Value);
        }

        if (onlyActive == true)
        {
            query = query.Where(c => c.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(s) ||
                c.Code.ToLower().Contains(s) ||
                (c.Email != null && c.Email.ToLower().Contains(s)) ||
                (c.ContactPerson != null && c.ContactPerson.ToLower().Contains(s)) ||
                (c.Phone != null && c.Phone.ToLower().Contains(s)) ||
                (c.TaxId != null && c.TaxId.ToLower().Contains(s)));
        }

        var clients = await query
            .OrderBy(c => c.Name)
            .Select(c => new ClientDto(
                c.Id,
                c.Name,
                c.Code,
                c.Email,
                c.Phone,
                c.ContactPerson,
                c.Address,
                c.TaxId,
                c.Notes,
                c.IsActive,
                c.CompanyId,
                c.Company != null ? c.Company.Name : null,
                c.SourceCompanyId,
                c.SourceCompany != null ? c.SourceCompany.Name : null,
                c.CreatedAt,
                c.UpdatedAt
            ))
            .ToListAsync();

        return Ok(new { success = true, data = clients });
    }

    [HttpGet("clients/invoice-options")]
    public async Task<IActionResult> GetInvoiceClientOptions([FromQuery] int? companyId = null)
    {
        await EnsureClientsTableAsync();

        if (!await _context.Clients.IgnoreQueryFilters().AnyAsync())
        {
            await DbInitializer.SeedAsync(_context);
        }

        var clientQuery = _context.Clients
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(c => c.Company)
            .Where(c => c.IsActive);

        if (companyId.HasValue)
        {
            clientQuery = clientQuery.Where(c => c.CompanyId == null || c.CompanyId == companyId.Value);
        }

        var masterClients = await clientQuery.OrderBy(c => c.Name).ToListAsync();
        var companies = await _context.Companies.AsNoTracking().OrderBy(c => c.Name).ToListAsync();

        var options = new List<InvoiceClientOptionDto>();

        foreach (var c in masterClients)
        {
            options.Add(new InvoiceClientOptionDto(
                Key: $"client:{c.Id}",
                Source: "client",
                ClientId: c.Id,
                SourceCompanyId: c.SourceCompanyId,
                Name: c.Name,
                Code: c.Code,
                Email: c.Email,
                Phone: c.Phone,
                ContactPerson: c.ContactPerson,
                Address: c.Address,
                TaxId: c.TaxId,
                OwnerCompanyId: c.CompanyId,
                OwnerCompanyName: c.Company?.Name
            ));
        }

        foreach (var comp in companies)
        {
            options.Add(new InvoiceClientOptionDto(
                Key: $"company:{comp.Id}",
                Source: "company",
                ClientId: null,
                SourceCompanyId: comp.Id,
                Name: comp.Name,
                Code: comp.Code,
                Email: comp.ContactEmail,
                Phone: null,
                ContactPerson: null,
                Address: comp.Address,
                TaxId: null,
                OwnerCompanyId: comp.Id,
                OwnerCompanyName: comp.Name
            ));
        }

        return Ok(new { success = true, data = options });
    }

    [HttpGet("clients/{id:int}")]
    public async Task<IActionResult> GetClientById(int id)
    {
        await EnsureClientsTableAsync();

        var c = await _context.Clients
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(x => x.Company)
            .Include(x => x.SourceCompany)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (c == null)
            return NotFound(new { success = false, message = "Data klien tidak ditemukan." });

        var dto = new ClientDto(
            c.Id,
            c.Name,
            c.Code,
            c.Email,
            c.Phone,
            c.ContactPerson,
            c.Address,
            c.TaxId,
            c.Notes,
            c.IsActive,
            c.CompanyId,
            c.Company != null ? c.Company.Name : null,
            c.SourceCompanyId,
            c.SourceCompany != null ? c.SourceCompany.Name : null,
            c.CreatedAt,
            c.UpdatedAt
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost("clients")]
    [Authorize]
    public async Task<IActionResult> CreateClient([FromBody] CreateClientRequest request)
    {
        await EnsureClientsTableAsync();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Nama klien wajib diisi." });

        var cleanName = request.Name.Trim();
        var cleanCode = (request.Code ?? string.Empty).Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(cleanCode))
        {
            var initials = new string(cleanName
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(w => w.FirstOrDefault())
                .Where(char.IsLetterOrDigit)
                .Take(4)
                .ToArray()).ToUpperInvariant();
            var count = await _context.Clients.IgnoreQueryFilters().CountAsync() + 1;
            cleanCode = string.IsNullOrWhiteSpace(initials) ? $"CL-{count:D3}" : $"{initials}-{count:D2}";
        }

        var client = new Client
        {
            Name = cleanName,
            Code = cleanCode,
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            ContactPerson = request.ContactPerson?.Trim(),
            Address = request.Address?.Trim(),
            TaxId = request.TaxId?.Trim(),
            Notes = request.Notes?.Trim(),
            IsActive = request.IsActive,
            CompanyId = request.CompanyId,
            SourceCompanyId = request.SourceCompanyId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();

        var company = client.CompanyId.HasValue
            ? await _context.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == client.CompanyId.Value)
            : null;
        var sourceCompany = client.SourceCompanyId.HasValue
            ? await _context.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == client.SourceCompanyId.Value)
            : null;

        var dto = new ClientDto(
            client.Id,
            client.Name,
            client.Code,
            client.Email,
            client.Phone,
            client.ContactPerson,
            client.Address,
            client.TaxId,
            client.Notes,
            client.IsActive,
            client.CompanyId,
            company?.Name,
            client.SourceCompanyId,
            sourceCompany?.Name,
            client.CreatedAt,
            client.UpdatedAt
        );

        return Ok(new { success = true, message = "Data klien berhasil ditambahkan.", data = dto });
    }

    [HttpPut("clients/{id:int}")]
    [Authorize]
    public async Task<IActionResult> UpdateClient(int id, [FromBody] UpdateClientRequest request)
    {
        await EnsureClientsTableAsync();

        var client = await _context.Clients.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
        if (client == null)
            return NotFound(new { success = false, message = "Data klien tidak ditemukan." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Nama klien wajib diisi." });

        client.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Code))
        {
            client.Code = request.Code.Trim().ToUpperInvariant();
        }
        client.Email = request.Email?.Trim();
        client.Phone = request.Phone?.Trim();
        client.ContactPerson = request.ContactPerson?.Trim();
        client.Address = request.Address?.Trim();
        client.TaxId = request.TaxId?.Trim();
        client.Notes = request.Notes?.Trim();
        client.IsActive = request.IsActive;
        client.CompanyId = request.CompanyId;
        client.SourceCompanyId = request.SourceCompanyId;
        client.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        var company = client.CompanyId.HasValue
            ? await _context.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == client.CompanyId.Value)
            : null;
        var sourceCompany = client.SourceCompanyId.HasValue
            ? await _context.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == client.SourceCompanyId.Value)
            : null;

        var dto = new ClientDto(
            client.Id,
            client.Name,
            client.Code,
            client.Email,
            client.Phone,
            client.ContactPerson,
            client.Address,
            client.TaxId,
            client.Notes,
            client.IsActive,
            client.CompanyId,
            company?.Name,
            client.SourceCompanyId,
            sourceCompany?.Name,
            client.CreatedAt,
            client.UpdatedAt
        );

        return Ok(new { success = true, message = "Data klien berhasil diperbarui.", data = dto });
    }

    [HttpDelete("clients/{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteClient(int id)
    {
        await EnsureClientsTableAsync();

        var client = await _context.Clients.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id);
        if (client == null)
            return NotFound(new { success = false, message = "Data klien tidak ditemukan." });

        _context.Clients.Remove(client);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Data klien berhasil dihapus." });
    }

    [HttpPost("clients/sync-from-companies")]
    [Authorize]
    public async Task<IActionResult> SyncClientsFromCompanies()
    {
        await EnsureClientsTableAsync();

        var companies = await _context.Companies.AsNoTracking().ToListAsync();
        var existingClients = await _context.Clients.IgnoreQueryFilters().ToListAsync();

        var toAdd = new List<Client>();
        int updatedCount = 0;

        foreach (var comp in companies)
        {
            var existing = existingClients.FirstOrDefault(c =>
                c.SourceCompanyId == comp.Id ||
                c.Name.Equals(comp.Name, StringComparison.OrdinalIgnoreCase));

            if (existing == null)
            {
                toAdd.Add(new Client
                {
                    Name = comp.Name,
                    Code = $"CL-{comp.Code}",
                    Email = comp.ContactEmail,
                    Address = comp.Address,
                    Notes = comp.Description ?? "Diambil dari tabel Master Perusahaan (companies)",
                    IsActive = true,
                    CompanyId = comp.Id,
                    SourceCompanyId = comp.Id,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                });
            }
            else if (existing.SourceCompanyId == null)
            {
                existing.SourceCompanyId = comp.Id;
                existing.Email ??= comp.ContactEmail;
                existing.Address ??= comp.Address;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                updatedCount++;
            }
        }

        if (toAdd.Any())
        {
            _context.Clients.AddRange(toAdd);
        }

        if (toAdd.Any() || updatedCount > 0)
        {
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            success = true,
            message = $"Sinkronisasi selesai: {toAdd.Count} klien baru ditambahkan dan {updatedCount} klien ditautkan dari tabel Perusahaan.",
            addedCount = toAdd.Count,
            updatedCount
        });
    }
}

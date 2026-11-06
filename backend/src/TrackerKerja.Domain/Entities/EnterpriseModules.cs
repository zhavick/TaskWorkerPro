using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TrackerKerja.Domain.Entities;

public enum IssueStatus
{
    Open = 0,
    InProgress = 1,
    Resolved = 2,
    Closed = 3
}

public enum IssuePriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public class IssueTicket
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string TicketCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public IssueStatus Status { get; set; } = IssueStatus.Open;
    public IssuePriority Priority { get; set; } = IssuePriority.Medium;

    [MaxLength(100)]
    public string? Category { get; set; } // Bug, Feature Request, Incident, Technical Debt, etc.

    public int CompanyId { get; set; }
    public int? ProjectId { get; set; }

    [MaxLength(450)]
    public string? ReportedByUserId { get; set; }

    [MaxLength(450)]
    public string? AssignedToUserId { get; set; }

    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Company? Company { get; set; }
    public Project? Project { get; set; }
    public AppUser? ReportedByUser { get; set; }
    public AppUser? AssignedToUser { get; set; }
    public ICollection<IssueTicketComment> Comments { get; set; } = new List<IssueTicketComment>();
}

public class IssueTicketComment
{
    public int Id { get; set; }
    public int TicketId { get; set; }

    [Required]
    [MaxLength(450)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public IssueTicket? Ticket { get; set; }
    public AppUser? User { get; set; }
}

public enum InvoiceStatus
{
    Draft = 0,
    Sent = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4
}

public class Invoice
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public int CompanyId { get; set; }
    public int? ProjectId { get; set; }
    public int? ClientId { get; set; }

    [Required]
    [MaxLength(255)]
    public string ClientName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? ClientEmail { get; set; }

    public string? ClientAddress { get; set; }

    public DateTimeOffset IssueDate { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset DueDate { get; set; } = DateTimeOffset.UtcNow.AddDays(30);

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;

    [Column(TypeName = "decimal(5,2)")]
    public decimal TaxRatePercent { get; set; } = 11.00m; // Default PPN 11%

    [Column(TypeName = "decimal(18,2)")]
    public decimal DiscountAmount { get; set; } = 0.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal SubTotal { get; set; } = 0.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; } = 0.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; } = 0.00m;

    public string? Notes { get; set; }

    [MaxLength(450)]
    public string? CreatedByUserId { get; set; }

    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Company? Company { get; set; }
    public Project? Project { get; set; }
    public Client? Client { get; set; }
    public AppUser? CreatedByUser { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Quantity { get; set; } = 1.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; } = 0.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; } = 0.00m;

    // Navigation property
    public Invoice? Invoice { get; set; }
}

public class CompanyDocument
{
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FileStoragePath { get; set; } = string.Empty;

    public long FileSize { get; set; } = 0;

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/octet-stream";

    [MaxLength(100)]
    public string Category { get; set; } = "Umum"; // SOP, Kontrak, Laporan, Desain, Legal, Umum

    public int CompanyId { get; set; }
    public int? ProjectId { get; set; }

    [MaxLength(450)]
    public string? UploadedByUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Company? Company { get; set; }
    public Project? Project { get; set; }
    public AppUser? UploadedByUser { get; set; }
}


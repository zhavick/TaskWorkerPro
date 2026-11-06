using TrackerKerja.Domain.Entities;

namespace TrackerKerja.Application.DTOs;

// --- 1. ISSUES TICKETING DTOS ---

public record IssueTicketCommentDto(
    int Id,
    int TicketId,
    string UserId,
    string? UserName,
    string? UserAvatarColor,
    string Message,
    DateTimeOffset CreatedAt
);

public record IssueTicketDto(
    int Id,
    string TicketCode,
    string Title,
    string? Description,
    IssueStatus Status,
    IssuePriority Priority,
    string? Category,
    int CompanyId,
    string? CompanyName,
    int? ProjectId,
    string? ProjectName,
    string? ReportedByUserId,
    string? ReportedByUserName,
    string? AssignedToUserId,
    string? AssignedToUserName,
    DateTimeOffset? ResolvedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int CommentsCount
);

public record IssueTicketDetailDto(
    int Id,
    string TicketCode,
    string Title,
    string? Description,
    IssueStatus Status,
    IssuePriority Priority,
    string? Category,
    int CompanyId,
    string? CompanyName,
    int? ProjectId,
    string? ProjectName,
    string? ReportedByUserId,
    string? ReportedByUserName,
    string? AssignedToUserId,
    string? AssignedToUserName,
    DateTimeOffset? ResolvedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<IssueTicketCommentDto> Comments
);

public record CreateIssueTicketRequest(
    string Title,
    string? Description,
    IssuePriority Priority,
    string? Category,
    int? CompanyId,
    int? ProjectId,
    string? AssignedToUserId
);

public record UpdateIssueTicketRequest(
    string Title,
    string? Description,
    IssueStatus Status,
    IssuePriority Priority,
    string? Category,
    int? ProjectId,
    string? AssignedToUserId
);

public record CreateIssueCommentRequest(
    string Message
);

// --- 2. INVOICE MANAGEMENT DTOS ---

public record InvoiceItemDto(
    int Id,
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal Amount
);

public record InvoiceDto(
    int Id,
    string InvoiceNumber,
    int CompanyId,
    string? CompanyName,
    int? ProjectId,
    string? ProjectName,
    string ClientName,
    string? ClientEmail,
    string? ClientAddress,
    DateTimeOffset IssueDate,
    DateTimeOffset DueDate,
    InvoiceStatus Status,
    decimal TaxRatePercent,
    decimal DiscountAmount,
    decimal SubTotal,
    decimal TaxAmount,
    decimal TotalAmount,
    string? Notes,
    string? CreatedByUserId,
    string? CreatedByUserName,
    DateTimeOffset? PaidAt,
    DateTimeOffset CreatedAt,
    List<InvoiceItemDto> Items,
    int? ClientId = null
);

public record CreateInvoiceItemRequest(
    string Description,
    decimal Quantity,
    decimal UnitPrice
);

public record CreateInvoiceRequest(
    string? InvoiceNumber,
    int? CompanyId,
    int? ProjectId,
    string ClientName,
    string? ClientEmail,
    string? ClientAddress,
    DateTimeOffset IssueDate,
    DateTimeOffset DueDate,
    decimal TaxRatePercent,
    decimal DiscountAmount,
    string? Notes,
    List<CreateInvoiceItemRequest> Items,
    int? ClientId = null,
    int? SourceCompanyClientId = null
);

public record UpdateInvoiceRequest(
    string? InvoiceNumber,
    int? ProjectId,
    string ClientName,
    string? ClientEmail,
    string? ClientAddress,
    DateTimeOffset IssueDate,
    DateTimeOffset DueDate,
    InvoiceStatus Status,
    decimal TaxRatePercent,
    decimal DiscountAmount,
    string? Notes,
    List<CreateInvoiceItemRequest> Items,
    int? ClientId = null,
    int? SourceCompanyClientId = null
);

public record UpdateInvoiceStatusRequest(
    InvoiceStatus Status
);

// --- 3. DOCUMENT MANAGEMENT SYSTEM (DMS) DTOS ---

public record CompanyDocumentDto(
    int Id,
    string Title,
    string? Description,
    string FileName,
    long FileSize,
    string ContentType,
    string Category,
    int CompanyId,
    string? CompanyName,
    int? ProjectId,
    string? ProjectName,
    string? UploadedByUserId,
    string? UploadedByUserName,
    DateTimeOffset CreatedAt
);

public record UpdateDocumentRequest(
    string Title,
    string? Description,
    string Category,
    int? ProjectId
);


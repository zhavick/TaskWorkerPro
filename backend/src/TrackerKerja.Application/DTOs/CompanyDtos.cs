namespace TrackerKerja.Application.DTOs;

public record CompanyDto(
    int Id,
    string Name,
    string Code,
    string? Description,
    string? Address,
    string? ContactEmail,
    DateTimeOffset CreatedAt,
    int TotalMembers = 0,
    int TotalProjects = 0,
    int TotalTasks = 0,
    bool EnableDms = true,
    bool EnableTicketing = true,
    bool EnableInvoicing = true
);

public record CreateCompanyRequest(
    string Name,
    string Code,
    string? Description = null,
    string? Address = null,
    string? ContactEmail = null,
    bool EnableDms = true,
    bool EnableTicketing = true,
    bool EnableInvoicing = true
);

public record UpdateCompanyRequest(
    string Name,
    string Code,
    string? Description = null,
    string? Address = null,
    string? ContactEmail = null,
    bool EnableDms = true,
    bool EnableTicketing = true,
    bool EnableInvoicing = true
);

public record CompanyModuleMatrixDto(
    int CompanyId,
    string CompanyName,
    string CompanyCode,
    bool EnableDms,
    bool EnableTicketing,
    bool EnableInvoicing,
    int TotalMembers = 0,
    int TotalProjects = 0
);

public record UpdateCompanyModulesRequest(
    bool EnableDms,
    bool EnableTicketing,
    bool EnableInvoicing
);

public record CompanyModuleItemRequest(
    int CompanyId,
    bool EnableDms,
    bool EnableTicketing,
    bool EnableInvoicing
);

public record BulkUpdateCompanyModuleMatrixRequest(
    List<CompanyModuleItemRequest> Items
);

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
    bool EnableInvoicing = true,
    long MaxStorageSizeBytes = 1073741824,
    long MaxUploadFileSizeBytes = 52428800
);

public record CreateCompanyRequest(
    string Name,
    string Code,
    string? Description = null,
    string? Address = null,
    string? ContactEmail = null,
    bool EnableDms = true,
    bool EnableTicketing = true,
    bool EnableInvoicing = true,
    long? MaxStorageSizeBytes = null,
    long? MaxUploadFileSizeBytes = null
);

public record UpdateCompanyRequest(
    string Name,
    string Code,
    string? Description = null,
    string? Address = null,
    string? ContactEmail = null,
    bool EnableDms = true,
    bool EnableTicketing = true,
    bool EnableInvoicing = true,
    long? MaxStorageSizeBytes = null,
    long? MaxUploadFileSizeBytes = null
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

public record CompanyStorageUsageDto(
    int CompanyId,
    string CompanyName,
    string CompanyCode,
    long MaxStorageSizeBytes,
    double MaxStorageMb,
    long MaxUploadFileSizeBytes,
    double MaxUploadFileSizeMb,
    long UsedStorageBytes,
    double UsedStorageMb,
    double UsedPercentage,
    int TotalFilesCount,
    bool IsQuotaExceeded
);

public record UpdateCompanyStorageQuotaRequest(
    double MaxStorageMb,
    double MaxUploadFileSizeMb
);

public record CompanyStorageQuotaItemRequest(
    int CompanyId,
    double MaxStorageMb,
    double MaxUploadFileSizeMb
);

public record BulkUpdateCompanyStorageQuotaRequest(
    List<CompanyStorageQuotaItemRequest> Items
);

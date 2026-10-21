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
    int TotalTasks = 0
);

public record CreateCompanyRequest(
    string Name,
    string Code,
    string? Description = null,
    string? Address = null,
    string? ContactEmail = null
);

public record UpdateCompanyRequest(
    string Name,
    string Code,
    string? Description = null,
    string? Address = null,
    string? ContactEmail = null
);

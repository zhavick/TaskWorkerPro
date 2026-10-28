namespace TrackerKerja.Application.DTOs;

public record HolidayDto(
    int Id,
    DateOnly Date,
    string Name,
    string? Description,
    bool IsNational,
    int? CompanyId,
    string? CompanyName
);

public record CreateHolidayRequest(
    DateOnly Date,
    string Name,
    string? Description,
    bool IsNational,
    int? CompanyId
);

public record UpdateHolidayRequest(
    DateOnly Date,
    string Name,
    string? Description,
    bool IsNational,
    int? CompanyId
);

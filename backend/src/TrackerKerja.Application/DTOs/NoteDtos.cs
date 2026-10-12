namespace TrackerKerja.Application.DTOs;

public record NoteItemDto(
    int Id,
    string Title,
    string ContentHtml,
    string Category,
    string Color,
    bool IsPinned,
    string? AuthorUserId,
    string? AuthorUserName,
    int? TaskId,
    string? TaskTitle,
    int AttachmentsCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record NoteAttachmentDto(
    int Id,
    string FileName,
    long FileSizeBytes,
    string? ContentType,
    string? FileExtension,
    string? UploadedByName,
    DateTimeOffset UploadedAt
);

public record NoteDetailDto(
    int Id,
    string Title,
    string ContentHtml,
    string Category,
    string Color,
    bool IsPinned,
    string? AuthorUserId,
    string? AuthorUserName,
    int? TaskId,
    string? TaskTitle,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<NoteAttachmentDto> Attachments
);

public record CreateNoteRequest(
    string Title,
    string ContentHtml,
    string Category,
    string Color,
    bool IsPinned,
    int? TaskId
);

public record UpdateNoteRequest(
    string Title,
    string ContentHtml,
    string Category,
    string Color,
    bool IsPinned,
    int? TaskId
);

namespace TrackerKerja.Domain.Entities;

public enum SyncDirection
{
    Push,
    Pull,
    ExportZip,
    ImportZip,
    Receive
}

public enum SyncStatus
{
    Success,
    Failed,
    Partial
}

public class SyncHistory
{
    public int Id { get; set; }
    public SyncDirection Direction { get; set; }
    public SyncStatus Status { get; set; }
    public string TargetHost { get; set; } = string.Empty;
    public int TotalRecordsSynced { get; set; }
    public long FileSizeBytes { get; set; }
    public string? SummaryJson { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? TriggeredByUserId { get; set; }
}

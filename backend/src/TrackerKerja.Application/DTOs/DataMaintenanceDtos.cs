namespace TrackerKerja.Application.DTOs;

public record DataMaintenanceStatsDto(
    int TotalTasks,
    int TotalSubtasks,
    int TotalProjects,
    int TotalWorkSessions,
    int TotalAttendances,
    int TotalNotes,
    int TotalNoteAttachments,
    int TotalNonAdminUsers,
    int TotalGamificationRecords,
    int TotalToolHistories,
    int TotalAuditLogs,
    int ProtectedAdminUsers,
    int ProtectedMasterDataItems,
    int ProtectedAnnouncements
)
{
    // Backwards-compatible aliases for existing tests and API callers
    public int TasksCount => TotalTasks;
    public int ProjectsCount => TotalProjects;
    public int SessionsCount => TotalWorkSessions;
    public int AttendancesCount => TotalAttendances;
    public int NotesCount => TotalNotes;
    public int NoteAttachmentsCount => TotalNoteAttachments;
    public int NonAdminUsersCount => TotalNonAdminUsers;
    public int ToolHistoriesCount => TotalToolHistories;
    public int AuditLogsCount => TotalAuditLogs;
    public int AdminUsersCount => ProtectedAdminUsers;
    public int MasterDataItemsCount => ProtectedMasterDataItems;
    public int AnnouncementsCount => ProtectedAnnouncements;
}

public record DataPurgeRequest(
    bool PurgeAll,
    bool PurgeTasks,
    bool PurgeProjects,
    bool PurgeAttendances,
    bool PurgeNotes,
    bool PurgeNonAdminUsers,
    bool PurgeAuditAndHistories,
    string ConfirmationKeyword,
    bool PurgeAllOperational = false
)
{
    public bool IsFullPurge => PurgeAll || PurgeAllOperational;
}

public record DataPurgeResultDto(
    bool Success,
    int TotalRecordsDeleted,
    int DeletedTasksCount,
    int DeletedProjectsCount,
    int DeletedSessionsCount,
    int DeletedAttendancesCount,
    int DeletedNotesCount,
    int DeletedUsersCount,
    int DeletedHistoriesCount,
    List<string> Messages
);

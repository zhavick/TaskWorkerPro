namespace TrackerKerja.Application.DTOs;

public record DataMaintenanceStatsDto(
    int TasksCount,
    int ProjectsCount,
    int SessionsCount,
    int AttendancesCount,
    int NotesCount,
    int NoteAttachmentsCount,
    int NonAdminUsersCount,
    int ToolHistoriesCount,
    int AuditLogsCount,
    int AdminUsersCount,
    int MasterDataItemsCount,
    int AnnouncementsCount
);

public record DataPurgeRequest(
    bool PurgeAll,
    bool PurgeTasks,
    bool PurgeProjects,
    bool PurgeAttendances,
    bool PurgeNotes,
    bool PurgeNonAdminUsers,
    bool PurgeAuditAndHistories,
    string ConfirmationKeyword
);

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

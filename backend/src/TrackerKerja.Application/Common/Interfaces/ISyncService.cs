using TrackerKerja.Application.DTOs;

namespace TrackerKerja.Application.Common.Interfaces;

public interface ISyncService
{
    Task<SyncPingResponse> GetLocalPingInfoAsync();
    Task<SyncPingResponse> PingRemoteHostAsync(string hostUrl, string apiKey, bool allowUntrustedSsl = false);
    Task<byte[]> ExportPackageZipAsync(bool includeFiles);
    Task<string> ExportSqlDumpAsync();
    Task<SyncOperationResult> ImportPackageZipAsync(Stream zipStream, string? triggeredByUserId);
    Task<SyncOperationResult> ImportSqlScriptAsync(string sqlContent, string? triggeredByUserId);
    Task<SyncPayload> PrepareSyncPayloadAsync(bool includeFiles);
    Task<SyncOperationResult> ProcessReceivedPayloadAsync(SyncPayload payload, string? triggeredByUserId);
    Task<SyncOperationResult> PushToHostAsync(SyncPushRequest request, string? triggeredByUserId);
    Task<SyncOperationResult> PullFromHostAsync(SyncPullRequest request, string? triggeredByUserId);
    Task<IReadOnlyList<SyncHistoryDto>> GetSyncHistoryAsync(int limit = 30);
}

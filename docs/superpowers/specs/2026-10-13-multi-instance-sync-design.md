# Spesifikasi Desain: FSD 5.16 Modul Multi-Instance Synchronization & Host Induk Sync

## 1. Ringkasan Eksekutif & Tujuan
Modul Multi-Instance Synchronization & Host Induk Sync (FSD 5.16) menyediakan kapabilitas sinkronisasi data terdistribusi dan berkas lampiran fisik antara instance node lokal/cabang (misal laptop teknisi lapangan atau kantor cabang) ke satu **Server Host Induk** terpusat.

Sistem mendukung 2 metode utama:
1. **Online REST API Sync (Push & Pull)**: Pengiriman dan penarikan langsung antar server via HTTP REST API yang diamankan dengan `X-Sync-Key` dan Base64 streaming untuk arsip berkas lampiran.
2. **Offline Air-Gapped Package (.zip Export & Import)**: Pengemasan mandiri paket arsip `.zip` berisi `manifest.json`, `sync_data.json`, dan direktori `uploads/` untuk pemindahan data tanpa koneksi internet langsung (via flashdisk/USB).

---

## 2. Arsitektur & Komponen Sistem

### 2.1 Domain Layer
- **Entitas `SyncHistory`** (`TrackerKerja.Domain/Entities/SyncEntities.cs`):
  - `Id` (int)
  - `Direction` (`SyncDirection`: `Push`, `Pull`, `ExportZip`, `ImportZip`, `Receive`)
  - `Status` (`SyncStatus`: `Success`, `Failed`, `Partial`)
  - `TargetHost` (string)
  - `TotalRecordsSynced` (int)
  - `FileSizeBytes` (long)
  - `SummaryJson` (string?)
  - `ErrorMessage` (string?)
  - `CreatedAt` (DateTimeOffset)
  - `TriggeredByUserId` (string?)
- Didaftarkan pada EF Core `AppDbContext` (`DbSet<SyncHistory> SyncHistories`).

### 2.2 Application Layer
- **Kontrak Antarmuka `ISyncService`** (`TrackerKerja.Application/Common/Interfaces/ISyncService.cs`):
  ```csharp
  public interface ISyncService
  {
      Task<SyncPingResponse> GetLocalPingInfoAsync();
      Task<SyncPingResponse> PingRemoteHostAsync(string hostUrl, string apiKey);
      Task<byte[]> ExportPackageZipAsync(bool includeFiles);
      Task<SyncOperationResult> ImportPackageZipAsync(Stream zipStream, string? triggeredByUserId);
      Task<SyncPayload> PrepareSyncPayloadAsync(bool includeFiles);
      Task<SyncOperationResult> ProcessReceivedPayloadAsync(SyncPayload payload, string? triggeredByUserId);
      Task<SyncOperationResult> PushToHostAsync(SyncPushRequest request, string? triggeredByUserId);
      Task<SyncOperationResult> PullFromHostAsync(SyncPullRequest request, string? triggeredByUserId);
      Task<IReadOnlyList<SyncHistoryDto>> GetSyncHistoryAsync(int limit = 30);
  }
  ```
- **DTOs (`TrackerKerja.Application/DTOs/SyncDtos.cs`)**:
  - `SyncPingResponse`
  - `SyncPushRequest`
  - `SyncPullRequest`
  - `SyncPayload`
  - `SyncManifest`
  - `SyncDatabaseData`
  - `SyncOperationResult`
  - `SyncHistoryDto`

### 2.3 Infrastructure Layer
- **`SyncService`** (`TrackerKerja.Infrastructure/Services/SyncService.cs`):
  - Menggunakan `System.IO.Compression.ZipArchive` untuk pengemasan dan ekstraksi file.
  - Membaca dan menulis berkas fisik di `uploads/` (`notes`, `avatars`, `covers`) dengan sanitasi path aman (`Path.GetFullPath` guard mencegah *Zip Slip*).
  - Melakukan serialisasi entitas ke format JSON terstruktur.
  - Menerapkan data ke database menggunakan transaksi atomik `IDbContextTransaction`:
    - Mengintegrasikan Company, Users, Projects, Categories, Tasks, Sessions, Notes, NoteAttachments, Attendances, MasterPriorities, MasterStatuses, MasterMilestones.
  - Mengirim dan menerima payload HTTP menggunakan `IHttpClientFactory`.

### 2.4 WebApi Layer
- **`SyncController`** (`TrackerKerja.WebApi/Controllers/SyncController.cs`):
  - `GET /api/sync/ping` — Informasi kesiapan lokal (jumlah entitas & ukuran berkas).
  - `POST /api/sync/ping-host` — Uji koneksi diagnostik ke URL host induk (Admin).
  - `POST /api/sync/push` — Kirim data lokal ke host induk (Admin).
  - `POST /api/sync/pull` — Tarik data dari host induk (Admin).
  - `POST /api/sync/receive` — Menerima payload dari cabang (Diautentikasi dengan `X-Sync-Key` atau Admin).
  - `GET /api/sync/export-package` — Download berkas `.zip` (Admin).
  - `POST /api/sync/import-package` — Upload dan jalankan berkas `.zip` (Admin).
  - `GET /api/sync/history` — Riwayat sinkronisasi (Admin).

### 2.5 Frontend UI (Next.js 16 + TailGrids)
- Di [`frontend/src/app/(with-layouts)/configuration/page.tsx`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/frontend/src/app/(with-layouts)/configuration/page.tsx):
  - Menambahkan Tab **"Sinkronisasi Host Induk"** (`activeTab === "sync"`).
  - **Panel Konfigurasi Host**: URL Host, Sync API Key, Toggle Sertakan Berkas, Tombol Ping Host dengan latensi ms.
  - **Panel Operasi Online**: Tombol Push dan Pull dengan loading indicator.
  - **Panel Offline Paket .ZIP**: Tombol Unduh Paket .ZIP dan form Upload Paket .ZIP.
  - **Tabel Riwayat Sinkronisasi**: Arah, Status badge, Entitas, Ukuran berkas, Waktu, Catatan.

---

## 3. Spesifikasi Keamanan & Pencegahan Vulnerability
1. **Zip Slip Protection**:
   Saat mengekstrak file dari zip arsip, pastikan path tujuan berada di dalam direktori `uploads`:
   ```csharp
   var destinationPath = Path.GetFullPath(Path.Combine(uploadBasePath, entry.FullName));
   if (!destinationPath.StartsWith(uploadBasePath, StringComparison.OrdinalIgnoreCase))
   {
       throw new InvalidOperationException("Zip Slip path traversal attempt detected.");
   }
   ```
2. **Autentikasi Header `X-Sync-Key`**:
   Endpoint `POST /api/sync/receive` memverifikasi header `X-Sync-Key` terhadap nilai setting sistem `Sync_ApiKey` / `Sync_HostSecret` atau JWT klaim Administrator.
3. **Payload Limit**:
   Dukungan multipart dan payload besar hingga 200MB dengan chunked streaming untuk berkas lampiran.

---

## 4. Strategi Pengujian (Testing Strategy)
1. **Unit Testing (`TrackerKerja.Tests/SyncServiceTests.cs`)**:
   - Pengujian pembuatan payload database & manifest.
   - Pengujian kompresi berkas ke zip dan ekstraksi aman.
   - Pengujian pencegahan Zip Slip traversal.
   - Pengujian integrasi transaksi dan pencatatan `SyncHistory`.
2. **Controller Testing (`TrackerKerja.Tests/SyncControllerTests.cs`)**:
   - Pengujian endpoint `/api/sync/ping`, `export-package`, `receive`, dan `history`.
3. **Frontend Verification**:
   - `npm run build` sukses 100% tanpa error TypeScript pada tab konfigurasi baru.

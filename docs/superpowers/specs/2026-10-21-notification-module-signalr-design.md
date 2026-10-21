# Design Specification: Modul Notifikasi Terpadu (Hybrid SignalR Real-Time Push & REST API)

- **Tanggal**: 2026-10-21
- **Status**: Disetujui (Drafting Implementation Plan)
- **Modul**: Notifikasi Sistem & Siaran Manajemen (Notification Center & Admin Broadcast)
- **Teknologi**: ASP.NET Core 8.0 SignalR, Entity Framework Core, PostgreSQL 16 / SQLite, Next.js 16 (React 19), `@microsoft/signalr`, TanStack React Query, TailGrids UI, Sonner Toasts.

---

## 1. Latar Belakang & Tujuan
TrackerKerja Modern membutuhkan subsistem komunikasi interaktif dan notifikasi terpadu untuk:
1. Memberikan pemberitahuan instan (sub-detik) kepada staf saat menerima penugasan tugas baru (*Task Assignment*), perubahan status tugas, pengumuman manajemen, atau event presensi.
2. Mengintegrasikan ikon lonceng pada bilah navigasi atas (*Header Bell*) dengan data langsung (menggantikan data tiruan/mock) dan indikator visual *badge* belum dibaca secara real-time.
3. Menyediakan halaman **Pusat Notifikasi (`/notifications`)** lengkap dengan filter kategori (*Semua, Belum Dibaca, Tugas, Pengumuman, Presensi, Broadcast*), penandaan baca massal, serta penghapusan riwayat.
4. Memberikan hak akses kepada Administrator/Superadmin untuk mengirimkan **Pesan Siaran (*Manual Broadcast*)** ke seluruh staf satu perusahaan atau pengguna terpilih.

---

## 2. Arsitektur Subsistem & Model Data

### 2.1 Entitas Domain (`UserNotification`)
File: `backend/src/TrackerKerja.Domain/Entities/UserNotification.cs`
```csharp
namespace TrackerKerja.Domain.Entities;

public class UserNotification
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int CompanyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = "Task"; // "Task", "Announcement", "Attendance", "System", "Broadcast"
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedByUserId { get; set; }

    public AppUser? User { get; set; }
    public Company? Company { get; set; }
    public AppUser? CreatedByUser { get; set; }
}
```

### 2.2 DTOs (`NotificationDtos.cs`)
File: `backend/src/TrackerKerja.Application/DTOs/NotificationDtos.cs`
* `NotificationDto(int Id, string UserId, int CompanyId, string Title, string Message, string Category, string? ActionUrl, bool IsRead, DateTimeOffset? ReadAt, DateTimeOffset CreatedAt, string? CreatedByUserName)`
* `BroadcastNotificationRequest(string Title, string Message, string Category, string? ActionUrl, string? TargetUserId)`
* `NotificationFilterRequest(bool? OnlyUnread, string? Category, int Page = 1, int PageSize = 20)`
* `NotificationUnreadCountDto(int UnreadCount)`

### 2.3 SignalR Hub (`NotificationHub.cs`)
File: `backend/src/TrackerKerja.WebApi/Hubs/NotificationHub.cs`
* Rute: `/hubs/notifications`
* Mengimplementasikan `Hub`:
  * `OnConnectedAsync()`: Mengambil claim `UserId` dan `CompanyId` dari `Context.User`, menambahkan koneksi ke grup `$"company_{companyId}"`.
* Autentikasi WebSocket:
  * Di `Program.cs`, konfigurasi `JwtBearerOptions.Events.OnMessageReceived` mengecek jika request path berawalan `/hubs/notifications`, token diambil dari `context.Request.Query["access_token"]`.

### 2.4 Service Terpusat (`INotificationService`)
File: `backend/src/TrackerKerja.Application/Common/Interfaces/INotificationService.cs` & `TrackerKerja.Infrastructure/Services/NotificationService.cs`
* `SendNotificationAsync(string userId, int companyId, string title, string message, string category, string? actionUrl = null, string? createdByUserId = null)`:
  1. Simpan ke database via `AppDbContext.UserNotifications`.
  2. Kirim pesan SignalR instan: `_hubContext.Clients.User(userId).SendAsync("ReceiveNotification", dto)`.
* `BroadcastCompanyAsync(int companyId, string title, string message, string category, string? actionUrl = null, string? createdByUserId = null)`:
  1. Ambil daftar user aktif dalam perusahaan.
  2. Buat entitas `UserNotification` untuk setiap user dalam perusahaan dan simpan batch.
  3. Kirim broadcast SignalR: `_hubContext.Clients.Group($"company_{companyId}").SendAsync("ReceiveNotification", dto)`.

---

## 3. REST API Endpoints (`NotificationsController`)
File: `backend/src/TrackerKerja.WebApi/Controllers/NotificationsController.cs`
Base Route: `/api/notifications` (Terproteksi `[Authorize]`)

| Method | Endpoint | Deskripsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Daftar notifikasi pengguna dengan paginasi & filter kategori/unread | Semua Pengguna |
| `GET` | `/api/notifications/unread-count` | Jumlah notifikasi belum dibaca | Semua Pengguna |
| `PUT` | `/api/notifications/{id}/read` | Menandai 1 notifikasi sebagai dibaca | Pemilik Notifikasi |
| `PUT` | `/api/notifications/read-all` | Menandai seluruh notifikasi pengguna sebagai dibaca | Pemilik Notifikasi |
| `DELETE` | `/api/notifications/{id}` | Menghapus 1 notifikasi | Pemilik Notifikasi |
| `POST` | `/api/notifications/broadcast` | Mengirim siaran notifikasi ke perusahaan / user | Admin / SuperAdmin |

---

## 4. Pemicu Event Otomatis (Automatic Event Triggers)
1. **Penugasan Tugas Baru (`TasksController.CreateTask`)**:
   * Jika `request.AssignedToUserId` tidak kosong dan berbeda dari pembuat tugas, kirim notifikasi: *"Anda ditugaskan pada tugas: [Judul Tugas]"* dengan `ActionUrl = "/tasks"`.
2. **Pembaruan Status Tugas (`TasksController.UpdateTask`)**:
   * Jika status tugas berubah menjadi `Done` atau tahap akhir, kirim notifikasi ke `CreatedByUserId`: *"Tugas [Judul Tugas] telah diselesaikan oleh [Nama Pelaksana]"*.
3. **Penerbitan Pengumuman Baru (`AnnouncementsController.CreateAnnouncement`)**:
   * Saat pengumuman dibuat dan berstatus aktif, picu `BroadcastCompanyAsync` ke seluruh staf perusahaan terkait: *"Pengumuman Baru: [Judul]"* dengan `ActionUrl = "/announcements"`.

---

## 5. Antarmuka Pengguna Frontend (UI/UX)

### 5.1 SignalR Connection Provider (`NotificationProvider` & `useNotificationHub`)
* Menggunakan pustaka `@microsoft/signalr`.
* Handshake otomatis menggunakan Bearer Token dari `localStorage`.
* Menerima event `"ReceiveNotification"`:
  * Memunculkan toast interaktif via `sonner`: judul, deskripsi pesan, dan tombol *"Buka"*.
  * Meng-invalidate React Query: `["notifications"]` dan `["notifications-unread-count"]`.

### 5.2 Header Bell Icon Popover (`components/common/header/notifications.tsx`)
* Mengambil data langsung dari `GET /api/notifications?pageSize=10` dan `GET /api/notifications/unread-count`.
* Badge merah berkedip saat `unreadCount > 0`.
* Menampilkan daftar 10 notifikasi terbaru dengan kategori badge berwarna.
* Klik item: langsung menandai dibaca dan mengarahkan ke `actionUrl`.
* Tombol *"Tandai Semua Dibaca"* dan tombol *"Lihat Semua"* yang mengarahkan ke `/notifications`.

### 5.3 Halaman Pusat Notifikasi (`src/app/(with-layouts)/notifications/page.tsx`)
* Tab filter: *Semua*, *Belum Dibaca*, *Tugas*, *Pengumuman*, *Presensi*, *Broadcast*.
* Tampilan list/card modern dengan tanggal relatif (misal: "5 menit lalu").
* Tombol aksi cepat: "Buka", "Tandai Dibaca", "Hapus".
* Modal Admin "Kirim Siaran (Broadcast)":
  * Formulir input Judul, Isi Pesan, Kategori, Tautan Tindakan, dan Pilihan Target (Seluruh Tim atau Anggota Tertentu).
* Menu Sidebar: Ditambahkan ke `NAV_DATA` di bawah bagian OPERASIONAL KERJA.

---

## 6. Rencana Pengujian & Validasi Mutu
1. **Unit Testing Backend (`TrackerKerja.Tests`)**:
   * `NotificationsControllerTests.cs`:
     * Pengguna hanya dapat melihat dan menandai notifikasi miliknya sendiri (isolasi multi-tenant).
     * Endpoint `read-all` memperbarui seluruh notifikasi aktif pengguna.
     * Endpoint `broadcast` ditolak untuk pengguna non-admin (403 Forbidden).
     * Admin berhasil mengirim siaran dan tersimpan di database.
2. **Kompilasi Frontend**:
   * Menjalankan `tsc --noEmit` untuk memastikan integritas tipe dan 0 error.
3. **End-to-End Verifikasi**:
   * Pengujian pengiriman notifikasi saat pembuatan tugas dan penerbitan pengumuman.

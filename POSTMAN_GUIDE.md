# Panduan Pengujian API dengan Postman (TaskWorker Pro v2.0)

Dokumen ini memuat petunjuk resmi penggunaan **Postman Collection** dan **Postman Environment** untuk pengujian otomatis (automated testing) seluruh endpoint sistem **TaskWorker Pro (TrackerKerja Modern)**.

---

## 1. Berkas Pengujian yang Disediakan

| Berkas | Deskripsi |
| :--- | :--- |
| **`TrackerKerja_Postman_Collection.json`** | Koleksi 69 request API yang mencakup 16 modul sistem, dilengkapi pengujian otomatis (`pm.test`), validasi latency, schema JSON, dan chaining token dinamis. |
| **`TrackerKerja_Postman_Environment.json`** | Variabel environment Postman (`base_url`, `admin_email`, `jwt_token`, `corporate_code`, dll). |

---

## 2. Struktur Modul dalam Postman Collection

Koleksi Postman telah disusun secara hierarkis mencakup seluruh modul operasional:

1. **`0. System Health & Maintenance (Public)`**: Health check anonim, ping host sinkronisasi, statistik tabel basis data, dan optimasi VACUUM.
2. **`1. Autentikasi & Akun`**: Login Admin (otomatis menyimpan `jwt_token`), Profil Pengguna, Registrasi, dan Refresh Token.
3. **`2. Dashboard & Metrik`**: Statistik eksekutif, workload anggota tim, dan recent activity.
4. **`3. Manajemen Proyek (Projects)`**: Ambil daftar proyek, buat proyek baru (otomatis set `test_project_id`), detail, dan pembaruan proyek.
5. **`4. Manajemen Tugas & Sub-Tugas (Tasks)`**: WBS hierarki tugas, buat tugas baru (otomatis set `test_task_id`), detail tugas, unified save, toggle status, checklist sub-tugas, dan papan Kanban.
6. **`5. Timesheet & Multi-Timer`**: Riwayat sesi kerja, log jam kerja manual cepat, start timer real-time, status timer aktif, dan stop timer.
7. **`6. Presensi & Absensi (Attendances)`**: Status presensi hari ini, check-in GPS WFO/WFH, check-out, riwayat bulanan, dan rekonsiliasi admin.
8. **`7. Gamifikasi, Badges & Rewards`**: Ringkasan poin & streak, daily check-in (+10 poin), galeri lencana prestasi, katalog reward, screen-time produktif, dan manajemen Master Badge oleh Admin.
9. **`8. Anggota Tim & Persetujuan (Members)`**: Daftar anggota aktif dan daftar registrasi pending approval.
10. **`9. Catatan Cepat (Notes)`**: CRUD catatan kerja pribadi dan pinning.
11. **`10. Pengumuman Resmi (Announcements)`**: Modal pop-up pengumuman aktif dan daftar pengumuman.
12. **`11. Notifikasi Sistem`**: Daftar notifikasi, unread count, dan mark all as read.
13. **`12. Laporan & Analytics (Reports)`**: Filter opsi pelaporan, laporan timesheet, laporan tugas per milestone, dan achievement anggota.
14. **`13. Kalender Kerja (Calendar)`**: Jadwal dan deadline tugas terintegrasi kalender.
15. **`14. Data Master & Organisasi`**: Master prioritas, kategori, milestone proyek, multi-tenant companies, dan system settings.
16. **`15. Developer Tools & Audit Logs`**: Format JSON, format SQL, riwayat audit log keamanan, dan statistik aktivitas per modul.

---

## 3. Langkah Impor ke Postman

1. Buka aplikasi **Postman** (Desktop atau Web).
2. Klik tombol **Import** di pojok kiri atas.
3. Pilih berkas:
   - `TrackerKerja_Postman_Collection.json`
   - `TrackerKerja_Postman_Environment.json`
4. Di pojok kanan atas Postman, pilih environment aktif: **`TaskWorker Pro — Local Environment`**.

---

## 4. Konfigurasi Variabel Environment

Berkas `TrackerKerja_Postman_Environment.json` telah dilengkapi variabel bawaan:

```json
{
  "base_url": "http://localhost:5008/api",
  "admin_email": "admin@trackerkerja.local",
  "admin_password": "AdminSecurePassword2026!",
  "corporate_code": "WCH",
  "jwt_token": "",
  "current_user_id": "",
  "test_project_id": "1",
  "test_task_id": "1",
  "test_subtask_id": "1",
  "test_note_id": "1",
  "test_badge_id": "1"
}
```

> **Catatan Alur Otomatis**:
> Saat request **`1. Autentikasi & Akun -> Login Administrator`** dieksekusi, skrip Postman akan secara otomatis mengambil `accessToken` dari respons server dan menyimpannya ke variabel `{{jwt_token}}`. Seluruh request berikutnya akan otomatis menggunakan token ini via header `Authorization: Bearer {{jwt_token}}`.

---

## 5. Contoh Skrip Pengujian Otomatis (pm.test)

Setiap request dalam koleksi ini telah dilengkapi skrip pengujian JavaScript pada tab **Tests**.

### A. Pengujian Standar Status Code, Waktu Respons, dan JSON Schema
```javascript
pm.test("Status code is successful (200/201)", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response time is acceptable (< 2000ms)", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

var jsonData = pm.response.json();
pm.test("Response payload has success flag or valid object structure", function () {
    pm.expect(jsonData).to.be.an('object');
    if (jsonData.hasOwnProperty('success')) {
        pm.expect(jsonData.success).to.be.true;
    }
});
```

### B. Otomasi Ekstraksi Token JWT pada Endpoint Login
```javascript
pm.test("Token JWT is generated and non-empty", function () {
    var token = jsonData.accessToken || jsonData.token || (jsonData.data && jsonData.data.token);
    pm.expect(token).to.be.a('string').and.not.empty;
});

pm.test("User profile has Administrator role", function () {
    var user = jsonData.user || (jsonData.data && jsonData.data.user);
    pm.expect(user).to.be.an('object');
    pm.expect(user.roles).to.include('Administrator');
});

// Chaining otomatis ke environment
var token = jsonData.accessToken || jsonData.token || (jsonData.data && jsonData.data.token);
if (token) {
    pm.environment.set('jwt_token', token);
    console.log('JWT Token successfully set in environment.');
}
var user = jsonData.user || (jsonData.data && jsonData.data.user);
if (user && user.id) {
    pm.environment.set('current_user_id', user.id);
}
```

### C. Pengujian Pembuatan Tugas Baru & Penyimpanan ID Dinamis
```javascript
pm.test("New task created successfully", function () {
    var t = jsonData.data || jsonData.task || jsonData;
    pm.expect(t).to.have.property('id');
    pm.expect(t.title).to.include('Automated Integration');
});

// Simpan ID tugas baru untuk digunakan pada request detail, subtask, dan update berikutnya
var t = jsonData.data || jsonData.task || jsonData;
if (t && t.id) {
    pm.environment.set('test_task_id', t.id);
}
```

---

## 6. Menjalankan Seluruh Koleksi (Collection Runner & CLI)

### Melalui Postman Collection Runner:
1. Klik kanan pada koleksi **TaskWorker Pro (TrackerKerja Modern) API Collection**.
2. Pilih **Run Collection**.
3. Pastikan urutan pengujian dimulai dari modul **0** dan **1 (Login)** agar token terisi terlebih dahulu.
4. Klik **Run TaskWorker Pro...**.

### Melalui CLI (Newman):
Jika telah menginstal `newman`:
```bash
npm install -g newman
newman run TrackerKerja_Postman_Collection.json -e TrackerKerja_Postman_Environment.json --delay-request 100
```

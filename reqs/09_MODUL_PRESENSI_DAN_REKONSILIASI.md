# 📍 FASE 9: PRESENSI TERPADU & REKONSILIASI KEHADIRAN
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Presensi Kerja (Clock In/Out), Lokasi Kerja (WFO/WFH/Dinas/Remote), Rekapitulasi Jam Kerja, dan Rekonsiliasi Absensi Tim oleh Admin**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids)  
> **Status**: Ready for Implementation  

---

## 1. Lingkup Fungsional & Atribut Presensi

Modul Presensi (*Attendance Records*) mencatat disiplin kehadiran harian seluruh anggota tim:
1. **Presensi Mandiri (1-Click Clock In & Clock Out)**:
   - Pencatatan waktu datang (*Clock In*) dan waktu pulang (*Clock Out*).
   - Perhitungan otomatis total jam kerja harian: $\text{TotalHours} = \frac{\text{ClockOut} - \text{ClockIn}}{3600 \text{ detik}}$.
2. **Kategori Kehadiran (`Type`)**:
   - `1 = Present` (Hadir Normal)
   - `2 = Leave` (Cuti)
   - `3 = Sick` (Sakit dengan Surat Keterangan)
   - `4 = Permission` (Izin Keperluan Mendesak)
   - `5 = BusinessTrip` (Perjalanan Dinas Luar Kota)
   - `6 = Holiday` (Hari Libur Resmi / Nasional)
3. **Lokasi Kerja (`WorkLocation`)**:
   - `1 = WFO` (Work From Office)
   - `2 = WFH` (Work From Home)
   - `3 = Dinas` (Dinas Lapangan / Klien)
   - `4 = Remote` (Bekerja Remote dari Mana Saja)
4. **Rekonsiliasi Presensi Tim oleh Administrator**:
   - Khusus pengguna dengan peran `Administrator`, tersedia menu rekonsiliasi untuk meninjau, mengoreksi, atau menambahkan catatan kehadiran anggota yang lupa melakukan Clock In/Clock Out.

---

## 2. Kontrak Endpoint REST API (`/api/attendances`)

### A. Operasi Presensi Mandiri
- `GET /api/attendances/today` — Mengecek status kehadiran pengguna hari ini (sudah clock-in / clock-out atau belum).
- `POST /api/attendances/clock-in` — Mencatat absensi masuk:
  ```json
  {
    "workLocation": 1,
    "notes": "Hadir di kantor pusat lantai 3"
  }
  ```
- `POST /api/attendances/clock-out` — Mencatat absensi pulang dan menghitung akumulasi total jam kerja hari ini.
- `GET /api/attendances/my-history?month=10&year=2026` — Riwayat kehadiran personal pengguna selama bulan tertentu.

### B. Rekonsiliasi Tim (Administrator Only)
- `GET /api/attendances/reconciliation?date=2026-10-12&companyId=1` — Menampilkan tabel rekonsiliasi seluruh anggota perusahaan pada tanggal tertentu.
- `PUT /api/attendances/reconciliation/{id}` — Mengoreksi jam clock-in, clock-out, atau status kehadiran anggota secara manual.
- `POST /api/attendances/reconciliation/manual-entry` — Menambahkan rekaman presensi manual untuk anggota yang berhalangan hadir/lupa absen.

---

## 3. Format DTO (C#)

```csharp
public record TodayAttendanceStatusDto(
    bool HasClockedIn,
    bool HasClockedOut,
    DateTimeOffset? ClockInTime,
    DateTimeOffset? ClockOutTime,
    double TotalHours,
    int WorkLocation,
    string? Notes
);

public record ReconcileAttendanceRequest(
    int Id,
    int Type,
    int WorkLocation,
    DateTimeOffset? ClockIn,
    DateTimeOffset? ClockOut,
    string? LeaveReason,
    string? Notes
);
```

---

## 4. Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

### A. Widget Presensi Cepat di Dashboard (`/dashboard`)
- Menampilkan kartu status presensi hari ini:
  - Tombol aksi besar **"Clock In"** (Warna Emerald) jika belum hadir.
  - Tombol **"Clock Out"** (Warna Amber/Rose) jika sudah Clock In dan belum pulang.
  - Pilihan radio/dropdown lokasi kerja (`WFO`, `WFH`, `Dinas`, `Remote`) menggunakan komponen TailGrids `select.tsx`.

### B. Halaman Presensi & Rekonsiliasi (`/attendance`)
- **Tampilan Kalender / Grid Bulanan**: Menampilkan kalender visual yang menandai hari-hari kehadiran dengan warna hijau (hadir), kuning (izin/cuti), atau merah (alpa).
- **Tab Khusus Admin "Rekonsiliasi Tim"**:
  - Tabel interaktif dengan `@tanstack/react-table` menyajikan daftar seluruh staf.
  - Tombol aksi "Edit Kehadiran" memunculkan modal `dialog.tsx` untuk penyesuaian jam kerja staf yang bersangkutan.

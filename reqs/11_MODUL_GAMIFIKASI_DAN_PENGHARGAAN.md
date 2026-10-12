# 🎮 FASE 11: GAMIFIKASI, CHECK-IN & REWARD STORE
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Mesin Gamifikasi, Aturan Poin 15 & 30 Hari, Reset Bulanan, Lencana Prestasi (Master Badges) & Penukaran Hadiah**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids)  
> **Status**: Ready for Implementation  

---

## 1. Aturan Bisnis & Mekanisme Poin Gamifikasi

Modul Gamifikasi mendorong konsistensi absensi dan produktivitas tim melalui aturan gamifikasi terstruktur:

### A. Aturan Saldo Bulanan Dimulai dari 0
- Akumulasi saldo poin check-in seluruh pengguna **dimulai kembali dari 0 pada awal bulan kalender** (tanggal 1 setiap bulan).
- Hal ini menjaga agar kompetisi absensi tetap aktif dan relevan setiap bulannya.

### B. Aturan Akumulasi Poin Check-In 15 & 30 Hari
1. **15 Hari Check-In dalam Sebulan**:
   - Memperoleh **1/2 (50%)** dari total akumulasi target poin milestone bulanan.
2. **30 Hari Check-In Penuh dalam Sebulan**:
   - Memperoleh **1x (100%)** dari total akumulasi poin target milestone bulanan secara utuh.

### C. Akumulasi Poin Lencana Prestasi (Additive Master Badges)
- Poin yang diperoleh dari 40+ lencana prestasi (*Master Badges*) bersifat **permanen** dan **ditambahkan langsung di atas** saldo akumulasi poin check-in bulanan pengguna.

### D. Daily Check-In Harian & Toleransi Streak 2 Hari
- **1-Click Check-In Harian**: Pengguna memperoleh **+10 Poin** per check-in harian.
- **Streak Counter**: Menghitung rangkaian hari berturut-turut (*streak*).
- **Toleransi 2 Hari**: Jika pengguna absen 1 hari, streak tidak langsung hangus; toleransi hingga **2 hari berturut-turut** sebelum streak di-reset kembali ke Hari 1.

### E. Penukaran Hadiah (Reward Claims)
- **Valuasi Saldo**: **1 Poin = Rp 100**.
- **Katalog Hadiah**: Voucher E-Wallet (GoPay, OVO, ShopeePay), Pulsa, Kopi, Merchandise Kantor, atau Hadiah Bulanan.
- **Alur Persetujuan**: Klaim hadiah berstatus `Pending` hingga diverifikasi dan disetujui (`Approved`) oleh Administrator.

---

## 2. Kontrak Endpoint REST API (`/api/gamification`)

### A. Daily Check-In & Saldo Poin
- `GET /api/gamification/status` — Mengambil saldo poin aktif, streak hari ini, dan status check-in hari ini.
- `POST /api/gamification/check-in` — Melakukan 1-click daily check-in (menambah 10 poin & menaikkan streak).
- `GET /api/gamification/monthly-progress` — Menampilkan progres akumulasi check-in bulan ini (indikator 15 hari dan 30 hari).
- `GET /api/gamification/leaderboard` — Peringkat poin tertinggi tim perusahaan bulan ini.

### B. Lencana Prestasi (Badges)
- `GET /api/gamification/badges` — Daftar seluruh 40+ Master Badges dan status kepemilikan oleh pengguna yang sedang login.
- `GET /api/gamification/my-badges` — Daftar lencana yang telah berhasil diraih pengguna.

### C. Katalog Hadiah & Klaim (`/api/gamification/rewards`)
- `GET /api/gamification/rewards` — Menampilkan item hadiah aktif di Reward Store.
- `POST /api/gamification/rewards/claim` — Mengajukan penukaran hadiah:
  ```json
  {
    "rewardItemId": 4,
    "userNotes": "Tukar ke Voucher GoPay 081234567890"
  }
  ```
- `GET /api/gamification/rewards/claims` — Riwayat klaim hadiah pengguna.
- `GET /api/gamification/admin/claims` (Admin Only) — Daftar seluruh pengajuan klaim hadiah tim yang menunggu persetujuan.
- `POST /api/gamification/admin/claims/{id}/approve` (Admin Only) — Menyetujui klaim hadiah.
- `POST /api/gamification/admin/claims/{id}/reject` (Admin Only) — Menolak klaim dan mengembalikan saldo poin ke pengguna.

---

## 3. Format DTO (C#)

```csharp
public record GamificationSummaryDto(
    int TotalCurrentPoints,
    int MonthlyCheckInPoints,
    int BadgePoints,
    int CurrentStreakDays,
    bool HasCheckedInToday,
    int DaysCheckedInThisMonth,
    bool Reached15DaysMilestone,
    bool Reached30DaysMilestone,
    int TotalBadgesUnlocked
);

public record ClaimRewardRequest(
    int RewardItemId,
    string? UserNotes
);

public record ProcessRewardClaimRequest(
    bool IsApproved,
    string? AdminNotes
);
```

---

## 4. Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

### A. Halaman Beranda Gamifikasi (`/gamification`)
- **Kartu Poin & Streak Animasi**: Menampilkan saldo poin dengan efek visual emas/indigo, ikon api untuk streak counter, dan tombol check-in harian yang dinonaktifkan jika sudah absen hari ini.
- **Bar Pencapaian 15 & 30 Hari**: Visual progress bar penanda batas target 15 hari (50%) dan 30 hari (100%) dengan lencana hadiah bulanan.
- **Leaderboard Podium**: Menampilkan 3 besar pengguna teratas bulan ini dengan avatar TailGrids dan badge peringkat.

### B. Galeri Lencana Prestasi (`/gamification/badges`)
- Grid 40+ lencana dengan warna border adaptif berdasarkan kelangkaan (*Common* abu-abu, *Rare* biru, *Epic* ungu, *Legendary* emas). Lencana yang belum terbuka berstatus redup (*grayscale*).

### C. Reward Store & Pengajuan Klaim (`/gamification/rewards`)
- Katalog kartu hadiah dengan harga poin dan ekuivalen Rupiah (`Rp 50.000 (500 Poin)`).
- Modal konfirmasi penukaran hadiah menggunakan TailGrids `dialog.tsx` dengan validasi kecukupan saldo poin secara instan di sisi klien.

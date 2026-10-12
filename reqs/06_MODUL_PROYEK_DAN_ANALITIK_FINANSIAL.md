# 💼 FASE 6: MODUL PROYEK DAN ANALITIK FINANSIAL
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Manajemen Proyek, Analitik Finansial (Budget vs Actual Cost), Indikator Burn Rate & Alokasi Massal Tugas**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids + Recharts)  
> **Status**: Ready for Implementation  

---

## 1. Lingkup Fungsional & Kebutuhan Bisnis

Modul Proyek mengorganisasi tugas-tugas tim ke dalam payung proyek strategis berdurasi multi-bulan dengan pengawasan finansial ketat:
1. **Atribut Proyek**: Nama proyek, deskripsi ruang lingkup, warna aksen Hex, batas akhir (*Deadline*), dan status alur kerja (`Active`, `Completed`, `Archived`).
2. **Klien & Project Manager (PM)**: Pencatatan entitas klien (`ClientName`) dan penugasan Project Manager (`ProjectManagerId`) dari direktori anggota.
3. **Analitik Finansial & Burn Rate**:
   - Pagu Anggaran (*Budget*): Nilai kontrak atau batas alokasi anggaran proyek.
   - Biaya Aktual (*Actual Cost*): Akumulasi realisasi biaya riil.
   - **Formula Burn Rate**:
     $$\text{Burn Rate (\%)} = \left(\frac{\text{ActualCost}}{\text{Budget}}\right) \times 100\%$$
   - **Indikator Visual Warna Adaptif**:
     - **Emerald / Hijau (< 80%)**: Pengeluaran aman dan terkendali.
     - **Amber / Kuning (80% - 100%)**: Peringatan mendekati batas pagu anggaran.
     - **Rose / Merah (> 100%)**: *Overbudget Warning!* Terjadi pembengkakan biaya di atas pagu.
4. **Alokasi Massal Tugas ke Proyek (Bulk Task Assignment)**:
   - Fitur modal checklist pada halaman detail proyek untuk menugaskan sekumpulan tugas lepas (*unassigned tasks*) ke dalam proyek bersangkutan dalam satu klik.

---

## 2. Kontrak Endpoint REST API (`/api/projects`)

### A. Operasi CRUD Proyek
- `GET /api/projects` — Mengambil daftar proyek (mendukung filter `companyId`, `status`, `search`).
  - Menghasilkan ringkasan: jumlah tugas, persentase progress rata-rata, budget, actual cost, dan burn rate.
- `GET /api/projects/{id}` — Detail lengkap proyek beserta statistik tugas dan tim kerja.
- `POST /api/projects` (Admin / PM) — Membuat proyek baru.
- `PUT /api/projects/{id}` (Admin / PM) — Memperbarui metadata proyek, status, dan finansial.
- `DELETE /api/projects/{id}` (Admin Only) — Menghapus proyek (tugas di dalamnya diubah menjadi `projectId = null`).

### B. Alokasi Massal Tugas (*Bulk Assignment*)
- `GET /api/projects/{id}/unassigned-tasks` — Mengambil daftar tugas yang belum terikat ke proyek mana pun dalam perusahaan bersangkutan.
- `POST /api/projects/{id}/assign-tasks` — Mengalokasikan sekumpulan ID tugas ke proyek ini sekaligus:
  ```json
  {
    "taskIds": [12, 15, 18, 24]
  }
  ```

---

## 3. Format DTO (C#)

```csharp
public record ProjectListDto(
    int Id,
    string Name,
    string? Description,
    string Color,
    int Status,
    string? ClientName,
    string? ProjectManagerName,
    decimal Budget,
    decimal ActualCost,
    double BurnRatePercent,
    string BurnRateStatus, // "Safe", "Warning", "Overbudget"
    int TotalTasks,
    int CompletedTasks,
    int ProgressPercent,
    DateTimeOffset? Deadline,
    DateTimeOffset CreatedAt
);

public record CreateProjectRequest(
    string Name,
    string? Description,
    string Color,
    int Status,
    string? ClientName,
    string? ProjectManagerId,
    decimal Budget,
    decimal ActualCost,
    DateTimeOffset? Deadline
);

public record BulkAssignTasksRequest(
    List<int> TaskIds
);
```

---

## 4. Desain Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

### A. Halaman Daftar Proyek (`/projects`)
- **Tampilan Grid Kartu Proyek**: Memanfaatkan komponen `card.tsx` TailGrids dengan badge status dan header aksen warna proyek.
- **Kartu Ringkasan Finansial**: Menampilkan metrik total pagu anggaran aktif dan total pengeluaran perusahaan menggunakan format mata uang IDR (`Rp`).
- **Komponen Progress Bar Burn Rate**:
  ```tsx
  export function BurnRateProgressBar({ percent }: { percent: number }) {
    const colorClass = 
      percent > 100 ? "bg-red-500" :
      percent >= 80 ? "bg-amber-500" : "bg-emerald-500";

    return (
      <div className="w-full">
        <div className="flex justify-between text-xs font-medium mb-1">
          <span>Burn Rate</span>
          <span className={percent > 100 ? "text-red-600 font-bold" : ""}>
            {percent.toFixed(1)}% {percent > 100 && "(OVERBUDGET!)"}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${colorClass}`} 
            style={{ width: `${Math.min(percent, 100)}%` }} 
          />
        </div>
      </div>
    );
  }
  ```

### B. Halaman Detail Proyek & Alokasi Massal (`/projects/[id]`)
- **Visualisasi Recharts**: Grafik donat alokasi tugas berdasarkan prioritas dan grafik batang pengeluaran bulanan.
- **Modal Checklist Alokasi Massal**: Menggunakan komponen `dialog.tsx` TailGrids berisi tabel checklist interaktif (`checkbox.tsx`) untuk memilih tugas lepas dan tombol aksi simpan satu klik.

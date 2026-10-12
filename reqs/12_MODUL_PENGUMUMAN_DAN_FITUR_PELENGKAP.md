# 📢 FASE 12: PENGUMUMAN RESMI & FITUR PELENGKAP
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Pengumuman Resmi (Announcements), Modal Popup Interaktif dengan Aturan Anti-Overlap, Kalender Interaktif & Impor Excel**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids)  
> **Status**: Ready for Implementation  

---

## 1. Modul Pengumuman Resmi & Aturan Anti-Overlap

Modul Pengumuman menyiarkan informasi operasional penting dari manajemen kepada seluruh pengguna:
1. **Kategori Pengumuman**:
   - **Informasi Penting**: Informasi mendesak atau darurat, ditampilkan dengan header/banner merah/rose menyala.
   - **Pengumuman Umum**: Pemberitahuan standar perusahaan, ditampilkan dengan aksen indigo/ungu.
2. **Periode Tayang**: Memiliki tanggal mulai (`start_date`) dan tanggal berakhir (`end_date`). Pengumuman otomatis kedaluwarsa setelah melewati tanggal akhir.
3. **Aturan Urutan Ketat Anti-Tumpang Tindih (*Strict Anti-Overlap Rule*)**:
   - Modal pengumuman **tidak akan pernah muncul berbarengan** dengan panduan pengguna (baik *Interactive Onboarding Tour* maupun *User Guide Modal*).
   - Jika pengguna baru sedang membuka tur/panduan, modal pengumuman tetap menunggu di latar belakang.
   - Segera setelah pengguna menutup panduan, modal pengumuman otomatis muncul ke layar dengan transisi animasi halus.
4. **Kontrol Pengguna ("Jangan Tampilkan Lagi")**:
   - Pengguna dapat mencentang opsi *"Jangan tampilkan lagi"* sehingga pengumuman yang sudah dibaca tidak terus-menerus muncul saat me-refresh halaman (dicatat di tabel `user_announcement_reads`).

---

## 2. Kontrak Endpoint REST API (`/api/announcements`)

### A. Operasi Pengumuman Pengguna
- `GET /api/announcements/active` — Mengambil pengumuman yang sedang aktif dan belum ditandai *"Jangan tampilkan lagi"* oleh user yang sedang login.
- `POST /api/announcements/{id}/mark-read` — Menandai pengumuman telah dibaca (dengan parameter `dontShowAgain: true/false`).

### B. Pengelolaan Pengumuman oleh Administrator
- `GET /api/announcements` (Admin Only) — Daftar seluruh pengumuman beserta statistik pembaca.
- `POST /api/announcements` (Admin Only) — Membuat pengumuman baru:
  ```json
  {
    "title": "Maintenance Server PostgreSQL Malam Ini",
    "content": "Akan dilakukan upgrade versi database pukul 23:00 - 01:00 WIB.",
    "type": "Informasi Penting",
    "startDate": "2026-10-12T00:00:00Z",
    "endDate": "2026-10-13T00:00:00Z",
    "isActive": true
  }
  ```
- `PUT /api/announcements/{id}` (Admin Only) — Mengedit data pengumuman.
- `PATCH /api/announcements/{id}/toggle-active` (Admin Only) — Mengaktifkan/menonaktifkan pengumuman.
- `DELETE /api/announcements/{id}` (Admin Only) — Menghapus pengumuman.

---

## 3. Fitur Pelengkap: Modul Kalender Kerja & Impor Excel

### A. Kalender Kerja Interaktif (`/calendar`)
- Menggunakan paket `@fullcalendar/react` yang sudah tersedia di template `sample-web-ui`.
- Menampilkan jadwal deadline tugas dan proyek dalam tampilan Bulan (*Month*), Minggu (*Week*), dan Hari (*Day*).
- **Scope Filter RBAC**:
  - Administrator dapat memfilter: `Semua Tim` atau `Tugas Sendiri`.
  - Member biasa otomatis terkunci hanya melihat jadwal pekerjaannya sendiri.

### B. Impor Tugas dari Excel (ClosedXML Engine)
- Mengunggah file `.xlsx` untuk memasukkan puluhan tugas secara massal dalam hitungan detik.
- Mendukung 2 format template spreadsheet:
  1. **Format Standar (9 Kolom)**: `No`, `Judul`, `Deskripsi`, `Prioritas`, `Status`, `PIC Email`, `Mulai`, `Selesai`, `Proyek`.
  2. **Format ARMS (21 Kolom)**: Format resmi pelaporan enterprise dengan rincian kendala, solusi, dan pembobotan persentase.
- **Endpoint**: `POST /api/tasks/import-excel` (Admin / Elevated Only).

---

## 4. Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

### A. Modal Popup Pengumuman Interaktif (`AnnouncementModal.tsx`)
```tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/tailgrids/core/dialog";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";

export function AnnouncementModal({ activeAnnouncement, isOnboardingActive }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Terapkan Anti-Overlap Rule: Hanya buka jika onboarding TIDAK aktif
    if (activeAnnouncement && !isOnboardingActive) {
      setIsOpen(true);
    }
  }, [activeAnnouncement, isOnboardingActive]);

  const handleClose = async () => {
    setIsOpen(false);
    if (activeAnnouncement) {
      await fetch(`/api/announcements/${activeAnnouncement.id}/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dontShowAgain })
      });
    }
  };

  if (!activeAnnouncement) return null;

  const isEmergency = activeAnnouncement.type === "Informasi Penting";

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={`max-w-lg ${isEmergency ? "border-red-500" : "border-indigo-500"}`}>
        <DialogHeader className={isEmergency ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"}>
          <DialogTitle>{activeAnnouncement.title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm text-gray-700 dark:text-gray-300">
          <p>{activeAnnouncement.content}</p>
        </div>
        <DialogFooter className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <Checkbox checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
            Jangan tampilkan lagi
          </label>
          <Button onClick={handleClose} variant="primary">
            Saya Mengerti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

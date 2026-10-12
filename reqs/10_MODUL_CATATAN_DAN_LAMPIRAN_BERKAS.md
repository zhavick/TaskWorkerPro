# 📝 FASE 10: DOKUMENTASI KERJA & LAMPIRAN BERKAS
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Catatan Kerja (Rich-Text WYSIWYG), Pinning Catatan, Organisasi Lampiran Berkas Fisik Terproteksi**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids + TipTap / Quill)  
> **Status**: Ready for Implementation  

---

## 1. Lingkup Fungsional & Atribut Catatan Kerja

Modul Catatan Kerja (*Work Notes*) berfungsi sebagai pusat dokumentasi teknis, instruksi kerja (*SOP*), catatan *meeting*, dan artefak penulisan teknis:
1. **Format Konten Kaya (Rich-Text WYSIWYG)**: Menyimpan konten HTML terformat (`content_html`) dengan dukungan tabel, kode sintaksis, checklist, dan kutipan.
2. **Kategori & Aksen Warna**: Dikelompokkan berdasarkan kategori (`Backend`, `Frontend`, `DevOps`, `General`) dan warna kartu Hex untuk identifikasi visual instan.
3. **Catatan Tersemat (Pinned Notes)**: Atribut `is_pinned` menempatkan catatan-catatan penting di baris teratas galeri catatan.
4. **Relasi Fleksibel**: Dapat berdiri sendiri sebagai catatan umum (*standalone note*) atau ditautkan langsung ke tugas kerja tertentu (`task_id`).

---

## 2. Arsitektur Penyimpanan Berkas Lampiran (`NoteAttachments`)

1. **Struktur Folder Terorganisir**:
   Berkas fisik disimpan secara hierarkis pada filesystem server:
   ```
   uploads/
   └── companies/
       └── {companyId}/
           └── notes/
               └── {noteId}/
                   ├── 20261012_ERD_Architecture.pdf
                   └── 20261012_Config_Payload.json
   ```
2. **Keamanan File & Validasi MIME Whitelist**:
   - Hanya ekstensi yang diizinkan yang dapat diunggah: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.zip`, `.txt`, `.json`, `.sql`.
   - Nama file fisik disanitasi dan diberi prefix timestamp untuk menghindari benturan nama berkas.
   - Akses unduh berkas melalui endpoint terotentikasi (mencegah *direct link sniffing* oleh pengguna luar).

---

## 3. Kontrak Endpoint REST API (`/api/notes`)

### A. Operasi Catatan
- `GET /api/notes` — Mengambil daftar catatan (filter: `taskId`, `category`, `isPinned`, `search`).
- `GET /api/notes/{id}` — Detail lengkap catatan beserta seluruh lampiran berkasnya.
- `POST /api/notes` — Membuat catatan baru.
- `PUT /api/notes/{id}` — Memperbarui judul, konten HTML, kategori, dan aksen warna.
- `PATCH /api/notes/{id}/pin` — Toggle status sematkan (*pin / unpin*).
- `DELETE /api/notes/{id}` — Menghapus catatan beserta seluruh lampiran fisiknya.

### B. Operasi Lampiran Berkas
- `POST /api/notes/{id}/attachments` — Mengunggah satu atau beberapa berkas lampiran (`multipart/form-data`).
- `GET /api/notes/attachments/{attachmentId}/download` — Mengunduh berkas lampiran dengan validasi hak akses tenant.
- `DELETE /api/notes/attachments/{attachmentId}` — Menghapus berkas lampiran tertentu.

---

## 4. Format DTO (C#)

```csharp
public record NoteDetailDto(
    int Id,
    string Title,
    string ContentHtml,
    string Category,
    string Color,
    bool IsPinned,
    string AuthorName,
    int? TaskId,
    string? TaskTitle,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    List<NoteAttachmentDto> Attachments
);

public record NoteAttachmentDto(
    int Id,
    string FileName,
    long FileSizeBytes,
    string? ContentType,
    string? FileExtension,
    string UploadedByName,
    DateTimeOffset UploadedAt
);
```

---

## 5. Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

### A. Galeri Catatan Masonry Grid (`/notes`)
- Menampilkan kartu-kartu catatan menggunakan `card.tsx` dengan border aksen warna catatan.
- Ikon pin di sudut kanan atas untuk catatan tersemat (`is_pinned == true`).
- Sidebar kategori untuk filter instan berdasarkan topik (*API*, *Database*, *Frontend*, dll.).

### B. Editor Studio Catatan Bentang Penuh (`/notes/[id]/edit`)
- **Area Pengetikan Luas**: Editor TipTap / Quill terintegrasi dengan minimal tinggi area 450px.
- **Dropzone Berkas Lampiran**: Komponen drag-and-drop file upload dengan indikator progres unggah berkas dan daftar berkas terlampir lengkap dengan ukuran (KB/MB) dan tombol download/hapus.

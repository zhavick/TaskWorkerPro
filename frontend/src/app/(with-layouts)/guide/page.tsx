"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Layers,
  ShieldCheck,
  User,
  Sparkles,
  Clock,
  Calendar,
  CheckSquare,
  Briefcase,
  Flame,
  Award,
  Bell,
  Code2,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ExternalLink,
  Info,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Copy,
  Check,
  Bookmark,
  Share2,
  Sliders,
  HelpCircle,
  FileText,
  Key,
  Database,
  Mail,
  Zap,
  Building,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

// Definisi Interface Bab & Panduan
interface SubSection {
  id: string;
  title: string;
  targetRole: "all" | "user" | "admin";
  content: React.ReactNode;
}

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  category: "Dasar & Navigasi" | "Operasional Tugas" | "Waktu & Kehadiran" | "Kolaborasi & Tim" | "Utilitas & Developer" | "Administrasi & Sistem";
  targetRole: "all" | "user" | "admin";
  summary: string;
  quickActionUrl?: string;
  quickActionLabel?: string;
  subsections: SubSection[];
}

export default function UserGuidePage() {
  const { user, isAdmin } = useCurrentUser();

  // State Kontrol Navigasi & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [activeChapterId, setActiveChapterId] = useState<string>("bab-1");
  const [readingMode, setReadingMode] = useState<"continuous" | "chapter">("continuous");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Pantau scroll untuk reading progress bar & back to top
  useEffect(() => {
    const handleScroll = () => {
      const el = document.querySelector("main");
      if (!el) return;
      const totalScroll = el.scrollHeight - el.clientHeight;
      if (totalScroll > 0) {
        const currentProgress = (el.scrollTop / totalScroll) * 100;
        setReadingProgress(Math.min(100, Math.max(0, currentProgress)));
      }
      setShowBackToTop(el.scrollTop > 400);
    };

    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll);
      return () => mainEl.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const scrollToTop = () => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (readingMode === "chapter") {
      // Find chapter containing this subsection
      const parent = chaptersData.find(
        (c) => c.id === sectionId || c.subsections.some((s) => s.id === sectionId)
      );
      if (parent) {
        setActiveChapterId(parent.id);
      }
    }
    setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const copySectionLink = (id: string) => {
    const url = `${window.location.origin}/guide#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Tautan bab panduan disalin ke clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Data Panduan Lengkap (16 Bab Komprehensif Berbasis USER_GUIDE.md)
  const chaptersData: Chapter[] = useMemo(
    () => [
      {
        id: "bab-1",
        chapterNumber: 1,
        title: "Pengenalan & Memulai Aplikasi",
        shortTitle: "Pengenalan & Login",
        icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
        category: "Dasar & Navigasi",
        targetRole: "all",
        summary:
          "Memulai akses ke TrackerKerja Modern, alur login Lottie, registrasi kode tenant perusahaan, persetujuan admin, navigasi topbar, dan keamanan sesi 1 jam.",
        quickActionUrl: "/profile",
        quickActionLabel: "Buka Profil",
        subsections: [
          {
            id: "sub-1-1",
            title: "1.1 Halaman Masuk, Registrasi Kode Perusahaan & Admin Approval",
            targetRole: "all",
            content: (
              <div className="space-y-4">
                <p>
                  Work Tracker Pro (TrackerKerja) dilengkapi tampilan halaman masuk modern bertenaga animasi Lottie yang responsif.
                </p>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <h5 className="font-bold text-indigo-900 dark:text-indigo-300 text-xs flex items-center gap-2">
                    <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Registrasi Mandiri dengan Kode Perusahaan (Company Code)
                  </h5>
                  <p className="mt-1 text-xs text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                    Saat mendaftar akun baru di <code>/register</code>, pengguna wajib memasukkan <strong>Kode Perusahaan</strong> unik (contoh: <code>WAHANA</code> atau <code>ELISTEC</code>) yang diberikan oleh pimpinan organisasi. Sistem secara otomatis menautkan akun ke entitas perusahaan tersebut untuk menjamin isolasi data multi-tenant.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <h5 className="font-bold text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Alur Persetujuan Admin (Admin Approval Workflow)
                  </h5>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Akun yang baru didaftarkan berada dalam status <em>Pending Approval</em>. Pengguna belum dapat masuk ke ruang kerja hingga <strong>Administrator</strong> menyetujui akun tersebut melalui menu Direktori Anggota. Sistem akan menampilkan layar tunggu yang ramah serta mengirimkan notifikasi persetujuan via email.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "sub-1-2",
            title: "1.2 Navigasi Topbar, Kustomisasi 40 Tema & 5 Google Fonts",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p>
                  Antarmuka TrackerKerja mengusung <strong>Topbar Minimalis</strong> dengan tombol cepat yang dapat diakses kapan pun:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <li><strong>Badge Tenant Perusahaan:</strong> Menampilkan nama dan logo perusahaan aktif tempat Anda bernaung.</li>
                  <li><strong>Active Timers Widget:</strong> Indikator berapa timer sesi kerja yang sedang aktif berjalan detik ini.</li>
                  <li><strong>Tombol Panduan & Bantuan:</strong> Ikon tanda tanya (<code>?</code>) untuk membuka modal panduan interaktif atau halaman dokumentasi ini.</li>
                  <li><strong>Theme Customizer (40 Tema Tampilan):</strong> Pilih dari 40 palet warna curated modern (Midnight, Cyberpunk, Emerald, Sakura, dsb.).</li>
                  <li><strong>Font Switcher (5 Google Fonts):</strong> Ubah tipografi sistem secara realtime (Inter, Plus Jakarta Sans, Outfit, Roboto, Poppins).</li>
                </ul>
              </div>
            ),
          },
          {
            id: "sub-1-3",
            title: "1.3 Keamanan Sesi, Peringatan 5 Menit & Auto-Logout 1 Jam",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p>
                  Demi melindungi kerahasiaan data operasional perusahaan, sistem menerapkan kebijakan keamanan sesi berbasis aktivitas mouse/keyboard:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Inaktivitas 55 Menit
                    </span>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Muncul jendela modal peringatan dengan hitung mundur 5 menit. Klik &quot;Perpanjang Sesi&quot; untuk melanjutkan pekerjaan.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Key className="h-4 w-4 text-rose-500" />
                      Inaktivitas 60 Menit
                    </span>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Sesi secara otomatis diakhiri (auto-logout), cookie/token dihapus, dan dialihkan kembali ke halaman login secara aman.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-2",
        chapterNumber: 2,
        title: "Dashboard & Ringkasan Kinerja",
        shortTitle: "Dashboard Metrik",
        icon: <Layers className="h-4 w-4 text-emerald-500" />,
        category: "Dasar & Navigasi",
        targetRole: "all",
        summary:
          "Memahami kartu statistik utama, visualisasi beban kerja proyek, pengingat check-in harian, dan panel notifikasi lonceng cerdas.",
        quickActionUrl: "/dashboard",
        quickActionLabel: "Buka Dashboard",
        subsections: [
          {
            id: "sub-2-1",
            title: "2.1 Kartu Metrik Personal & Spanduk Pengingat Check-In",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p>
                  Dashboard utama menyajikan 5 kartu metrik eksekutif yang disesuaikan secara personal:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs text-center font-medium">
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/20">
                    <div className="text-blue-600 dark:text-blue-400 font-bold">Total Tasks</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">Semua Tugas</div>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <div className="text-amber-600 dark:text-amber-400 font-bold">In Progress</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">Sedang Dikerjakan</div>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">Done</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">Tuntas Selesai</div>
                  </div>
                  <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-950/20">
                    <div className="text-purple-600 dark:text-purple-400 font-bold">Jam Hari Ini</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">Timesheet Tercatat</div>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/20 col-span-2 sm:col-span-1">
                    <div className="text-rose-600 dark:text-rose-400 font-bold">Streak 🔥</div>
                    <div className="text-gray-500 text-[11px] mt-0.5">Daily Check-In</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Kartu ke-5 memiliki tombol aksi cepat <strong>&quot;Check-In Sekarang (+10 Poin)&quot;</strong> yang memungkinkan pengguna mengklaim poin harian langsung dalam 1 klik tanpa berpindah halaman (*instant AJAX*).
                </p>
              </div>
            ),
          },
          {
            id: "sub-2-2",
            title: "2.2 Panel Notifikasi Lonceng Cerdas",
            targetRole: "all",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Panel notifikasi di bilah atas dikelompokkan ke dalam 4 tab interaktif:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  <li><strong>Semua:</strong> Seluruh riwayat pengumuman dan penugasan tugas baru.</li>
                  <li><strong>Overdue:</strong> Peringatan kritis untuk tugas-tugas yang telah melewati batas waktu (*deadline*).</li>
                  <li><strong>Mendekati Deadline:</strong> Tugas yang jatuh tempo dalam 2–3 hari ke depan.</li>
                  <li><strong>Timesheet Cut-Off:</strong> Pengingat otomatis menjelang tanggal cut-off bulanan (tanggal 25).</li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-3",
        chapterNumber: 3,
        title: "Modul Task, Kanban Board & Kendala",
        shortTitle: "Tugas & Kanban",
        icon: <CheckSquare className="h-4 w-4 text-blue-500" />,
        category: "Operasional Tugas",
        targetRole: "all",
        summary:
          "Manajemen siklus hidup tugas kerja, hierarki sub-task, pencatatan kendala (obstacle) dan solusi teknis, Kanban drag & drop, serta impor spreadsheet Excel.",
        quickActionUrl: "/tasks",
        quickActionLabel: "Buka Modul Tugas",
        subsections: [
          {
            id: "sub-3-1",
            title: "3.1 Membuat & Mengatur Metadata Tugas Kerja",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Setiap tugas memiliki parameter terstruktur untuk menjamin akuntabilitas:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Kode Tugas & Judul:</strong> Diberikan kode otomatis unik (contoh: <code>TSK-0841</code>) dan nama inisiatif kerja yang jelas.
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Milestone SDLC Waterfall:</strong> Tahapan siklus pengembangan (Requirement, System Design, Implementation, Testing & QA, Deployment, Maintenance).
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Penanggung Jawab (PIC):</strong> Anggota tim pelaksana utama yang bertanggung jawab menyelesaikan deliverable.
                  </div>
                  <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Slider Kemajuan (0–100%):</strong> Menyesuaikan estimasi kemajuan pengerjaan tugas secara granular dan visual.
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "sub-3-2",
            title: "3.2 Sub-Task Hierarkis, Kendala (Obstacle) & Solusi Teknis",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Tugas berukuran besar dapat dipecah menjadi anak tugas (<em>sub-tasks</em>) dengan persentase bobot tersendiri.
                </p>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5 dark:border-rose-900/30 dark:bg-rose-950/20 text-xs">
                  <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    Pencatatan Kendala (Obstacle) & Solusi Teknis
                  </span>
                  <p className="mt-1 text-rose-800 dark:text-rose-300/80 leading-relaxed">
                    Jika pekerjaan Anda terhambat oleh faktor eksternal (misal: <em>&quot;Akses VPN staging belum disetujui&quot;</em>), isi kolom <strong>Kendala (Obstacle)</strong> dan <strong>Solusi Teknis / Tindak Lanjut</strong> pada form edit tugas. Kartu tugas akan menampilkan badge peringatan mencolok sehingga Lead dan PM dapat segera memberikan asistensi pada sesi standup meeting.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "sub-3-3",
            title: "3.3 Papan Kanban Interaktif & Tombol Switcher Mobile",
            targetRole: "all",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Pada menu <strong>Kanban Board</strong> (<code>/tasks/kanban</code>), kartu tugas dapat digeser (<em>Drag & Drop</em>) langsung antar kolom status: <strong>To Do</strong>, <strong>In Progress</strong>, dan <strong>Done</strong>. Status tugas di basis data akan tersimpan secara otomatis seketika.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Di layar smartphone, tersedia tombol tab horizontal di bagian atas untuk berpindah antar kolom status dengan rapi tanpa perlu menggulirkan layar secara berlebihan.
                </p>
              </div>
            ),
          },
          {
            id: "sub-3-4",
            title: "3.4 Impor Spreadsheet Excel (Standar, ARMS & Migrasi Catatan Kosong)",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Mendukung impor massal dari file spreadsheet <code>.xlsx</code> dengan 2 format:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
                  <li><strong>Format Standar (9 Kolom):</strong> Cocok untuk migrasi cepat daftar backlog tugas harian dengan wizard pratinjau dan fitur <em>Bulk Assign</em> PIC.</li>
                  <li><strong>Format ARMS Enterprise (21 Kolom):</strong> Memetakan seluruh atribut enterprise (kode tugas, modul, kendala, solusi, milestone SDLC, dan catatan).</li>
                </ul>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/20 text-xs">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Migrasi Cerdas Catatan Kosong dari Excel
                  </span>
                  <p className="mt-1 text-emerald-800 dark:text-emerald-300/80 leading-relaxed">
                    Jika kolom <em>Catatan</em> pada spreadsheet terisi sedangkan tugas di sistem lokal belum memiliki catatan (atau catatannya masih kosong), parser impor otomatis membuatkan entitas <strong>WorkNote</strong> baru dan memindahkan isi catatan tersebut ke modul Catatan Tugas.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "sub-3-5",
            title: "3.5 Penyatuan Formulir Edit Tugas & Timesheet Manual (1-Click Save)",
            targetRole: "all",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Saat membuka halaman ubah tugas (<code>/tasks/edit/[id]</code>), Anda tidak perlu berpindah ke modul timesheet untuk mencatat jam kerja. Cukup isi seksi <strong>&quot;Catat Jam Kerja Sesi Ini (Manual Timesheet)&quot;</strong> di kanvas kiri bawah (durasi, tanggal, dan rincian aktivitas), lalu klik satu tombol biru <strong>&quot;Simpan Perubahan & Sesi Kerja Manual&quot;</strong>. Sistem akan memperbarui data tugas sekaligus membuat entri log jam kerja secara atomik.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-4",
        chapterNumber: 4,
        title: "Modul Proyek, Finansial & Alokasi Massal",
        shortTitle: "Proyek & Budget",
        icon: <Briefcase className="h-4 w-4 text-cyan-500" />,
        category: "Operasional Tugas",
        targetRole: "all",
        summary:
          "Pengelolaan inisiatif proyek, pelacakan pagu anggaran vs biaya aktual, indikator burn rate finansial, serta alokasi tugas massal (Bulk Assignment).",
        quickActionUrl: "/projects",
        quickActionLabel: "Buka Proyek",
        subsections: [
          {
            id: "sub-4-1",
            title: "4.1 Membuat & Mengelola Proyek (Client, PM, Budget & Actual Cost)",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Setiap proyek diatur dengan parameter finansial dan operasional:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-center">
                  <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong className="block text-gray-900 dark:text-white">Budget (Pagu)</strong>
                    <span className="text-gray-500 text-[11px]">Nilai pagu anggaran proyek</span>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong className="block text-gray-900 dark:text-white">Actual Cost</strong>
                    <span className="text-gray-500 text-[11px]">Biaya pengeluaran berjalan</span>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong className="block text-gray-900 dark:text-white">Burn Rate %</strong>
                    <span className="text-gray-500 text-[11px]">Persentase penyerapan dana</span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "sub-4-2",
            title: "4.2 Alokasi Massal Tugas ke Proyek (Bulk Task Assignment)",
            targetRole: "all",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Pada detail proyek, Project Manager atau Administrator dapat mencentang puluhan tugas sekaligus dan memindahkannya ke proyek lain, mengubah PIC massal, atau menyelaraskan target milestone dalam 1 kali eksekusi (*bulk transaction*).
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-5",
        chapterNumber: 5,
        title: "Modul Timesheet, Multi-Timer & Laporan Excel",
        shortTitle: "Timesheet & Timer",
        icon: <Clock className="h-4 w-4 text-purple-500" />,
        category: "Waktu & Kehadiran",
        targetRole: "all",
        summary:
          "Pencatatan jam kerja live multi-timer serentak, floating bottom bar, notifikasi cut-off tanggal 25, dan ekspor spreadsheet resmi format Elistec.",
        quickActionUrl: "/timesheets",
        quickActionLabel: "Buka Timesheet",
        subsections: [
          {
            id: "sub-5-1",
            title: "5.1 Multi-Timer Serentak & Floating Timer Bar",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  TrackerKerja mendukung pengoperasian <strong>banyak timer pengerjaan tugas secara bersamaan</strong> (misal sedang menunggu kompilasi build pada tugas A sambil mengerjakan telaah dokumen pada tugas B).
                </p>
                <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3.5 dark:border-purple-900/30 dark:bg-purple-950/20 text-xs">
                  <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Floating Timer Bar di Bawah Layar
                  </span>
                  <p className="mt-1 text-purple-800 dark:text-purple-300/80 leading-relaxed">
                    Setiap kali Anda menekan tombol <strong>Start Timer</strong> pada kartu tugas, bilah pengatur waktu mengambang (*floating bar*) akan muncul di dasar layar. Anda dapat memantau detik jam berjalan, menjeda (pause), melanjutkan (resume), atau menghentikan (stop) timer dan langsung memasukkan catatan aktivitas.
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "sub-5-2",
            title: "5.2 Pengingat Cut-Off Tanggal 25 & Ekspor Excel Resmi",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Setiap tanggal 20–25 setiap bulannya, sistem akan mengaktifkan spanduk dan pemberitahuan cut-off agar anggota tim melengkapi rekaman jam kerja bulanan.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Melalui tombol <strong>Ekspor Timesheet</strong>, pengguna dapat mengunduh berkas laporan spreadsheet <code>.xlsx</code> resmi berstandar korporat yang telah menyertakan identitas proyek, rekapitulasi jam kerja, hari libur nasional, dan kolom tanda tangan persetujuan atasan.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-6",
        chapterNumber: 6,
        title: "Modul Presensi Kehadiran & Rekonsiliasi",
        shortTitle: "Presensi Tim",
        icon: <Calendar className="h-4 w-4 text-emerald-500" />,
        category: "Waktu & Kehadiran",
        targetRole: "all",
        summary:
          "Check-in & Check-out kehadiran harian, status WFH/WFO/Izin/Cuti, kalender absensi bulanan tim, dan form rekonsiliasi manual.",
        quickActionUrl: "/attendance",
        quickActionLabel: "Buka Presensi",
        subsections: [
          {
            id: "sub-6-1",
            title: "6.1 Check-In & Check-Out Kehadiran Harian",
            targetRole: "all",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Buka menu <strong>Presensi Kehadiran</strong> (<code>/attendance</code>) saat Anda memulai hari kerja. Pilih status kehadiran:
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">Hadir (WFO)</span>
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">Work From Home (WFH)</span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">Izin / Sakit</span>
                  <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">Cuti Resmi</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Saat jam kerja berakhir, klik tombol <strong>Check-Out</strong> untuk mencatat waktu kepulangan dan total jam kehadiran hari ini.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-7",
        chapterNumber: 7,
        title: "Modul Kalender Tugas & RBAC Scoping",
        shortTitle: "Kalender Jadwal",
        icon: <Calendar className="h-4 w-4 text-blue-500" />,
        category: "Waktu & Kehadiran",
        targetRole: "all",
        summary:
          "Visualisasi jadwal tugas interaktif FullCalendar v6 (Bulan, Minggu, Hari, Agenda), modal rincian acara, dan isolasi filter berbasis peran.",
        quickActionUrl: "/calendar",
        quickActionLabel: "Buka Kalender",
        subsections: [
          {
            id: "sub-7-1",
            title: "7.1 Tampilan Kalender & Kontrol Akses Berbasis Peran (RBAC Scoping)",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Menampilkan linimasa pengerjaan tugas berdasarkan rentang tanggal mulai dan tanggal jatuh tempo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <User className="h-4 w-4 text-blue-500" />
                      Pengguna Non-Admin (Staff / Member)
                    </span>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Otomatis terkunci pada cakupan <strong>&quot;Tugas Saya&quot;</strong> (<code>filter=mine</code>). Hanya tugas yang ditugaskan ke Anda yang akan muncul demi menjaga privasi dan fokus kerja.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Khusus Administrator
                    </span>
                    <p className="mt-1 text-indigo-800 dark:text-indigo-300/80">
                      Tersedia dropdown pemilih filter live di toolbar: <strong>&quot;Semua Tugas Tim&quot;</strong> (melihat beban kerja seluruh anggota dengan avatar PIC) atau <strong>&quot;Tugas Saya Sendiri&quot;</strong>.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-8",
        chapterNumber: 8,
        title: "Modul Catatan Kerja & Multi-File Upload",
        shortTitle: "Catatan & SOP",
        icon: <BookOpen className="h-4 w-4 text-amber-500" />,
        category: "Kolaborasi & Tim",
        targetRole: "all",
        summary:
          "Dokumentasi teknis teks kaya WYSIWYG Quill.js, kartu catatan berwarna, pin note, relasi tugas/proyek, dan unggah berkas multi-file terorganisir folder.",
        quickActionUrl: "/notes",
        quickActionLabel: "Buka Catatan",
        subsections: [
          {
            id: "sub-8-1",
            title: "8.1 Penyusunan Catatan Rich-Text, Kartu Warna & Pin Note",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Modul Catatan (<code>/notes</code>) menjadi repositori pengetahuan (knowledge base) dan dokumentasi SOP teknis:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1.5 text-gray-600 dark:text-gray-300">
                  <li><strong>Editor Teks Kaya (WYSIWYG):</strong> Format heading, list, kutipan, tabel, dan blok kode dengan penyorotan sintaksis.</li>
                  <li><strong>Penyematan Penting (Pin Note):</strong> Mengaktifkan sakelar pin agar catatan prioritas selalu berada di jajaran teratas.</li>
                  <li><strong>Palet Warna Visual:</strong> Memberi aksen warna kartu (Putih, Biru, Hijau, Kuning, Merah, Ungu) untuk kategorisasi cepat.</li>
                  <li><strong>Pengorganisasian Lampiran Berkas:</strong> Berkas yang diunggah disimpan rapi pada folder terisolasi <code>/uploads/notes/{"{id}"}/</code>.</li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-9",
        chapterNumber: 9,
        title: "Modul Developer Tools (JSON & SQL)",
        shortTitle: "Developer Tools",
        icon: <Code2 className="h-4 w-4 text-indigo-500" />,
        category: "Utilitas & Developer",
        targetRole: "all",
        summary:
          "Peralatan pengembang bawaan terintegrasi: JSON Formatter & Minifier, serta SQL Beautifier & Validator untuk 15+ dialek database engine.",
        quickActionUrl: "/dev-tools/sql",
        quickActionLabel: "Buka SQL Tools",
        subsections: [
          {
            id: "sub-9-1",
            title: "9.1 JSON Payload Formatter, Validator & Minifier",
            targetRole: "all",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Buka menu <code>/dev-tools/json</code> untuk merapikan (beautify) respons REST API yang berantakan, memvalidasi sintaks objek JSON, atau mengompres (minify) payload menjadi satu baris hemat karakter.
                </p>
              </div>
            ),
          },
          {
            id: "sub-9-2",
            title: "9.2 SQL Beautifier & Syntax Validator (15+ Dialek Database)",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Buka menu <code>/dev-tools/sql</code> untuk merapikan kueri database tanpa perlu membuka editor eksternal. Mendukung 15+ dialek populer:
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                  {["PostgreSQL", "MySQL", "SQL Server (T-SQL)", "Oracle PL/SQL", "SQLite", "MariaDB", "Snowflake", "BigQuery", "Spark SQL"].map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-10",
        chapterNumber: 10,
        title: "Modul Anggota Tim (Member) & Direktori",
        shortTitle: "Anggota Tim",
        icon: <User className="h-4 w-4 text-teal-500" />,
        category: "Kolaborasi & Tim",
        targetRole: "all",
        summary:
          "Direktori anggota berbasis Pure Grid Card, kustomisasi cover banner profil, persetujuan akun, grouping perusahaan admin, dan aksi hapus akun.",
        quickActionUrl: "/members",
        quickActionLabel: "Buka Anggota",
        subsections: [
          {
            id: "sub-10-1",
            title: "10.1 Direktori Pure Grid Card, Anti-Truncation & Kustomisasi Cover Profil",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Halaman <code>/members</code> menyajikan kartu profil seluruh personel tim dengan visual kartu modern, avatar inisial berwarna, badge jabatan, dan akumulasi jam kerja.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Setiap pengguna dapat mengunggah <strong>Gambar Sampul Profil (Cover Banner)</strong> di halaman <code>/profile</code> untuk memberikan sentuhan personal pada kartu akunnya.
                </p>
              </div>
            ),
          },
          {
            id: "sub-10-2",
            title: "10.2 Khusus Administrator: Grouping Perusahaan, Reset Password & Hapus Akun",
            targetRole: "admin",
            content: (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/30 dark:bg-indigo-950/20 text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Grouping Anggota Berdasarkan Perusahaan
                  </span>
                  <p className="mt-1 text-indigo-800 dark:text-indigo-300/80 leading-relaxed">
                    Khusus login Administrator, direktori anggota otomatis dikelompokkan (*grouped*) berdasarkan entitas perusahaan dengan kartu ringkasan KPI (rasio tugas selesai dan total jam kerja tim per tenant).
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/30 dark:bg-rose-950/20 text-xs">
                  <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    Fitur Hapus Permanen Pengguna (Double Confirmation)
                  </span>
                  <p className="mt-1 text-rose-800 dark:text-rose-300/80 leading-relaxed">
                    Admin dapat menghapus akun secara permanen melalui modal proteksi ganda (wajib mengetikkan nama lengkap pengguna target dan kata sandi admin) untuk mencegah ketidaksengajaan.
                  </p>
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-11",
        chapterNumber: 11,
        title: "Modul Gamifikasi, Streak & Hadiah",
        shortTitle: "Gamifikasi & Hadiah",
        icon: <Flame className="h-4 w-4 text-amber-500" />,
        category: "Kolaborasi & Tim",
        targetRole: "all",
        summary:
          "Sistem motivasi kerja: saldo awal bulanan (0), aturan poin 15/30 hari, aturan streak (reset 2 hari), 40+ lencana gaul, dan penukaran saldo reward nyata.",
        quickActionUrl: "/gamification",
        quickActionLabel: "Buka Gamifikasi",
        subsections: [
          {
            id: "sub-11-1",
            title: "11.1 Saldo Awal Bulanan (0), Aturan Poin 15 & 30 Hari, dan Reset Streak 2 Hari",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong className="block text-gray-900 dark:text-white mb-1">Ketentuan Saldo Bulanan & 15/30 Hari:</strong>
                    <ul className="list-disc pl-4 space-y-1 text-gray-500 dark:text-gray-400">
                      <li>Setiap awal bulan baru, saldo akumulasi check-in dimulai dari <strong>0</strong>.</li>
                      <li>Check-in 15 hari berhak atas <strong>50%</strong> poin bulanan.</li>
                      <li>Check-in 30 hari penuh berhak atas <strong>100%</strong> poin bulanan penuh.</li>
                      <li>Poin dari Lencana Prestasi (<em>Badges</em>) bersifat permanen dan ditambahkan di atas saldo check-in.</li>
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong className="block text-gray-900 dark:text-white mb-1">Aturan Streak (Reset 2 Hari):</strong>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                      Lakukan check-in setiap hari untuk menaikkan hitungan Streak (+1). Jika Anda absen selama <strong>2 hari berturut-turut</strong> (gap &ge; 2 hari), hitungan streak akan otomatis <strong>kembali ke hari ke-1</strong>.
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "sub-11-2",
            title: "11.2 Koleksi 40+ Master Badge Gaul & Reward Store (1 Poin = Rp 100)",
            targetRole: "all",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Sistem mengevaluasi otomatis pencapaian kerja Anda untuk membuka lencana dengan nama-nama gaul anak muda:
                  <em> Sat-Set 10 Task ⚡</em>, <em>Sepuh Produktif 100 🏆</em>, <em>Speedrun Kerja 🚀</em>, <em>Anti Lembur Club 🧘</em>, <em>Pawang JSON 🔮</em>, dll.
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Tukarkan poin yang terkumpul di <strong>Reward Store</strong> (<code>/gamification/rewards</code>) untuk klaim voucher e-wallet, pulsa, atau merchandise kantor (kurs default: <strong>1 Poin = Rp 100</strong>).
                </p>
              </div>
            ),
          },
          {
            id: "sub-11-3",
            title: "11.3 Khusus Administrator: Manajemen Katalog Hadiah & Persetujuan Klaim",
            targetRole: "admin",
            content: (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Administrator mengatur stok dan katalog hadiah serta menyetujui pengajuan klaim penukaran poin anggota tim melalui menu <strong>Master Data &gt; Tab Hadiah</strong>. Jika klaim ditolak, saldo poin pengguna akan dikembalikan secara utuh.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-12",
        chapterNumber: 12,
        title: "Modul Pengumuman Resmi (Announcements)",
        shortTitle: "Pengumuman",
        icon: <Bell className="h-4 w-4 text-rose-500" />,
        category: "Kolaborasi & Tim",
        targetRole: "all",
        summary:
          "Penyampaian maklumat resmi pimpinan tim, modal pop-up darurat, tanggal kedaluwarsa otomatis, dan pelacakan daftar pembaca (Read Receipts).",
        quickActionUrl: "/announcements",
        quickActionLabel: "Buka Pengumuman",
        subsections: [
          {
            id: "sub-12-1",
            title: "12.1 Pengumuman Mendesak, Modal Pop-Up Otomatis & Pelacakan Pembaca",
            targetRole: "all",
            content: (
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <p>
                  Pengumuman bertipe <strong>&quot;Mendesak / Darurat&quot;</strong> akan secara otomatis membuka jendela modal pop-up di layar pengguna saat login. Pengguna wajib mengklik tombol <em>&quot;Saya Telah Membaca & Memahami&quot;</em>.
                </p>
                <p>
                  Pembuat pengumuman dan Administrator dapat melihat daftar nama siapa saja yang telah membaca pengumuman lengkap beserta waktu bacanya (*Read Receipts*).
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-13",
        chapterNumber: 13,
        title: "Konfigurasi Sistem 4-Tab (Khusus Admin)",
        shortTitle: "Konfigurasi Sistem",
        icon: <Settings className="h-4 w-4 text-indigo-500" />,
        category: "Administrasi & Sistem",
        targetRole: "admin",
        summary:
          "Pusat kendali enterprise: Sinkronisasi Multi-Instance Host Induk, Database Vacuum & Snapshot, Integrasi Server Email SMTP, dan Swagger REST API.",
        quickActionUrl: "/configuration",
        quickActionLabel: "Buka Konfigurasi",
        subsections: [
          {
            id: "sub-13-1",
            title: "13.1 Arsitektur Antarmuka Konfigurasi 4-Tab Modular",
            targetRole: "admin",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Halaman <code>/configuration</code> dibagi menjadi 4 tab spesialisasi:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Tab 1: Sinkronisasi Host Induk:</strong> Push/Pull data dan lampiran ke server induk terpusat.
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Tab 2: Database & Pemeliharaan:</strong> Monitoring kapasitas SQLite, VACUUM defragmentasi, dan backup snapshot.
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Tab 3: Server Email & Notifikasi:</strong> Koneksi SMTP, uji latensi (ms), dan 7 template email WYSIWYG.
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <strong>Tab 4: Umum & REST API:</strong> Global Base URL dan tautan Swagger Documentation OpenAPI 3.0.
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "sub-13-2",
            title: "13.2 Sinkronisasi Multi-Instance & Migrasi Catatan Kosong (Notes Auto-Migration)",
            targetRole: "admin",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Menghubungkan cabang/laptop lokal ke Server Host Induk dengan protokol streaming Base64 atau paket offline ZIP:
                </p>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/30 dark:bg-indigo-950/20 text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Migrasi Cerdas Catatan Kosong (Empty Notes Auto-Migration)
                  </span>
                  <p className="mt-1 text-indigo-800 dark:text-indigo-300/80 leading-relaxed">
                    Apabila catatan tugas, deskripsi tugas, sesi kerja, atau presensi di sistem lokal masih kosong (termasuk jika hanya berisi spasi atau tag HTML editor <code>&lt;p&gt;&lt;/p&gt;</code>), dan payload sinkronisasi sistem lama membawa data catatan tersebut, sistem secara otomatis memindahkan dan memperbarui konten catatan ke sistem lokal, termasuk pemetaan relasi tugas (<code>taskIdLookup</code>) dan lampiran file (<code>noteIdLookup</code>).
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: "sub-13-3",
            title: "13.3 Server Email SMTP, Diagnostik Latensi & Template Event",
            targetRole: "admin",
            content: (
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <p>
                  Admin dapat mengonfigurasi host SMTP (Gmail, Microsoft 365, Mailtrap, dsb.), menguji koneksi kirim email dengan pengukuran latensi milidetik (*latency ms*), serta menyunting 7 template email notifikasi bawaan menggunakan editor teks kaya.
                </p>
              </div>
            ),
          },
          {
            id: "sub-13-4",
            title: "13.4 Audit Trail & Inspeksi Modal Aktivitas Sistem",
            targetRole: "admin",
            content: (
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <p>
                  Melalui menu <strong>Audit Trail</strong> (<code>/audit-trail</code>), seluruh aktivitas operasional tercatat secara otomatis. Klik <strong>Lihat Detail</strong> untuk menginspeksi IP Address, User Agent, durasi eksekusi milidetik, HTTP status, dan payload perubahan data.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-14",
        chapterNumber: 14,
        title: "Panduan Khusus Non-Admin & Tim Pelaksana",
        shortTitle: "Khusus Non-Admin",
        icon: <User className="h-4 w-4 text-emerald-500" />,
        category: "Kolaborasi & Tim",
        targetRole: "user",
        summary:
          "SOP harian terbaik untuk Staff, Developer, System Analyst, Technical Writer, dan QA: efisiensi waktu, pelaporan kendala, dan tips produktivitas.",
        quickActionUrl: "/dashboard",
        quickActionLabel: "Mulai Bekerja",
        subsections: [
          {
            id: "sub-14-1",
            title: "14.1 Alur Kerja Harian Ideal Tim Pelaksana (5 Langkah Sat-Set)",
            targetRole: "user",
            content: (
              <div className="space-y-3">
                <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li><strong>Langkah 1 (Pagi): Presensi & Check-In</strong> — Buka Dashboard, klik tombol <em>&quot;Check-In Sekarang (+10 Poin)&quot;</em> untuk menjaga streak, lalu lakukan check-in kehadiran di menu Presensi.</li>
                  <li><strong>Langkah 2: Tinjau Tugas & Kalender</strong> — Cek daftar tugas di Kanban Board atau Kalender Jadwal untuk melihat prioritas dan tenggat waktu hari ini.</li>
                  <li><strong>Langkah 3: Jalankan Multi-Timer</strong> — Saat mulai mengerjakan tugas, klik <em>Start Timer</em> agar jam kerja terekam akurat secara otomatis.</li>
                  <li><strong>Langkah 4: Update Progres & Kendala</strong> — Jika menemui hambatan teknis, segera catat di kolom Kendala tugas agar dapat dibantu tim lain.</li>
                  <li><strong>Langkah 5 (Sore): Simpan & Check-Out</strong> — Pastikan timer distop, tinjau ringkasan jam kerja hari ini di kartu metrik, lalu lakukan check-out presensi.</li>
                </ol>
              </div>
            ),
          },
          {
            id: "sub-14-2",
            title: "14.2 Tips Cepat Produktivitas & Shortcut",
            targetRole: "user",
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <strong>Pencatatan Jam Cepat:</strong> Gunakan form gabungan di halaman Edit Tugas untuk menyimpan tugas dan log sesi kerja dalam 1 tombol.
                </div>
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <strong>Sematkan Catatan (Pin):</strong> Pasang pin pada catatan kredensial staging atau link figma agar selalu mudah ditemukan.
                </div>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-15",
        chapterNumber: 15,
        title: "Panduan Khusus Administrator & Lead",
        shortTitle: "Khusus Administrator",
        icon: <ShieldCheck className="h-4 w-4 text-rose-500" />,
        category: "Administrasi & Sistem",
        targetRole: "admin",
        summary:
          "SOP tata kelola organisasi, persetujuan pendaftaran akun, isolasi tenant kode perusahaan, reset password, dan pemeliharaan server database.",
        quickActionUrl: "/configuration",
        quickActionLabel: "Kelola Sistem",
        subsections: [
          {
            id: "sub-15-1",
            title: "15.1 SOP Persetujuan Registrasi Akun Baru & Penetapan Tenant",
            targetRole: "admin",
            content: (
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <p>
                  Ketika staf baru mendaftar:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Buka menu <strong>Anggota Tim</strong> (<code>/members</code>).</li>
                  <li>Cari anggota dengan status <em>&quot;Menunggu Persetujuan&quot; (Pending Approval)</em>.</li>
                  <li>Klik <strong>Edit Anggota</strong>, verifikasi alamat email dan kode perusahaan afiliasinya.</li>
                  <li>Ubah status persetujuan menjadi <strong>Disetujui (Approved)</strong> dan tetapkan peran (Role: User / Administrator).</li>
                  <li>Klik Simpan. Pengguna kini dapat login dan mengakses modul kerja.</li>
                </ol>
              </div>
            ),
          },
          {
            id: "sub-15-2",
            title: "15.2 Pemeliharaan Database SQLite (VACUUM Defragmentasi & Snapshot Backup)",
            targetRole: "admin",
            content: (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Lakukan pemeliharaan rutin di <code>/configuration &gt; Tab Database</code>:
                </p>
                <ul className="list-disc pl-5 text-xs space-y-1 text-gray-600 dark:text-gray-300">
                  <li><strong>Tombol VACUUM:</strong> Mengompres file database SQLite dan mengklaim kembali ruang disk yang terbuang dari catatan lama yang telah dihapus.</li>
                  <li><strong>Unduh Snapshot .db / .sql:</strong> Buat cadangan biner database secara berkala sebelum pembaruan rilis besar sistem.</li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: "bab-16",
        chapterNumber: 16,
        title: "Pusat Tanya Jawab & Bantuan Teknis (FAQ)",
        shortTitle: "FAQ & Bantuan",
        icon: <HelpCircle className="h-4 w-4 text-amber-500" />,
        category: "Dasar & Navigasi",
        targetRole: "all",
        summary:
          "Pertanyaan yang paling sering diajukan seputar reset password, sinkronisasi data, cut-off jam kerja, dan dukungan kontak sistem.",
        subsections: [
          {
            id: "sub-16-1",
            title: "16.1 Pertanyaan Sering Diajukan (Frequently Asked Questions)",
            targetRole: "all",
            content: (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <strong className="block text-gray-900 dark:text-white mb-0.5">
                    Q: Mengapa saya tidak bisa login setelah berhasil registrasi akun?
                  </strong>
                  <p className="text-gray-500 dark:text-gray-400">
                    A: Seluruh pendaftaran akun baru memerlukan persetujuan dari Administrator organisasi. Silakan hubungi Admin kantor Anda untuk melakukan aktivasi status akun di menu Direktori Anggota.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <strong className="block text-gray-900 dark:text-white mb-0.5">
                    Q: Apa yang terjadi jika saya lupa check-in gamifikasi selama 2 hari?
                  </strong>
                  <p className="text-gray-500 dark:text-gray-400">
                    A: Berdasarkan aturan konsistensi streak, jika terdapat jeda absen &ge; 2 hari berturut-turut, streak Anda akan otomatis ter-reset kembali ke Hari 1. Namun poin yang telah tersimpan dari badge dan hari sebelumnya tidak akan hilang.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <strong className="block text-gray-900 dark:text-white mb-0.5">
                    Q: Bagaimana cara memindahkan data dari laptop lokal ke server kantor pusat?
                  </strong>
                  <p className="text-gray-500 dark:text-gray-400">
                    A: Gunakan menu Konfigurasi Sistem &gt; Tab Sinkronisasi. Anda dapat menggunakan metode Online Push Sync dengan memasukkan URL Host dan Secret Key, atau mengunduh Paket Ekspor ZIP dan mengunggahnya di server pusat.
                  </p>
                </div>
              </div>
            ),
          },
        ],
      },
    ],
    []
  );

  // Filter bab berdasarkan role & pencarian
  const filteredChapters = useMemo(() => {
    return chaptersData
      .filter((chap) => {
        if (roleFilter === "user" && chap.targetRole === "admin") return false;
        if (roleFilter === "admin" && chap.targetRole === "user") return false;
        return true;
      })
      .filter((chap) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchTitle = chap.title.toLowerCase().includes(q);
        const matchSummary = chap.summary.toLowerCase().includes(q);
        const matchSub = chap.subsections.some((s) => s.title.toLowerCase().includes(q));
        return matchTitle || matchSummary || matchSub;
      });
  }, [chaptersData, roleFilter, searchQuery]);

  // Current active chapter object for single chapter mode
  const currentChapter = useMemo(() => {
    return chaptersData.find((c) => c.id === activeChapterId) || chaptersData[0];
  }, [chaptersData, activeChapterId]);

  const currentIndex = useMemo(() => {
    return filteredChapters.findIndex((c) => c.id === currentChapter?.id);
  }, [filteredChapters, currentChapter]);

  const prevChapter = currentIndex > 0 ? filteredChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < filteredChapters.length - 1 ? filteredChapters[currentIndex + 1] : null;

  return (
    <div className="w-full min-h-screen bg-gray-50/50 dark:bg-gray-950/40 text-gray-900 dark:text-gray-100 pb-20">
      {/* Top Reading Progress Bar */}
      <div className="sticky top-0 z-40 h-1 w-full bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Hero Header Section */}
      <div className="relative border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
              <BookOpen className="h-3.5 w-3.5" />
              Pusat Panduan & Dokumentasi Resmi Aplikasi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Buku Panduan Pengguna (User Guide)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
              Panduan interaktif lengkap untuk seluruh modul operasional kerja, pencatatan waktu, tata kelola tim, dan konfigurasi sistem TrackerKerja Modern.
            </p>
          </div>

          {/* Quick Stats / Filter Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setRoleFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  roleFilter === "all"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                Semua Panduan
              </button>
              <button
                onClick={() => setRoleFilter("user")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  roleFilter === "user"
                    ? "bg-white text-emerald-600 shadow-sm dark:bg-gray-900 dark:text-emerald-400"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <User className="h-3.5 w-3.5" />
                Khusus Tim / Non-Admin
              </button>
              <button
                onClick={() => setRoleFilter("admin")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                  roleFilter === "admin"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Khusus Administrator
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setReadingMode("continuous")}
                title="Baca Pelan-Pelan seperti Dokumen Utuh"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                  readingMode === "continuous"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400 font-bold"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                Mode Dokumen
              </button>
              <button
                onClick={() => setReadingMode("chapter")}
                title="Pilih Bab Langsung Satu Per Satu"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                  readingMode === "chapter"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-gray-900 dark:text-indigo-400 font-bold"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Sliders className="h-3.5 w-3.5" />
                Mode Per Bab
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar Navigation + Content Body */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sticky Sidebar: Navigation & Table of Contents */}
          <aside className="lg:col-span-4 xl:col-span-3 sticky top-6 z-20 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              {/* Search Box */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari topik panduan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Navigation Header */}
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Daftar Isi Panduan ({filteredChapters.length} Bab)
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {roleFilter === "all" ? "Semua Peran" : roleFilter === "admin" ? "Admin Only" : "Non-Admin"}
                </span>
              </div>

              {/* Chapters List */}
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {filteredChapters.map((chap) => {
                  const isActive = activeChapterId === chap.id;
                  return (
                    <div key={chap.id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          setActiveChapterId(chap.id);
                          if (readingMode === "continuous") {
                            scrollToSection(chap.id);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all group",
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}
                          >
                            {chap.chapterNumber}
                          </span>
                          <span className="truncate">{chap.shortTitle}</span>
                        </div>

                        {chap.targetRole === "admin" && (
                          <span
                            className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0",
                              isActive
                                ? "bg-white/25 text-white"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            )}
                          >
                            Admin
                          </span>
                        )}
                      </button>

                      {/* Sub-sections dropdown preview if active */}
                      {isActive && readingMode === "chapter" && (
                        <div className="pl-8 pr-2 py-1 space-y-1">
                          {chap.subsections.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => scrollToSection(sub.id)}
                              className="w-full text-left text-[11px] py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white truncate block transition-colors"
                            >
                              {sub.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredChapters.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    Tidak ditemukan topik panduan dengan kata kunci tersebut.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Pintasan Langsung Aplikasi
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/tasks"
                  className="p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-center font-medium text-gray-700 dark:text-gray-300"
                >
                  Modul Tugas
                </Link>
                <Link
                  href="/calendar"
                  className="p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-center font-medium text-gray-700 dark:text-gray-300"
                >
                  Kalender
                </Link>
                <Link
                  href="/timesheets"
                  className="p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-center font-medium text-gray-700 dark:text-gray-300"
                >
                  Timesheet
                </Link>
                <Link
                  href="/gamification"
                  className="p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-center font-medium text-gray-700 dark:text-gray-300"
                >
                  Gamifikasi
                </Link>
              </div>
            </div>
          </aside>

          {/* Right Main Content Panel */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-8" ref={contentContainerRef}>
            {/* CONTINUOUS MODE: Render all filtered chapters sequentially */}
            {readingMode === "continuous" && (
              <div className="space-y-10">
                {filteredChapters.map((chap) => (
                  <section
                    key={chap.id}
                    id={chap.id}
                    className="scroll-mt-20 rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-6"
                  >
                    {/* Chapter Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 font-black text-lg">
                          {chap.chapterNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              {chap.category}
                            </span>
                            {chap.targetRole === "admin" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                Khusus Administrator
                              </span>
                            )}
                            {chap.targetRole === "user" && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Khusus Non-Admin
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                            Bab {chap.chapterNumber}: {chap.title}
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {chap.summary}
                          </p>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {chap.quickActionUrl && (
                          <Link
                            href={chap.quickActionUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
                          >
                            {chap.quickActionLabel || "Buka Halaman"}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => copySectionLink(chap.id)}
                          title="Salin Tautan Bab"
                          className="p-1.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                        >
                          {copiedId === chap.id ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Subsections Content */}
                    <div className="space-y-6 divide-y divide-gray-100 dark:divide-gray-800/60">
                      {chap.subsections.map((sub, sIdx) => (
                        <div
                          key={sub.id}
                          id={sub.id}
                          className={cn("scroll-mt-24 space-y-3", sIdx > 0 && "pt-6")}
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {sub.title}
                            </h3>
                            {sub.targetRole === "admin" && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Administrator Only
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {sub.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {/* SINGLE CHAPTER FOCUS MODE: Render one chapter at a time */}
            {readingMode === "chapter" && currentChapter && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-6">
                {/* Chapter Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-md shadow-indigo-500/20">
                      {currentChapter.chapterNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {currentChapter.category}
                        </span>
                        {currentChapter.targetRole === "admin" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            Khusus Administrator
                          </span>
                        )}
                        {currentChapter.targetRole === "user" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            Khusus Non-Admin
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                        Bab {currentChapter.chapterNumber}: {currentChapter.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {currentChapter.summary}
                      </p>
                    </div>
                  </div>

                  {currentChapter.quickActionUrl && (
                    <Link
                      href={currentChapter.quickActionUrl}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                    >
                      {currentChapter.quickActionLabel || "Buka Halaman"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                {/* Subsections Content */}
                <div className="space-y-6 divide-y divide-gray-100 dark:divide-gray-800/60">
                  {currentChapter.subsections.map((sub, sIdx) => (
                    <div
                      key={sub.id}
                      id={sub.id}
                      className={cn("space-y-3", sIdx > 0 && "pt-6")}
                    >
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {sub.title}
                      </h3>
                      <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {sub.content}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Previous & Next Chapter Navigator Buttons */}
                <div className="flex items-center justify-between pt-8 border-t border-gray-100 dark:border-gray-800">
                  {prevChapter ? (
                    <button
                      onClick={() => {
                        setActiveChapterId(prevChapter.id);
                        scrollToTop();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Bab {prevChapter.chapterNumber}: {prevChapter.shortTitle}
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextChapter ? (
                    <button
                      onClick={() => {
                        setActiveChapterId(nextChapter.id);
                        scrollToTop();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
                    >
                      Bab {nextChapter.chapterNumber}: {nextChapter.shortTitle}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          title="Kembali ke Atas"
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

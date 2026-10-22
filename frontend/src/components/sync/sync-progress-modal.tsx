"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudDownload,
  CloudUpload,
  FileArchive,
  FileText,
  Database,
  Users,
  Check,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  HardDrive,
  FolderTree,
  Building,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
import { Button } from "@/components/tailgrids/core/button";
import Link from "next/link";

export type SyncOperationType =
  | "pull"
  | "push"
  | "import-package"
  | "export-zip"
  | "export-sql";

export interface SyncResultData {
  recordsProcessed?: number;
  filesExtracted?: number;
  fileSizeBytes?: number;
  details?: string[];
  message?: string;
  sourceInstance?: string;
}

export interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationType: SyncOperationType;
  status: "idle" | "running" | "success" | "error";
  targetHost?: string;
  resultData?: SyncResultData | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

interface StepItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PULL_STEPS: StepItem[] = [
  {
    id: "handshake",
    title: "1. Handshake & Otorisasi Host Induk",
    description: "Menghubungi endpoint host induk dan memvalidasi kunci otorisasi X-Sync-ApiKey...",
    icon: CloudDownload,
  },
  {
    id: "download",
    title: "2. Pengunduhan Paket Data & Manifest",
    description: "Mentransfer paket basis data rekod, manifest sinkronisasi, dan arsip berkas fisik...",
    icon: Database,
  },
  {
    id: "extract_files",
    title: "3. Ekstraksi Berkas Fisik & Mirroring",
    description: "Mengekstrak foto avatar profil, foto cover pengguna, dan lampiran catatan ke uploads/...",
    icon: ImageIcon,
  },
  {
    id: "master_data",
    title: "4. Penggabungan Master Data & Tenant",
    description: "Menyelaraskan struktur perusahaan (tenant), kategori, prioritas, status SDLC, dan milestone...",
    icon: Building,
  },
  {
    id: "users_profiles",
    title: "5. Sinkronisasi Profil Pengguna & Data Binding",
    description: "Memperbarui profil pengguna, binding foto profil, foto cover, nomor telepon, dan role...",
    icon: Users,
  },
  {
    id: "tasks_projects",
    title: "6. Pembaruan Proyek, Tugas & Presensi Kerja",
    description: "Menggabungkan daftar proyek, hierarki tugas kerja, log sesi waktu, dan rekam absensi staf...",
    icon: FolderTree,
  },
  {
    id: "notes_attachments",
    title: "7. WorkNotes & Normalisasi Path Lampiran",
    description: "Menyusun catatan kerja dan mengaitkan file path lampiran dokumen secara portabel...",
    icon: FileText,
  },
  {
    id: "finalization",
    title: "8. Finalisasi Transaksi Atomik Basis Data",
    description: "Memverifikasi konsistensi relasi rekod dan mencatat log riwayat sinkronisasi...",
    icon: ShieldCheck,
  },
];

const PUSH_STEPS: StepItem[] = [
  {
    id: "handshake",
    title: "1. Uji Koneksi & Otorisasi Host Target",
    description: "Memeriksa ketersediaan server host induk dan memvalidasi kredensial sinkronisasi...",
    icon: CloudUpload,
  },
  {
    id: "consolidate",
    title: "2. Konsolidasi Berkas Fisik Lokal",
    description: "Mengumpulkan foto profil, foto cover, dan seluruh lampiran catatan kerja dari direktori lokal...",
    icon: HardDrive,
  },
  {
    id: "package",
    title: "3. Pengemasan Payload Entitas & Data JSON",
    description: "Menyusun entitas database, metadata manifest, dan mengompres berkas fisik menjadi paket...",
    icon: FileArchive,
  },
  {
    id: "transfer",
    title: "4. Pengiriman Data ke Host Induk",
    description: "Mengunggah paket sinkronisasi terenkripsi ke endpoint RESTful host induk (/api/sync/receive)...",
    icon: CloudUpload,
  },
  {
    id: "remote_process",
    title: "5. Ekstraksi & Penggabungan di Host Induk",
    description: "Host induk mengekstrak berkas avatar/cover/notes dan menggabungkan rekod database secara atomik...",
    icon: Database,
  },
  {
    id: "finalization",
    title: "6. Konfirmasi Keberhasilan & Audit Trail",
    description: "Menerima respons konfirmasi dari host induk dan mencatat riwayat sinkronisasi lokal...",
    icon: ShieldCheck,
  },
];

const IMPORT_STEPS: StepItem[] = [
  {
    id: "read_package",
    title: "1. Pemeriksaan Kelengkapan Paket",
    description: "Membaca berkas paket arsip (.zip / .sql) dan memvalidasi integritas manifest...",
    icon: FileArchive,
  },
  {
    id: "security_guard",
    title: "2. Proteksi Zip Slip Traversal Guard",
    description: "Memverifikasi seluruh path entri berkas aman dari upaya path traversal sebelum ekstraksi...",
    icon: ShieldCheck,
  },
  {
    id: "extract_files",
    title: "3. Ekstraksi Berkas Fisik & Mirroring",
    description: "Mengekstrak foto profil, foto cover, dan berkas catatan ke uploads/ serta mirroring ke web root...",
    icon: ImageIcon,
  },
  {
    id: "master_merge",
    title: "4. Penggabungan Struktur Organisasi & Master Data",
    description: "Menyelaraskan data perusahaan, kategori, prioritas, status alur kerja, dan milestone...",
    icon: Building,
  },
  {
    id: "users_merge",
    title: "5. Binding Profil Pengguna & Akun Staf",
    description: "Memperbarui akun pengguna, foto avatar, foto cover, dan hak akses peran Administrator/Member...",
    icon: Users,
  },
  {
    id: "operational_merge",
    title: "6. Penggabungan Tugas, Proyek & Presensi",
    description: "Menerapkan data proyek, kartu tugas kerja, log timer sesi, catatan kerja, dan presensi...",
    icon: FolderTree,
  },
  {
    id: "finalization",
    title: "7. Verifikasi & Penyelesaian Impor",
    description: "Memvalidasi konsistensi basis data dan menyelesaikan transaksi atomic batch...",
    icon: CheckCircle2,
  },
];

const EXPORT_STEPS: StepItem[] = [
  {
    id: "read_db",
    title: "1. Pembacaan Database & Entitas",
    description: "Mengambil data perusahaan, pengguna, tugas, proyek, presensi, dan catatan kerja...",
    icon: Database,
  },
  {
    id: "consolidate_uploads",
    title: "2. Konsolidasi Berkas Fisik",
    description: "Mengumpulkan foto profil, foto cover, dan seluruh dokumen lampiran catatan...",
    icon: HardDrive,
  },
  {
    id: "generate_archive",
    title: "3. Pembuatan Paket Arsip (.ZIP / .SQL)",
    description: "Menghasilkan manifest.json, skrip SQL DML, dan mengompres lampiran berkas...",
    icon: FileArchive,
  },
  {
    id: "download_ready",
    title: "4. Berkas Siap Diunduh",
    description: "Menyelesaikan pembuatan paket unduhan untuk transfer mandiri via media penyimpanan...",
    icon: CloudDownload,
  },
];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function SyncProgressModal({
  isOpen,
  onClose,
  operationType,
  status,
  targetHost,
  resultData,
  errorMessage,
  onRetry,
}: SyncProgressModalProps) {
  const steps = useMemo(() => {
    switch (operationType) {
      case "pull":
        return PULL_STEPS;
      case "push":
        return PUSH_STEPS;
      case "import-package":
        return IMPORT_STEPS;
      case "export-zip":
      case "export-sql":
        return EXPORT_STEPS;
      default:
        return PULL_STEPS;
    }
  }, [operationType]);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer & dynamic step progression
  useEffect(() => {
    let timerInterval: any = null;
    let stepInterval: any = null;

    if (isOpen && status === "running") {
      setActiveStepIndex(0);
      setElapsedSeconds(0);

      timerInterval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // Advance through steps realistically up to the second-to-last step
      stepInterval = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev < steps.length - 2) {
            return prev + 1;
          }
          return prev;
        });
      }, 1400);
    } else if (status === "success") {
      setActiveStepIndex(steps.length - 1);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
      if (stepInterval) clearInterval(stepInterval);
    };
  }, [isOpen, status, steps.length]);

  const operationTitle = useMemo(() => {
    switch (operationType) {
      case "pull":
        return "Tarik & Impor Data dari Host Induk";
      case "push":
        return "Push Data ke Host Induk";
      case "import-package":
        return "Impor Paket Sinkronisasi (.ZIP / .SQL)";
      case "export-zip":
        return "Ekspor Paket Mandiri (.ZIP)";
      case "export-sql":
        return "Ekspor Skrip Dump Basis Data (.SQL)";
      default:
        return "Sinkronisasi Host Induk";
    }
  }, [operationType]);

  const operationSubtitle = useMemo(() => {
    if (targetHost) {
      return `Target Host: ${targetHost}`;
    }
    return "Sinkronisasi komprehensif data operasional, profil pengguna, dan berkas fisik.";
  }, [targetHost]);

  const progressPercent = useMemo(() => {
    if (status === "success") return 100;
    if (status === "error") return Math.round(((activeStepIndex + 1) / steps.length) * 100);
    return Math.min(92, Math.round(((activeStepIndex + 1) / steps.length) * 90));
  }, [status, activeStepIndex, steps.length]);

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        // Prevent accidental dismissal while actively running
        if (!open && status === "running") return;
        if (!open) onClose();
      }}
      showCloseButton={status !== "running"}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-colors ${
                status === "success"
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : status === "error"
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              }`}
            >
              {status === "success" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : status === "error" ? (
                <AlertCircle className="h-6 w-6" />
              ) : operationType === "pull" ? (
                <CloudDownload className="h-6 w-6 animate-pulse" />
              ) : operationType === "push" ? (
                <CloudUpload className="h-6 w-6 animate-pulse" />
              ) : (
                <FileArchive className="h-6 w-6 animate-pulse" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white truncate">
                  {status === "running" && "Sinkronisasi Berlangsung..."}
                  {status === "success" && "Sinkronisasi Selesai!"}
                  {status === "error" && "Sinkronisasi Mengalami Kendala"}
                  {status === "idle" && operationTitle}
                </DialogTitle>
                {status === "running" && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {operationSubtitle}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4 py-2">
          {/* Progress Bar & Status Pill */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 font-semibold">
                {status === "running" ? (
                  <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Memproses Pipeline Sinkronisasi...
                  </span>
                ) : status === "success" ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Seluruh Tahap Berhasil Diselesaikan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Proses Terhenti Sebelum Selesai
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{elapsedSeconds}s</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  ({progressPercent}%)
                </span>
              </div>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200/80 dark:bg-gray-700/60">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  status === "success"
                    ? "bg-emerald-500"
                    : status === "error"
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-[length:200%_100%] animate-[shimmer_2s_infinite]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Checklist of Synchronization Steps */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3 dark:border-gray-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rangkaian Proses & Entitas Yang Diimpor
              </h4>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {status === "success"
                  ? `${steps.length}/${steps.length} Selesai`
                  : `Langkah ${Math.min(activeStepIndex + 1, steps.length)} dari ${steps.length}`}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-gray-50 dark:divide-gray-800/40">
              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                const isCompleted = status === "success" || idx < activeStepIndex;
                const isCurrent = status === "running" && idx === activeStepIndex;
                const isFailed = status === "error" && idx === activeStepIndex;
                const isPending = !isCompleted && !isCurrent && !isFailed;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 py-2 px-2 rounded-xl transition-all ${
                      isCurrent
                        ? "bg-indigo-50/70 border border-indigo-200/70 dark:bg-indigo-950/30 dark:border-indigo-900/50"
                        : isFailed
                        ? "bg-rose-50/70 border border-rose-200/70 dark:bg-rose-950/30 dark:border-rose-900/50"
                        : isCompleted
                        ? "hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                        : "opacity-60"
                    }`}
                  >
                    {/* Status Step Icon */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-colors ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-2xs"
                          : isCurrent
                          ? "bg-indigo-600 text-white shadow-xs animate-pulse"
                          : isFailed
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <IconComponent className="h-3.5 w-3.5" />
                      )}
                    </div>

                    {/* Step Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isCompleted
                              ? "text-gray-800 dark:text-gray-200"
                              : isCurrent
                              ? "text-indigo-700 dark:text-indigo-300"
                              : isFailed
                              ? "text-rose-700 dark:text-rose-300"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {step.title}
                        </span>

                        {isCurrent && (
                          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Aktif
                          </span>
                        )}
                        {isCompleted && (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Tuntas
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success Summary KPI Card */}
          {status === "success" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Ringkasan Keberhasilan Sinkronisasi
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 dark:border-emerald-900/40 dark:bg-gray-900">
                  <span className="text-[10px] text-gray-400 block font-medium">Rekod Tergabung</span>
                  <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                    {resultData?.recordsProcessed ?? "Semua"} Rekod
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200/80 bg-white p-2.5 dark:border-emerald-900/40 dark:bg-gray-900">
                  <span className="text-[10px] text-gray-400 block font-medium">Berkas Fisik (uploads/)</span>
                  <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                    {resultData?.filesExtracted ?? "Terekstrak"} Berkas
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-200/80 bg-white p-2.5 dark:border-emerald-900/40 dark:bg-gray-900">
                  <span className="text-[10px] text-gray-400 block font-medium">Ukuran Paket</span>
                  <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300 font-mono">
                    {formatBytes(resultData?.fileSizeBytes)}
                  </span>
                </div>
              </div>

              {resultData?.message && (
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-2 font-medium">
                  {resultData.message}
                </p>
              )}

              {/* Quick Direct Navigation Links */}
              <div className="pt-2.5 mt-2 border-t border-emerald-200/80 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-2">
                  Buka Data Terimpor Langsung:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href="/tasks"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 text-xs transition-colors shadow-xs"
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    Daftar Tugas
                  </Link>
                  <Link
                    href="/tasks/board"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs transition-colors shadow-2xs"
                  >
                    <HardDrive className="h-3.5 w-3.5" />
                    Kanban Board
                  </Link>
                  <Link
                    href="/projects"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs transition-colors shadow-2xs"
                  >
                    <Building className="h-3.5 w-3.5" />
                    Proyek
                  </Link>
                  <Link
                    href="/notes"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs transition-colors shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Catatan Kerja
                  </Link>
                  <Link
                    href="/gamification"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs transition-colors shadow-2xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Gamifikasi & Lencana
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Card */}
          {status === "error" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20 space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <h4 className="text-xs font-bold">Rincian Kegagalan Sinkronisasi</h4>
              </div>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-mono bg-white/70 dark:bg-gray-900/60 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 break-words">
                {errorMessage || "Terjadi kesalahan saat berkomunikasi dengan host induk atau memproses paket berkas."}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Pastikan URL server host induk benar, kunci otorisasi (X-Sync-ApiKey) cocok, dan koneksi internet stabil.
              </p>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {status === "error" && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="gap-1.5 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Coba Lagi
              </Button>
            )}

            {status !== "running" ? (
              <Button
                size="sm"
                onClick={onClose}
                className={`gap-1.5 text-xs font-bold text-white shadow-xs ${
                  status === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {status === "success" ? "Selesai & Tutup" : "Tutup"}
              </Button>
            ) : (
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5 italic font-medium">
                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                Harap tunggu, proses sedang berlangsung...
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

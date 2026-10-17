"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  X,
  BookOpen,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
  Code2,
  FileSpreadsheet,
  Flame,
  CheckCircle2,
  ArrowRight,
  Command,
  Laptop,
  Check,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { cn } from "@/utils/cn";

export function UserGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "modules" | "shortcuts" | "rbac"
  >("overview");

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent("wtp:panduan_opened"));
    }
  }, [isOpen]);

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent("wtp:panduan_closed"));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="userGuideModalBackdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm bg-black/60 animate-in fade-in transition-all duration-300"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-linear-to-r from-indigo-50/70 via-white to-purple-50/70 px-6 py-5 dark:border-gray-800 dark:from-indigo-950/20 dark:via-gray-900 dark:to-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/25">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                Panduan Sistem & Pusat Bantuan
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dokumentasi fitur terpadu, alur kerja rekayasa, dan tips produktivitas TrackerKerja Pro.
              </p>
            </div>
          </div>

          <button
            id="closeUserGuideModalBtn"
            onClick={handleClose}
            aria-label="Tutup Panduan"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 px-6 overflow-x-auto dark:border-gray-800 dark:bg-gray-800/40">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3.5 px-3 text-xs font-bold transition-colors whitespace-nowrap",
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ringkasan Platform
          </button>

          <button
            onClick={() => setActiveTab("modules")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3.5 px-3 text-xs font-bold transition-colors whitespace-nowrap",
              activeTab === "modules"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Modul Utama
          </button>

          <button
            onClick={() => setActiveTab("shortcuts")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3.5 px-3 text-xs font-bold transition-colors whitespace-nowrap",
              activeTab === "shortcuts"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            <Command className="h-3.5 w-3.5" />
            Tips & Pintasan Cepat
          </button>

          <button
            onClick={() => setActiveTab("rbac")}
            className={cn(
              "flex items-center gap-2 border-b-2 py-3.5 px-3 text-xs font-bold transition-colors whitespace-nowrap",
              activeTab === "rbac"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Hak Akses & Keamanan
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-700 dark:text-gray-300">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-300 text-base">
                  Selamat Datang di Work Tracker Pro Modern
                </h3>
                <p className="mt-1 text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                  Platform manajemen tugas terpadu yang memadukan pencatatan jam kerja presisi, presensi kehadiran, visualisasi kalender interaktif, gamifikasi prestasi tim, utilitas pengembang SQL/JSON, serta pelaporan resmi spreadsheet ClosedXML.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    Multi-Timer Serentak
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                    Jalankan beberapa timer pengerjaan tugas secara live tanpa saling menghentikan. Mengambang otomatis di bar bawah layar.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    Kalender Tugas & RBAC Scoping
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                    Visualisasi deadline 4-mode (Bulan, Minggu, Hari, Agenda) dengan kontrol filter aman antara tugas pribadi dan seluruh tim.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs">
                    <Flame className="h-4 w-4 text-amber-500" />
                    Gamifikasi & Hadiah Nyata
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                    Dapatkan poin dari daily check-in dan 40+ lencana gaul. Tukarkan poin ke saldo reward nyata seperti e-wallet atau merchandise.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-xs">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    Impor & Ekspor Spreadsheet
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                    Dukungan multi-sheet Excel, pembuatan akun otomatis bagi PIC baru, serta ekspor format Standar dan format ARMS 21-kolom.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "modules" && (
            <div className="space-y-4">
              <div className="border-l-4 border-indigo-500 pl-4 py-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  1. Studio Tugas & Kanban Board
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Kelola hierarki tugas (Parent & Sub-tasks), dokumentasi kendala (Obstacle) dan solusi teknis (Solution), serta pembaruan progres kerja real-time.
                </p>
              </div>

              <div className="border-l-4 border-emerald-500 pl-4 py-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  2. Timesheet & Rekap Jam Kerja
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Pencatatan sesi kerja otomatis dan manual, estimasi Man-Days (MD berbasis 8 jam/hari), dan ekspor laporan Excel 3-sheet dengan formula ClosedXML.
                </p>
              </div>

              <div className="border-l-4 border-sky-500 pl-4 py-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  3. Presensi Kehadiran & Rekonsiliasi Tim
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Clock-In & Clock-Out harian berbasis lokasi kerja (WFO/WFH), pengajuan cuti/izin/sakit, serta modul rekonsiliasi kehadiran tim bagi Administrator.
                </p>
              </div>

              <div className="border-l-4 border-amber-500 pl-4 py-1">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                  4. Utilitas Developer (SQL & JSON Tools)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  SQL Beautifier mendukung 15+ dialek database dan JSON Validator/Minifier mandiri tanpa ketergantungan pihak ketiga eksternal.
                </p>
              </div>
            </div>
          )}

          {activeTab === "shortcuts" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Pintasan Navigasi & Aksi Cepat
              </h4>

              <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800 text-xs">
                <div className="flex items-center justify-between p-3.5">
                  <span className="font-medium">Pencarian Global Cepat</span>
                  <kbd className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Ctrl + K
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3.5">
                  <span className="font-medium">1-Klik Quick Status pada Kalender</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Klik tugas di kalender &rarr; Pilih To Do / In Progress / Done
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5">
                  <span className="font-medium">Multi-Timer Floating Bar</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Otomatis muncul di bawah layar saat minimal 1 timer aktif
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5">
                  <span className="font-medium">Beralih Mode Gelap / Terang</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Klik ikon matahari/bulan di bilah atas
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "rbac" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Matriks Hak Akses Peran
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        Administrator
                      </span>
                      : Akses penuh ke seluruh data organisasi, konfigurasi sistem, audit trail, rekapitulasi presensi tim, import/export tugas, dan manajemen hadiah.
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        Anggota Tim (Member)
                      </span>
                      : Mengelola tugas pribadi, memulai multi-timer, mencatat jam kerja mandiri, presensi check-in/out, daily check-in gamifikasi, dan klaim hadiah.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/60">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            TrackerKerja Modern v3.8 Production Ready
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="startTourFromGuideBtn"
              variant="outline"
              onClick={() => {
                handleClose();
                window.dispatchEvent(new CustomEvent("wtp:start_onboarding_tour"));
              }}
              className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Mulai Tur Layar (6 Spotlight)
            </Button>

            <Button
              id="closeUserGuideOkBtn"
              onClick={handleClose}
              className="bg-indigo-600 font-bold text-white shadow-md hover:bg-indigo-700"
            >
              Tutup Panduan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

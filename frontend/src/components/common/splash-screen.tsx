"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, Mail, ArrowRight } from "lucide-react";

const loadingMessages = [
  { at: 0, text: "Menyiapkan ruang kerja & papan tugas..." },
  { at: 35, text: "Memuat modul pelacakan progres real-time..." },
  { at: 75, text: "Menyinkronkan antrean worker & tenggat waktu..." },
  { at: 100, text: "Workspace siap digunakan. Silakan masuk." },
];

export function SplashScreen() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(loadingMessages[0].text);
  const [imageError, setImageError] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startProgressSimulation = useCallback(() => {
    setProgress(0);
    setStatusText(loadingMessages[0].text);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 4, 100);

        for (let i = loadingMessages.length - 1; i >= 0; i--) {
          if (next >= loadingMessages[i].at) {
            setStatusText(loadingMessages[i].text);
            break;
          }
        }

        if (next >= 100 && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return next;
      });
    }, 45);
  }, []);

  const handleClose = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsExiting(true);
    try {
      sessionStorage.setItem("wtp_splash_dismissed", "true");
    } catch {
      // ignore storage error if unavailable
    }

    setTimeout(() => {
      setIsOpen(false);
      setIsExiting(false);
    }, 700);
  }, []);

  useEffect(() => {
    // 1. Check if already dismissed in this browser session
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("wtp_splash_dismissed") === "true";
    } catch {
      dismissed = false;
    }

    if (!dismissed) {
      setIsOpen(true);
      startProgressSimulation();
    }

    // 2. Listen for custom replay event (e.g. from user menu or help button)
    const handleReplayEvent = () => {
      setIsExiting(false);
      setIsOpen(true);
      startProgressSimulation();
    };

    window.addEventListener("wtp:open_splash", handleReplayEvent);

    // 3. Listen for Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isExiting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("wtp:open_splash", handleReplayEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose, isOpen, isExiting, startProgressSimulation]);

  if (!isOpen) return null;

  return (
    <div
      id="task-splash-overlay"
      className={`fixed inset-0 z-[99999] flex flex-col justify-between overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 workflow-grid-pattern transition-all duration-700 select-none ${
        isExiting
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        backgroundColor: "#060d1a",
        color: "#f1f5f9",
      }}
    >
      {/* Efek Cahaya Ambien Latar Belakang */}
      <div className="fixed top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[560px] sm:h-[560px] bg-sky-500/15 rounded-full blur-[130px] pointer-events-none animate-glow-pulse" />
      <div className="fixed bottom-10 right-10 w-[280px] h-[280px] bg-emerald-500/15 rounded-full blur-[110px] pointer-events-none" />

      {/* BARIS ATAS: Lencana Status Sistem & Tombol Lewati */}
      <header className="relative z-10 flex items-center justify-between w-full max-w-5xl mx-auto pt-1 animate-fade-up">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0c1629]/90 border border-sky-500/30 text-xs font-mono text-sky-300 shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>TASKWORKERPRO SUITE // WORKFLOW ENGINE</span>
        </div>

        <button
          onClick={handleClose}
          type="button"
          title="Lewati Splash Screen (Esc)"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c1629]/80 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <span>Lewati</span>
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </header>

      {/* KONTEN UTAMA TENGAH: Visual Workspace, Logo & Preamble */}
      <main className="relative z-10 max-w-5xl w-full mx-auto my-auto py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center bg-[#0c1629]/85 backdrop-blur-xl border border-slate-700/70 rounded-3xl p-6 sm:p-9 lg:p-10 shadow-2xl">
          {/* KOLOM KIRI (5 Kolom): Image Ruang Kerja & Logo Kustom Task Tracker Pro */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-sky-500/30 frame-elevated group">
              {/* Gambar Ruang Kerja & Manajemen Tugas */}
              <div className="aspect-[4/3] sm:aspect-square bg-[#060d1a] relative overflow-hidden">
                {!imageError ? (
                  <img
                    src="/images/splash-workspace.jpg"
                    alt="Perencanaan Tugas dan Ruang Kerja Produktif Task Tracker Pro"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-1000 opacity-85"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0c1629] to-[#060d1a] text-sky-400 font-mono text-xs">
                    Task Tracker Pro Workspace
                  </div>
                )}
                {/* Gradasi Gelap Lembut di Bagian Bawah Gambar */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#060d1a] via-[#060d1a]/55 to-transparent" />
              </div>

              {/* Overlay Logo Task Tracker Pro di Bawah Foto */}
              <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col items-center text-center">
                {/* Emblem Logo SVG Kustom Task Tracker Pro */}
                <div className="w-16 h-16 rounded-2xl bg-[#060d1a]/95 border border-sky-400/60 shadow-xl flex items-center justify-center mb-3 animate-float-slow">
                  <svg
                    className="w-11 h-11"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="splashTaskProGrad"
                        x1="8"
                        y1="8"
                        x2="56"
                        y2="56"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="50%" stopColor="#0EA5E9" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                    {/* Bingkai Kanban / Papan Progres Presisi */}
                    <rect
                      x="10"
                      y="12"
                      width="44"
                      height="40"
                      rx="9"
                      stroke="url(#splashTaskProGrad)"
                      strokeWidth="2.6"
                      className="task-logo-stroke"
                    />
                    {/* Garis Kolom & Bar Progres */}
                    <path
                      d="M18 22H30"
                      stroke="#38BDF8"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      className="task-logo-stroke"
                    />
                    <path
                      d="M18 30H26"
                      stroke="#94A3B8"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      className="task-logo-stroke"
                    />
                    <path
                      d="M18 38H28"
                      stroke="#94A3B8"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      className="task-logo-stroke"
                    />
                    {/* Simbol Centang Eksekusi Selesai (Emerald) */}
                    <path
                      d="M33 33L38.5 38.5L48 26"
                      stroke="#10B981"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="task-logo-stroke"
                    />
                  </svg>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Task Tracker{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">
                    Pro
                  </span>
                </h1>
                <p className="text-xs text-slate-300/85 mt-1 font-sans">
                  Kendali Penuh Atas Setiap Tugas & Eksekusi Tim
                </p>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (7 Kolom): Preamble & Informasi Aplikasi */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            {/* Preamble / Pengantar Sebelum Membuka Aplikasi */}
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#060d1a]/90 border border-sky-500/30 text-sky-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Preamble & Pengantar Aplikasi</span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-snug">
                Orkestrasi Alur Kerja yang Terukur, Transparan, dan Tepat Waktu
              </h2>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-300 leading-relaxed font-sans">
                <p>
                  Selamat datang di{" "}
                  <strong className="font-semibold text-white">
                    Task Tracker Pro
                  </strong>{" "}
                  — modul manajemen tugas dan pelacakan progres terpadu yang lahir
                  dari inisiatif pengembangan{" "}
                  <span className="font-mono text-sky-400 text-xs sm:text-sm">
                    TaskWorkerPro
                  </span>{" "}
                  oleh{" "}
                  <strong className="text-emerald-400 font-semibold">
                    MaktabIT Technology
                  </strong>
                  .
                </p>
                <p>
                  Dirancang untuk menjawab tantangan koordinasi kerja modern,
                  aplikasi ini membantu individu maupun tim memetakan prioritas,
                  memantau status pengerjaan secara <em>real-time</em>, serta
                  memastikan setiap target terselesaikan dengan akuntabilitas
                  tinggi.
                </p>
              </div>
            </div>

            {/* Intisari Kapabilitas Utama (4 Poin Ringkas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#060d1a]/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Kanban & Manajemen Tugas
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Klasifikasi status tugas terstruktur dari antrean hingga tuntas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#060d1a]/80 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Pelacakan Progres Real-Time
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pantau capaian setiap pekerja dan sprint secara instan.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#060d1a]/80 border border-slate-800 hover:border-sky-500/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Kolaborasi Tim Terstruktur
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Distribusi tanggung jawab dan prioritas kerja yang jelas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#060d1a]/80 border border-slate-800 hover:border-amber-500/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">
                    Notifikasi & Tenggat Waktu
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pengingat jadwal otomatis agar tidak ada target terlewat.
                  </p>
                </div>
              </div>
            </div>

            {/* Bilah Kesiapan & Tombol Masuk Utama */}
            <div className="pt-3 border-t border-slate-800 space-y-4">
              {/* Indikator Kesiapan Ruang Kerja */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-sans">{statusText}</span>
                  <span className="font-mono text-sky-400 font-semibold">
                    {progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#060d1a] rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-400 hover:to-emerald-300 text-[#060d1a] font-display font-bold text-sm shadow-lg shadow-sky-500/20 transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  <span>Buka Aplikasi Task Tracker Pro</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href="https://github.com/zhavick/TaskWorkerPro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#060d1a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span>GitHub</span>
                  </a>
                  <a
                    href="mailto:zhavick@gmail.com?subject=Kolaborasi%20Task%20Tracker%20Pro"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#060d1a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition-colors"
                  >
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>Kontak</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BARIS BAWAH: BRANDING PEMBUAT RESMI (MAKTABIT TECHNOLOGY + LOGO MONOGRAM) */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto pt-2 pb-1 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        {/* Identitas & Logo Resmi MaktabIT Technology */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0c1629]/95 border border-slate-700/80 shadow-md">
          {/* Logo SVG Kustom MaktabIT Technology */}
          <div className="w-9 h-9 rounded-xl bg-[#060d1a] border border-sky-500/40 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6"
              viewBox="0 0 72 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Bingkai Segi Delapan MaktabIT */}
              <path
                d="M24 8H48L64 24V48L48 64H24L8 48V24L24 8Z"
                stroke="#38BDF8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Monogram M / Buku Terbuka */}
              <path
                d="M20 46V26L36 37L52 26V46"
                stroke="#FFFFFF"
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Titik Simpul Digital */}
              <circle cx="36" cy="20" r="3.5" fill="#10B981" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-sans">
              Dikembangkan oleh
            </span>
            <span className="font-display font-bold text-sm text-white tracking-tight">
              Maktab<span className="text-sky-400">IT</span> Technology
            </span>
          </div>
        </div>

        {/* Keterangan Versi & Tautan */}
        <div className="text-center sm:text-right text-[11px] text-slate-400/80 space-y-0.5 font-sans">
          <div>
            Task Tracker Pro v1.0 • Bagian dari Ekosistem{" "}
            <span className="text-slate-300 font-mono">TaskWorkerPro</span>
          </div>
          <div>
            &copy; 2026 MaktabIT Technology •{" "}
            <a
              href="mailto:zhavick@gmail.com"
              className="hover:text-sky-400 underline underline-offset-2"
            >
              zhavick@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

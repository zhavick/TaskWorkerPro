"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart3,
  CheckSquare,
  CalendarDays,
  CalendarCheck,
  Code,
  Palette,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";

interface TourStep {
  id: string;
  selector: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "metrics",
    selector: "#tour-metrics, [data-tour='tour-metrics']",
    title: "Ringkasan Metrik Dashboard",
    badge: "Dashboard Overview",
    description:
      "Pantau performa operasional kerja secara real-time: akumulasi jam kerja, total tugas aktif, status presensi kehadiran harian, serta streak konsistensi check-in tim.",
    icon: BarChart3,
    position: "bottom",
  },
  {
    id: "tasks",
    selector: "#tour-tasks, [data-tour='tour-tasks']",
    title: "Manajemen Tugas & Multi-Timer",
    badge: "Task & Kanban Studio",
    description:
      "Kelola hierarki tugas (parent & sub-tasks), papan Kanban visual, serta rekam waktu kerja menggunakan fitur Multi-Timer yang dapat berjalan secara simultan.",
    icon: CheckSquare,
    position: "right",
  },
  {
    id: "calendar",
    selector: "#tour-calendar, [data-tour='tour-calendar']",
    title: "Kalender Kerja & Scoping Peran",
    badge: "Work Calendar",
    description:
      "Lihat tenggat waktu tugas dalam 4 mode tampilan interaktif (Bulan, Minggu, Hari, Agenda) dengan kontrol filter hak akses aman antara tugas mandiri dan tim.",
    icon: CalendarDays,
    position: "right",
  },
  {
    id: "attendance",
    selector: "#tour-attendance, [data-tour='tour-attendance']",
    title: "Presensi Mandiri & Timesheet",
    badge: "Attendance & Geo",
    description:
      "Lakukan pencatatan kehadiran harian (Clock-In & Clock-Out) dengan deteksi tipe lokasi (WFO/WFH) dan otomatisasi integrasi rekonsiliasi timesheet.",
    icon: CalendarCheck,
    position: "right",
  },
  {
    id: "sql",
    selector: "#tour-sql, [data-tour='tour-sql']",
    title: "Utilitas Developer & SQL Beautifier",
    badge: "Developer Tools",
    description:
      "Format dan rapikan query SQL hingga 15+ dialek database tanpa ketergantungan pihak ketiga eksternal, serta validasi struktur data JSON mandiri.",
    icon: Code,
    position: "right",
  },
  {
    id: "theme",
    selector: "#tour-theme, [data-tour='tour-theme']",
    title: "Theme & Font Switcher Global",
    badge: "Eye-Friendly Theme Studio",
    description:
      "Pilih dari 40 palet tema visual modern (22 mode terang & 18 mode gelap) serta 5 Google Fonts global untuk kenyamanan mata selama jam kerja panjang.",
    icon: Palette,
    position: "bottom",
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Update target bounding rect
  const updateRect = useCallback(() => {
    if (!isActive || !currentStep) return;

    const el = document.querySelector(currentStep.selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    } else {
      // Fallback center of screen if target is not in current DOM (e.g., hidden mobile menu)
      setTargetRect(null);
    }
  }, [isActive, currentStep]);

  // Handle start tour
  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  // Handle tour finish or dismiss
  const completeTour = useCallback(() => {
    setIsActive(false);
    try {
      localStorage.setItem("onboarding_tour_completed", "true");
    } catch {}
  }, []);

  // Listen for global custom event
  useEffect(() => {
    const handleStartEvent = () => startTour();
    window.addEventListener("wtp:start_onboarding_tour", handleStartEvent);

    // Initial check: if tour never completed, trigger auto-start once with slight delay
    try {
      const isCompleted = localStorage.getItem("onboarding_tour_completed");
      if (!isCompleted) {
        const timer = setTimeout(() => {
          startTour();
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}

    return () => {
      window.removeEventListener("wtp:start_onboarding_tour", handleStartEvent);
    };
  }, [startTour]);

  // Window resize & scroll listeners
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
      updateRect();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  // Scroll target element into view when step changes
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const el = document.querySelector(currentStep.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }

    const timer = setTimeout(() => {
      updateRect();
    }, 300);

    return () => clearTimeout(timer);
  }, [isActive, currentStepIndex, currentStep, updateRect]);

  // Keyboard navigation (Escape, ArrowRight, ArrowLeft, Enter)
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        completeTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          completeTour();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStepIndex, completeTour]);

  if (!isActive || !currentStep) return null;

  // Compute popover placement coordinates
  let popoverTop = 100;
  let popoverLeft = 100;
  const popoverWidth = 360;

  if (targetRect) {
    const spaceBelow = windowDimensions.height - (targetRect.top + targetRect.height);
    const spaceRight = windowDimensions.width - (targetRect.left + targetRect.width);

    if (currentStep.position === "bottom" || spaceBelow > 260) {
      popoverTop = targetRect.top + targetRect.height + 14;
      popoverLeft = Math.max(16, Math.min(targetRect.left, windowDimensions.width - popoverWidth - 16));
    } else if (currentStep.position === "right" && spaceRight > popoverWidth + 24) {
      popoverTop = Math.max(16, targetRect.top);
      popoverLeft = targetRect.left + targetRect.width + 16;
    } else {
      // Default / fallback
      popoverTop = Math.max(16, targetRect.top - 240);
      popoverLeft = Math.max(16, Math.min(targetRect.left, windowDimensions.width - popoverWidth - 16));
    }

    // Keep popover on-screen
    if (popoverTop + 240 > windowDimensions.height) {
      popoverTop = Math.max(16, windowDimensions.height - 250);
    }
  } else {
    // Centered fallback
    popoverTop = Math.max(16, (windowDimensions.height - 240) / 2);
    popoverLeft = Math.max(16, (windowDimensions.width - popoverWidth) / 2);
  }

  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* SVG Spotlight Mask Cutout Overlay */}
      <svg
        className="fixed inset-0 h-full w-full pointer-events-none transition-all duration-300"
        style={{ width: "100vw", height: "100vh" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White reveals the dark backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cuts out the spotlight hole */}
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={14}
                ry={14}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop Rect with Mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.75)"
          mask="url(#tour-spotlight-mask)"
          className="backdrop-blur-[2px]"
        />
      </svg>

      {/* Target Glowing Ring */}
      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.35),0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Floating Spotlight Card */}
      <div
        className="fixed z-50 transition-all duration-300 ease-out"
        style={{
          top: `${popoverTop}px`,
          left: `${popoverLeft}px`,
          width: `${popoverWidth}px`,
        }}
      >
        <div className="overflow-hidden rounded-3xl border border-gray-100/90 bg-white p-5 shadow-2xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900 dark:ring-white/10">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
                <StepIcon className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-indigo-100/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {currentStep.badge}
              </span>
            </div>

            <button
              onClick={completeTour}
              aria-label="Tutup Tur"
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title & Description */}
          <div className="mt-1">
            <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
              {currentStep.title}
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {currentStep.description}
            </p>
          </div>

          {/* Step Progress Dots */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  aria-label={`Ke langkah ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? "w-5 bg-indigo-600 dark:bg-indigo-400"
                      : "w-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700"
                  }`}
                />
              ))}
              <span className="ml-2 text-[11px] font-medium text-gray-400">
                {currentStepIndex + 1}/{TOUR_STEPS.length}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              )}

              {currentStepIndex < TOUR_STEPS.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                  className="h-8 gap-1 bg-indigo-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-600"
                >
                  Lanjut
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={completeTour}
                  className="h-8 gap-1 bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-600"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mulai Bekerja
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

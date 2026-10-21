"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Megaphone,
  AlertOctagon,
  AlertTriangle,
  Wrench,
  Info,
  Calendar,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { cn } from "@/utils/cn";

export interface ActiveAnnouncement {
  id: number;
  title: string;
  content: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  companyId?: number | null;
  companyName?: string | null;
  companyCode?: string | null;
  createdByUserName?: string | null;
  createdAt: string;
  readCount: number;
  hasRead?: boolean;
}

export function AnnouncementModal() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Listen to anti-overlap event with user guide/tour
  useEffect(() => {
    const handleGuideOpened = () => setIsGuideOpen(true);
    const handleGuideClosed = () => {
      setIsGuideOpen(false);
    };

    window.addEventListener("wtp:panduan_opened", handleGuideOpened);
    window.addEventListener("wtp:panduan_closed", handleGuideClosed);

    return () => {
      window.removeEventListener("wtp:panduan_opened", handleGuideOpened);
      window.removeEventListener("wtp:panduan_closed", handleGuideClosed);
    };
  }, []);

  // Fetch active announcements
  const { data: announcements = [] } = useQuery<ActiveAnnouncement[]>({
    queryKey: ["activeAnnouncementsModal"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/announcements/active");
        return res.data.data || [];
      } catch {
        return [];
      }
    },
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Filter out any locally dismissed announcements
  const filteredAnnouncements = announcements.filter((a) => {
    try {
      const localDismissed = JSON.parse(
        localStorage.getItem("wtp_dismissed_announcements") || "[]"
      );
      if (localDismissed.includes(a.id)) return false;

      if (typeof window !== "undefined" && sessionStorage.getItem("wtp_session_dismissed_" + a.id)) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  });

  // Trigger open when filtered announcements exist and no guide is active
  useEffect(() => {
    if (filteredAnnouncements.length > 0 && !isGuideOpen) {
      // Small 400ms delay for smooth mount
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
    }
  }, [filteredAnnouncements.length, isGuideOpen]);

  // Mark read mutation
  const markReadMutation = useMutation({
    mutationFn: async ({
      id,
      dontShow,
    }: {
      id: number;
      dontShow: boolean;
    }) => {
      await apiClient.post(`/announcements/${id}/mark-read`, {
        dontShowAgain: dontShow,
      });
    },
  });

  if (!isOpen || filteredAnnouncements.length === 0) {
    return null;
  }

  const currentItem = filteredAnnouncements[currentIndex] || filteredAnnouncements[0];

  const handleNext = () => {
    if (currentIndex < filteredAnnouncements.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setDontShowAgain(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setDontShowAgain(false);
    }
  };

  const handleClose = () => {
    if (currentItem) {
      if (dontShowAgain) {
        try {
          const currentList = JSON.parse(
            localStorage.getItem("wtp_dismissed_announcements") || "[]"
          );
          if (!currentList.includes(currentItem.id)) {
            currentList.push(currentItem.id);
            localStorage.setItem(
              "wtp_dismissed_announcements",
              JSON.stringify(currentList)
            );
          }
        } catch {}

        markReadMutation.mutate({
          id: currentItem.id,
          dontShow: true,
        });
      } else {
        try {
          sessionStorage.setItem("wtp_session_dismissed_" + currentItem.id, "true");
        } catch {}
      }
    }

    setIsOpen(false);
  };

  const isUrgent =
    currentItem.type === "Mendesak / Darurat" ||
    currentItem.type === "Informasi Penting";

  const isMaintenance = currentItem.type === "Pemeliharaan Sistem";

  const getUrgencyBadge = () => {
    if (currentItem.type === "Mendesak / Darurat") {
      return {
        icon: <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-pulse" />,
        badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
        borderHighlight: "border-rose-500/50 shadow-rose-500/20",
        headerBg: "from-rose-500/15 via-rose-500/5 to-transparent",
        label: "Mendesak / Darurat",
      };
    }
    if (currentItem.type === "Informasi Penting") {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        borderHighlight: "border-amber-500/50 shadow-amber-500/20",
        headerBg: "from-amber-500/15 via-amber-500/5 to-transparent",
        label: "Informasi Penting",
      };
    }
    if (currentItem.type === "Pemeliharaan Sistem") {
      return {
        icon: <Wrench className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
        badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800",
        borderHighlight: "border-sky-500/50 shadow-sky-500/20",
        headerBg: "from-sky-500/15 via-sky-500/5 to-transparent",
        label: "Pemeliharaan Sistem",
      };
    }
    return {
      icon: <Megaphone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
      badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
      borderHighlight: "border-indigo-500/50 shadow-indigo-500/20",
      headerBg: "from-indigo-500/15 via-indigo-500/5 to-transparent",
      label: "Pengumuman Resmi",
    };
  };

  const styleMeta = getUrgencyBadge();

  return (
    <div
      id="globalAnnouncementModalContainer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60 transition-all duration-300 animate-in fade-in"
    >
      <div
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-3xl border bg-white shadow-2xl transition-all duration-300 dark:bg-gray-900",
          styleMeta.borderHighlight
        )}
      >
        {/* Top Accent Gradient Bar */}
        <div
          className={cn(
            "h-2 w-full bg-linear-to-r",
            isUrgent
              ? "from-rose-500 via-amber-500 to-rose-600"
              : isMaintenance
              ? "from-sky-500 via-indigo-500 to-sky-600"
              : "from-indigo-500 via-purple-500 to-pink-500"
          )}
        />

        {/* Modal Header */}
        <div
          className={cn(
            "flex items-start justify-between border-b border-gray-100 p-6 bg-linear-to-b dark:border-gray-800/80",
            styleMeta.headerBg
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-xs",
                styleMeta.badgeClass
              )}
            >
              {styleMeta.icon}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
                    styleMeta.badgeClass
                  )}
                >
                  {styleMeta.label}
                </span>

                {currentItem.companyName ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Building className="h-3 w-3" />
                    {currentItem.companyName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    <Sparkles className="h-3 w-3" />
                    Lintas Organisasi
                  </span>
                )}
              </div>

              <h2
                id="announcementModalTitle"
                className="mt-2 text-lg font-black tracking-tight text-gray-900 dark:text-white"
              >
                {currentItem.title}
              </h2>
            </div>
          </div>

          <button
            id="closeAnnouncementModalBtn"
            onClick={handleClose}
            aria-label="Tutup Pengumuman"
            className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed font-normal">
            {currentItem.content}
          </div>

          {/* Validity & Issuer Information Footer Box */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                Masa Berlaku:
              </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {new Date(currentItem.startDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                s/d{" "}
                {new Date(currentItem.endDate).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Diterbitkan Oleh:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {currentItem.createdByUserName || "Administrator Sistem"}
              </span>
            </div>
          </div>
        </div>

        {/* Stepper & Bottom Action Bar */}
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-900/60 sm:flex-row sm:items-center sm:justify-between">
          {/* Stepper Count (If > 1) */}
          <div className="flex items-center gap-2">
            {filteredAnnouncements.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <Button
                  id="prevAnnouncementBtn"
                  size="sm"
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 px-1">
                  {currentIndex + 1} / {filteredAnnouncements.length}
                </span>

                <Button
                  id="nextAnnouncementBtn"
                  size="sm"
                  variant="outline"
                  disabled={currentIndex === filteredAnnouncements.length - 1}
                  onClick={handleNext}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <input
                  id="dontShowAgainCheckbox"
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                />
                Jangan tampilkan lagi
              </label>
            )}

            {filteredAnnouncements.length > 1 && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-2">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
                />
                Jangan ingatkan lagi
              </label>
            )}
          </div>

          {/* Action button */}
          <Button
            id="acknowledgeAnnouncementBtn"
            onClick={handleClose}
            className={cn(
              "font-bold text-white shadow-md transition-all",
              isUrgent
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
            )}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Saya Mengerti
          </Button>
        </div>
      </div>
    </div>
  );
}

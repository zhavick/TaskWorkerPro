"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Clock,
  Square,
  ChevronUp,
  ChevronDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import Link from "next/link";

interface ActiveTimer {
  sessionId: number;
  taskId: number;
  taskTitle: string;
  projectName?: string;
  projectColor?: string;
  startTime: string;
  currentElapsedSeconds: number;
  notes?: string;
}

export function FloatingTimerBar() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState<Record<number, number>>({});

  // Query active timers
  const { data: timers = [] } = useQuery<ActiveTimer[]>({
    queryKey: ["activeTimers"],
    queryFn: async () => {
      const res = await apiClient.get("/timesheets/active-timers");
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  // Real-time second ticker
  useEffect(() => {
    if (!timers || timers.length === 0) return;

    const initialMap: Record<number, number> = {};
    timers.forEach((t) => {
      const startMs = new Date(t.startTime).getTime();
      initialMap[t.sessionId] = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    });
    setLiveElapsed(initialMap);

    const interval = setInterval(() => {
      setLiveElapsed((prev) => {
        const next = { ...prev };
        timers.forEach((t) => {
          const startMs = new Date(t.startTime).getTime();
          next[t.sessionId] = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  // Stop Timer Mutation
  const stopTimerMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiClient.post(`/timesheets/${sessionId}/stop`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Sesi kerja dihentikan! Durasi tercatat: ${data.durationHours || 0} jam.`);
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSessions"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menghentikan timer");
    },
  });

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!timers || timers.length === 0) {
    return null;
  }

  const primaryTimer = timers[0];
  const primarySecs =
    liveElapsed[primaryTimer.sessionId] ?? primaryTimer.currentElapsedSeconds ?? 0;

  return (
    <>
      {/* Floating Bottom Bar Container */}
      <aside aria-label="Live Active Timer" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 w-[94%] max-w-2xl transition-all duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-white/95 p-3 shadow-2xl backdrop-blur-md dark:border-indigo-900/60 dark:bg-gray-900/95">
          {/* Subtle Accent Glow Line on top */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

          {isMinimized ? (
            /* Minimized View */
            <div className="flex items-center justify-between px-2 pt-0.5">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                  {formatTime(primarySecs)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] sm:max-w-xs">
                  {primaryTimer.taskTitle}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg"
                  onClick={() => stopTimerMutation.mutate(primaryTimer.sessionId)}
                  disabled={stopTimerMutation.isPending}
                >
                  <Square className="h-3 w-3 fill-current" />
                  Stop
                </Button>
                <button
                  onClick={() => setIsMinimized(false)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Perbesar Tampilan Timer"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Floating Bar View */
            <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center sm:justify-between">
              {/* Task Info & Project Badge */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {primaryTimer.projectName && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: primaryTimer.projectColor || "#4F46E5" }}
                      >
                        {primaryTimer.projectName}
                      </span>
                    )}
                    <Link
                      href={`/tasks/${primaryTimer.taskId}`}
                      className="truncate text-xs sm:text-sm font-bold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                    >
                      {primaryTimer.taskTitle}
                    </Link>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {primaryTimer.notes || "Sesi pengerjaan tugas sedang berlangsung"}
                  </p>
                </div>
              </div>

              {/* Ticker & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-gray-100 pt-2 sm:border-0 sm:pt-0 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base sm:text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {formatTime(primarySecs)}
                  </span>

                  {timers.length > 1 && (
                    <button
                      onClick={() => setModalOpen(true)}
                      className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-300"
                      title="Lihat seluruh sesi timer serentak"
                    >
                      <Layers className="h-3 w-3" />
                      +{timers.length - 1} Lainnya
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl shadow-md shadow-rose-500/20"
                    onClick={() => stopTimerMutation.mutate(primaryTimer.sessionId)}
                    disabled={stopTimerMutation.isPending}
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </Button>

                  <button
                    onClick={() => setIsMinimized(true)}
                    className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    title="Minimalkan Tampilan Timer"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Multi-Timer Management Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Sesi Timer Serentak Berjalan ({timers.length})
            </DialogTitle>
          </DialogHeader>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            TrackerKerja mendukung pengerjaan multi-tugas serentak dengan pelacakan durasi per sesi.
          </p>

          <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {timers.map((t) => {
              const secs = liveElapsed[t.sessionId] ?? t.currentElapsedSeconds ?? 0;
              return (
                <div
                  key={t.sessionId}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      {t.projectName && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: t.projectColor || "#4F46E5" }}
                        >
                          {t.projectName}
                        </span>
                      )}
                      <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {t.taskTitle}
                      </h4>
                    </div>
                    {t.notes && (
                      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        {t.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {formatTime(secs)}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 gap-1 rounded-lg px-2.5 text-xs font-semibold"
                      onClick={() => stopTimerMutation.mutate(t.sessionId)}
                      disabled={stopTimerMutation.isPending}
                    >
                      <Square className="h-3 w-3 fill-current" />
                      Stop
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

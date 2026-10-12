"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { Clock, Square, Play, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Button } from "@/components/tailgrids/core/button";

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

export function ActiveTimersWidget() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState<Record<number, number>>({});

  const { data: timers = [] } = useQuery<ActiveTimer[]>({
    queryKey: ["activeTimers"],
    queryFn: async () => {
      const res = await apiClient.get("/timesheets/active-timers");
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  // Local second-by-second ticker for smooth timer UI
  useEffect(() => {
    if (!timers.length) return;

    // Initialize local elapsed
    const initialMap: Record<number, number> = {};
    timers.forEach((t) => {
      const startMs = new Date(t.startTime).getTime();
      initialMap[t.sessionId] = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    });
    setLiveElapsed(initialMap);

    const ticker = setInterval(() => {
      setLiveElapsed((prev) => {
        const next = { ...prev };
        timers.forEach((t) => {
          const startMs = new Date(t.startTime).getTime();
          next[t.sessionId] = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [timers]);

  const stopTimerMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiClient.post(`/timesheets/${sessionId}/stop`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Timer dihentikan! Durasi: ${data.durationHours} Jam.`);
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSessions"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menghentikan timer");
    },
  });

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!timers || timers.length === 0) {
    return null;
  }

  // Primary active timer displayed on pill
  const primaryTimer = timers[0];
  const primarySecs = liveElapsed[primaryTimer.sessionId] || primaryTimer.currentElapsedSeconds;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        title="Klik untuk melihat seluruh live timer aktif"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600"></span>
        </span>
        <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="font-mono font-bold">{formatTime(primarySecs)}</span>
        {timers.length > 1 && (
          <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
            +{timers.length - 1}
          </span>
        )}
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Live Timer Serentak Aktif ({timers.length})
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {timers.map((t) => {
              const secs = liveElapsed[t.sessionId] || t.currentElapsedSeconds;
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

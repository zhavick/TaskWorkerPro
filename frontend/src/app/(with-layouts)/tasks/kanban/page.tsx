"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Kanban as KanbanIcon,
  Plus,
  Play,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  List,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";
import Link from "next/link";

const columns = [
  { id: "Todo", title: "Untuk Dikerjakan (Todo)", statusValue: 0, color: "border-slate-500 text-slate-600 bg-slate-50 dark:bg-slate-900/60" },
  { id: "InProgress", title: "Sedang Berjalan (InProgress)", statusValue: 1, color: "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/60" },
  { id: "Done", title: "Selesai (Done)", statusValue: 2, color: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/60" },
  { id: "Overdue", title: "Kedaluwarsa (Overdue)", statusValue: 3, color: "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-900/60" },
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [selectedMobileColumn, setSelectedMobileColumn] = useState("InProgress");

  // Query Kanban Tasks
  const { data: kanbanData = { Todo: [], InProgress: [], Done: [], Overdue: [] }, isLoading } = useQuery<any>({
    queryKey: ["kanbanTasks"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks/kanban");
      return res.data.data;
    },
  });

  // Status Patch Mutation
  const patchStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: number }) => {
      const res = await apiClient.patch(`/tasks/${taskId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status tugas berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah status"),
  });

  // Start Timer Mutation
  const startTimerMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiClient.post("/timesheets/start", { taskId });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Live timer dimulai!");
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memulai timer"),
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Papan Kanban Interaktif
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Visualisasi alur kerja tim dalam 4 kolom status dengan pembaruan status instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tasks">
            <Button variant="outline" className="gap-2">
              <List className="h-4 w-4" />
              Tampilan Grid Tabel
            </Button>
          </Link>
          <Link href="/tasks">
            <Button className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              Tugas Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Column Segmented Control (< md) */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 md:hidden dark:bg-gray-800">
        {columns.map((col) => (
          <button
            key={col.id}
            onClick={() => setSelectedMobileColumn(col.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedMobileColumn === col.id
                ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {col.id} ({(kanbanData[col.id] || []).length})
          </button>
        ))}
      </div>

      {/* 4-Column Board Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => {
          const tasksInCol = kanbanData[col.id] || [];
          const isMobileVisible = selectedMobileColumn === col.id;

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border border-gray-200/80 bg-gray-50/60 p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900/60 ${
                !isMobileVisible ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between border-b border-gray-200/70 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.id === "Done" ? "bg-emerald-500" : col.id === "InProgress" ? "bg-indigo-500" : col.id === "Overdue" ? "bg-rose-500" : "bg-slate-400"}`} />
                  <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                    {col.id}
                  </h3>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-gray-600 shadow-xs dark:bg-gray-800 dark:text-gray-300">
                  {tasksInCol.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                {tasksInCol.map((task: any) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-xs transition hover:border-indigo-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-850 dark:hover:border-indigo-600"
                  >
                    {/* Project & Milestone */}
                    <div className="flex items-center justify-between gap-2">
                      {task.projectName ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white truncate max-w-[120px]"
                          style={{ backgroundColor: task.projectColor || "#4F46E5" }}
                        >
                          {task.projectName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Umum</span>
                      )}

                      {task.milestone && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {task.milestone}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <Link href={`/tasks/${task.id}`}>
                      <h4 className="mt-2 text-sm font-bold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 leading-snug">
                        {task.title}
                      </h4>
                    </Link>

                    {/* Obstacle Alert */}
                    {task.obstacle && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                        <span className="line-clamp-2 leading-tight">{task.obstacle}</span>
                      </div>
                    )}

                    {/* Progress Slider */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>Progres</span>
                        <span className="font-bold text-gray-600 dark:text-gray-300">{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full bg-indigo-600 transition-all"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Move Status Select */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-800">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          title="Mulai Live Timer"
                          onClick={() => startTimerMutation.mutate(task.id)}
                        >
                          <Play className="h-3 w-3 fill-current" />
                        </Button>
                        <span className="font-mono text-[10px] text-gray-400">
                          {Math.round((task.totalDurationSeconds / 3600) * 10) / 10}h
                        </span>
                      </div>

                      {/* Select Column Transition */}
                      <select
                        value={task.status}
                        onChange={(e) =>
                          patchStatusMutation.mutate({
                            taskId: task.id,
                            status: Number(e.target.value),
                          })
                        }
                        className="rounded-lg border border-gray-200 bg-transparent px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                      >
                        <option value={0}>Ke Todo</option>
                        <option value={1}>Ke InProgress</option>
                        <option value={2}>Ke Done</option>
                        <option value={3}>Ke Overdue</option>
                      </select>
                    </div>
                  </div>
                ))}

                {tasksInCol.length === 0 && (
                  <div className="py-12 text-center text-xs text-gray-400">
                    Tidak ada tugas di kolom ini.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

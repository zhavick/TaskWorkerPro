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
  GripVertical,
  MoveRight,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { ImportExcelDialog } from "@/components/tasks/import-excel-dialog";
import { toast } from "sonner";
import Link from "next/link";

const columns = [
  {
    id: "Todo",
    title: "Untuk Dikerjakan (Todo)",
    statusValue: 0,
    badgeColor: "bg-slate-400",
    color: "border-slate-500 text-slate-600 bg-slate-50 dark:bg-slate-900/60",
    dropZoneHighlight: "border-slate-400 bg-slate-100/70 dark:bg-slate-900/80 ring-2 ring-slate-400/50",
  },
  {
    id: "InProgress",
    title: "Sedang Berjalan (InProgress)",
    statusValue: 1,
    badgeColor: "bg-indigo-500",
    color: "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/60",
    dropZoneHighlight: "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/50",
  },
  {
    id: "Done",
    title: "Selesai (Done)",
    statusValue: 2,
    badgeColor: "bg-emerald-500",
    color: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/60",
    dropZoneHighlight: "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500/50",
  },
  {
    id: "Overdue",
    title: "Kedaluwarsa (Overdue)",
    statusValue: 3,
    badgeColor: "bg-rose-500",
    color: "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-900/60",
    dropZoneHighlight: "border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 ring-2 ring-rose-500/50",
  },
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const [selectedMobileColumn, setSelectedMobileColumn] = useState("InProgress");
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropColId, setActiveDropColId] = useState<string | null>(null);

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
    onMutate: async ({ taskId, status }) => {
      // Snapshot previous value for rollback
      await queryClient.cancelQueries({ queryKey: ["kanbanTasks"] });
      const previousData = queryClient.getQueryData<any>(["kanbanTasks"]);

      // Optimistic update
      if (previousData) {
        const nextData = {
          Todo: [...(previousData.Todo || [])],
          InProgress: [...(previousData.InProgress || [])],
          Done: [...(previousData.Done || [])],
          Overdue: [...(previousData.Overdue || [])],
        };

        let targetTask: any = null;
        for (const colKey of ["Todo", "InProgress", "Done", "Overdue"] as const) {
          const idx = nextData[colKey].findIndex((t: any) => t.id === taskId);
          if (idx !== -1) {
            targetTask = { ...nextData[colKey][idx], status };
            nextData[colKey].splice(idx, 1);
            break;
          }
        }

        if (targetTask) {
          const colName =
            status === 0 ? "Todo" : status === 1 ? "InProgress" : status === 2 ? "Done" : "Overdue";
          nextData[colName].unshift(targetTask);
          queryClient.setQueryData(["kanbanTasks"], nextData);
        }
      }

      return { previousData };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["kanbanTasks"], context.previousData);
      }
      toast.error(err.response?.data?.message || "Gagal mengubah status tugas");
    },
    onSuccess: () => {
      toast.success("Status tugas berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
    },
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

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropColId(null);
  };

  const handleDragOverColumn = (e: React.DragEvent<HTMLDivElement>, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropColId !== colId) {
      setActiveDropColId(colId);
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setActiveDropColId(null);
    }
  };

  const handleDropColumn = (e: React.DragEvent<HTMLDivElement>, col: (typeof columns)[0]) => {
    e.preventDefault();
    setActiveDropColId(null);
    setDraggedTaskId(null);

    const taskIdStr = e.dataTransfer.getData("text/plain");
    const taskId = Number(taskIdStr);
    if (!taskId || isNaN(taskId)) return;

    patchStatusMutation.mutate({ taskId, status: col.statusValue });
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <KanbanIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Papan Kanban Interaktif
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tarik dan letakkan (*Drag & Drop*) kartu tugas antar kolom status untuk pembaruan instan.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Impor Excel
          </Button>
          <Link href="/tasks">
            <Button variant="outline" className="gap-2 text-xs">
              <List className="h-4 w-4" />
              Tampilan Tabel
            </Button>
          </Link>
          <Link href="/tasks">
            <Button className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs">
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
          const isDropActive = activeDropColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDropColumn(e, col)}
              className={`flex flex-col rounded-2xl border transition-all duration-200 p-4 shadow-xs min-h-[500px] ${
                isDropActive
                  ? `${col.dropZoneHighlight} scale-[1.01]`
                  : "border-gray-200/80 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/60"
              } ${!isMobileVisible ? "hidden md:flex" : "flex"}`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between border-b border-gray-200/70 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.badgeColor}`} />
                  <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                    {col.id}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-gray-600 shadow-xs dark:bg-gray-800 dark:text-gray-300">
                    {tasksInCol.length}
                  </span>
                </div>
              </div>

              {/* Drop Target Hint Banner (Visible when dragging over) */}
              {isDropActive && (
                <div className="mb-3 rounded-xl border border-dashed border-indigo-400 bg-indigo-50/90 py-2.5 text-center text-xs font-bold text-indigo-700 animate-pulse dark:border-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300">
                  Lepaskan untuk pindah ke {col.id}
                </div>
              )}

              {/* Task Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                {tasksInCol.map((task: any) => {
                  const isBeingDragged = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                        isBeingDragged
                          ? "opacity-35 scale-[0.98] border-dashed border-indigo-500 bg-indigo-50/50"
                          : "border-gray-200/80 bg-white hover:border-indigo-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-850 dark:hover:border-indigo-600"
                      }`}
                    >
                      {/* Drag Handle & Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition dark:text-gray-600 dark:group-hover:text-gray-400" />
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
                        </div>

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

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span>Progres</span>
                          <span className="font-bold text-gray-600 dark:text-gray-300">
                            {task.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full bg-indigo-600 transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Move Status & Live Timer */}
                      <div className="mt-3.5 flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-800">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                            title="Mulai Live Timer Untuk Tugas Ini"
                            onClick={(e) => {
                              e.stopPropagation();
                              startTimerMutation.mutate(task.id);
                            }}
                          >
                            <Play className="h-3 w-3 fill-current" />
                          </Button>
                          <span className="font-mono text-[10px] text-gray-400">
                            {Math.round(((task.totalDurationSeconds || 0) / 3600) * 10) / 10}h
                          </span>
                        </div>

                        {/* Select Column Transition (as fallback for mobile/touch) */}
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            patchStatusMutation.mutate({
                              taskId: task.id,
                              status: Number(e.target.value),
                            });
                          }}
                          className="rounded-lg border border-gray-200 bg-transparent px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                        >
                          <option value={0}>Ke Todo</option>
                          <option value={1}>Ke InProgress</option>
                          <option value={2}>Ke Done</option>
                          <option value={3}>Ke Overdue</option>
                        </select>
                      </div>
                    </div>
                  );
                })}

                {tasksInCol.length === 0 && !isDropActive && (
                  <div className="py-14 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl dark:border-gray-800">
                    Tidak ada tugas di kolom ini.
                    <br />
                    <span className="text-[10px] text-gray-400">Tarik tugas ke sini</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Impor Excel */}
      <ImportExcelDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />
    </div>
  );
}

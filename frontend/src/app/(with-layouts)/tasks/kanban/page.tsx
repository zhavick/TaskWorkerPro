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
  Search,
  Filter,
  Users,
  User,
  Calendar,
  CheckSquare,
  X,
  FolderKanban,
  Flag,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { ImportExcelDialog } from "@/components/tasks/import-excel-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { toast } from "sonner";
import Link from "next/link";

const columns = [
  {
    id: "Todo",
    title: "Untuk Dikerjakan (Todo)",
    statusValue: 0,
    emoji: "📋",
    badgeColor: "bg-slate-400",
    color: "border-slate-500 text-slate-600 bg-slate-50 dark:bg-slate-900/60",
    dropZoneHighlight: "border-slate-400 bg-slate-100/70 dark:bg-slate-900/80 ring-2 ring-slate-400/50",
  },
  {
    id: "InProgress",
    title: "Sedang Berjalan (InProgress)",
    statusValue: 1,
    emoji: "🔄",
    badgeColor: "bg-indigo-500",
    color: "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/60",
    dropZoneHighlight: "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/50",
  },
  {
    id: "Done",
    title: "Selesai (Done)",
    statusValue: 2,
    emoji: "✅",
    badgeColor: "bg-emerald-500",
    color: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/60",
    dropZoneHighlight: "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500/50",
  },
  {
    id: "Overdue",
    title: "Kedaluwarsa (Overdue)",
    statusValue: 3,
    emoji: "⚠️",
    badgeColor: "bg-rose-500",
    color: "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-900/60",
    dropZoneHighlight: "border-rose-500 bg-rose-50/80 dark:bg-rose-950/60 ring-2 ring-rose-500/50",
  },
];

const priorityConfig: Record<number, { label: string; badge: string }> = {
  0: { label: "Low", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  1: { label: "Medium", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  2: { label: "High", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  3: { label: "Critical", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
};

export default function KanbanPage() {
  const queryClient = useQueryClient();

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [selectedMobileColumn, setSelectedMobileColumn] = useState("InProgress");

  // Dialog States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState(0);

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropColId, setActiveDropColId] = useState<string | null>(null);

  // 1. Fetch User Profile to check Admin RBAC
  const { data: userProfile } = useQuery<any>({
    queryKey: ["kanbanUserProfile"],
    queryFn: async () => {
      const res = await apiClient.get("/profile");
      return res.data.data;
    },
  });

  const isAdmin =
    userProfile?.roles?.includes("Administrator") ||
    userProfile?.jobTitle?.toLowerCase().includes("admin") ||
    false;

  // 2. Fetch Projects for filter
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["kanbanProjects"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data || [];
    },
  });

  // 3. Query Kanban Tasks with filters
  const { data: kanbanData = { Todo: [], InProgress: [], Done: [], Overdue: [] }, isLoading } = useQuery<any>({
    queryKey: ["kanbanTasks", search, selectedProjectId, selectedPriority, scope],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedProjectId !== "all") params.append("projectId", selectedProjectId);
      if (selectedPriority !== "all") params.append("priority", selectedPriority);
      if (scope) params.append("filter", scope);

      const res = await apiClient.get(`/tasks/kanban?${params.toString()}`);
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
      await queryClient.cancelQueries({ queryKey: ["kanbanTasks"] });
      const previousData = queryClient.getQueryData<any>(["kanbanTasks", search, selectedProjectId, selectedPriority, scope]);

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
          queryClient.setQueryData(["kanbanTasks", search, selectedProjectId, selectedPriority, scope], nextData);
        }
      }

      return { previousData };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["kanbanTasks", search, selectedProjectId, selectedPriority, scope], context.previousData);
      }
      toast.error(err.response?.data?.message || "Gagal mengubah status tugas");
    },
    onSuccess: () => {
      toast.success("Status tugas berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
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

  const hasActiveFilters = search.trim() !== "" || selectedProjectId !== "all" || selectedPriority !== "all";

  const resetFilters = () => {
    setSearch("");
    setSelectedProjectId("all");
    setSelectedPriority("all");
  };

  const openCreateDialogForStatus = (statusVal: number) => {
    setCreateModalDefaultStatus(statusVal);
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* 1. Header Section */}
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
                Tarik dan letakkan (*Drag & Drop*) kartu tugas antar kolom status untuk alur kerja yang gesit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <Button
            onClick={() => openCreateDialogForStatus(0)}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs"
          >
            <Plus className="h-4 w-4" />
            Tugas Baru
          </Button>
        </div>
      </div>

      {/* 2. Interactive Filter Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas berdasarkan judul atau deskripsi..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Proyek */}
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="rounded-xl border border-gray-200 bg-transparent px-2.5 py-1.5 text-xs font-medium text-gray-800 dark:border-gray-800 dark:text-gray-200"
              >
                <option value="all">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Prioritas */}
            <div className="flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="rounded-xl border border-gray-200 bg-transparent px-2.5 py-1.5 text-xs font-medium text-gray-800 dark:border-gray-800 dark:text-gray-200"
              >
                <option value="all">Semua Prioritas</option>
                <option value="0">Low</option>
                <option value="1">Medium</option>
                <option value="2">High</option>
                <option value="3">Critical</option>
              </select>
            </div>

            {/* Scope Switcher (RBAC Admin: mine vs all) */}
            {isAdmin && (
              <div className="flex items-center rounded-xl bg-gray-100 p-0.5 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    scope === "all"
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Users className="h-3 w-3" />
                  Semua Tim
                </button>
                <button
                  type="button"
                  onClick={() => setScope("mine")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    scope === "mine"
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <User className="h-3 w-3" />
                  Tugas Saya
                </button>
              </div>
            )}

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 gap-1 px-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Mobile Column Segmented Control (< md) */}
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
            {col.emoji} {col.id} ({(kanbanData[col.id] || []).length})
          </button>
        ))}
      </div>

      {/* 4. 4-Column Board Grid */}
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
              className={`flex flex-col rounded-2xl border transition-all duration-200 p-4 shadow-xs min-h-[520px] ${
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
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-gray-600 shadow-xs dark:bg-gray-800 dark:text-gray-300">
                    {tasksInCol.length}
                  </span>
                </div>

                {/* Quick Add Button to this Column */}
                <button
                  type="button"
                  onClick={() => openCreateDialogForStatus(col.statusValue)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  title={`Tambah tugas ke ${col.id}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
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
                  const prio = priorityConfig[task.priority] || priorityConfig[1];
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== 2;

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
                      {/* Drag Handle, Priority & Project Badges */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-500 transition dark:text-gray-600 dark:group-hover:text-gray-400" />
                          {task.projectName ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white truncate max-w-[110px]"
                              style={{ backgroundColor: task.projectColor || "#4F46E5" }}
                            >
                              {task.projectName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Umum</span>
                          )}
                        </div>

                        {/* Priority Badge */}
                        <span className={`shrink-0 rounded border px-1.5 py-0.2 text-[9px] font-bold ${prio.badge}`}>
                          {prio.label}
                        </span>
                      </div>

                      {/* Title */}
                      <Link href={`/tasks/${task.id}`}>
                        <h4 className="mt-2 text-sm font-bold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 leading-snug">
                          {task.title}
                        </h4>
                      </Link>

                      {/* Milestone Tag */}
                      {task.milestone && (
                        <div className="mt-1 text-[10px] text-gray-400 font-medium">
                          {task.milestone}
                        </div>
                      )}

                      {/* Obstacle Alert */}
                      {task.obstacle && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                          <span className="line-clamp-2 leading-tight">{task.obstacle}</span>
                        </div>
                      )}

                      {/* Subtasks Count & Due Date Badges */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        {/* Subtasks Counter */}
                        {task.subtasksCount > 0 ? (
                          <div className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>
                              {task.completedSubtasksCount || 0}/{task.subtasksCount}
                            </span>
                          </div>
                        ) : (
                          <span />
                        )}

                        {/* Due Date Indicator */}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 font-medium text-[10px] ${
                            isOverdue
                              ? "text-red-600 font-bold dark:text-red-400"
                              : "text-gray-400"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              {isOverdue && " (Overdue)"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span>Progres</span>
                          <span className="font-bold text-gray-600 dark:text-gray-300">
                            {task.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full transition-all ${
                              task.progress === 100
                                ? "bg-emerald-500"
                                : "bg-indigo-600"
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Footer: Assignee, Timer, Quick Move */}
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-800">
                        {/* Assignee Avatar / Name */}
                        <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {(task.assignedToUserName || "U")[0].toUpperCase()}
                          </div>
                          <span className="truncate text-[10px] font-medium text-gray-600 dark:text-gray-300">
                            {task.assignedToUserName || "Belum ada PIC"}
                          </span>
                        </div>

                        {/* Timer & Quick Column Select */}
                        <div className="flex items-center gap-1.5">
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

                          {/* Quick Column Transition */}
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
                            className="rounded-lg border border-gray-200 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                          >
                            <option value={0}>Todo</option>
                            <option value={1}>InProgress</option>
                            <option value={2}>Done</option>
                            <option value={3}>Overdue</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {tasksInCol.length === 0 && !isDropActive && (
                  <div className="py-14 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl dark:border-gray-800">
                    Tidak ada tugas di kolom ini.
                    <br />
                    <button
                      type="button"
                      onClick={() => openCreateDialogForStatus(col.statusValue)}
                      className="mt-2 text-indigo-600 hover:underline font-semibold dark:text-indigo-400"
                    >
                      + Tambah Tugas
                    </button>
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

      {/* Modal Buat Tugas Baru */}
      <CreateTaskDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultStatus={createModalDefaultStatus}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Kanban as KanbanIcon,
  Plus,
  Play,
  Square,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  List,
  GripVertical,
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Milestone as MilestoneIcon,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
import { ImportExcelDialog } from "@/components/tasks/import-excel-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { toast } from "sonner";
import Link from "next/link";

interface KanbanColumn {
  id: "Todo" | "InProgress" | "Done" | "Overdue";
  title: string;
  shortTitle: string;
  statusValue: number;
  emoji: string;
  badgeColor: string;
  headerBorder: string;
  dropZoneHighlight: string;
}

const columns: KanbanColumn[] = [
  {
    id: "Todo",
    title: "Untuk Dikerjakan (Todo)",
    shortTitle: "Todo",
    statusValue: 0,
    emoji: "📋",
    badgeColor: "bg-slate-500",
    headerBorder: "border-slate-500/30 text-slate-700 dark:text-slate-300",
    dropZoneHighlight:
      "border-slate-400 bg-slate-100/80 dark:bg-slate-900/90 ring-2 ring-slate-400/50",
  },
  {
    id: "InProgress",
    title: "Sedang Berjalan (InProgress)",
    shortTitle: "In Progress",
    statusValue: 1,
    emoji: "🔄",
    badgeColor: "bg-indigo-500",
    headerBorder: "border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
    dropZoneHighlight:
      "border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/70 ring-2 ring-indigo-500/50",
  },
  {
    id: "Done",
    title: "Selesai (Done)",
    shortTitle: "Done",
    statusValue: 2,
    emoji: "✅",
    badgeColor: "bg-emerald-500",
    headerBorder: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    dropZoneHighlight:
      "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 ring-2 ring-emerald-500/50",
  },
  {
    id: "Overdue",
    title: "Kedaluwarsa (Overdue)",
    shortTitle: "Overdue",
    statusValue: 3,
    emoji: "⚠️",
    badgeColor: "bg-rose-500",
    headerBorder: "border-rose-500/30 text-rose-700 dark:text-rose-300",
    dropZoneHighlight:
      "border-rose-500 bg-rose-50/90 dark:bg-rose-950/70 ring-2 ring-rose-500/50",
  },
];

const priorityConfig: Record<
  number,
  { label: string; badge: string; dot: string }
> = {
  0: {
    label: "Rendah",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  1: {
    label: "Sedang",
    badge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  2: {
    label: "Tinggi",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  3: {
    label: "Kritis",
    badge:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
};

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

function formatElapsedTimer(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? `${h.toString().padStart(2, "0")}:` : ""}${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function KanbanPage() {
  const queryClient = useQueryClient();

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [scope, setScope] = useState<"mine" | "all">("all");
  const [selectedMobileColumn, setSelectedMobileColumn] =
    useState<"Todo" | "InProgress" | "Done" | "Overdue">("InProgress");

  // Active Month Filter State ("hanya menampilkan pada bulan yang aktif saja")
  const [activeMonth, setActiveMonth] = useState<number>(() => new Date().getMonth() + 1); // 1-12
  const [activeYear, setActiveYear] = useState<number>(() => new Date().getFullYear());

  // Done Column Scope: "month" (default: Bulan Aktif), "range" (Rentang Waktu kustom), "all" (Semua Waktu)
  const [doneFilterMode, setDoneFilterMode] = useState<"month" | "range" | "all">("month");
  const [doneStartDate, setDoneStartDate] = useState<string>("");
  const [doneEndDate, setDoneEndDate] = useState<string>("");

  const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const isCurrentMonth =
    activeMonth === new Date().getMonth() + 1 &&
    activeYear === new Date().getFullYear();

  const goToPrevMonth = () => {
    if (activeMonth === 1) {
      setActiveMonth(12);
      setActiveYear((y) => y - 1);
    } else {
      setActiveMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (activeMonth === 12) {
      setActiveMonth(1);
      setActiveYear((y) => y + 1);
    } else {
      setActiveMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setActiveMonth(now.getMonth() + 1);
    setActiveYear(now.getFullYear());
  };

  // Dialog States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState(0);
  const [quickViewTask, setQuickViewTask] = useState<any | null>(null);

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [activeDropColId, setActiveDropColId] = useState<string | null>(null);

  // Live Timer Ticker
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState<
    Record<number, number>
  >({});

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
    userProfile?.roles?.includes("SuperAdmin") ||
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

  // 3. Query Active Timers for live badge on cards
  const { data: activeTimers = [] } = useQuery<ActiveTimer[]>({
    queryKey: ["activeTimers"],
    queryFn: async () => {
      const res = await apiClient.get("/timesheets/active-timers");
      return res.data.data || [];
    },
    refetchInterval: 5000,
  });

  // Second-by-second ticker for live running timers
  useEffect(() => {
    if (!activeTimers.length) {
      setLiveElapsedSeconds({});
      return;
    }

    const updateTimes = () => {
      const map: Record<number, number> = {};
      const now = Date.now();
      activeTimers.forEach((t) => {
        const startMs = new Date(t.startTime).getTime();
        map[t.taskId] = Math.max(0, Math.floor((now - startMs) / 1000));
      });
      setLiveElapsedSeconds(map);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, [activeTimers]);

  // 4. Query Kanban Tasks with filters (active tasks Todo & InProgress always show; Done respects mode)
  const kanbanQueryKey = [
    "kanbanTasks",
    search,
    selectedProjectId,
    selectedPriority,
    scope,
    doneFilterMode,
    activeMonth,
    activeYear,
    doneStartDate,
    doneEndDate,
  ];

  const {
    data: kanbanData = { Todo: [], InProgress: [], Done: [], Overdue: [] },
    isLoading,
  } = useQuery<any>({
    queryKey: kanbanQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedProjectId !== "all")
        params.append("projectId", selectedProjectId);
      if (selectedPriority !== "all")
        params.append("priority", selectedPriority);
      if (scope) params.append("filter", scope);

      if (doneFilterMode === "month") {
        params.append("month", activeMonth.toString());
        params.append("year", activeYear.toString());
      } else if (doneFilterMode === "range") {
        if (doneStartDate) {
          const startIso = new Date(doneStartDate + "T00:00:00").toISOString();
          params.append("doneStartDate", startIso);
        }
        if (doneEndDate) {
          const endIso = new Date(doneEndDate + "T23:59:59.999").toISOString();
          params.append("doneEndDate", endIso);
        }
      } else if (doneFilterMode === "all") {
        params.append("month", "0");
      }

      const res = await apiClient.get(`/tasks/kanban?${params.toString()}`);
      return res.data.data;
    },
  });

  // Status Patch Mutation with Optimistic Updates
  const patchStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: number;
      status: number;
    }) => {
      const res = await apiClient.patch(`/tasks/${taskId}/status`, { status });
      return res.data;
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["kanbanTasks"] });
      const previousData = queryClient.getQueryData<any>(kanbanQueryKey);

      if (previousData) {
        const nextData = {
          Todo: [...(previousData.Todo || [])],
          InProgress: [...(previousData.InProgress || [])],
          Done: [...(previousData.Done || [])],
          Overdue: [...(previousData.Overdue || [])],
        };

        let targetTask: any = null;
        for (const colKey of [
          "Todo",
          "InProgress",
          "Done",
          "Overdue",
        ] as const) {
          const idx = nextData[colKey].findIndex((t: any) => t.id === taskId);
          if (idx !== -1) {
            targetTask = {
              ...nextData[colKey][idx],
              status,
              progress: status === 2 ? 100 : nextData[colKey][idx].progress,
            };
            nextData[colKey].splice(idx, 1);
            break;
          }
        }

        if (targetTask) {
          const colName =
            status === 0
              ? "Todo"
              : status === 1
                ? "InProgress"
                : status === 2
                  ? "Done"
                  : "Overdue";
          nextData[colName].unshift(targetTask);
          queryClient.setQueryData(kanbanQueryKey, nextData);
        }
      }

      return { previousData };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(kanbanQueryKey, context.previousData);
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

  // Start Live Timer Mutation
  const startTimerMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiClient.post("/timesheets/start", { taskId });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Live timer tugas dimulai!");
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memulai timer"),
  });

  // Stop Live Timer Mutation
  const stopTimerMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiClient.post(`/timesheets/${sessionId}/stop`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Timer dihentikan! Durasi tercatat: ${data.durationHours || 0} jam.`,
      );
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghentikan timer"),
  });

  // Drag Handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    taskId: number,
  ) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropColId(null);
  };

  const handleDragOverColumn = (
    e: React.DragEvent<HTMLDivElement>,
    colId: string,
  ) => {
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

  const handleDropColumn = (
    e: React.DragEvent<HTMLDivElement>,
    col: KanbanColumn,
  ) => {
    e.preventDefault();
    setActiveDropColId(null);
    setDraggedTaskId(null);

    const taskIdStr = e.dataTransfer.getData("text/plain");
    const taskId = Number(taskIdStr);
    if (!taskId || isNaN(taskId)) return;

    patchStatusMutation.mutate({ taskId, status: col.statusValue });
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedProjectId !== "all" ||
    selectedPriority !== "all" ||
    doneFilterMode !== "month" ||
    !isCurrentMonth ||
    doneStartDate !== "" ||
    doneEndDate !== "";

  const resetFilters = () => {
    setSearch("");
    setSelectedProjectId("all");
    setSelectedPriority("all");
    setDoneFilterMode("month");
    setDoneStartDate("");
    setDoneEndDate("");
    goToCurrentMonth();
  };

  const openCreateDialogForStatus = (statusVal: number) => {
    setCreateModalDefaultStatus(statusVal);
    setCreateModalOpen(true);
  };

  // Mobile Navigation Index
  const currentMobileIndex = columns.findIndex(
    (c) => c.id === selectedMobileColumn,
  );
  const handlePrevMobileColumn = () => {
    const prevIdx =
      (currentMobileIndex - 1 + columns.length) % columns.length;
    setSelectedMobileColumn(columns[prevIdx].id);
  };
  const handleNextMobileColumn = () => {
    const nextIdx = (currentMobileIndex + 1) % columns.length;
    setSelectedMobileColumn(columns[nextIdx].id);
  };

  const totalTasksCount =
    (kanbanData.Todo?.length || 0) +
    (kanbanData.InProgress?.length || 0) +
    (kanbanData.Done?.length || 0) +
    (kanbanData.Overdue?.length || 0);

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs dark:bg-indigo-950/80 dark:text-indigo-400">
              <KanbanIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  Papan Kanban Interaktif
                </h1>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  {totalTasksCount} Tugas
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Calendar className="h-3 w-3 text-indigo-500" />
                  {doneFilterMode === "month"
                    ? `Done: ${MONTH_NAMES[activeMonth - 1]} ${activeYear}`
                    : doneFilterMode === "range"
                      ? `Done: ${doneStartDate || "Awal"} s/d ${doneEndDate || "Akhir"}`
                      : "Done: Semua Waktu"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data Todo &amp; InProgress ditampilkan lengkap sesuai data grid. Tugas Done difilter berdasarkan bulan aktif atau rentang waktu yang dipilih.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs h-9"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Impor Excel
          </Button>

          <Link href="/tasks">
            <Button variant="outline" className="gap-2 text-xs h-9">
              <List className="h-4 w-4" />
              Tampilan Tabel
            </Button>
          </Link>

          <Button
            onClick={() => openCreateDialogForStatus(0)}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs h-9"
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
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Selesai (Done) Scope: Bulan Aktif / Rentang Waktu / Semua */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50/80 p-1 dark:border-gray-800 dark:bg-gray-800/80">
              <span className="px-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                Filter Done:
              </span>
              <div className="flex items-center rounded-lg bg-gray-200/70 p-0.5 dark:bg-gray-700/70">
                <button
                  type="button"
                  onClick={() => setDoneFilterMode("month")}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                    doneFilterMode === "month"
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Bulan Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setDoneFilterMode("range")}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                    doneFilterMode === "range"
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Rentang Waktu
                </button>
                <button
                  type="button"
                  onClick={() => setDoneFilterMode("all")}
                  className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                    doneFilterMode === "all"
                      ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Semua
                </button>
              </div>

              {/* Month Selector for month mode */}
              {doneFilterMode === "month" && (
                <div className="flex items-center gap-0.5 pl-1">
                  <button
                    type="button"
                    onClick={goToPrevMonth}
                    title="Bulan Sebelumnya"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-900 shadow-2xs transition-all dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>

                  <div className="flex items-center gap-1 px-1.5 text-xs font-bold text-gray-800 dark:text-gray-100 min-w-[110px] justify-center select-none">
                    <Calendar className="h-3 w-3 text-indigo-500" />
                    <span>
                      {MONTH_NAMES[activeMonth - 1]} {activeYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={goToNextMonth}
                    title="Bulan Berikutnya"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-900 shadow-2xs transition-all dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>

                  {!isCurrentMonth && (
                    <button
                      type="button"
                      onClick={goToCurrentMonth}
                      className="ml-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900"
                    >
                      Bulan Ini
                    </button>
                  )}
                </div>
              )}

              {/* Date Range Pickers for range mode */}
              {doneFilterMode === "range" && (
                <div className="flex items-center gap-1 pl-1">
                  <input
                    type="date"
                    value={doneStartDate}
                    onChange={(e) => setDoneStartDate(e.target.value)}
                    title="Tanggal Mulai Selesai"
                    className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                  <span className="text-[11px] text-gray-400">s/d</span>
                  <input
                    type="date"
                    value={doneEndDate}
                    onChange={(e) => setDoneEndDate(e.target.value)}
                    title="Tanggal Akhir Selesai"
                    className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              )}
            </div>

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
                <option value="0">Rendah (Low)</option>
                <option value="1">Sedang (Medium)</option>
                <option value="2">Tinggi (High)</option>
                <option value="3">Kritis (Critical)</option>
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

      {/* 3. Mobile Column Segmented Switcher (< md) per FSD 5.6 */}
      <div className="space-y-2 md:hidden">
        <div className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={handlePrevMobileColumn}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs active:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            aria-label="Kolom Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="grid flex-1 grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800/90 shadow-inner">
            {columns.map((col) => {
              const count = (kanbanData[col.id] || []).length;
              const isActive = selectedMobileColumn === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedMobileColumn(col.id)}
                  className={`relative flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-extrabold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-gray-900 shadow-xs ring-1 ring-black/5 dark:bg-gray-900 dark:text-white dark:ring-white/10"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <span className="text-sm">{col.emoji}</span>
                  <span className="hidden sm:inline text-[11px] truncate">
                    {col.shortTitle}
                  </span>
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNextMobileColumn}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs active:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            aria-label="Kolom Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile active column context indicator */}
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Menampilkan kolom:{" "}
            <strong className="text-gray-900 dark:text-white">
              {
                columns.find((c) => c.id === selectedMobileColumn)?.title
              }
            </strong>
          </span>
          <span>
            {(kanbanData[selectedMobileColumn] || []).length} tugas
          </span>
        </div>
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
              className={`flex flex-col rounded-2xl border transition-all duration-200 p-4 shadow-xs min-h-[540px] ${
                isDropActive
                  ? `${col.dropZoneHighlight} scale-[1.01]`
                  : "border-gray-200/80 bg-gray-50/70 dark:border-gray-800 dark:bg-gray-900/60"
              } ${!isMobileVisible ? "hidden md:flex" : "flex"}`}
            >
              {/* Column Header */}
              <div className="mb-3.5 flex items-center justify-between border-b border-gray-200/70 pb-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${col.badgeColor}`}
                  />
                  <h3 className="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-wider">
                    {col.shortTitle}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-gray-600 shadow-xs dark:bg-gray-800 dark:text-gray-300">
                    {tasksInCol.length}
                  </span>
                  {col.id === "Done" && (
                    <span
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300 truncate max-w-[140px]"
                      title={
                        doneFilterMode === "month"
                          ? `${MONTH_NAMES[activeMonth - 1]} ${activeYear}`
                          : doneFilterMode === "range"
                            ? `${doneStartDate || "Awal"} ~ ${doneEndDate || "Akhir"}`
                            : "Semua Waktu"
                      }
                    >
                      {doneFilterMode === "month"
                        ? `${MONTH_NAMES[activeMonth - 1]} ${activeYear}`
                        : doneFilterMode === "range"
                          ? `${doneStartDate || "Awal"} ~ ${doneEndDate || "Akhir"}`
                          : "Semua"}
                    </span>
                  )}
                </div>

                {/* Quick Add Button to this Column */}
                <button
                  type="button"
                  onClick={() => openCreateDialogForStatus(col.statusValue)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition"
                  title={`Tambah tugas baru ke ${col.title}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Drop Target Hint Banner (Visible when dragging over) */}
              {isDropActive && (
                <div className="mb-3 rounded-xl border border-dashed border-indigo-400 bg-indigo-50/90 py-3 text-center text-xs font-bold text-indigo-700 animate-pulse dark:border-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300">
                  Lepaskan kartu di sini untuk memindahkan ke {col.shortTitle}
                </div>
              )}

              {/* Task Cards Container */}
              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                {tasksInCol.map((task: any) => {
                  const isBeingDragged = draggedTaskId === task.id;
                  const prio =
                    priorityConfig[task.priority] || priorityConfig[1];
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== 2;

                  // Active timer check
                  const activeSession = activeTimers.find(
                    (t) => t.taskId === task.id,
                  );
                  const isTimerRunning = Boolean(activeSession);
                  const elapsedSec =
                    liveElapsedSeconds[task.id] ||
                    activeSession?.currentElapsedSeconds ||
                    0;

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                        isBeingDragged
                          ? "opacity-35 scale-[0.98] border-dashed border-indigo-500 bg-indigo-50/50"
                          : isTimerRunning
                            ? "border-emerald-400 bg-white shadow-emerald-500/10 ring-2 ring-emerald-500/30 dark:border-emerald-600 dark:bg-gray-850"
                            : "border-gray-200/80 bg-white hover:border-indigo-400 hover:shadow-md dark:border-gray-800 dark:bg-gray-850 dark:hover:border-indigo-600"
                      }`}
                    >
                      {/* Top Bar: Drag Handle, Project & Priority Badges */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-500 transition dark:text-gray-600 dark:group-hover:text-gray-400" />
                          {task.projectName ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white truncate max-w-[120px]"
                              style={{
                                backgroundColor: task.projectColor || "#4F46E5",
                              }}
                            >
                              {task.projectName}
                            </span>
                          ) : (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              Umum
                            </span>
                          )}
                        </div>

                        {/* Priority Badge */}
                        <span
                          className={`shrink-0 rounded border px-1.5 py-0.2 text-[9px] font-bold ${prio.badge}`}
                        >
                          {prio.label}
                        </span>
                      </div>

                      {/* Title & Quick Preview Trigger */}
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h4 className="text-sm font-bold text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 leading-snug transition-colors">
                            {task.title}
                          </h4>
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickViewTask(task);
                          }}
                          className="shrink-0 p-1 text-gray-300 hover:text-indigo-600 dark:text-gray-600 dark:hover:text-indigo-400 transition"
                          title="Lihat Pratinjau Cepat"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Milestone Tag */}
                      {task.milestone && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                          <MilestoneIcon className="h-3 w-3 text-indigo-400" />
                          <span>{task.milestone}</span>
                        </div>
                      )}

                      {/* Live Timer Running Indicator Banner */}
                      {isTimerRunning && (
                        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span>Timer: {formatElapsedTimer(elapsedSec)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeSession) {
                                stopTimerMutation.mutate(
                                  activeSession.sessionId,
                                );
                              }
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] font-extrabold bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition"
                            title="Hentikan Timer"
                          >
                            Stop
                          </button>
                        </div>
                      )}

                      {/* Obstacle Alert */}
                      {task.obstacle && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                          <span className="line-clamp-2 leading-tight">
                            <strong>Kendala:</strong> {task.obstacle}
                          </span>
                        </div>
                      )}

                      {/* Solution Highlight */}
                      {task.solution && (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-emerald-50 p-2 text-[11px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="line-clamp-2 leading-tight">
                            <strong>Solusi:</strong> {task.solution}
                          </span>
                        </div>
                      )}

                      {/* Subtasks Count & Due Date Badges */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        {/* Subtasks Counter */}
                        {task.subtasksCount > 0 ? (
                          <div className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>
                              {task.completedSubtasksCount || 0}/
                              {task.subtasksCount} Subtugas
                            </span>
                          </div>
                        ) : (
                          <span />
                        )}

                        {/* Due Date Indicator */}
                        {task.dueDate && (
                          <div
                            className={`flex items-center gap-1 font-medium text-[10px] ${
                              isOverdue
                                ? "text-rose-600 font-bold dark:text-rose-400"
                                : "text-gray-400"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short" },
                              )}
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
                            className={`h-full transition-all duration-300 ${
                              task.progress === 100
                                ? "bg-emerald-500"
                                : "bg-indigo-600"
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Card Footer: Assignee PIC (Prominent) + Quick Action Buttons */}
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 dark:border-gray-800">
                        {/* Assignee Avatar & Name */}
                        <div
                          className="flex items-center gap-1.5 min-w-0 pr-2"
                          title={`Ditugaskan kepada: ${task.assignedToUserName || "Belum ada PIC"}`}
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800">
                            {(task.assignedToUserName || "U")[0].toUpperCase()}
                          </div>
                          <span className="truncate text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                            {task.assignedToUserName || (
                              <span className="text-gray-400 italic">
                                Belum ada PIC
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Timer Button & Quick Column Transitions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isTimerRunning && (
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
                          )}

                          {/* Quick Status Select */}
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
                            className="rounded-lg border border-gray-200 bg-transparent px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                            title="Pindah Status Tugas"
                          >
                            <option value={0}>📋 Todo</option>
                            <option value={1}>🔄 InProgress</option>
                            <option value={2}>✅ Done</option>
                            <option value={3}>⚠️ Overdue</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {tasksInCol.length === 0 && !isDropActive && (
                  <div className="py-14 text-center text-xs text-gray-400 border border-dashed border-gray-200/90 rounded-2xl dark:border-gray-800 p-4">
                    <p>Tidak ada tugas di kolom {col.shortTitle}.</p>
                    <button
                      type="button"
                      onClick={() => openCreateDialogForStatus(col.statusValue)}
                      className="mt-2.5 inline-flex items-center gap-1 text-indigo-600 hover:underline font-bold dark:text-indigo-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Tugas
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Quick View Task Modal */}
      {quickViewTask && (
        <Dialog
          open={Boolean(quickViewTask)}
          onOpenChange={(open) => !open && setQuickViewTask(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 pr-6">
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  Tugas #{quickViewTask.id}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    priorityConfig[quickViewTask.priority]?.badge
                  }`}
                >
                  Prioritas: {priorityConfig[quickViewTask.priority]?.label}
                </span>
              </div>
              <DialogTitle className="mt-2 text-base font-extrabold text-gray-900 dark:text-white leading-snug">
                {quickViewTask.title}
              </DialogTitle>
            </DialogHeader>

            <DialogBody className="space-y-4 py-2">
              {/* Project & Category info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-800/60">
                  <span className="text-[10px] text-gray-400 block mb-0.5">
                    Proyek
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">
                    {quickViewTask.projectName || "Umum"}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-800/60">
                  <span className="text-[10px] text-gray-400 block mb-0.5">
                    PIC Ditugaskan
                  </span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 truncate block">
                    {quickViewTask.assignedToUserName || "Belum ada PIC"}
                  </span>
                </div>
              </div>

              {/* Description */}
              {quickViewTask.description && (
                <div>
                  <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Deskripsi
                  </h5>
                  <p className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-700 dark:bg-gray-800/70 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {quickViewTask.description}
                  </p>
                </div>
              )}

              {/* Obstacle & Solution */}
              {quickViewTask.obstacle && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                  <strong className="block mb-0.5 text-rose-800 dark:text-rose-200">
                    Kendala / Obstacle:
                  </strong>
                  {quickViewTask.obstacle}
                </div>
              )}

              {quickViewTask.solution && (
                <div className="rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                  <strong className="block mb-0.5 text-emerald-800 dark:text-emerald-200">
                    Solusi / Tindak Lanjut:
                  </strong>
                  {quickViewTask.solution}
                </div>
              )}

              {/* Progress & Milestone */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Progres Penyelesaian</span>
                  <span>{quickViewTask.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${quickViewTask.progress}%` }}
                  />
                </div>
              </div>

              {/* Quick Actions in Modal */}
              <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <Link
                  href={`/tasks/${quickViewTask.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buka Halaman Detail Penuh
                </Link>

                <Button
                  size="sm"
                  onClick={() => {
                    startTimerMutation.mutate(quickViewTask.id);
                    setQuickViewTask(null);
                  }}
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-8"
                >
                  <Play className="h-3 w-3 fill-current" />
                  Mulai Timer
                </Button>
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Impor Excel */}
      <ImportExcelDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
          queryClient.invalidateQueries({ queryKey: ["tasksList"] });
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        }}
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

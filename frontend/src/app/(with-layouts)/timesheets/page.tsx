"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Clock,
  Download,
  Plus,
  Play,
  Calendar,
  Layers,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  AlertTriangle,
  CheckCircle2,
  Check,
  Flame,
  Lock,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Kanban,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { SearchableTaskPicker } from "@/components/common/searchable-task-picker";
import { CompanyTimesheetExportModal } from "@/components/timesheets/company-timesheet-export-modal";
import { AutomatedTimesheetGeneratorModal } from "@/components/timesheets/automated-timesheet-generator-modal";
import { toast } from "sonner";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  parseTaskStatus,
  parseTaskPriority,
} from "@/utils/task-status";

const priorityLabels = TASK_PRIORITY_LABELS;
const statusLabels = TASK_STATUS_LABELS;

type SortField = "title" | "project" | "priority" | "status" | "progress" | "dueDate" | "createdAt" | "today";

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser, isAdmin, userId: currentUserId } = useCurrentUser();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Chart state (Tampilan grafik terbagi berdasarkan nama proyek)
  const [chartView, setChartView] = useState<"bar" | "pie">("bar");
  const [isChartCollapsed, setIsChartCollapsed] = useState(false);

  // Paging state: 20, 50, 100, 200
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Sorting state: Default ke "today" agar tugas hari ini / sekarang langsung berada di atas
  const [sortBy, setSortBy] = useState<SortField>("today");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Selection state (Checklist multiple)
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Modal dialog states
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [startTimerModalOpen, setStartTimerModalOpen] = useState(false);
  const [companyExportModalOpen, setCompanyExportModalOpen] = useState(false);
  const [autoGenModalOpen, setAutoGenModalOpen] = useState(false);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkPriorityModalOpen, setBulkPriorityModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // Start Timer state
  const [timerTaskId, setTimerTaskId] = useState<number | undefined>(undefined);
  const [timerNotes, setTimerNotes] = useState("");

  // Manual Session Form state
  const [taskId, setTaskId] = useState<number | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  // 1a. Overall Timesheet Metric Summary Query
  const { data: timesheetSummaryData } = useQuery<any>({
    queryKey: ["timesheetSummary"],
    queryFn: async () => {
      const res = await apiClient.get("/timesheets/sessions?page=1&pageSize=1");
      return res.data;
    },
  });
  const summary = timesheetSummaryData?.summary;

  // 1b. Project Chart Query (Distribusi Tugas per Nama Proyek)
  const { data: projectChartRaw, isLoading: loadingProjectChart } = useQuery<{
    data: any[];
    totalProjects: number;
    totalTasks: number;
  }>({
    queryKey: ["tasksProjectChartTimesheet"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks/project-chart");
      return res.data;
    },
  });
  const projectChartData = projectChartRaw?.data || [];

  // 1c. All Tasks Query with Timesheet data, Paging, Sorting, and Filters
  const { data: tasksResponse, isLoading, isPlaceholderData } = useQuery<{
    data: any[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: [
      "timesheetTasksList",
      search,
      priorityFilter,
      statusFilter,
      projectFilter,
      dateFilter,
      page,
      pageSize,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (projectFilter !== "all") params.append("projectId", projectFilter);
      if (dateFilter !== "all") params.append("dateFilter", dateFilter);
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      const res = await apiClient.get(`/tasks?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const tasks = tasksResponse?.data || [];
  const totalCount = tasksResponse?.totalCount ?? 0;
  const totalPages = Math.max(1, tasksResponse?.totalPages ?? Math.ceil(totalCount / pageSize));

  // RBAC & Past-Month Done protection
  const isPastMonthDone = (t: any) => {
    if (parseTaskStatus(t.status) !== 2) return false;
    const dateStr = t.dueDate || t.createdAt;
    if (!dateStr) return false;
    const taskDate = new Date(dateStr);
    const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return taskDate < startOfCurrentMonth;
  };

  const canUserModifyTask = (t: any) => {
    if (isAdmin) return true;
    if (t.createdByUserId) {
      return t.createdByUserId === currentUserId;
    }
    return t.assignedToUserId === currentUserId;
  };

  const selectedTasks = useMemo(() => {
    return tasks.filter((t: any) => selectedTaskIds.includes(t.id));
  }, [tasks, selectedTaskIds]);

  const protectedDeleteCount = useMemo(() => {
    return selectedTasks.filter((t: any) => isPastMonthDone(t)).length;
  }, [selectedTasks]);

  const nonModifiableCount = useMemo(() => {
    if (isAdmin) return 0;
    return selectedTasks.filter((t: any) => !canUserModifyTask(t)).length;
  }, [selectedTasks, isAdmin, currentUserId]);

  // Projects Query for filter & select
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsSelectTimesheet"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // Master Data Queries (Priorities & Statuses)
  const { data: masterPriorities = [] } = useQuery<any[]>({
    queryKey: ["masterPrioritiesTimesheet"],
    queryFn: async () => {
      const res = await apiClient.get("/master/priorities");
      return res.data.data || [];
    },
  });

  const { data: masterStatuses = [] } = useQuery<any[]>({
    queryKey: ["masterStatusesTimesheet"],
    queryFn: async () => {
      const res = await apiClient.get("/master/statuses");
      return res.data.data || [];
    },
  });

  const resolvePriorityValue = (p: any, idx: number) => {
    const n = (p.name || "").toLowerCase();
    if (n.includes("rendah") || n.includes("low")) return 0;
    if (n.includes("sedang") || n.includes("med")) return 1;
    if (n.includes("tinggi") || n.includes("high")) return 2;
    if (n.includes("kritis") || n.includes("crit") || n.includes("urgent")) return 3;
    return (p.orderIndex ?? (idx + 1)) - 1;
  };

  const resolveStatusValue = (s: any, idx: number) => {
    const n = (s.name || "").toLowerCase();
    if (n.includes("to do") || n.includes("todo") || n.includes("siap")) return 0;
    if (n.includes("progress") || n.includes("kerja") || n.includes("jalan")) return 1;
    if (s.isDoneState || n.includes("done") || n.includes("selesai")) return 2;
    if (n.includes("overdue") || n.includes("lewat") || n.includes("terlambat")) return 3;
    return (s.orderIndex ?? (idx + 1)) - 1;
  };

  const PROJECT_PIE_COLORS = [
    "#3B82F6", "#10B981", "#6366F1", "#F59E0B", "#EC4899",
    "#8B5CF6", "#06B6D4", "#F43F5E", "#14B8A6", "#84CC16"
  ];

  const isTodayTask = (t: any) => {
    if (!t) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dueStr = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "";
    const startStr = t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : "";
    const createdStr = t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "";
    return dueStr === todayStr || startStr === todayStr || createdStr === todayStr;
  };

  // Header Master Checkbox indeterminate state
  useEffect(() => {
    if (!masterCheckboxRef.current) return;
    const pageTaskIds = tasks.map((t) => t.id);
    const selectedOnPage = pageTaskIds.filter((id) => selectedTaskIds.includes(id));
    const allSelectedOnPage = pageTaskIds.length > 0 && selectedOnPage.length === pageTaskIds.length;
    const someSelectedOnPage = selectedOnPage.length > 0 && !allSelectedOnPage;

    masterCheckboxRef.current.checked = allSelectedOnPage;
    masterCheckboxRef.current.indeterminate = someSelectedOnPage;
  }, [selectedTaskIds, tasks]);

  // Master Checkbox Toggle (current page)
  const handleToggleSelectAllPage = () => {
    const pageTaskIds = tasks.map((t) => t.id);
    const selectedOnPage = pageTaskIds.filter((id) => selectedTaskIds.includes(id));
    const allSelectedOnPage = pageTaskIds.length > 0 && selectedOnPage.length === pageTaskIds.length;

    if (allSelectedOnPage) {
      setSelectedTaskIds((prev) => prev.filter((id) => !pageTaskIds.includes(id)));
    } else {
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...pageTaskIds])));
    }
  };

  // Row Checkbox Toggle
  const handleToggleSelectRow = (targetTaskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(targetTaskId) ? prev.filter((id) => id !== targetTaskId) : [...prev, targetTaskId]
    );
  };

  // Column Sort Handler
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
    );
  };

  // Live Timer Mutation (from row or modal)
  const startTimerMutation = useMutation({
    mutationFn: async (targetTaskId?: number) => {
      const idToStart = targetTaskId || timerTaskId;
      if (!idToStart) throw new Error("Silakan cari dan pilih tugas terlebih dahulu.");
      const res = await apiClient.post("/timesheets/start", {
        taskId: idToStart,
        notes: timerNotes?.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Live timer berhasil dimulai!");
      setStartTimerModalOpen(false);
      setTimerTaskId(undefined);
      setTimerNotes("");
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetTasksList"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSummary"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memulai timer"),
  });

  // Manual Session Mutation
  const createManualMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("Silakan pilih tugas terlebih dahulu.");
      if (!startTime || !endTime) throw new Error("Waktu mulai dan selesai wajib diisi.");
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Format tanggal waktu mulai atau selesai tidak valid.");
      }
      if (end <= start) {
        throw new Error("Waktu selesai harus lebih besar dari waktu mulai.");
      }
      const res = await apiClient.post("/timesheets/manual", {
        taskId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: notes?.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Sesi jam kerja manual berhasil disimpan!");
      setManualModalOpen(false);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["timesheetTasksList"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSummary"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mencatat jam kerja"),
  });

  // Bulk Status Mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async (targetStatus: number) => {
      const res = await apiClient.post("/tasks/bulk-status", {
        taskIds: selectedTaskIds,
        status: targetStatus,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Status tugas terpilih berhasil diperbarui!");
      setBulkStatusModalOpen(false);
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["timesheetTasksList"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui status"),
  });

  // Bulk Priority Mutation
  const bulkPriorityMutation = useMutation({
    mutationFn: async (targetPriority: number) => {
      const res = await apiClient.post("/tasks/bulk-priority", {
        taskIds: selectedTaskIds,
        priority: targetPriority,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Prioritas tugas terpilih berhasil diperbarui!");
      setBulkPriorityModalOpen(false);
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["timesheetTasksList"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui prioritas"),
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (targetIds?: number[]) => {
      const ids = targetIds && targetIds.length > 0 ? targetIds : selectedTaskIds;
      const res = await apiClient.post("/tasks/bulk-delete", {
        taskIds: ids,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas terpilih berhasil dihapus!");
      setBulkDeleteModalOpen(false);
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["timesheetTasksList"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSummary"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus tugas"),
  });

  // Excel Export Handler (Official ClosedXML)
  const handleExportExcel = async () => {
    try {
      toast.loading("Menyiapkan file spreadsheet laporan resmi...", { id: "exportExcel" });
      const response = await apiClient.get("/timesheets/export/excel", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Timesheet_TrackerKerja_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("File Excel berhasil diunduh!", { id: "exportExcel" });
    } catch {
      toast.error("Gagal mengunduh laporan excel", { id: "exportExcel" });
    }
  };

  const isFilterActive =
    search.trim() !== "" ||
    priorityFilter !== "all" ||
    statusFilter !== "all" ||
    projectFilter !== "all" ||
    dateFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setStatusFilter("all");
    setProjectFilter("all");
    setDateFilter("all");
    setPage(1);
  };

  const pageRangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageRangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Log Timesheet & Rekap Jam Kerja
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {totalCount} Total Tugas
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pusat manajemen waktu pengerjaan tugas, target harian 8 jam, estimasi Man-Days (MD), dan ekspor spreadsheet standar perusahaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setCompanyExportModalOpen(true)}
            variant="outline"
            className="gap-2 border-indigo-600/30 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-950/40 text-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Ekspor Standar Perusahaan (ELISTEC)
          </Button>

          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Ekspor Excel Resmi (.xlsx)
          </Button>

          <Button
            onClick={() => setAutoGenModalOpen(true)}
            variant="outline"
            className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40 font-semibold text-xs"
          >
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Generate Otomatis 8 Jam
          </Button>

          <Button
            onClick={() => {
              setTimerTaskId(undefined);
              setTimerNotes("");
              setStartTimerModalOpen(true);
            }}
            className="gap-2 bg-emerald-600 font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 text-xs"
          >
            <Play className="h-4 w-4 fill-current" />
            Mulai Timer
          </Button>

          <Button
            onClick={() => {
              setTaskId(undefined);
              setStartTime("");
              setEndTime("");
              setNotes("");
              setManualModalOpen(true);
            }}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs"
          >
            <Plus className="h-4 w-4" />
            Catat Jam Manual
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Hari Ini</span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {summary ? Math.round((summary.todaySeconds / 3600) * 10) / 10 : 0}{" "}
            <span className="text-sm font-medium text-gray-400">Jam</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Target standar: 8.0 jam / hari kerja
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Minggu Ini</span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Calendar className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summary ? Math.round((summary.thisWeekSeconds / 3600) * 10) / 10 : 0}{" "}
            <span className="text-sm font-medium text-gray-400">Jam</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Akumulasi 5 hari kerja (Senin - Jumat)
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Bulan Ini</span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Layers className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {summary ? Math.round((summary.thisMonthSeconds / 3600) * 10) / 10 : 0}{" "}
            <span className="text-sm font-medium text-gray-400">Jam</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Total waktu kerja bulan berjalan
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Konversi Man-Days</span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary ? summary.totalManDays : 0}{" "}
            <span className="text-sm font-medium text-gray-400">MD</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Dihitung dari rasio total jam / 8 jam
          </div>
        </div>
      </div>

      {/* Project Distribution Chart (Distribusi Tugas per Nama Proyek) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <BarChart3 className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Distribusi & Beban Jam Kerja per Proyek
              </h2>
              <p className="text-[11px] text-gray-500">
                Visualisasi perbandingan jumlah tugas dan alokasi kerja tiap proyek
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 text-xs dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setChartView("bar")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  chartView === "bar"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300"
                }`}
              >
                <BarChart3 className="size-3.5" />
                Grafik Batang
              </button>
              <button
                type="button"
                onClick={() => setChartView("pie")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  chartView === "pie"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300"
                }`}
              >
                <PieChartIcon className="size-3.5" />
                Diagram Lingkaran
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChartCollapsed((prev) => !prev)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              title={isChartCollapsed ? "Tampilkan Grafik" : "Sembunyikan Grafik"}
            >
              {isChartCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
            </Button>
          </div>
        </div>

        {!isChartCollapsed && (
          <div className="p-4 sm:p-6">
            {loadingProjectChart ? (
              <div className="flex h-56 items-center justify-center text-xs text-gray-400">
                Memuat data grafik proyek...
              </div>
            ) : projectChartData.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-1 text-xs text-gray-400">
                <Layers className="size-6 text-gray-300 dark:text-gray-600" />
                <span>Belum ada data proyek atau tugas untuk ditampilkan.</span>
              </div>
            ) : chartView === "bar" ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={projectChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.6} />
                    <XAxis
                      dataKey="projectName"
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      interval={0}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip />
                    <Bar
                      dataKey="totalTasks"
                      name="Total Tugas"
                      radius={[6, 6, 0, 0]}
                      onClick={(data: any) => {
                        if (data && data.projectId) {
                          setProjectFilter(String(data.projectId));
                          setPage(1);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {projectChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.projectColor || PROJECT_PIE_COLORS[index % PROJECT_PIE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectChartData}
                        dataKey="totalTasks"
                        nameKey="projectName"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        paddingAngle={3}
                        label={({ name, percent }: any) =>
                          `${name.length > 12 ? name.substring(0, 10) + "..." : name} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {projectChartData.map((entry, index) => (
                          <Cell
                            key={`pie-cell-${index}`}
                            fill={entry.projectColor || PROJECT_PIE_COLORS[index % PROJECT_PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="max-h-60 space-y-2 overflow-y-auto pr-2">
                  {projectChartData.map((p, idx) => {
                    const color = p.projectColor || PROJECT_PIE_COLORS[idx % PROJECT_PIE_COLORS.length];
                    const isSelected = projectFilter === String(p.projectId);
                    return (
                      <div
                        key={p.projectId}
                        onClick={() => {
                          if (isSelected) {
                            setProjectFilter("all");
                          } else {
                            setProjectFilter(String(p.projectId));
                            setPage(1);
                          }
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                            : "border-gray-200/70 hover:border-indigo-300 bg-gray-50/50 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <span
                            className="size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <div className="truncate">
                            <span className="font-bold text-xs text-gray-900 dark:text-white truncate block">
                              {p.projectName}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {p.doneTasks} Selesai &bull; {p.inProgressTasks} Berjalan &bull; {p.todoTasks} To Do
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                            {p.totalTasks} Tugas
                          </span>
                          <span className="block text-[10px] font-semibold text-emerald-600">
                            {p.completionRate}% Selesai
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari tugas berdasarkan judul, deskripsi, atau nama proyek..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Prioritas Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Prioritas:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">Semua Prioritas</option>
                {masterPriorities.length > 0 ? (
                  masterPriorities.map((p: any, idx: number) => (
                    <option key={p.id} value={String(resolvePriorityValue(p, idx))}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="0">🟢 Rendah (Low)</option>
                    <option value="1">🔵 Sedang (Medium)</option>
                    <option value="2">🟡 Tinggi (High)</option>
                    <option value="3">🔴 Kritis (Critical)</option>
                  </>
                )}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">Semua Status</option>
                {masterStatuses.length > 0 ? (
                  masterStatuses.map((s: any, idx: number) => (
                    <option key={s.id} value={String(resolveStatusValue(s, idx))}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="0">To Do</option>
                    <option value="1">In Progress</option>
                    <option value="2">Done</option>
                    <option value="3">Overdue</option>
                  </>
                )}
              </select>
            </div>

            {/* Proyek Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Proyek:</span>
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 max-w-[150px] truncate"
              >
                <option value="all">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 gap-1 text-[11px] text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                <X className="h-3 w-3" />
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Chips: Tanggal & Prioritas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          {/* Tanggal Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mr-1 flex items-center gap-1">
              <CalendarDays className="size-3.5 text-indigo-500" />
              Filter Tanggal:
            </span>
            <button
              type="button"
              onClick={() => {
                setDateFilter("all");
                setPage(1);
              }}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                dateFilter === "all"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              Semua Tanggal
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("today");
                setSortBy("today");
                setSortOrder("asc");
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                dateFilter === "today"
                  ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
              }`}
            >
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilter("this-week");
                setPage(1);
              }}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                dateFilter === "this-week"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
              }`}
            >
              Minggu Ini
            </button>
          </div>

          {/* Quick Priority Filter Chips */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mr-1">
              Prioritas:
            </span>
            <button
              type="button"
              onClick={() => {
                setPriorityFilter("all");
                setPage(1);
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                priorityFilter === "all"
                  ? "bg-gray-800 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => {
                setPriorityFilter("0");
                setPage(1);
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                priorityFilter === "0"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
              }`}
            >
              Rendah
            </button>
            <button
              type="button"
              onClick={() => {
                setPriorityFilter("1");
                setPage(1);
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                priorityFilter === "1"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300"
              }`}
            >
              Sedang
            </button>
            <button
              type="button"
              onClick={() => {
                setPriorityFilter("2");
                setPage(1);
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                priorityFilter === "2"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              Tinggi
            </button>
            <button
              type="button"
              onClick={() => {
                setPriorityFilter("3");
                setPage(1);
              }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                priorityFilter === "3"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300"
              }`}
            >
              Kritis
            </button>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Toolbar */}
      {selectedTaskIds.length > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/95 p-3.5 shadow-lg backdrop-blur-md dark:border-indigo-900/60 dark:bg-indigo-950/90 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
              {selectedTaskIds.length} Tugas Dipilih
            </span>
            <span className="text-xs text-indigo-950 dark:text-indigo-200">
              Pilih tindakan massal untuk seluruh item yang ditandai:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (nonModifiableCount > 0) {
                  toast.error(`Terdapat ${nonModifiableCount} tugas yang dibuat oleh anggota lain. Anda hanya dapat mengubah status tugas yang Anda buat sendiri.`);
                  return;
                }
                setBulkStatusModalOpen(true);
              }}
              className="h-8 gap-1.5 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
              Ubah Status
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (nonModifiableCount > 0) {
                  toast.error(`Terdapat ${nonModifiableCount} tugas yang dibuat oleh anggota lain. Anda hanya dapat mengubah prioritas tugas yang Anda buat sendiri.`);
                  return;
                }
                setBulkPriorityModalOpen(true);
              }}
              className="h-8 gap-1.5 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
            >
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              Ubah Prioritas
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkDeleteModalOpen(true)}
              className="h-8 gap-1.5 border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              Hapus Terpilih
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedTaskIds([])}
              className="h-8 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-300"
            >
              Batal Pilihan
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid Table Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                {/* Select All Checkbox Column */}
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    ref={masterCheckboxRef}
                    type="checkbox"
                    onChange={handleToggleSelectAllPage}
                    className="size-4 cursor-pointer rounded border-gray-300 accent-indigo-600 focus:ring-indigo-500 dark:border-gray-700"
                    title="Pilih Semua di Halaman Ini"
                  />
                </th>

                {/* Tugas (Title) */}
                <th
                  onClick={() => handleSort("title")}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                >
                  <div className="inline-flex items-center">
                    Tugas
                    {renderSortIcon("title")}
                  </div>
                </th>

                {/* Proyek */}
                <th
                  onClick={() => handleSort("project")}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                >
                  <div className="inline-flex items-center">
                    Proyek
                    {renderSortIcon("project")}
                  </div>
                </th>

                {/* Prioritas */}
                <th
                  onClick={() => handleSort("priority")}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                >
                  <div className="inline-flex items-center">
                    Prioritas
                    {renderSortIcon("priority")}
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort("status")}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                >
                  <div className="inline-flex items-center">
                    Status
                    {renderSortIcon("status")}
                  </div>
                </th>

                {/* Progres */}
                <th
                  onClick={() => handleSort("progress")}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                >
                  <div className="inline-flex items-center">
                    Progres
                    {renderSortIcon("progress")}
                  </div>
                </th>

                {/* Ditugaskan Kepada (PIC) */}
                <th className="px-4 py-3.5 font-bold text-gray-700 dark:text-gray-300 select-none">
                  Ditugaskan Kepada
                </th>

                {/* Tenggat Waktu / Tanggal */}
                <th
                  onClick={() => {
                    if (sortBy === "today") {
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                    } else {
                      setSortBy("today");
                      setSortOrder("asc");
                    }
                    setPage(1);
                  }}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                  title="Klik untuk mengurutkan berdasarkan tanggal hari ini / sekarang"
                >
                  <div className="inline-flex items-center">
                    Tenggat / Tanggal
                    {sortBy === "today" ? (
                      <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 shadow-2xs">
                        <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                        Hari Ini {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    ) : sortBy === "dueDate" ? (
                      renderSortIcon("dueDate")
                    ) : (
                      <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                    )}
                  </div>
                </th>

                {/* Timesheet & Durasi Jam Kerja */}
                <th className="px-4 py-3.5 font-bold text-gray-700 dark:text-gray-300 select-none">
                  Timesheet & Durasi
                </th>

                {/* Aksi */}
                <th className="px-4 py-3.5 text-right font-bold text-gray-700 dark:text-gray-300">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((t) => {
                const totalSec = t.totalDurationSeconds || 0;
                const hours = Math.round((totalSec / 3600) * 10) / 10;
                const manDays = Math.round((totalSec / 28800) * 100) / 100;

                const isSelected = selectedTaskIds.includes(t.id);
                const statusNum = parseTaskStatus(t.status);
                const priorityNum = parseTaskPriority(t.priority);
                const priorityInfo = priorityLabels[priorityNum] || priorityLabels[1];
                const statusInfo = statusLabels[statusNum] || statusLabels[0];
                const isOverdue =
                  t.dueDate &&
                  new Date(t.dueDate).getTime() < Date.now() &&
                  statusNum !== 2;

                return (
                  <tr
                    key={t.id}
                    className={`transition ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/30"
                        : "hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(t.id)}
                        className="size-4 cursor-pointer rounded border-gray-300 accent-indigo-600 focus:ring-indigo-500 dark:border-gray-700"
                      />
                    </td>

                    {/* Tugas Title */}
                    <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/tasks/${t.id}`}
                            className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400 font-bold"
                          >
                            {t.title}
                          </Link>
                          {t.obstacle && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              <AlertTriangle className="size-2.5" />
                              Kendala
                            </span>
                          )}
                          {t.subtasksCount > 0 && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              {t.completedSubtasksCount}/{t.subtasksCount} Subtugas
                            </span>
                          )}
                          {isPastMonthDone(t) && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" title="Arsip Permanen (Selesai bulan lalu - Terkunci dari penghapusan)">
                              <Lock className="size-2.5 text-amber-600 dark:text-amber-400" />
                              Arsip
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          Dibuat oleh: <span className="font-semibold text-gray-700 dark:text-gray-300">{t.createdByUserName || "Sistem"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Proyek */}
                    <td className="px-4 py-3.5">
                      {t.projectName ? (
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                          style={{ backgroundColor: t.projectColor || "#4680FF" }}
                        >
                          {t.projectName}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Prioritas */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${priorityInfo.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${priorityInfo.dot}`} />
                        {priorityInfo.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusInfo.badge}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Progres */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              t.progress === 100 ? "bg-emerald-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-gray-500 font-medium text-[11px]">
                          {t.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Ditugaskan Kepada (PIC) */}
                    <td className="px-4 py-3.5">
                      {t.assignedToUserName ? (
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 font-bold text-xs text-white shadow-2xs">
                            {t.assignedToUserName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-gray-900 dark:text-white truncate max-w-[140px]">
                              {t.assignedToUserName}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              PIC
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Belum Ditugaskan
                        </span>
                      )}
                    </td>

                    {/* Tenggat / Tanggal */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        {isTodayTask(t) && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 shadow-2xs">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Hari Ini
                            </span>
                          </div>
                        )}
                        {t.dueDate ? (
                          <span
                            className={`font-mono text-[11px] ${
                              isOverdue
                                ? "font-bold text-rose-600 dark:text-rose-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {new Date(t.dueDate).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                            {isOverdue && (
                              <span className="ml-1 text-[9px] uppercase font-bold text-rose-500">
                                (Lewat)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            {t.startDate ? `Mulai: ${new Date(t.startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}` : "-"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Timesheet & Durasi Jam Kerja */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {hours} Jam
                          </span>
                          <span className="text-[10px] text-gray-400">
                            ({manDays} MD)
                          </span>
                        </div>

                        <div>
                          {hours >= 8 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800/60 shadow-2xs">
                              <Check className="size-2.5" />
                              Target 8h Tercapai
                            </span>
                          ) : hours > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-800/60 shadow-2xs">
                              <Clock className="size-2.5" />
                              Parsial ({hours} Jam)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                              Belum Ada Jam
                            </span>
                          )}
                        </div>

                        {/* Quick action buttons per row */}
                        <div className="flex items-center gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => startTimerMutation.mutate(t.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 transition"
                            title="Mulai Live Timer untuk tugas ini"
                          >
                            <Play className="size-2.5 fill-current" />
                            Mulai Timer
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTaskId(t.id);
                              const taskDate = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : new Date());
                              const dStr = taskDate.toISOString().slice(0, 10);
                              setStartTime(`${dStr}T08:00`);
                              setEndTime(`${dStr}T17:00`);
                              setNotes("");
                              setManualModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition"
                            title="Catat sesi jam kerja manual untuk tugas ini"
                          >
                            <Plus className="size-2.5" />
                            + Catat Jam
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/tasks/${t.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50">
                            Studio &rarr;
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {tasks.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="size-8 text-gray-300 dark:text-gray-600" />
                      <p className="font-semibold text-gray-600 dark:text-gray-300">
                        Tidak ada tugas yang cocok dengan kriteria pencarian.
                      </p>
                      <p className="text-xs text-gray-400">
                        Coba ubah kata kunci atau reset filter prioritas/status.
                      </p>
                      {isFilterActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs"
                        >
                          Reset Semua Filter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paging & Data Summary Footer */}
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/75 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-800/50">
          {/* Page Size & Range Summary */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <span>Tampilkan per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-800 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <span className="text-gray-300 dark:text-gray-700">|</span>

            <span>
              Menampilkan{" "}
              <strong className="font-bold text-gray-900 dark:text-white">
                {pageRangeStart} - {pageRangeEnd}
              </strong>{" "}
              dari{" "}
              <strong className="font-bold text-gray-900 dark:text-white">
                {totalCount}
              </strong>{" "}
              data tugas
            </span>
          </div>

          {/* Pagination Navigation Controls */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(1)}
              className="h-8 w-8 p-0"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Current Page Pill */}
            <div className="flex items-center gap-1 px-1">
              <span className="text-xs font-medium text-gray-500">Hal.</span>
              <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                {page}
              </span>
              <span className="text-xs font-medium text-gray-500">dari {totalPages}</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(totalPages)}
              className="h-8 w-8 p-0"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Catat Jam Manual */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Catat Jam Kerja Manual
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createManualMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Pilih Tugas *
              </label>
              <SearchableTaskPicker
                value={taskId ?? null}
                onChange={(id) => setTaskId(id ?? undefined)}
                required
                placeholder="Ketik untuk mencari tugas (judul atau kode TK-xxxx)..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Waktu Mulai *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Waktu Selesai *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Pekerjaan
              </label>
              <textarea
                rows={2}
                placeholder="Rincian aktivitas yang diselesaikan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!taskId || !startTime || !endTime || createManualMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {createManualMutation.isPending ? "Menyimpan..." : "Simpan Jam Kerja"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Mulai Timer Langsung */}
      <Dialog open={startTimerModalOpen} onOpenChange={setStartTimerModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400 fill-current" />
              Mulai Timer Tugas Langsung
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTimerMutation.mutate(undefined);
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Pilih Tugas yang Dikerjakan *
              </label>
              <SearchableTaskPicker
                value={timerTaskId ?? null}
                onChange={(id) => setTimerTaskId(id ?? undefined)}
                required
                placeholder="Ketik untuk mencari tugas (judul atau kode TK-xxxx)..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Aktivitas (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Fokus pengerjaan sesi ini..."
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStartTimerModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!timerTaskId || startTimerMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {startTimerMutation.isPending ? "Memulai..." : "Mulai Timer Sekarang"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ekspor Standar Perusahaan ELISTEC */}
      <CompanyTimesheetExportModal
        open={companyExportModalOpen}
        onOpenChange={setCompanyExportModalOpen}
      />

      {/* Modal Generator Timesheet Otomatis Administrator */}
      <AutomatedTimesheetGeneratorModal
        open={autoGenModalOpen}
        onOpenChange={setAutoGenModalOpen}
      />

      {/* Modal Aksi Massal: Ubah Status */}
      <Dialog open={bulkStatusModalOpen} onOpenChange={setBulkStatusModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Perbarui Status ({selectedTaskIds.length} Tugas)
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-500 mt-1">
            Pilih status baru yang akan diterapkan secara serentak ke seluruh tugas yang dipilih:
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {masterStatuses.length > 0 ? (
              masterStatuses.map((s: any, idx: number) => {
                const sVal = resolveStatusValue(s, idx);
                return (
                  <Button
                    key={s.id}
                    variant="outline"
                    onClick={() => bulkStatusMutation.mutate(sVal)}
                    disabled={bulkStatusMutation.isPending}
                    className="justify-start gap-2 text-xs"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: s.color || "#6366F1" }}
                    />
                    {s.name}
                  </Button>
                );
              })
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => bulkStatusMutation.mutate(0)}
                  disabled={bulkStatusMutation.isPending}
                  className="justify-start gap-2 text-xs hover:border-slate-400"
                >
                  <span className="size-2 rounded-full bg-slate-400" />
                  Set to: To Do
                </Button>

                <Button
                  variant="outline"
                  onClick={() => bulkStatusMutation.mutate(1)}
                  disabled={bulkStatusMutation.isPending}
                  className="justify-start gap-2 text-xs hover:border-indigo-400"
                >
                  <span className="size-2 rounded-full bg-indigo-500" />
                  Set to: In Progress
                </Button>

                <Button
                  variant="outline"
                  onClick={() => bulkStatusMutation.mutate(2)}
                  disabled={bulkStatusMutation.isPending}
                  className="justify-start gap-2 text-xs hover:border-emerald-400 text-emerald-700 dark:text-emerald-400"
                >
                  <Check className="size-3 text-emerald-600" />
                  Set to: Selesai (Done)
                </Button>

                <Button
                  variant="outline"
                  onClick={() => bulkStatusMutation.mutate(3)}
                  disabled={bulkStatusMutation.isPending}
                  className="justify-start gap-2 text-xs hover:border-rose-400 text-rose-700 dark:text-rose-400"
                >
                  <AlertTriangle className="size-3 text-rose-600" />
                  Set to: Overdue
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Aksi Massal: Ubah Prioritas */}
      <Dialog open={bulkPriorityModalOpen} onOpenChange={setBulkPriorityModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Perbarui Prioritas ({selectedTaskIds.length} Tugas)
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-500 mt-1">
            Pilih tingkat prioritas baru untuk seluruh tugas yang dipilih:
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {masterPriorities.length > 0 ? (
              masterPriorities.map((p: any, idx: number) => {
                const pVal = resolvePriorityValue(p, idx);
                return (
                  <Button
                    key={p.id}
                    variant="outline"
                    onClick={() => bulkPriorityMutation.mutate(pVal)}
                    disabled={bulkPriorityMutation.isPending}
                    className="justify-start gap-2 text-xs"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: p.color || "#3B82F6" }}
                    />
                    {p.name}
                  </Button>
                );
              })
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => bulkPriorityMutation.mutate(0)}
                  disabled={bulkPriorityMutation.isPending}
                  className="justify-start gap-2 text-xs text-emerald-700 dark:text-emerald-400"
                >
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Rendah (Low)
                </Button>

                <Button
                  variant="outline"
                  onClick={() => bulkPriorityMutation.mutate(1)}
                  disabled={bulkPriorityMutation.isPending}
                  className="justify-start gap-2 text-xs text-blue-700 dark:text-blue-400"
                >
                  <span className="size-2 rounded-full bg-blue-500" />
                  Sedang (Medium)
                </Button>

                <Button
                  variant="outline"
                  onClick={() => bulkPriorityMutation.mutate(2)}
                  disabled={bulkPriorityMutation.isPending}
                  className="justify-start gap-2 text-xs text-amber-700 dark:text-amber-400"
                >
                  <span className="size-2 rounded-full bg-amber-500" />
                  Tinggi (High)
                </Button>

                <Button
                  variant="outline"
                  onClick={() => bulkPriorityMutation.mutate(3)}
                  disabled={bulkPriorityMutation.isPending}
                  className="justify-start gap-2 text-xs text-rose-700 dark:text-rose-400"
                >
                  <span className="size-2 rounded-full bg-rose-500" />
                  Kritis (Critical)
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Massal */}
      <Dialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Hapus {selectedTaskIds.length} Tugas?
            </DialogTitle>
          </DialogHeader>

          {protectedDeleteCount > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 flex items-start gap-2">
              <Lock className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <strong>{protectedDeleteCount} tugas selesai bulan lalu</strong> telah diarsipkan secara permanen dan tidak boleh dihapus.
              </div>
            </div>
          )}

          {nonModifiableCount > 0 && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <strong>{nonModifiableCount} tugas</strong> dibuat oleh anggota lain. Anda hanya dapat menghapus tugas yang Anda buat sendiri.
              </div>
            </div>
          )}

          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
            {protectedDeleteCount > 0 || nonModifiableCount > 0 ? (
              <span>
                Hanya tugas yang memenuhi syarat (dibuat sendiri dan bukan arsip permanen) yang akan diproses untuk dihapus.
              </span>
            ) : (
              <span>
                Apakah Anda yakin ingin menghapus <strong>{selectedTaskIds.length} tugas</strong> yang dipilih? Tindakan ini juga akan menghapus subtugas dan riwayat sesi kerja terkait, serta tidak dapat dibatalkan.
              </span>
            )}
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={bulkDeleteMutation.isPending || (selectedTaskIds.length - protectedDeleteCount - nonModifiableCount) <= 0}
              onClick={() => {
                const validIds = selectedTasks
                  .filter((t: any) => !isPastMonthDone(t) && canUserModifyTask(t))
                  .map((t: any) => t.id);
                if (validIds.length === 0) {
                  toast.error("Tidak ada tugas terpilih yang dapat dihapus.");
                  return;
                }
                bulkDeleteMutation.mutate(validIds);
              }}
              className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleteMutation.isPending ? "Menghapus..." : `Ya, Hapus Sekarang (${Math.max(0, selectedTaskIds.length - protectedDeleteCount - nonModifiableCount)} Tugas)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

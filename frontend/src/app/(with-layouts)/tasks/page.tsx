"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Plus,
  Search,
  Filter,
  Play,
  Kanban,
  Calendar,
  FileSpreadsheet,
  Download,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  AlertTriangle,
  Tag,
  CheckCircle2,
  Clock,
  Check,
  Flame,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { ImportExcelDialog } from "@/components/tasks/import-excel-dialog";
import { ExportTasksDialog } from "@/components/tasks/export-excel-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { toast } from "sonner";
import Link from "next/link";

const priorityLabels: Record<number, { label: string; badge: string; dot: string }> = {
  0: { label: "Rendah", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500" },
  1: { label: "Sedang", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800", dot: "bg-blue-500" },
  2: { label: "Tinggi", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-500" },
  3: { label: "Kritis", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800", dot: "bg-rose-500" },
};

const statusLabels: Record<number, { label: string; badge: string }> = {
  0: { label: "To Do", badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  1: { label: "In Progress", badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800" },
  2: { label: "Done", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800" },
  3: { label: "Overdue", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800" },
};

type SortField = "title" | "project" | "priority" | "status" | "progress" | "dueDate" | "createdAt";

export default function TasksListPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Paging state: 20, 50, 100, 200
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection state (Checklist multiple)
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Modal dialog states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkPriorityModalOpen, setBulkPriorityModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // 1. Tasks Query with Paging, Sorting, and Filters
  const { data: tasksResponse, isLoading, isPlaceholderData } = useQuery<{
    data: any[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({
    queryKey: [
      "tasksList",
      search,
      priorityFilter,
      statusFilter,
      projectFilter,
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

  // 2. Projects Query for filter & select
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsSelect"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // 3. Master Data Queries (Priorities & Statuses)
  const { data: masterPriorities = [] } = useQuery<any[]>({
    queryKey: ["masterPriorities"],
    queryFn: async () => {
      const res = await apiClient.get("/master/priorities");
      return res.data.data || [];
    },
  });

  const { data: masterStatuses = [] } = useQuery<any[]>({
    queryKey: ["masterStatuses"],
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

  // Handle Header Master Checkbox indeterminate state
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
      // Unselect only current page items
      setSelectedTaskIds((prev) => prev.filter((id) => !pageTaskIds.includes(id)));
    } else {
      // Select all current page items
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...pageTaskIds])));
    }
  };

  // Row Checkbox Toggle
  const handleToggleSelectRow = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
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
    setPage(1); // Reset to first page when sort changes
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

  // 4. Start Live Timer Mutation
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

  // 5. Bulk Status Mutation
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
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui status"),
  });

  // 6. Bulk Priority Mutation
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
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui prioritas"),
  });

  // 7. Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/tasks/bulk-delete", {
        taskIds: selectedTaskIds,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas terpilih berhasil dihapus!");
      setBulkDeleteModalOpen(false);
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus tugas"),
  });

  const isFilterActive =
    search.trim() !== "" ||
    priorityFilter !== "all" ||
    statusFilter !== "all" ||
    projectFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setPriorityFilter("all");
    setStatusFilter("all");
    setProjectFilter("all");
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
              Daftar Tugas Operasional
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {totalCount} Total
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pusat manajemen pekerjaan harian, filter prioritas, sortir kolom, dan aksi massal multi-pilihan.
          </p>
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
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
            className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40 text-xs"
          >
            <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Ekspor Excel
          </Button>
          <Link href="/tasks/kanban">
            <Button variant="outline" className="gap-2 text-xs">
              <Kanban className="h-4 w-4" />
              Papan Kanban
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="gap-2 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400">
              <Calendar className="h-4 w-4 text-indigo-500" />
              Kalender
            </Button>
          </Link>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs"
          >
            <Plus className="h-4 w-4" />
            Tugas Baru
          </Button>
        </div>
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

        {/* Priority Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mr-1">
            Filter Cepat Prioritas:
          </span>
          <button
            type="button"
            onClick={() => {
              setPriorityFilter("all");
              setPage(1);
            }}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              priorityFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
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
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              priorityFilter === "0"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Rendah
          </button>
          <button
            type="button"
            onClick={() => {
              setPriorityFilter("1");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              priorityFilter === "1"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
            }`}
          >
            <span className="size-1.5 rounded-full bg-blue-400" />
            Sedang
          </button>
          <button
            type="button"
            onClick={() => {
              setPriorityFilter("2");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              priorityFilter === "2"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300"
            }`}
          >
            <span className="size-1.5 rounded-full bg-amber-400" />
            Tinggi
          </button>
          <button
            type="button"
            onClick={() => {
              setPriorityFilter("3");
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              priorityFilter === "3"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-400" />
            Kritis
          </button>
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
              onClick={() => setBulkStatusModalOpen(true)}
              className="h-8 gap-1.5 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
              Ubah Status
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkPriorityModalOpen(true)}
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

                {/* Tenggat Waktu */}
                <th
                  onClick={() => handleSort("dueDate")}
                  className="group cursor-pointer px-4 py-3.5 font-bold text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 select-none"
                >
                  <div className="inline-flex items-center">
                    Tenggat
                    {renderSortIcon("dueDate")}
                  </div>
                </th>

                {/* Aksi */}
                <th className="px-4 py-3.5 text-right font-bold text-gray-700 dark:text-gray-300">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((t) => {
                const hours = Math.round((t.totalDurationSeconds / 3600) * 10) / 10;
                const isSelected = selectedTaskIds.includes(t.id);
                const priorityInfo = priorityLabels[t.priority] || priorityLabels[1];
                const statusInfo = statusLabels[t.status] || statusLabels[0];
                const isOverdue =
                  t.dueDate &&
                  new Date(t.dueDate).getTime() < Date.now() &&
                  t.status !== 2;

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

                    {/* Tenggat */}
                    <td className="px-4 py-3.5">
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
                        <span className="text-gray-400 text-xs">-</span>
                      )}
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
                  <td colSpan={9} className="py-16 text-center">
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

      {/* Dialog Buat Tugas Terpadu */}
      <CreateTaskDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
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

          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
            Apakah Anda yakin ingin menghapus <strong>{selectedTaskIds.length} tugas</strong> yang dipilih?
            Tindakan ini juga akan menghapus subtugas dan riwayat sesi kerja terkait, serta tidak dapat dibatalkan.
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
              disabled={bulkDeleteMutation.isPending}
              onClick={() => bulkDeleteMutation.mutate()}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {bulkDeleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Sekarang"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Impor Excel */}
      <ImportExcelDialog open={importModalOpen} onOpenChange={setImportModalOpen} />

      {/* Modal Ekspor Excel */}
      <ExportTasksDialog open={exportModalOpen} onOpenChange={setExportModalOpen} />
    </div>
  );
}

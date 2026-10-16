"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Filter,
  Eye,
  ExternalLink,
  Flag,
  Milestone as MilestoneIcon,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  List,
  CalendarDays,
  CalendarRange,
  Layers,
  FolderKanban,
  Check,
  Loader2,
  Plus,
  Play,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import Link from "next/link";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const WEEKDAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const PRIORITY_LABELS: Record<number, { label: string; color: string; badge: string }> = {
  0: { label: "Low", color: "#10B981", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  1: { label: "Medium", color: "#3B82F6", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" },
  2: { label: "High", color: "#F59E0B", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
  3: { label: "Critical", color: "#EF4444", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400" },
};

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "To Do", color: "#6366F1" },
  1: { label: "In Progress", color: "#3B82F6" },
  2: { label: "Done", color: "#10B981" },
  3: { label: "Overdue", color: "#EF4444" },
};

function getStatusNumber(status: any): number {
  if (typeof status === "number") return status;
  if (!status) return 0;
  const s = String(status).toLowerCase();
  if (s.includes("done") || s.includes("selesai")) return 2;
  if (s.includes("progress") || s.includes("sedang")) return 1;
  if (s.includes("overdue") || s.includes("terlambat")) return 3;
  return 0;
}

function getPriorityNumber(priority: any): number {
  if (typeof priority === "number") return priority;
  if (!priority) return 1;
  const p = String(priority).toLowerCase();
  if (p.includes("critical") || p.includes("kritis")) return 3;
  if (p.includes("high") || p.includes("tinggi")) return 2;
  if (p.includes("low") || p.includes("rendah")) return 0;
  return 1;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CalendarSchedulePage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);

  // Active anchor date for calendar navigation
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "agenda">("month");
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Selected Day agenda popup
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ dateStr: string; tasks: any[] } | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  // 1. Fetch Current User Profile to inspect RBAC Role
  const { data: userProfile } = useQuery<any>({
    queryKey: ["currentUserProfile"],
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

  // Active filter based on RBAC: Non-admin is strictly scoped to "mine"
  const activeScopeFilter = isAdmin ? scopeFilter : "mine";

  // 2. Fetch Project List for Filter Toolbar
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsListForCalendar"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data || [];
    },
  });

  // Calculate Date Range based on current View Mode
  const dateRange = useMemo(() => {
    const curYear = selectedDate.getFullYear();
    const curMonth = selectedDate.getMonth();

    if (viewMode === "month" || viewMode === "agenda") {
      // Buffer by +/- 7 days to cover surrounding calendar grid days
      const start = new Date(curYear, curMonth, 1 - 7, 0, 0, 0);
      const end = new Date(curYear, curMonth + 1, 7, 23, 59, 59);
      return { startIso: start.toISOString(), endIso: end.toISOString() };
    }

    if (viewMode === "week") {
      // Find Monday of the current week (Monday = 1, Sunday = 0)
      const dayOfWeek = selectedDate.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(selectedDate);
      monday.setDate(selectedDate.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      return { startIso: monday.toISOString(), endIso: sunday.toISOString(), monday, sunday };
    }

    // Single day view
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [selectedDate, viewMode]);

  // 3. Fetch Tasks via Dedicated Calendar Events API
  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: [
      "calendarEvents",
      dateRange.startIso,
      dateRange.endIso,
      activeScopeFilter,
      projectFilter,
      statusFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("start", dateRange.startIso);
      params.set("end", dateRange.endIso);
      params.set("filter", activeScopeFilter);
      if (projectFilter !== "all") {
        params.set("projectId", projectFilter);
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await apiClient.get(`/calendar/events?${params.toString()}`);
      return res.data.data || [];
    },
  });

  // 4. Mutation for 1-Click Quick Status Update
  const quickUpdateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: number }) => {
      const res = await apiClient.patch(`/calendar/events/${taskId}/status`, { status });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(data.message || "Status tugas berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      if (selectedTask && selectedTask.id === variables.taskId) {
        setSelectedTask((prev: any) => ({
          ...prev,
          status: variables.status,
          statusName: variables.status === 2 ? "Done" : variables.status === 1 ? "In Progress" : "Todo",
          statusColor: variables.status === 2 ? "#10B981" : variables.status === 1 ? "#3B82F6" : "#6366F1",
          isDone: variables.status === 2,
          progress: variables.status === 2 ? 100 : (prev?.progress === 100 && variables.status === 0 ? 0 : prev?.progress),
          isOverdue: variables.status === 2 ? false : prev?.isOverdue,
        }));
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memperbarui status tugas");
    },
  });

  // 5. Start Live Timer Mutation
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

  // Navigation Handlers
  const handlePrev = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month" || viewMode === "agenda") {
        next.setMonth(next.getMonth() - 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() - 7);
      } else if (viewMode === "day") {
        next.setDate(next.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month" || viewMode === "agenda") {
        next.setMonth(next.getMonth() + 1);
      } else if (viewMode === "week") {
        next.setDate(next.getDate() + 7);
      } else if (viewMode === "day") {
        next.setDate(next.getDate() + 1);
      }
      return next;
    });
  };

  const handleJumpToToday = () => {
    setSelectedDate(new Date());
  };

  // Group events by local date string (yyyy-MM-dd)
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach((t) => {
      const dateToUse = t.end || t.dueDate || t.start || t.startDate;
      if (dateToUse) {
        const d = new Date(dateToUse);
        const key = formatDateKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [events]);

  // Calendar Matrix Grid Computation (Month View)
  const calendarCells = useMemo(() => {
    const curYear = selectedDate.getFullYear();
    const curMonth = selectedDate.getMonth();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    // Monday as 0, Sunday as 6
    const firstDayIndex = (new Date(curYear, curMonth, 1).getDay() + 6) % 7;
    const daysInPrevMonth = new Date(curYear, curMonth, 0).getDate();

    const cells: Array<{
      date: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateKey: string;
      isToday: boolean;
      fullDate: Date;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = curMonth === 0 ? 11 : curMonth - 1;
      const y = curMonth === 0 ? curYear - 1 : curYear;
      const cellDate = new Date(y, m, d);
      cells.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateKey: formatDateKey(cellDate),
        isToday: false,
        fullDate: cellDate,
      });
    }

    // Current month days
    const todayStr = formatDateKey(today);
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(curYear, curMonth, d);
      const key = formatDateKey(cellDate);
      cells.push({
        date: d,
        month: curMonth,
        year: curYear,
        isCurrentMonth: true,
        dateKey: key,
        isToday: key === todayStr,
        fullDate: cellDate,
      });
    }

    // Next month padding to fill complete rows of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = curMonth === 11 ? 0 : curMonth + 1;
      const y = curMonth === 11 ? curYear + 1 : curYear;
      const cellDate = new Date(y, m, d);
      cells.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateKey: formatDateKey(cellDate),
        isToday: false,
        fullDate: cellDate,
      });
    }

    return cells;
  }, [selectedDate, today]);

  // Week View Days Computation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - diffToMonday);

    const days: Array<{
      dayName: string;
      date: number;
      dateKey: string;
      isToday: boolean;
      fullDate: Date;
    }> = [];

    const todayStr = formatDateKey(today);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = formatDateKey(d);
      days.push({
        dayName: WEEKDAY_NAMES[i],
        date: d.getDate(),
        dateKey: key,
        isToday: key === todayStr,
        fullDate: d,
      });
    }

    return days;
  }, [selectedDate, today]);

  // KPI Calculations
  const stats = useMemo(() => {
    let done = 0;
    let inProgress = 0;
    let overdue = 0;

    events.forEach((t) => {
      const isDone = t.isDone || getStatusNumber(t.status) === 2;
      if (isDone) {
        done++;
      } else {
        inProgress++;
        if (t.isOverdue) {
          overdue++;
        }
      }
    });

    return { total: events.length, done, inProgress, overdue };
  }, [events]);

  const handleOpenTask = (task: any) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleOpenDayTasks = (dateStr: string, dayTasks: any[]) => {
    setSelectedDayTasks({ dateStr, tasks: dayTasks });
    setDayModalOpen(true);
  };

  const handleDayHeaderClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode("day");
  };

  // Header Title Formatter
  const headerTitle = useMemo(() => {
    if (viewMode === "month" || viewMode === "agenda") {
      return `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const first = weekDays[0];
      const last = weekDays[6];
      if (first && last) {
        return `${first.date} ${MONTH_NAMES[first.fullDate.getMonth()].slice(0, 3)} - ${last.date} ${MONTH_NAMES[last.fullDate.getMonth()]} ${last.fullDate.getFullYear()}`;
      }
    }
    // Day view
    const dayName = WEEKDAY_NAMES[(selectedDate.getDay() + 6) % 7];
    return `${dayName}, ${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [viewMode, selectedDate, weekDays]);

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Kalender Jadwal & Tenggat Tugas
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
              SDLC Timeline
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Jadwal milestone rekayasa perangkat lunak, tenggat penyelesaian (*due date*), dan visualisasi penugasan tim.
          </p>
        </div>

        {/* Toolbar Action Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* New Task Button */}
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5 bg-indigo-600 font-bold text-white shadow-xs hover:bg-indigo-700 text-xs h-9"
          >
            <Plus className="h-4 w-4" />
            Tugas Baru
          </Button>

          {/* RBAC Scope Switcher (FSD 5.14) */}
          {isAdmin ? (
            <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  scopeFilter === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Semua Tim
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("mine")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  scopeFilter === "mine"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Tugas Saya
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              <span>Tugas Saya Sendiri</span>
            </div>
          )}

          {/* 4 View Modes Switcher: Bulan, Minggu, Hari, Agenda */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "month"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Bulan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "week"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Minggu
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "day"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Hari
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "agenda"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Proyek & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <Filter className="h-3.5 w-3.5 text-indigo-500" />
            <span>Filter:</span>
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
            <FolderKanban className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-700 outline-none dark:text-gray-200"
            >
              <option value="all">Semua Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800">
            <Layers className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-gray-700 outline-none dark:text-gray-200"
            >
              <option value="all">Semua Status</option>
              <option value="0">To Do</option>
              <option value="1">In Progress</option>
              <option value="2">Done</option>
              <option value="3">Overdue</option>
            </select>
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Memuat jadwal...</span>
          </div>
        )}
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Total Jadwal Tugas</span>
            <CalendarIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <span className="text-[11px] text-gray-400">Terdaftar pada periode ini</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium">Tugas Selesai</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">
            {stats.done}
          </div>
          <span className="text-[11px] text-gray-400">Mencapai progres 100%</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-medium">Sedang Berjalan</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">
            {stats.inProgress}
          </div>
          <span className="text-[11px] text-gray-400">Dalam pengerjaan tim</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-medium">Melewati Tenggat</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {stats.overdue}
          </div>
          <span className="text-[11px] text-gray-400">Perlu tindak lanjut cepat</span>
        </div>
      </div>

      {/* Calendar Navigation Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="min-w-44 text-center text-base font-extrabold text-gray-900 dark:text-white">
            {headerTitle}
          </span>

          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleJumpToToday}
            className="ml-2 text-xs font-semibold"
          >
            Hari Ini
          </Button>
        </div>

        {/* Quick Month & Year Selectors (Active in Month/Agenda view) */}
        {(viewMode === "month" || viewMode === "agenda") && (
          <div className="flex items-center gap-2">
            <select
              value={selectedDate.getMonth()}
              onChange={(e) => {
                const next = new Date(selectedDate);
                next.setMonth(parseInt(e.target.value));
                setSelectedDate(next);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedDate.getFullYear()}
              onChange={(e) => {
                const next = new Date(selectedDate);
                next.setFullYear(parseInt(e.target.value));
                setSelectedDate(next);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: MONTHLY CALENDAR MATRIX GRID (FSD 5.14) */}
      {/* ======================================================== */}
      {viewMode === "month" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          {/* Weekdays Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
            {WEEKDAY_NAMES.map((name, idx) => (
              <div
                key={name}
                className={`py-3 ${idx === 5 || idx === 6 ? "text-indigo-600 dark:text-indigo-400" : ""}`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Days Grid Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-800/60">
            {calendarCells.map((cell) => {
              const dayTasks = eventsByDate[cell.dateKey] || [];
              const maxVisible = 3;
              const hasMore = dayTasks.length > maxVisible;

              return (
                <div
                  key={cell.dateKey}
                  className={`group relative min-h-28 p-1.5 transition sm:min-h-32 sm:p-2 ${
                    cell.isCurrentMonth
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50/50 text-gray-400 dark:bg-gray-950/40 dark:text-gray-600"
                  } ${cell.isToday ? "bg-indigo-50/20 dark:bg-indigo-950/10" : ""}`}
                >
                  {/* Date Header in Cell */}
                  <div className="flex items-center justify-between pb-1">
                    <button
                      type="button"
                      onClick={() => handleDayHeaderClick(cell.fullDate)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition hover:ring-2 hover:ring-indigo-400 ${
                        cell.isToday
                          ? "bg-indigo-600 text-white shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-gray-900 group-hover:text-indigo-600 dark:text-white"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                      title="Klik untuk membuka tampilan Hari"
                    >
                      {cell.date}
                    </button>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        {dayTasks.length} {dayTasks.length === 1 ? "tugas" : "tugas"}
                      </span>
                    )}
                  </div>

                  {/* Task Event Chips */}
                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, maxVisible).map((task) => {
                      const isDone = task.isDone || task.status === 2;
                      const isOverdue = task.isOverdue;

                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleOpenTask(task)}
                          className="w-full text-left"
                        >
                          <div
                            className={`flex items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow-2xs transition hover:brightness-110 ${
                              isOverdue ? "ring-1 ring-rose-400" : ""
                            }`}
                            style={{ backgroundColor: task.projectColor || "#4680FF" }}
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-white/90" />
                            ) : isOverdue ? (
                              <AlertCircle className="h-3 w-3 shrink-0 text-rose-200" />
                            ) : (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        </button>
                      );
                    })}

                    {/* Has More Popover trigger */}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => handleOpenDayTasks(cell.dateKey, dayTasks)}
                        className="w-full rounded px-1.5 py-0.5 text-center text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                      >
                        +{dayTasks.length - maxVisible} tugas lainnya
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: WEEK COLUMNS VIEW */}
      {/* ======================================================== */}
      {viewMode === "week" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayTasks = eventsByDate[day.dateKey] || [];

            return (
              <div
                key={day.dateKey}
                className={`flex flex-col rounded-2xl border p-3 shadow-2xs transition ${
                  day.isToday
                    ? "border-indigo-300 bg-indigo-50/20 dark:border-indigo-800 dark:bg-indigo-950/20"
                    : "border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900"
                }`}
              >
                {/* Column Day Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {day.dayName}
                    </span>
                    <p
                      onClick={() => handleDayHeaderClick(day.fullDate)}
                      className={`cursor-pointer text-lg font-black ${
                        day.isToday ? "text-indigo-600 dark:text-indigo-400" : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {day.date}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {dayTasks.length}
                  </span>
                </div>

                {/* Event Cards inside column */}
                <div className="mt-2.5 flex-1 space-y-2 overflow-y-auto max-h-[600px]">
                  {dayTasks.map((task) => {
                    const isDone = task.isDone || task.status === 2;
                    const isOverdue = task.isOverdue;

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleOpenTask(task)}
                        className={`cursor-pointer rounded-xl border p-2.5 shadow-2xs transition hover:shadow-xs hover:border-indigo-300 ${
                          isDone
                            ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                            : isOverdue
                            ? "border-rose-200 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20"
                            : "border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: task.projectColor || "#4680FF" }}
                          />
                          <span className="truncate text-[10px] font-bold text-gray-400 uppercase">
                            {task.projectName || "General"}
                          </span>
                        </div>

                        <h4 className="mt-1 text-xs font-bold text-gray-900 line-clamp-2 dark:text-white">
                          {task.title}
                        </h4>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                          <span className="font-mono">
                            {task.dueDate
                              ? new Date(task.dueDate).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Hari Penuh"}
                          </span>

                          <span
                            className={`rounded px-1.5 py-0.2 font-bold ${
                              isDone
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : isOverdue
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                            }`}
                          >
                            {isDone ? "Done" : isOverdue ? "Overdue" : `${task.progress}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {dayTasks.length === 0 && (
                    <div className="flex h-28 items-center justify-center text-center text-[11px] text-gray-400">
                      Kosong
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: DAY TIMELINE / SCHEDULE VIEW */}
      {/* ======================================================== */}
      {viewMode === "day" && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                Jadwal Tugas Harian
              </h3>
              <p className="text-xs text-gray-500">
                Menampilkan seluruh agenda dan tenggat yang jatuh tempo pada {headerTitle}
              </p>
            </div>
            <span className="rounded-xl bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {(eventsByDate[formatDateKey(selectedDate)] || []).length} Tugas Terdaftar
            </span>
          </div>

          <div className="space-y-3">
            {(eventsByDate[formatDateKey(selectedDate)] || []).map((t: any) => {
              const isDone = t.isDone || getStatusNumber(t.status) === 2;
              const isOverdue = t.isOverdue;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col gap-3 rounded-xl border p-4 transition hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-800/40 ${
                    isDone
                      ? "border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/30"
                      : isOverdue
                      ? "border-rose-200/80 bg-rose-50/20 dark:border-rose-900/30"
                      : "border-gray-100 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: t.projectColor || "#4680FF" }}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenTask(t)}
                          className="text-left font-bold text-sm text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                        >
                          {t.title}
                        </button>
                        {t.milestone && (
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {t.milestone}
                          </span>
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            PRIORITY_LABELS[getPriorityNumber(t.priority)]?.badge || ""
                          }`}
                        >
                          {PRIORITY_LABELS[getPriorityNumber(t.priority)]?.label || t.priority || "Normal"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Proyek: <strong>{t.projectName || "General"}</strong> • PIC:{" "}
                        <strong>{t.assignedToUserName || "Belum Ditugaskan"}</strong>
                      </p>
                      {t.description && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2 dark:text-gray-300">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="text-gray-500">
                      {t.dueDate ? (
                        <span className={isOverdue ? "font-bold text-rose-600" : ""}>
                          Tenggat: {new Date(t.dueDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        "Sepanjang Hari"
                      )}
                    </div>

                    <span
                      className={`rounded px-2.5 py-1 text-xs font-bold text-white ${
                        isDone
                          ? "bg-emerald-600"
                          : isOverdue
                          ? "bg-rose-600"
                          : "bg-indigo-600"
                      }`}
                    >
                      {isDone ? "Selesai" : isOverdue ? "Terlambat" : `${t.progress}%`}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenTask(t)}
                      className="h-8 gap-1.5 px-3 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </Button>
                  </div>
                </div>
              );
            })}

            {(eventsByDate[formatDateKey(selectedDate)] || []).length === 0 && !isLoading && (
              <div className="py-16 text-center">
                <CalendarIcon className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-xs text-gray-400">
                  Tidak ada jadwal tugas yang tercatat pada hari ini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 4: AGENDA LIST VIEW */}
      {/* ======================================================== */}
      {viewMode === "agenda" && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Daftar Rincian Agenda & Tenggat ({events.length})
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              Mode: {activeScopeFilter === "all" ? "Semua Tim" : "Tugas Saya"}
            </span>
          </div>

          <div className="space-y-3">
            {events.map((t: any) => {
              const isDone = t.isDone || getStatusNumber(t.status) === 2;
              const isOverdue = t.isOverdue;
              const dueVal = t.end || t.dueDate || t.start || t.startDate;

              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 transition hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: t.projectColor || "#4680FF" }}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenTask(t)}
                          className="text-left font-bold text-xs text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                        >
                          {t.title}
                        </button>
                        {t.milestone && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {t.milestone}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Proyek: <strong>{t.projectName || "General"}</strong> • PIC:{" "}
                        {t.assignedToUserName || "Belum Ditugaskan"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                    <div className="text-gray-500">
                      {dueVal ? (
                        <span className={isOverdue ? "font-bold text-rose-600" : ""}>
                          Tenggat: {new Date(dueVal).toLocaleDateString("id-ID")}
                        </span>
                      ) : (
                        "Tanpa Tenggat"
                      )}
                    </div>

                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                        isDone
                          ? "bg-emerald-600"
                          : isOverdue
                          ? "bg-rose-600"
                          : "bg-indigo-600"
                      }`}
                    >
                      {isDone ? "Selesai" : isOverdue ? "Terlambat" : `${t.progress}%`}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenTask(t)}
                      className="h-7 gap-1 px-2 text-[11px]"
                    >
                      <Eye className="h-3 w-3" />
                      Detail
                    </Button>
                  </div>
                </div>
              );
            })}

            {events.length === 0 && !isLoading && (
              <p className="py-12 text-center text-xs text-gray-400">
                Belum ada jadwal tugas terdaftar untuk periode ini.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG 1: MODAL DETAIL TUGAS INTERAKTIF DENGAN QUICK STATUS (FSD 5.14) */}
      {/* ======================================================== */}
      <Dialog isOpen={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedTask?.projectColor || "#4680FF" }}
              />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {selectedTask?.projectName || "Proyek Umum"}
              </span>
            </div>
            <DialogTitle className="text-lg font-black text-gray-900 dark:text-white">
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {/* Badges Bar */}
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                style={{
                  backgroundColor:
                    PRIORITY_LABELS[getPriorityNumber(selectedTask?.priority)]?.color || selectedTask?.priorityColor || "#3B82F6",
                }}
              >
                <Flag className="h-3 w-3" />
                {PRIORITY_LABELS[getPriorityNumber(selectedTask?.priority)]?.label || selectedTask?.priority || "Normal"}
              </span>

              <span
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                style={{
                  backgroundColor:
                    STATUS_LABELS[getStatusNumber(selectedTask?.status)]?.color || selectedTask?.statusColor || "#6366F1",
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                {STATUS_LABELS[getStatusNumber(selectedTask?.status)]?.label || selectedTask?.status || "To Do"}
              </span>

              {selectedTask?.isOverdue && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </span>
              )}

              {selectedTask?.milestone && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  <MilestoneIcon className="h-3 w-3" />
                  {selectedTask.milestone}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              {selectedTask?.description || "Tidak ada deskripsi detail pada tugas ini."}
            </div>

            {/* Quick Status Update Section (FSD 5.14) */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Pembaruan Cepat Status Tugas (1-Click Update):
              </span>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={quickUpdateStatusMutation.isPending || getStatusNumber(selectedTask?.status) === 0}
                  onClick={() =>
                    quickUpdateStatusMutation.mutate({ taskId: selectedTask.id, status: 0 })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold transition ${
                    getStatusNumber(selectedTask?.status) === 0
                      ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  To Do
                </button>
                <button
                  type="button"
                  disabled={quickUpdateStatusMutation.isPending || getStatusNumber(selectedTask?.status) === 1}
                  onClick={() =>
                    quickUpdateStatusMutation.mutate({ taskId: selectedTask.id, status: 1 })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold transition ${
                    getStatusNumber(selectedTask?.status) === 1
                      ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  In Progress
                </button>
                <button
                  type="button"
                  disabled={quickUpdateStatusMutation.isPending || getStatusNumber(selectedTask?.status) === 2}
                  onClick={() =>
                    quickUpdateStatusMutation.mutate({ taskId: selectedTask.id, status: 2 })
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-bold transition ${
                    getStatusNumber(selectedTask?.status) === 2
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  Done (100%)
                </button>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Penanggung Jawab (PIC)</span>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: selectedTask?.assignedToUserAvatarColor || "#6366F1" }}
                  >
                    {selectedTask?.assignedToUserName?.slice(0, 2).toUpperCase() || "NA"}
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {selectedTask?.assignedToUserName || "Belum Ditugaskan"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Progres Penyelesaian</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {selectedTask?.progress || 0}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${selectedTask?.progress || 0}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Tanggal Mulai</span>
                <p className="mt-1 font-mono font-bold text-gray-900 dark:text-white">
                  {selectedTask?.start || selectedTask?.startDate
                    ? new Date(selectedTask.start || selectedTask.startDate).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Batas Waktu (Due Date)</span>
                <p className="mt-1 font-mono font-bold text-gray-900 dark:text-white">
                  {selectedTask?.end || selectedTask?.dueDate
                    ? new Date(selectedTask.end || selectedTask.dueDate).toLocaleDateString("id-ID")
                    : "Tanpa Deadline"}
                </p>
              </div>
            </div>

            {/* Obstacle & Solution (if any) */}
            {(selectedTask?.obstacle || selectedTask?.solution) && (
              <div className="space-y-2 rounded-xl border border-amber-200/60 bg-amber-50/30 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                {selectedTask?.obstacle && (
                  <div>
                    <span className="font-bold text-amber-800 dark:text-amber-400">
                      Kendala Operasional (*Obstacle*):
                    </span>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTask.obstacle}</p>
                  </div>
                )}
                {selectedTask?.solution && (
                  <div className="mt-2 border-t border-amber-200/40 pt-2 dark:border-amber-900/40">
                    <span className="font-bold text-emerald-800 dark:text-emerald-400">
                      Solusi Teknis (*Solution*):
                    </span>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTask.solution}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Tutup
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    startTimerMutation.mutate(selectedTask?.id);
                  }}
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-8"
                  title="Mulai Live Timer Untuk Tugas Ini"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Mulai Timer
                </Button>

                <Link href={`/tasks/${selectedTask?.id}`}>
                  <Button size="sm" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 h-8 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Studio Detail Tugas
                  </Button>
                </Link>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 2: POPUP DETAIL TUGAS PADA TANGGAL TERTENTU */}
      {/* ======================================================== */}
      <Dialog isOpen={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-900 dark:text-white">
              Tenggat Tugas Tanggal: {selectedDayTasks?.dateStr}
            </DialogTitle>
          </DialogHeader>

          <DialogBody className="space-y-2">
            {selectedDayTasks?.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  setDayModalOpen(false);
                  handleOpenTask(task);
                }}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 p-2.5 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: task.projectColor || "#4680FF" }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      {task.title}
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      {task.projectName || "General"} • {task.assignedToUserName || "PIC -"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              </div>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Modal Buat Tugas Baru dari Kalender */}
      <CreateTaskDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultStatus={0}
      />
    </div>
  );
}

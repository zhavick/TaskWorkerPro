"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
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
  Tag,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  List,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
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

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Low", color: "#10B981" },
  1: { label: "Medium", color: "#3B82F6" },
  2: { label: "High", color: "#F59E0B" },
  3: { label: "Critical", color: "#EF4444" },
};

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Backlog", color: "#64748B" },
  1: { label: "To Do", color: "#6366F1" },
  2: { label: "In Progress", color: "#3B82F6" },
  3: { label: "Review", color: "#F59E0B" },
  4: { label: "Done", color: "#10B981" },
};

export default function CalendarSchedulePage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");

  // Task Detail Modal State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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
    userProfile?.jobTitle?.toLowerCase().includes("admin") ||
    false;

  // Active filter based on RBAC: Non-admin is always "mine"
  const activeFilter = isAdmin ? scopeFilter : "mine";

  // 2. Fetch Tasks with Date range & Scope Filter
  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["calendarTasks", currentYear, currentMonth, activeFilter],
    queryFn: async () => {
      // Calculate first and last day of current month view
      const firstDay = new Date(currentYear, currentMonth, 1).toISOString();
      const lastDay = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      const res = await apiClient.get(
        `/tasks?filter=${activeFilter}&allHierarchies=true`
      );
      return res.data.data;
    },
  });

  // Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  // Group tasks by date string (yyyy-MM-dd) based on DueDate or StartDate
  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    tasks.forEach((t) => {
      const dateToUse = t.dueDate || t.startDate;
      if (dateToUse) {
        const d = new Date(dateToUse);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  // Calendar Matrix Grid Computation
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Monday as 0, Sunday as 6
    const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      date: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateKey: string;
      isToday: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateKey: key,
        isToday: false,
      });
    }

    // Current month days
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
      cells.push({
        date: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        dateKey: key,
        isToday: key === todayStr,
      });
    }

    // Next month padding to fill complete rows of 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateKey: key,
        isToday: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth, today]);

  // KPI Calculations
  const stats = useMemo(() => {
    let done = 0;
    let inProgress = 0;
    let overdue = 0;
    const nowTime = today.getTime();

    tasks.forEach((t) => {
      const isDone = t.status === 4 || t.status === 2 && t.progress === 100;
      if (isDone) {
        done++;
      } else {
        inProgress++;
        if (t.dueDate && new Date(t.dueDate).getTime() < nowTime) {
          overdue++;
        }
      }
    });

    return { total: tasks.length, done, inProgress, overdue };
  }, [tasks, today]);

  const handleOpenTask = (task: any) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleOpenDayTasks = (dateStr: string, dayTasks: any[]) => {
    setSelectedDayTasks({ dateStr, tasks: dayTasks });
    setDayModalOpen(true);
  };

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

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "calendar"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kalender
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "agenda"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Agenda List
            </button>
          </div>
        </div>
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
          <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="min-w-40 text-center text-base font-extrabold text-gray-900 dark:text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
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

        {/* Quick Month & Year Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: MONTHLY CALENDAR MATRIX GRID (FSD 5.14) */}
      {/* ======================================================== */}
      {viewMode === "calendar" && (
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
              const dayTasks = tasksByDate[cell.dateKey] || [];
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
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
                        cell.isToday
                          ? "bg-indigo-600 text-white shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-gray-900 group-hover:text-indigo-600 dark:text-white"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      {cell.date}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        {dayTasks.length} {dayTasks.length === 1 ? "tugas" : "tugas"}
                      </span>
                    )}
                  </div>

                  {/* Task Event Chips */}
                  <div className="mt-1 space-y-1">
                    {dayTasks.slice(0, maxVisible).map((task) => {
                      const isDone = task.status === 4 || (task.status === 2 && task.progress === 100);
                      const isOverdue =
                        !isDone &&
                        task.dueDate &&
                        new Date(task.dueDate).getTime() < today.getTime();

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
      {/* VIEW 2: AGENDA LIST VIEW */}
      {/* ======================================================== */}
      {viewMode === "agenda" && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Daftar Rincian Agenda & Tenggat ({tasks.length})
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              Mode: {activeFilter === "all" ? "Semua Tim" : "Tugas Saya"}
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((t: any) => {
              const isDone = t.status === 4 || (t.status === 2 && t.progress === 100);
              const isOverdue =
                !isDone && t.dueDate && new Date(t.dueDate).getTime() < today.getTime();

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
                      {t.dueDate ? (
                        <span className={isOverdue ? "font-bold text-rose-600" : ""}>
                          Tenggat: {new Date(t.dueDate).toLocaleDateString("id-ID")}
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

            {tasks.length === 0 && !isLoading && (
              <p className="py-12 text-center text-xs text-gray-400">
                Belum ada jadwal tugas terdaftar untuk periode ini.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG 1: MODAL DETAIL TUGAS INTERAKTIF (FSD 5.14) */}
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
                    PRIORITY_LABELS[selectedTask?.priority]?.color || "#3B82F6",
                }}
              >
                <Flag className="h-3 w-3" />
                {PRIORITY_LABELS[selectedTask?.priority]?.label || "Normal"}
              </span>

              <span
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white shadow-2xs"
                style={{
                  backgroundColor:
                    STATUS_LABELS[selectedTask?.status]?.color || "#6366F1",
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                {STATUS_LABELS[selectedTask?.status]?.label || "To Do"}
              </span>

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

            {/* Grid Information */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Penanggung Jawab (PIC)</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {selectedTask?.assignedToUserName?.slice(0, 2).toUpperCase() || "NA"}
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">
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
                  {selectedTask?.startDate
                    ? new Date(selectedTask.startDate).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                <span className="text-[11px] text-gray-400">Batas Waktu (Due Date)</span>
                <p className="mt-1 font-mono font-bold text-gray-900 dark:text-white">
                  {selectedTask?.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString("id-ID")
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
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
              >
                Tutup
              </Button>

              <Link href={`/tasks/${selectedTask?.id}`}>
                <Button size="sm" className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Buka Studio Edit Tugas
                </Button>
              </Link>
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
    </div>
  );
}

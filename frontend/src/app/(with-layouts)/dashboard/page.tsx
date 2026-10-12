"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  CalendarCheck,
  Play,
  Layers,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const chartData = [
  { day: "Sen", tasks: 6, hours: 7.5 },
  { day: "Sel", tasks: 8, hours: 8.2 },
  { day: "Rab", tasks: 11, hours: 9.0 },
  { day: "Kam", tasks: 9, hours: 8.0 },
  { day: "Jum", tasks: 12, hours: 7.8 },
  { day: "Sab", tasks: 4, hours: 3.5 },
  { day: "Min", tasks: 2, hours: 1.5 },
];

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("Rekan Kerja");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_profile");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.fullName) setUserName(u.fullName);
      }
    } catch {}
  }, []);

  // 1. Projects Query
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["dashboardProjects"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // 2. Tasks Query
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["dashboardTasks"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks");
      return res.data.data;
    },
  });

  // 3. Timesheets Summary Query
  const { data: timesheetData } = useQuery<any>({
    queryKey: ["dashboardTimesheetSummary"],
    queryFn: async () => {
      const res = await apiClient.get("/timesheets/sessions?page=1&pageSize=5");
      return res.data;
    },
  });

  // 4. Gamification Status Query
  const { data: gamification } = useQuery<any>({
    queryKey: ["dashboardGamification"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/status");
      return res.data.data;
    },
  });

  // 5. Attendance Status Today
  const { data: attendance } = useQuery<any>({
    queryKey: ["dashboardAttendanceToday"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/today");
      return res.data.data;
    },
  });

  // Mutations
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-in", { workLocation: 1 });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Presensi masuk berhasil dicatat!");
      queryClient.invalidateQueries({ queryKey: ["dashboardAttendanceToday"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal clock in"),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-out", {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Presensi pulang dicatat! Total jam: ${data.totalHours} Jam.`);
      queryClient.invalidateQueries({ queryKey: ["dashboardAttendanceToday"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal clock out"),
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/gamification/check-in");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["dashboardGamification"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal check-in"),
  });

  const summary = timesheetData?.summary;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t: any) => t.status === 2).length;

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Top Header Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Selamat Datang, {userName}! 👋
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Berikut ringkasan operasional proyek, jam kerja timesheet, dan disiplin kehadiran Anda.
          </p>
        </div>

        {/* Quick Attendance Action Button */}
        <div className="flex items-center gap-3">
          {attendance?.hasClockedIn && !attendance?.hasClockedOut ? (
            <Button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="gap-2 bg-amber-600 font-semibold text-white hover:bg-amber-700 dark:bg-amber-600"
            >
              <Clock className="h-4 w-4" />
              Clock Out (Pulang)
            </Button>
          ) : !attendance?.hasClockedIn ? (
            <Button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
              className="gap-2 bg-emerald-600 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600"
            >
              <CalendarCheck className="h-4 w-4" />
              Clock In (Hadir)
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Presensi Lengkap ({attendance.totalHours} Jam)
            </div>
          )}

          <Link href="/tasks">
            <Button variant="outline" className="gap-2">
              <Layers className="h-4 w-4" />
              Buka Studio Tugas
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Proyek Aktif */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Proyek</span>
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-white">{projects.length}</div>
            <div className="mt-1 flex items-center text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="mr-1 h-3.5 w-3.5" />
              <span>{projects.filter((p: any) => p.status === 0).length} Proyek Sedang Berjalan</span>
            </div>
          </div>
        </div>

        {/* Tugas Operasional */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Penyelesaian Tugas</span>
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {doneTasks} <span className="text-sm font-medium text-gray-400">/ {totalTasks}</span>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% Tingkat Selesai
            </div>
          </div>
        </div>

        {/* Jam Timesheet Hari Ini */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Timesheet Hari Ini</span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900 dark:text-white">
              {summary ? Math.round((summary.todaySeconds / 3600) * 10) / 10 : 0} <span className="text-sm font-medium text-gray-400">Jam</span>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Bulan ini: {summary ? summary.totalManDays : 0} Man-Days (MD)
            </div>
          </div>
        </div>

        {/* Gamifikasi & Streak */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Saldo Poin & Streak</span>
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {gamification?.totalCurrentPoints || 0} <span className="text-xs font-semibold">PTS</span>
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                🔥 Streak: {gamification?.currentStreakDays || 0} Hari
              </div>
            </div>

            {!gamification?.hasCheckedInToday && (
              <Button
                size="sm"
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="h-8 gap-1 bg-amber-500 text-xs font-bold text-white hover:bg-amber-600"
              >
                +10 Poin
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Chart & Financial Burn Rate Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Activity Chart (8 cols) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs lg:col-span-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Tren Jam Kerja & Produktivitas Mingguan
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data jam sesi kerja dan penyelesaian tugas operasional dalam 7 hari terakhir
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-600" /> Jam Kerja
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    borderRadius: "0.75rem",
                    border: "none",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#hoursGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Financial Burn Rate Highlight (4 cols) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs lg:col-span-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Status Burn Rate Proyek
            </h3>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Semua <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {projects.slice(0, 4).map((p: any) => {
              const statusColor =
                p.burnRateStatus === "Overbudget"
                  ? "bg-red-500"
                  : p.burnRateStatus === "Warning"
                  ? "bg-amber-500"
                  : "bg-emerald-500";

              return (
                <div key={p.id} className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-800/80">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {p.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                        p.burnRateStatus === "Overbudget"
                          ? "bg-red-600"
                          : p.burnRateStatus === "Warning"
                          ? "bg-amber-600"
                          : "bg-emerald-600"
                      }`}
                    >
                      {p.burnRatePercent}%
                    </span>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full transition-all ${statusColor}`}
                      style={{ width: `${Math.min(100, p.burnRatePercent)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Biaya: Rp {Number(p.actualCost).toLocaleString("id-ID")}</span>
                    <span>Budget: Rp {Number(p.budget).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">Belum ada proyek terdaftar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

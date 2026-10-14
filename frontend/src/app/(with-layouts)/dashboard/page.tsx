"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  CalendarCheck,
  CalendarDays,
  Layers,
  Sparkles,
  Hourglass,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  UserCheck,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("Rekan Kerja");
  const [userRole, setUserRole] = useState("Member");
  const [activeChartTab, setActiveChartTab] = useState<"hours" | "tasks">("hours");
  const [activeDistributionTab, setActiveDistributionTab] = useState<"project" | "status">("project");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_profile");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.fullName) setUserName(u.fullName);
        if (u.jobTitle) setUserRole(u.jobTitle);
      }
    } catch {}
  }, []);

  // 1. Dashboard Stats Query (TSD 2.13)
  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/dashboard/stats");
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  // 2. Dashboard Productivity Chart Query (TSD 2.13)
  const { data: productivityData = [] } = useQuery({
    queryKey: ["dashboardProductivity"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/dashboard/productivity?days=7");
        return res.data.data;
      } catch {
        return [];
      }
    },
  });

  // 3. Dashboard Distribution Query (USER_GUIDE 2.3)
  const { data: distributionData } = useQuery({
    queryKey: ["dashboardDistribution"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/dashboard/distribution");
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  // 4. Dashboard Recent Activities Query (TSD 2.13)
  const { data: activitiesData = [] } = useQuery({
    queryKey: ["dashboardActivities"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/dashboard/activities?limit=6");
        return res.data.data;
      } catch {
        return [];
      }
    },
  });

  // 5. Projects Query (for burn rate analysis)
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["dashboardProjects"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data || [];
    },
  });

  // Fallback Queries if /dashboard/stats is still loading or using individual endpoints
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["dashboardTasks"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks");
      return res.data.data || [];
    },
    enabled: !statsData,
  });

  const { data: gamificationFallback } = useQuery<any>({
    queryKey: ["dashboardGamificationFallback"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/status");
      return res.data.data;
    },
    enabled: !statsData,
  });

  const { data: attendanceFallback } = useQuery<any>({
    queryKey: ["dashboardAttendanceFallback"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/today");
      return res.data.data;
    },
    enabled: !statsData,
  });

  // Consolidate data from stats or fallbacks
  const taskStats = statsData?.tasks || {
    total: tasks.length,
    inProgress: tasks.filter((t: any) => t.status === 1).length,
    done: tasks.filter((t: any) => t.status === 2).length,
    todo: tasks.filter((t: any) => t.status === 0).length,
    overdue: tasks.filter((t: any) => t.status === 3).length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === 2).length / tasks.length) * 100) : 0,
  };

  const workHours = statsData?.workHours || {
    todayHours: 0,
    todaySeconds: 0,
  };

  const gamification = statsData?.gamification || gamificationFallback || {
    totalCurrentPoints: 0,
    currentStreakDays: 0,
    hasCheckedInToday: false,
  };

  const attendance = statsData?.attendance || attendanceFallback || {
    hasClockedIn: false,
    hasClockedOut: false,
    clockInTime: null,
    clockOutTime: null,
    totalHours: 0,
  };

  // Mutations
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-in", { workLocation: 1 });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Presensi hadir berhasil dicatat!");
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardAttendanceFallback"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mencatat presensi masuk"),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-out", {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Presensi pulang dicatat! Total jam kerja: ${data.totalHours || 0} Jam.`);
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardAttendanceFallback"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mencatat presensi keluar"),
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/gamification/check-in");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Berhasil Check-In Harian! +10 Poin diperoleh.");
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardGamificationFallback"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal check-in hari ini"),
  });

  // Prepare fallback productivity chart data if empty
  const defaultChartData = [
    { day: "Sen", tasks: 0, hours: 0 },
    { day: "Sel", tasks: 0, hours: 0 },
    { day: "Rab", tasks: 0, hours: 0 },
    { day: "Kam", tasks: 0, hours: 0 },
    { day: "Jum", tasks: 0, hours: 0 },
    { day: "Sab", tasks: 0, hours: 0 },
    { day: "Min", tasks: 0, hours: 0 },
  ];
  const chartData = productivityData.length > 0 ? productivityData : defaultChartData;

  // Prepare fallback distribution data
  const projectDistribution = distributionData?.byProject || projects.slice(0, 5).map((p, idx) => {
    const pTasks = tasks.filter((t: any) => t.projectId === p.id);
    const pDone = pTasks.filter((t: any) => t.status === 2).length;
    const colors = ["#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];
    return {
      name: p.name,
      color: p.color || colors[idx % colors.length],
      value: pTasks.length || 1,
      percentage: tasks.length > 0 ? Math.round((pTasks.length / tasks.length) * 100) : 0,
      doneCount: pDone,
    };
  });

  const statusDistribution = distributionData?.byStatus || [
    { name: "To Do", value: taskStats.todo, color: "#6366F1" },
    { name: "In Progress", value: taskStats.inProgress, color: "#3B82F6" },
    { name: "Done", value: taskStats.done, color: "#10B981" },
    { name: "Overdue", value: taskStats.overdue, color: "#EF4444" },
  ];

  const currentPieData = activeDistributionTab === "project" ? projectDistribution : statusDistribution;

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* 1. Header Section with Welcome & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Selamat Datang, {userName}! 👋
            </h1>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {userRole}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Berikut ringkasan operasional tugas, distribusi proyek, produktivitas timesheet, dan disiplin presensi Anda.
          </p>
        </div>

        {/* Quick Actions (Presensi Cepat, Kalender, Studio Tugas) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {attendance?.hasClockedIn && !attendance?.hasClockedOut ? (
            <Button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="gap-2 bg-amber-600 font-semibold text-white shadow-xs hover:bg-amber-700 dark:bg-amber-600"
            >
              <Clock className="h-4 w-4" />
              Clock Out (Pulang)
            </Button>
          ) : !attendance?.hasClockedIn ? (
            <Button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
              className="gap-2 bg-emerald-600 font-semibold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-600"
            >
              <CalendarCheck className="h-4 w-4" />
              Clock In (Hadir)
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Presensi Lengkap ({attendance.totalHours} Jam)
            </div>
          )}

          <Link href="/calendar">
            <Button variant="outline" className="gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Kalender Jadwal
            </Button>
          </Link>

          <Link href="/tasks">
            <Button variant="outline" className="gap-2">
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Studio Tugas
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Spanduk Pengingat Check-In & Streak (FSD 5.20.7 & USER_GUIDE 2.1) */}
      <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
        gamification?.hasCheckedInToday
          ? "border-emerald-200/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:border-emerald-800/60 dark:from-emerald-950/30"
          : "border-amber-200/90 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent dark:border-amber-800/70 dark:from-amber-950/40"
      }`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
              gamification?.hasCheckedInToday
                ? "bg-emerald-600 text-white"
                : "bg-amber-500 text-white animate-pulse"
            }`}>
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  Pengingat Check-In Harian & Streak Konsistensi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                  🔥 {gamification?.currentStreakDays || 0} Hari Streak
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                {gamification?.hasCheckedInToday
                  ? "Hebat! Anda sudah check-in hari ini. Pertahankan streak aktif Anda untuk meraih milestone hadiah bulanan!"
                  : "Check-in harian wajib dilakukan agar streak Anda tidak terputus (toleransi toleransi reset 2 hari). Dapatkan +10 poin sekarang!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Saldo Poin</span>
              <div className="font-black text-sm text-amber-600 dark:text-amber-400">
                {gamification?.totalCurrentPoints || 0} PTS
              </div>
            </div>

            {!gamification?.hasCheckedInToday ? (
              <Button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-xs text-white shadow-md hover:from-amber-600 hover:to-orange-700"
              >
                {checkInMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                Check-In Sekarang (+10 Poin)
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-gray-900/80 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Sudah Check-In
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. 5 Personal Metric Cards (FSD Bagian 5.20.7 & USER_GUIDE Bagian 2.1) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Tugas */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Tugas</span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Layers className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-gray-900 dark:text-white">{taskStats.total}</div>
            <div className="mt-1 flex items-center text-[11px] text-indigo-600 dark:text-indigo-400">
              <span>Ditugaskan kepada Anda</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tugas In Progress */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sedang Dikerjakan</span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{taskStats.inProgress}</div>
            <div className="mt-1 flex items-center text-[11px] text-gray-500 dark:text-gray-400">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
              <span>Aktif dalam proses</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tugas Selesai (Done) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tugas Selesai</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{taskStats.done}</span>
              <span className="text-xs font-medium text-gray-400">/ {taskStats.total}</span>
            </div>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {taskStats.completionRate}% Tingkat Selesai
            </div>
          </div>
        </div>

        {/* Card 4: Jam Kerja Hari Ini */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Kerja Hari Ini</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Hourglass className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{workHours.todayHours}</span>
              <span className="text-xs font-semibold text-gray-400">Jam</span>
            </div>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Durasi sesi timesheet hari ini
            </div>
          </div>
        </div>

        {/* Card 5: Daily Check-In & Streak */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4.5 shadow-xs transition-shadow hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Daily Check-In</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Flame className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {gamification?.totalCurrentPoints || 0} <span className="text-xs font-bold text-gray-400">PTS</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-gray-500 dark:text-gray-400">🔥 {gamification?.currentStreakDays || 0} Hari Streak</span>
              {gamification?.hasCheckedInToday ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Check-In OK</span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">Belum Check-In</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Chart Visualization Grid (FSD & USER_GUIDE 2.3 & TSD 2.13) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Chart 1: Tren Jam Kerja & Produktivitas Mingguan (7 cols) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs lg:col-span-7 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Tren Jam Kerja & Produktivitas Mingguan
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Statistik riil durasi sesi timesheet dan tugas selesai 7 hari terakhir
              </p>
            </div>

            {/* Tab Switcher: Jam Kerja vs Tugas */}
            <div className="flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => setActiveChartTab("hours")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeChartTab === "hours"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Jam Kerja (Jam)
              </button>
              <button
                onClick={() => setActiveChartTab("tasks")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeChartTab === "tasks"
                    ? "bg-white text-emerald-600 shadow-xs dark:bg-gray-900 dark:text-emerald-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Tugas Selesai
              </button>
            </div>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === "hours" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="#9CA3AF" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderRadius: "0.75rem",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                    }}
                    formatter={(val: any) => [`${val} Jam`, "Durasi Kerja"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.date ? `${label} (${item.date})` : label;
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
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.12} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="#9CA3AF" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#9CA3AF" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderRadius: "0.75rem",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                    }}
                    formatter={(val: any) => [`${val} Tugas`, "Tugas Selesai"]}
                  />
                  <Bar dataKey="tasks" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribusi Tugas & Beban Kerja (Doughnut Chart - 5 cols) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs lg:col-span-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Distribusi Tugas & Proyek
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Sebaran beban kerja menurut kategori
              </p>
            </div>

            {/* Switcher: Proyek vs Status */}
            <div className="flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => setActiveDistributionTab("project")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeDistributionTab === "project"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Proyek
              </button>
              <button
                onClick={() => setActiveDistributionTab("status")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeDistributionTab === "status"
                    ? "bg-white text-emerald-600 shadow-xs dark:bg-gray-900 dark:text-emerald-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                Status
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between sm:flex-row sm:gap-4">
            {/* Doughnut Chart Canvas */}
            <div className="relative h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderRadius: "0.75rem",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
                    }}
                    formatter={(val: any, name: any) => [`${val} Tugas`, name]}
                  />
                  <Pie
                    data={currentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {currentPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#6366F1"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text in Doughnut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {taskStats.total}
                </span>
                <span className="text-[11px] font-semibold text-gray-400">Total Tugas</span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="mt-3 w-full space-y-2 sm:mt-0">
              {currentPieData.slice(0, 5).map((item: any) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                      {item.name}
                    </span>
                  </div>
                  <span className="shrink-0 font-bold text-gray-900 dark:text-white">
                    {item.value} ({item.percentage || (taskStats.total > 0 ? Math.round((item.value / taskStats.total) * 100) : 0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Financial Burn Rate & Recent Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Status Burn Rate Proyek (6 cols) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs lg:col-span-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Status Burn Rate & Finansial Proyek
              </h3>
            </div>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Semua Proyek <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {projects.slice(0, 4).map((p: any) => {
              const statusColor =
                p.burnRateStatus === "Overbudget"
                  ? "bg-red-500"
                  : p.burnRateStatus === "Warning"
                  ? "bg-amber-500"
                  : "bg-emerald-500";

              return (
                <div key={p.id} className="rounded-xl border border-gray-100 p-3.5 transition-colors hover:border-gray-200 dark:border-gray-800/80 dark:hover:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-bold text-sm text-gray-900 dark:text-white">
                      {p.name}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold text-white ${
                        p.burnRateStatus === "Overbudget"
                          ? "bg-red-600"
                          : p.burnRateStatus === "Warning"
                          ? "bg-amber-600"
                          : "bg-emerald-600"
                      }`}
                    >
                      {p.burnRatePercent || 0}% ({p.burnRateStatus || "Normal"})
                    </span>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full transition-all duration-500 ${statusColor}`}
                      style={{ width: `${Math.min(100, p.burnRatePercent || 0)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Biaya Aktual: Rp {Number(p.actualCost || 0).toLocaleString("id-ID")}</span>
                    <span>Anggaran: Rp {Number(p.budget || 0).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <p className="py-8 text-center text-xs text-gray-400">Belum ada data proyek terdaftar.</p>
            )}
          </div>
        </div>

        {/* Right Column: Feed Aktivitas Terkini (6 cols) */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs lg:col-span-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Feed Aktivitas Operasional Terkini
              </h3>
            </div>
            <Link
              href="/timesheets"
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline dark:text-purple-400"
            >
              Timesheet Log <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activitiesData.slice(0, 5).map((act: any) => (
              <div
                key={act.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 transition-colors hover:border-gray-200 dark:border-gray-800/70 dark:hover:border-gray-700"
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                    act.type === "timesheet"
                      ? "bg-purple-600 dark:bg-purple-500"
                      : "bg-indigo-600 dark:bg-indigo-500"
                  }`}>
                    {act.type === "timesheet" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="truncate font-semibold text-xs text-gray-900 dark:text-white">
                      {act.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {act.userName}
                      </span>
                      <span>•</span>
                      <span className="truncate">{act.projectName}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {act.type === "timesheet" ? (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                      {act.duration ? `${Math.round(act.duration / 60)} Menit` : "Sedang Berjalan"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Status: {act.status}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {activitiesData.length === 0 && (
              <p className="py-8 text-center text-xs text-gray-400">Belum ada log aktivitas kerja.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

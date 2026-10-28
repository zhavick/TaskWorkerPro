"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Briefcase,
  Building,
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
  Users,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";
import Link from "next/link";
import { parseTaskStatus } from "@/utils/task-status";
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
  Legend,
} from "recharts";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("Rekan Kerja");
  const [userRole, setUserRole] = useState("Member");
  const [activeChartTab, setActiveChartTab] = useState<"hours" | "tasks">("hours");
  const [activeDistributionTab, setActiveDistributionTab] = useState<"project" | "status" | "member">("project");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

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

  // 0. Query Available Companies
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["dashboardCompanies"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/companies");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 1. Dashboard Stats Query (TSD 2.13)
  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats", selectedCompanyId],
    queryFn: async () => {
      try {
        const url = selectedCompanyId ? `/dashboard/stats?companyId=${selectedCompanyId}` : "/dashboard/stats";
        const res = await apiClient.get(url);
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  // 2. Dashboard Productivity Chart Query (TSD 2.13)
  const { data: productivityData = [] } = useQuery({
    queryKey: ["dashboardProductivity", selectedCompanyId],
    queryFn: async () => {
      try {
        const url = selectedCompanyId
          ? `/dashboard/productivity?days=7&companyId=${selectedCompanyId}`
          : "/dashboard/productivity?days=7";
        const res = await apiClient.get(url);
        return res.data.data;
      } catch {
        return [];
      }
    },
  });

  // 3. Dashboard Distribution Query (USER_GUIDE 2.3)
  const { data: distributionData } = useQuery({
    queryKey: ["dashboardDistribution", selectedCompanyId],
    queryFn: async () => {
      try {
        const url = selectedCompanyId
          ? `/dashboard/distribution?companyId=${selectedCompanyId}`
          : "/dashboard/distribution";
        const res = await apiClient.get(url);
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  // 4. Dashboard Recent Activities Query (TSD 2.13)
  const { data: activitiesData = [] } = useQuery({
    queryKey: ["dashboardActivities", selectedCompanyId],
    queryFn: async () => {
      try {
        const url = selectedCompanyId
          ? `/dashboard/activities?limit=6&companyId=${selectedCompanyId}`
          : "/dashboard/activities?limit=6";
        const res = await apiClient.get(url);
        return res.data.data;
      } catch {
        return [];
      }
    },
  });

  // 5. Projects Query (for burn rate analysis)
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["dashboardProjects", selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId ? `/projects?companyId=${selectedCompanyId}` : "/projects";
      const res = await apiClient.get(url);
      return res.data.data || [];
    },
  });

  // Fallback Queries if /dashboard/stats is still loading or using individual endpoints
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["dashboardTasks", selectedCompanyId],
    queryFn: async () => {
      const url = selectedCompanyId ? `/tasks?companyId=${selectedCompanyId}` : "/tasks";
      const res = await apiClient.get(url);
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
    inProgress: tasks.filter((t: any) => parseTaskStatus(t.status) === 1).length,
    done: tasks.filter((t: any) => parseTaskStatus(t.status) === 2).length,
    todo: tasks.filter((t: any) => parseTaskStatus(t.status) === 0).length,
    overdue: tasks.filter((t: any) => parseTaskStatus(t.status) === 3).length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter((t: any) => parseTaskStatus(t.status) === 2).length / tasks.length) * 100) : 0,
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
    const pDone = pTasks.filter((t: any) => parseTaskStatus(t.status) === 2).length;
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

  // Filter helper: Administrator tidak ditampilkan pada chart dashboard
  const isAdministrator = (m: any) => {
    if (!m) return false;
    const title = (m.jobTitle || "").toLowerCase();
    const name = (m.name || "").toLowerCase();
    const uname = (m.userName || "").toLowerCase();
    const uid = (m.userId || "").toLowerCase();
    const role = (m.role || "").toLowerCase();
    return (
      title.includes("admin") ||
      name.includes("administrator") ||
      name === "admin" ||
      name.startsWith("admin ") ||
      uname === "admin" ||
      uid.includes("admin") ||
      role.includes("admin")
    );
  };

  const rawMemberDistribution = distributionData?.byMember || [];
  const memberDistribution = useMemo(() => {
    return rawMemberDistribution.filter((m: any) => !isAdministrator(m));
  }, [rawMemberDistribution]);

  const memberChartData = useMemo(() => {
    return memberDistribution.filter((m: any) => !isAdministrator(m));
  }, [memberDistribution]);

  const currentPieData =
    activeDistributionTab === "project"
      ? projectDistribution
      : activeDistributionTab === "status"
      ? statusDistribution
      : memberDistribution;

  const hasPieData = currentPieData.some((d: any) => d.value > 0);
  const safePieData = hasPieData
    ? currentPieData.filter((d: any) => d.value > 0)
    : [{ name: "Belum Ada Data", value: 1, color: "#94A3B8" }];

  const doughnutTotalTasks = useMemo(() => {
    if (activeDistributionTab === "member") {
      return memberDistribution.reduce((acc: number, d: any) => acc + (d.value || 0), 0);
    }
    if (distributionData?.totalTasks !== undefined && distributionData?.totalTasks !== null) {
      return distributionData.totalTasks;
    }
    if (hasPieData) {
      return currentPieData.reduce((acc: number, d: any) => acc + (d.value || 0), 0);
    }
    return taskStats.total;
  }, [activeDistributionTab, memberDistribution, distributionData?.totalTasks, hasPieData, currentPieData, taskStats.total]);

  const memberProjectData = useMemo(() => {
    if (distributionData?.byMemberProject && distributionData.byMemberProject.length > 0) {
      return distributionData.byMemberProject.filter((m: any) => !isAdministrator(m));
    }
    return memberChartData.map((m: any) => {
      const row: Record<string, any> = {
        name: m.name,
        userId: m.userId,
        total: m.value || (m.doneCount || 0) + (m.inProgressCount || 0),
      };
      if (m.projectBreakdown && Array.isArray(m.projectBreakdown)) {
        m.projectBreakdown.forEach((p: any) => {
          row[p.projectName] = p.count;
        });
      } else if (m.projects && Array.isArray(m.projects)) {
        const share = Math.max(1, Math.floor((m.value || 1) / m.projects.length));
        m.projects.forEach((proj: string) => {
          row[proj] = share;
        });
      }
      return row;
    });
  }, [distributionData?.byMemberProject, memberChartData]);

  const topProjectsList = useMemo(() => {
    if (distributionData?.topProjects && distributionData.topProjects.length > 0) {
      return distributionData.topProjects;
    }
    const set = new Set<string>();
    memberProjectData.forEach((row: any) => {
      Object.keys(row).forEach((k) => {
        if (k !== "name" && k !== "userId" && k !== "total" && k !== "Proyek Lainnya" && k !== "Tanpa Proyek") {
          set.add(k);
        }
      });
    });
    return Array.from(set).slice(0, 6);
  }, [distributionData?.topProjects, memberProjectData]);

  const projectBarColors = [
    "#6366F1", "#10B981", "#F59E0B", "#EC4899", "#3B82F6", "#8B5CF6", "#06B6D4", "#14B8A6"
  ];

  const integrity = statsData?.integrity || {
    tasksWithoutProjectCount: 0,
    tasksWithoutProjectSample: [],
    emptyProjectsCount: 0,
    emptyProjectsSample: [],
  };

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

        {/* Quick Actions (Perusahaan Filter, Presensi Cepat, Kalender, Studio Tugas) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Company Filter Dropdown */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={selectedCompanyId ?? ""}
              onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
              title="Pilih perusahaan untuk memfilter metrik dashboard"
            >
              <option value="">🏢 Perusahaan: Otomatis</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id} className="text-gray-900 bg-white dark:bg-gray-900 dark:text-gray-100">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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

      {/* 2.5 Informasi Penting Integritas Operasional: Task Tanpa Proyek & Proyek Kosong */}
      {(integrity.tasksWithoutProjectCount > 0 || integrity.emptyProjectsCount > 0) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Perhatian Penting: Ketidaksesuaian Struktur Tugas &amp; Proyek
                </h4>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Audit Integritas Data Real-Time
                </span>
              </div>
              <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-300/80">
                Ditemukan entitas kerja yang belum terorganisir sempurna dan berpotensi menghambat visibilitas laporan:
              </p>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Notice 1: Task Tanpa Proyek */}
                {integrity.tasksWithoutProjectCount > 0 ? (
                  <div className="rounded-xl border border-amber-200/90 bg-white/90 p-3 shadow-2xs dark:border-amber-800/60 dark:bg-gray-900/90">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-[11px] font-black text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                          {integrity.tasksWithoutProjectCount}
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Tugas Tanpa Asosiasi Proyek
                        </span>
                      </div>
                      <Link
                        href="/tasks"
                        className="flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Buka Tugas <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Tugas ini berdiri sendiri tanpa repositori/proyek induk, sehingga jam kerja dan progresnya tidak teragregasi di burn rate proyek.
                    </p>
                  </div>
                ) : null}

                {/* Notice 2: Proyek Kosong Tanpa Task */}
                {integrity.emptyProjectsCount > 0 ? (
                  <div className="rounded-xl border border-amber-200/90 bg-white/90 p-3 shadow-2xs dark:border-amber-800/60 dark:bg-gray-900/90">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-[11px] font-black text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
                          {integrity.emptyProjectsCount}
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Proyek Kosong Tanpa Tugas
                        </span>
                      </div>
                      <Link
                        href="/projects"
                        className="flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Kelola Proyek <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Proyek telah dibuat namun belum memiliki rincian tugas operasional aktif yang ditugaskan ke anggota tim.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 5 Personal Metric Cards (FSD Bagian 5.20.7 & USER_GUIDE Bagian 2.1) */}
      <div id="tour-metrics" data-tour="tour-metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Tugas */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-xs transition-shadow hover:shadow-sm text-text-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Total Tugas</span>
            <div className="rounded-xl bg-primary-500/10 p-2 text-primary-500">
              <Layers className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-text-primary">{taskStats.total}</div>
            <div className="mt-1 flex items-center text-[11px] text-primary-500">
              <span>Ditugaskan kepada Anda</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tugas In Progress */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-xs transition-shadow hover:shadow-sm text-text-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Sedang Dikerjakan</span>
            <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-blue-500">{taskStats.inProgress}</div>
            <div className="mt-1 flex items-center text-[11px] text-text-secondary">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
              <span>Aktif dalam proses</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tugas Selesai (Done) */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-xs transition-shadow hover:shadow-sm text-text-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Tugas Selesai</span>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-500">{taskStats.done}</span>
              <span className="text-xs font-medium text-text-secondary">/ {taskStats.total}</span>
            </div>
            <div className="mt-1 text-[11px] text-text-secondary">
              {taskStats.completionRate}% Tingkat Selesai
            </div>
          </div>
        </div>

        {/* Card 4: Jam Kerja Hari Ini */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-xs transition-shadow hover:shadow-sm text-text-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Jam Kerja Hari Ini</span>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-500">
              <Hourglass className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-500">{workHours.todayHours}</span>
              <span className="text-xs font-semibold text-text-secondary">Jam</span>
            </div>
            <div className="mt-1 text-[11px] text-text-secondary">
              Durasi sesi timesheet hari ini
            </div>
          </div>
        </div>

        {/* Card 5: Daily Check-In & Streak */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-xs transition-shadow hover:shadow-sm text-text-primary">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary">Daily Check-In</span>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
              <Flame className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-500">
              {gamification?.totalCurrentPoints || 0} <span className="text-xs font-bold text-text-secondary">PTS</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">🔥 {gamification?.currentStreakDays || 0} Hari Streak</span>
              {gamification?.hasCheckedInToday ? (
                <span className="font-semibold text-emerald-500">Check-In OK</span>
              ) : (
                <span className="font-semibold text-amber-500">Belum Check-In</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Chart Visualization Grid (FSD & USER_GUIDE 2.3 & TSD 2.13) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Chart 1: Tren Jam Kerja & Produktivitas Mingguan (7 cols) */}
        <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs lg:col-span-7 text-text-primary">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary-500" />
                <h3 className="text-base font-bold text-text-primary">
                  Tren Jam Kerja & Produktivitas Mingguan
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Statistik riil durasi sesi timesheet dan tugas selesai 7 hari terakhir
              </p>
            </div>

            {/* Tab Switcher: Jam Kerja vs Tugas */}
            <div className="flex items-center rounded-xl border border-card-border bg-card-surface-area p-1">
              <button
                onClick={() => setActiveChartTab("hours")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeChartTab === "hours"
                    ? "bg-card-background text-primary-500 shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Jam Kerja (Jam)
              </button>
              <button
                onClick={() => setActiveChartTab("tasks")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeChartTab === "tasks"
                    ? "bg-card-background text-primary-500 shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
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
                      <stop offset="5%" stopColor="var(--primary-500, #3758f9)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary-500, #3758f9)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border, #E5E7EB)" opacity={0.6} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-background, #ffffff)",
                      borderColor: "var(--card-border, #e5e7eb)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "0.75rem",
                      color: "var(--text-primary, #111827)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "var(--text-primary, #111827)" }}
                    labelStyle={{ color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}
                    formatter={(val: any) => [`${val} Jam`, "Durasi Kerja"]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.date ? `${label} (${item.date})` : label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="var(--primary-500, #3758f9)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#hoursGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border, #E5E7EB)" opacity={0.6} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-background, #ffffff)",
                      borderColor: "var(--card-border, #e5e7eb)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "0.75rem",
                      color: "var(--text-primary, #111827)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "var(--text-primary, #111827)" }}
                    labelStyle={{ color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}
                    formatter={(val: any) => [`${val} Tugas`, "Tugas Selesai"]}
                  />
                  <Bar dataKey="tasks" fill="var(--primary-500, #3758f9)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribusi Tugas & Beban Kerja (Doughnut Chart - 5 cols) */}
        <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs lg:col-span-5 text-text-primary">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary-500" />
                <h3 className="text-base font-bold text-text-primary">
                  Distribusi Tugas & Proyek
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Sebaran beban kerja menurut kategori
              </p>
            </div>

            {/* Switcher: Proyek vs Status vs Anggota Tim */}
            <div className="flex items-center rounded-xl border border-card-border bg-card-surface-area p-1">
              <button
                onClick={() => setActiveDistributionTab("project")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeDistributionTab === "project"
                    ? "bg-card-background text-primary-500 shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Proyek
              </button>
              <button
                onClick={() => setActiveDistributionTab("status")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeDistributionTab === "status"
                    ? "bg-card-background text-primary-500 shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Status
              </button>
              <button
                onClick={() => setActiveDistributionTab("member")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  activeDistributionTab === "member"
                    ? "bg-card-background text-primary-500 shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Anggota Tim
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
                      backgroundColor: "var(--card-background, #ffffff)",
                      borderColor: "var(--card-border, #e5e7eb)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "0.75rem",
                      color: "var(--text-primary, #111827)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "var(--text-primary, #111827)" }}
                    labelStyle={{ color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}
                    formatter={(val: any, name: any) => [`${val} Tugas`, name]}
                  />
                  <Pie
                    data={safePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={hasPieData ? 3 : 0}
                    dataKey="value"
                    stroke="none"
                  >
                    {safePieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "var(--primary-500, #6366F1)"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text in Doughnut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-text-primary">
                  {doughnutTotalTasks}
                </span>
                <span className="text-[11px] font-semibold text-text-secondary">
                  {activeDistributionTab === "member" ? "Tugas Tim" : "Total Tugas"}
                </span>
              </div>
            </div>

            {/* Legend / Breakdown List */}
            <div className="mt-3 w-full sm:mt-0">
              {activeDistributionTab === "member" ? (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {currentPieData.map((item: any) => (
                    <div
                      key={item.userId || item.name}
                      className="rounded-xl border border-card-border bg-card-surface-area p-2.5 transition-all hover:border-primary-500/40 text-text-primary"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="truncate">
                            <span className="block truncate text-xs font-bold text-text-primary">
                              {item.name}
                            </span>
                            <span className="block text-[10px] text-text-secondary">
                              {item.jobTitle || "Anggota Tim"}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="font-bold text-xs text-text-primary">
                            {item.value} Tugas
                          </span>
                          <span className="block text-[10px] font-medium text-text-secondary">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Multi-Project Tags */}
                      {item.projects && item.projects.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.projects.map((proj: string) => (
                            <span
                              key={proj}
                              className="rounded-md border border-card-border bg-card-background px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary shadow-2xs"
                            >
                              {proj}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-[9px] text-text-secondary italic">
                          Belum ada alokasi proyek
                        </div>
                      )}
                    </div>
                  ))}

                  {currentPieData.length === 0 && (
                    <div className="py-6 text-center text-xs text-text-secondary">
                      Belum ada anggota tim terdaftar
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentPieData.slice(0, 5).map((item: any) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate font-medium text-text-primary">
                          {item.name}
                        </span>
                      </div>
                      <span className="shrink-0 font-bold text-text-primary">
                        {item.value} ({item.percentage || (taskStats.total > 0 ? Math.round((item.value / taskStats.total) * 100) : 0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4.5 Section Khusus: Beban Kerja & Produktivitas Anggota Tim */}
      <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs text-text-primary">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <Users className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Beban Kerja & Distribusi Tugas Anggota Tim
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              Komparasi kapasitas riil, penyelesaian tugas (Selesai vs Dalam Proses), dan alokasi proyek tiap anggota
            </p>
          </div>

          <Link
            href="/members"
            className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
          >
            Direktori Tim <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Bar Chart Komparasi Tugas Anggota Tim (7 cols) */}
          <div className="h-68 w-full lg:col-span-7">
            {memberChartData.length === 0 ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-card-border p-6 text-center text-xs text-text-secondary">
                <Users className="mb-2 h-7 w-7 text-text-secondary/50" />
                <p className="font-semibold text-text-primary">Belum Ada Data Tugas Anggota Tim</p>
                <p className="mt-1 text-[11px]">Tidak ada tugas aktif atau anggota tim yang teralokasi pada filter perusahaan ini.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border, #E5E7EB)" opacity={0.6} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-background, #ffffff)",
                      borderColor: "var(--card-border, #e5e7eb)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "0.75rem",
                      color: "var(--text-primary, #111827)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "var(--text-primary, #111827)" }}
                    labelStyle={{ color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}
                    formatter={(val: any, name: any) => [`${val} Tugas`, name]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                    formatter={(value) => <span className="text-text-secondary font-medium">{value}</span>}
                  />
                  <Bar dataKey="doneCount" name="Tugas Selesai" fill="var(--primary-500, #3758f9)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="inProgressCount" name="Dalam Proses" fill="var(--neutral-brand-color, #10B981)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Rincian Kartu Member (5 cols) */}
          <div className="space-y-2.5 max-h-68 overflow-y-auto pr-1 lg:col-span-5">
            {memberChartData.length === 0 ? (
              <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-card-border p-6 text-center text-xs text-text-secondary">
                Belum ada anggota tim terdaftar untuk filter ini.
              </div>
            ) : (
              memberChartData.map((m: any) => {
                const total = (m.doneCount || 0) + (m.inProgressCount || 0);
                const completionRate = total > 0 ? Math.round(((m.doneCount || 0) / total) * 100) : 0;
                return (
                  <div
                    key={m.userId || m.name}
                    className="rounded-xl border border-card-border bg-card-surface-area p-3 transition-colors hover:border-primary-500/40 text-text-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: m.color || "var(--primary-500, #3758f9)" }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="block truncate text-xs font-bold text-text-primary">
                            {m.name}
                          </span>
                          <span className="block text-[11px] text-text-secondary">
                            {m.jobTitle || "Anggota Tim"}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-black text-text-primary">
                          {m.value || total} Tugas
                        </span>
                        <span className="block text-[10px] font-semibold text-primary-500">
                          {completionRate}% Selesai
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Selesai vs Dalam Proses */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-gray-secondary">
                      <div
                        className="h-full bg-primary-500 transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>

                    {/* Assigned Projects Tags */}
                    {m.projects && m.projects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.projects.map((proj: string) => (
                          <span
                            key={proj}
                            className="rounded-md border border-card-border bg-card-background px-1.5 py-0.5 text-[9px] font-medium text-text-secondary"
                          >
                            {proj}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Divider & Chart 2: Alokasi Beban Kerja Berdasarkan Proyek */}
        <div className="mt-8 border-t border-card-border pt-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  Distribusi Tugas Anggota Tim Berdasarkan Proyek
                </h4>
                <p className="text-[11px] text-text-secondary">
                  Proporsi pembagian tugas tiap anggota tim di masing-masing repositori &amp; proyek aktif
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-text-secondary">
              Stacked Workload per Proyek
            </span>
          </div>

          <div className="h-72 w-full">
            {memberProjectData.length === 0 ? (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-card-border p-6 text-center text-xs text-text-secondary">
                <Briefcase className="mb-2 h-7 w-7 text-text-secondary/50" />
                <p className="font-semibold text-text-primary">Belum Ada Distribusi Proyek</p>
                <p className="mt-1 text-[11px]">Tidak ada data pembagian tugas antar proyek pada filter perusahaan ini.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberProjectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border, #E5E7EB)" opacity={0.6} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--text-secondary, #9CA3AF)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-background, #ffffff)",
                      borderColor: "var(--card-border, #e5e7eb)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "0.75rem",
                      color: "var(--text-primary, #111827)",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "var(--text-primary, #111827)" }}
                    labelStyle={{ color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}
                    formatter={(val: any, name: any) => [`${val} Tugas`, name]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                    formatter={(value) => <span className="text-text-secondary font-medium">{value}</span>}
                  />
                  {topProjectsList.map((proj: string, idx: number) => (
                    <Bar
                      key={proj}
                      dataKey={proj}
                      name={proj}
                      stackId="workloadProject"
                      fill={projectBarColors[idx % projectBarColors.length]}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={36}
                    />
                  ))}
                  {memberProjectData.some((r: any) => (r["Proyek Lainnya"] || 0) > 0) && (
                    <Bar
                      dataKey="Proyek Lainnya"
                      name="Proyek Lainnya"
                      stackId="workloadProject"
                      fill="#8B5CF6"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={36}
                    />
                  )}
                  {memberProjectData.some((r: any) => (r["Tanpa Proyek"] || 0) > 0) && (
                    <Bar
                      dataKey="Tanpa Proyek"
                      name="Tanpa Proyek"
                      stackId="workloadProject"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Section: Financial Burn Rate & Recent Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Status Burn Rate Proyek (6 cols) */}
        <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs lg:col-span-6 text-text-primary">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary-500" />
              <h3 className="text-base font-bold text-text-primary">
                Status Burn Rate & Finansial Proyek
              </h3>
            </div>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
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
                <div key={p.id} className="rounded-xl border border-card-border bg-card-surface-area p-3.5 transition-colors hover:border-primary-500/40 text-text-primary">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-bold text-sm text-text-primary">
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

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-background-gray-secondary">
                    <div
                      className={`h-full transition-all duration-500 ${statusColor}`}
                      style={{ width: `${Math.min(100, p.burnRatePercent || 0)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
                    <span>Biaya Aktual: Rp {Number(p.actualCost || 0).toLocaleString("id-ID")}</span>
                    <span>Anggaran: Rp {Number(p.budget || 0).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <p className="py-8 text-center text-xs text-text-secondary">Belum ada data proyek terdaftar.</p>
            )}
          </div>
        </div>

        {/* Right Column: Feed Aktivitas Terkini (6 cols) */}
        <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs lg:col-span-6 text-text-primary">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <h3 className="text-base font-bold text-text-primary">
                Feed Aktivitas Operasional Terkini
              </h3>
            </div>
            <Link
              href="/timesheets"
              className="flex items-center gap-1 text-xs font-semibold text-primary-500 hover:underline"
            >
              Timesheet Log <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activitiesData.slice(0, 5).map((act: any) => (
              <div
                key={act.id}
                className="flex items-center justify-between rounded-xl border border-card-border bg-card-surface-area p-3 transition-colors hover:border-primary-500/40 text-text-primary"
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                    act.type === "timesheet"
                      ? "bg-purple-600 dark:bg-purple-500"
                      : "bg-primary-600 dark:bg-primary-500"
                  }`}>
                    {act.type === "timesheet" ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <div className="truncate font-semibold text-xs text-text-primary">
                      {act.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                      <span className="font-medium text-text-primary">
                        {act.userName}
                      </span>
                      <span>•</span>
                      <span className="truncate">{act.projectName}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {act.type === "timesheet" ? (
                    <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-300">
                      {act.duration ? `${Math.round(act.duration / 60)} Menit` : "Sedang Berjalan"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[10px] font-bold text-primary-600 dark:text-primary-300">
                      Status: {act.status}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {activitiesData.length === 0 && (
              <p className="py-8 text-center text-xs text-text-secondary">Belum ada log aktivitas kerja.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

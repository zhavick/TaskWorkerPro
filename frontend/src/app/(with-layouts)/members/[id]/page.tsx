"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Edit3,
  Loader2,
  FolderGit2,
  Timer,
  Check,
  AlertCircle,
  Search,
} from "lucide-react";
import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import {
  getCoverGradientClass,
  getInitials,
  AVATAR_COLORS,
} from "../../profile/profile-constants";
import { parseTaskStatus, TASK_STATUS_LABELS } from "@/utils/task-status";

interface MemberTask {
  id: number;
  title: string;
  description?: string | null;
  status: string | number;
  priority: string | number;
  progress: number;
  projectId?: number | null;
  projectName?: string | null;
  projectColor?: string | null;
  dueDate?: string | null;
  createdAt: string;
}

interface MemberProject {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  status: string;
  clientName?: string | null;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  deadline?: string | null;
}

interface MemberSession {
  id: number;
  taskId: number;
  taskTitle: string;
  projectName?: string | null;
  projectColor?: string | null;
  startTime: string;
  endTime?: string | null;
  duration: number;
  durationHours: number;
  notes?: string | null;
}

interface MemberDetailData {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  avatarColor?: string | null;
  profilePictureUrl?: string | null;
  coverPictureUrl?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  companyCode?: string | null;
  isApproved: boolean;
  roles: string[];
  phoneNumber?: string | null;
  createdAt: string;
  kpi: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    totalHours: number;
    completionRate: number;
  };
  tasks: MemberTask[];
  projects: MemberProject[];
  recentSessions: MemberSession[];
}

export default function MemberSpecialProfilePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const memberId = params.id as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"tasks" | "projects" | "timesheet" | "corporate">("tasks");

  // Task filter & search
  const [taskFilterStatus, setTaskFilterStatus] = useState<"all" | "Done" | "InProgress" | "Todo">("all");
  const [taskSearch, setTaskSearch] = useState("");

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"Member" | "DataPurgeAdmin" | "Administrator">("Member");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("#6366F1");

  // Reset Password Modal State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  // Current logged in user info (from localStorage)
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("user_profile");
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isAdmin = currentUser?.roles?.includes("Administrator") ||
    currentUser?.email === "admin@trackerkerja.local" ||
    currentUser?.id === "usr-superadmin";

  // Fetch Member Details
  const { data: memberData, isLoading, error } = useQuery<MemberDetailData>({
    queryKey: ["memberDetailSpecial", memberId],
    queryFn: async () => {
      const res = await apiClient.get(`/members/${memberId}`);
      return res.data.data;
    },
    enabled: !!memberId,
  });

  // Mutation: Update Member
  const updateMemberMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/members/${memberId}`, {
        fullName: editFullName.trim(),
        email: isAdmin ? editEmail.trim() || undefined : undefined,
        jobTitle: editJobTitle.trim(),
        phoneNumber: editPhoneNumber.trim() || null,
        avatarColor: editAvatarColor,
        role: isAdmin && memberId !== "usr-superadmin" ? editRole : undefined,
        canPurgeData:
          isAdmin && memberId !== "usr-superadmin" ? editRole === "DataPurgeAdmin" : undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Data profil berhasil diperbarui!");
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["memberDetailSpecial", memberId] });
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memperbarui data profil anggota");
    },
  });

  // Mutation: Reset Password
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/members/${memberId}/reset-password`, {
        newPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Kata sandi berhasil direset!");
      setIsResetOpen(false);
      setNewPassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mereset kata sandi");
    },
  });

  const openEditModal = () => {
    if (memberData) {
      setEditFullName(memberData.fullName);
      setEditEmail(memberData.email);
      if (memberData.roles?.includes("Administrator") || memberData.id === "usr-superadmin") {
        setEditRole("Administrator");
      } else if (memberData.roles?.includes("DataPurgeAdmin")) {
        setEditRole("DataPurgeAdmin");
      } else {
        setEditRole("Member");
      }
      setEditJobTitle(memberData.jobTitle);
      setEditPhoneNumber(memberData.phoneNumber || "");
      setEditAvatarColor(memberData.avatarColor || "#6366F1");
      setIsEditOpen(true);
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let gen = "K3rja!";
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(gen);
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!memberData?.tasks) return [];
    return memberData.tasks.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.projectName && t.projectName.toLowerCase().includes(taskSearch.toLowerCase()));
      const stNum = parseTaskStatus(t.status);
      const matchesStatus =
        taskFilterStatus === "all" ||
        (taskFilterStatus === "Done" && stNum === 2) ||
        (taskFilterStatus === "InProgress" && stNum === 1) ||
        (taskFilterStatus === "Todo" && stNum === 0);
      return matchesSearch && matchesStatus;
    });
  }, [memberData?.tasks, taskSearch, taskFilterStatus]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-xs text-gray-500 font-medium">Memuat profil lengkap anggota...</p>
        </div>
      </div>
    );
  }

  if (error || !memberData) {
    return (
      <div className="py-20 text-center space-y-4 px-4">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Profil Anggota Tidak Ditemukan
        </h2>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Anggota ini tidak terdaftar, telah dihapus, atau Anda tidak memiliki hak akses multi-tenant untuk melihat data ini.
        </p>
        <Button
          onClick={() => router.push("/members")}
          className="gap-2 bg-indigo-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Direktori Tim
        </Button>
      </div>
    );
  }

  const isCustomCover =
    memberData.coverPictureUrl &&
    (memberData.coverPictureUrl.startsWith("http") ||
      memberData.coverPictureUrl.startsWith("/uploads"));
  const coverGradient = getCoverGradientClass(memberData.coverPictureUrl);
  const initials = getInitials(memberData.fullName);

  return (
    <div className="mt-2 space-y-6 px-2 lg:px-6 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/members")}
            className="h-8 gap-1.5 text-xs text-gray-600 hover:text-indigo-600 dark:text-gray-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Direktori Tim</span>
          </Button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Profil Spesial Anggota
          </span>
        </div>

        <Breadcrumbs
          dividerType="chevron"
          items={[
            { href: "/", label: "Home" },
            { href: "/members", label: "Members" },
            { href: `/members/${memberId}`, label: memberData.fullName },
          ]}
        />
      </div>

      {/* Hero Panoramic Banner Card */}
      <div className="rounded-2xl border border-card-border bg-card-surface-area overflow-hidden shadow-sm">
        {/* Cover Banner */}
        <div
          style={
            isCustomCover
              ? {
                  backgroundImage: `url(${memberData.coverPictureUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
          className={`w-full h-40 sm:h-52 md:h-60 relative ${
            isCustomCover ? "" : `bg-gradient-to-r ${coverGradient}`
          } transition-all duration-500 flex items-end p-4 sm:p-6 overflow-hidden`}
        >
          <div
            className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Top Right Badges */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white/90 border border-white/20 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {memberData.companyName || "Holding Company"}
            </span>
          </div>
        </div>

        {/* Profile Identity & Quick Action Row */}
        <div className="px-5 pb-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            {/* Avatar & Main Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              {memberData.profilePictureUrl ? (
                <img
                  src={memberData.profilePictureUrl}
                  alt={memberData.fullName}
                  className="size-24 sm:size-28 rounded-2xl ring-4 ring-white dark:ring-gray-900 shadow-xl object-cover shrink-0"
                />
              ) : (
                <div
                  style={{ backgroundColor: memberData.avatarColor || "#6366F1" }}
                  className="size-24 sm:size-28 rounded-2xl ring-4 ring-white dark:ring-gray-900 shadow-xl flex items-center justify-center text-white font-black text-3xl sm:text-4xl shrink-0 select-none"
                >
                  {initials}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    {memberData.fullName}
                  </h1>
                  {memberData.isApproved && (
                    <span title="Akun Terverifikasi">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    </span>
                  )}
                  {memberData.roles?.includes("Administrator") && (
                    <span className="rounded-full bg-primary-50 border border-primary-500/30 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-950/60 dark:border-primary-500/30 dark:text-primary-300">
                      Administrator
                    </span>
                  )}
                  {memberData.roles?.includes("DataPurgeAdmin") &&
                    !memberData.roles?.includes("Administrator") && (
                      <span className="rounded-full bg-amber-100 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        Admin Pembersihan Data
                      </span>
                    )}
                </div>

                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {memberData.jobTitle}
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {memberData.email}
                  </span>
                  {memberData.phoneNumber && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {memberData.phoneNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-primary-500" />
                    [{memberData.companyCode || "WCH"}] {memberData.companyName}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Admin or Self) */}
            <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
              {(isAdmin || currentUser?.id === memberId) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditModal}
                  className="gap-1.5 text-xs text-primary-500 border-primary-500/30 hover:bg-primary-50 dark:border-primary-500/30 dark:text-primary-400"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Profil</span>
                </Button>
              )}

              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewPassword("");
                    setIsResetOpen(true);
                  }}
                  className="gap-1.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:border-amber-900/40 dark:text-amber-400"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Reset Sandi</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {/* Card 1: Total Tasks & Completion Rate */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Tugas Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-text-primary">
              {memberData.kpi.completedTasks}
            </span>
            <span className="text-xs text-gray-400 font-semibold">
              / {memberData.kpi.totalTasks} total
            </span>
          </div>
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
              <span>Tingkat Penyelesaian</span>
              <span>{memberData.kpi.completionRate}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${memberData.kpi.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Total Hours Logged */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Waktu Log</span>
            <Timer className="h-4 w-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
              {memberData.kpi.totalHours.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 font-semibold">jam kerja</span>
          </div>
          <p className="mt-2.5 text-[11px] text-gray-400">
            Tercatat dari sesi timer & timesheet aktif.
          </p>
        </div>

        {/* Card 3: Total Projects Involved */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Alokasi Proyek</span>
            <FolderGit2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {memberData.projects.length}
            </span>
            <span className="text-xs text-gray-400 font-semibold">proyek aktif</span>
          </div>
          <p className="mt-2.5 text-[11px] text-gray-400">
            Proyek yang memiliki kontribusi tugas.
          </p>
        </div>

        {/* Card 4: In-Progress Tasks */}
        <div className="rounded-2xl border border-card-border bg-card-background p-4.5 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Sedang Dikerjakan</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {memberData.kpi.inProgressTasks}
            </span>
            <span className="text-xs text-gray-400 font-semibold">tugas aktif</span>
          </div>
          <p className="mt-2.5 text-[11px] text-gray-400">
            {memberData.kpi.todoTasks} tugas antrean belum dimulai.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "tasks"
                ? "border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Kontribusi Tugas ({memberData.tasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "projects"
                ? "border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <FolderGit2 className="h-4 w-4" />
            <span>Portofolio Proyek ({memberData.projects.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timesheet")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "timesheet"
                ? "border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Timer className="h-4 w-4" />
            <span>Sesi Kerja Timesheet ({memberData.recentSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("corporate")}
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "corporate"
                ? "border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Identitas Korporat</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Kontribusi Tugas & Pekerjaan */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
              {(["all", "InProgress", "Done", "Todo"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTaskFilterStatus(st)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    taskFilterStatus === st
                      ? "bg-primary-500 text-white shadow-2xs"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {st === "all"
                    ? "Semua Tugas"
                    : st === "Done"
                    ? "Selesai"
                    : st === "InProgress"
                    ? "Sedang Dikerjakan"
                    : "Antrean (Todo)"}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari judul tugas / proyek..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="pl-8 text-xs w-full"
              />
            </div>
          </div>

          {/* Task Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className="group rounded-2xl border border-card-border bg-card-background p-4.5 shadow-2xs hover:shadow-md transition text-text-primary flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {t.projectName ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: t.projectColor || "#6366F1" }}
                      >
                        {t.projectName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-semibold">Umum</span>
                    )}

                    {(() => {
                      const stNum = parseTaskStatus(t.status);
                      const stInfo = TASK_STATUS_LABELS[stNum] || TASK_STATUS_LABELS[0];
                      return (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            stNum === 2
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : stNum === 1
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : stNum === 3
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {stInfo.label}
                        </span>
                      );
                    })()}
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug">
                    {t.title}
                  </h3>

                  {t.description && (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t.dueDate
                        ? new Date(t.dueDate).toLocaleDateString("id-ID")
                        : "Tanpa batas"}
                    </span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Progress: {t.progress}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        parseTaskStatus(t.status) === 2 ? "bg-emerald-500" : "bg-indigo-600"
                      }`}
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="col-span-full py-16 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl dark:border-gray-800">
                Tidak ada tugas yang sesuai dengan filter pencarian saat ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Portofolio Proyek */}
      {activeTab === "projects" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberData.projects.map((proj) => (
            <div
              key={proj.id}
              className="rounded-2xl border border-card-border bg-card-background p-5 shadow-2xs hover:shadow-md transition text-text-primary flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: proj.color || "#6366F1" }}
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {proj.clientName || "Internal"}
                    </span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {proj.status}
                  </span>
                </div>

                <h3 className="font-bold text-base text-gray-900 dark:text-white leading-snug">
                  {proj.name}
                </h3>

                {proj.description && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {proj.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
                    <span className="text-[10px] text-gray-400 block">Tugas Pengguna</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {proj.completedTasks} / {proj.totalTasks}
                    </span>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-2 dark:bg-gray-800/60">
                    <span className="text-[10px] text-gray-400 block">Jam Log Anggota</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      {proj.totalHours.toFixed(1)}j
                    </span>
                  </div>
                </div>

                {proj.deadline && (
                  <p className="text-[10px] text-gray-400 text-center pt-1">
                    Target Selesai: {new Date(proj.deadline).toLocaleDateString("id-ID")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {memberData.projects.length === 0 && (
            <div className="col-span-full py-16 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl dark:border-gray-800">
              Belum ada proyek yang dikerjakan oleh anggota ini.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sesi Kerja Timesheet */}
      {activeTab === "timesheet" && (
        <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                Riwayat Sesi Kerja Terbaru
              </h3>
              <p className="text-xs text-gray-500">
                20 sesi log pengerjaan tugas terakhir yang tercatat di sistem.
              </p>
            </div>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-full">
              Total: {memberData.kpi.totalHours.toFixed(1)} Jam
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Tugas & Proyek</th>
                  <th className="py-2.5 px-3">Mulai</th>
                  <th className="py-2.5 px-3">Selesai</th>
                  <th className="py-2.5 px-3">Durasi</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {memberData.recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {s.taskTitle}
                      </div>
                      {s.projectName && (
                        <span
                          className="inline-block mt-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: s.projectColor || "#6366F1" }}
                        >
                          {s.projectName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {new Date(s.startTime).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {s.endTime
                        ? new Date(s.endTime).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Aktif"}
                    </td>
                    <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {s.durationHours.toFixed(2)} jam
                    </td>
                    <td className="py-3 px-3 text-gray-400 italic max-w-xs truncate">
                      {s.notes || "-"}
                    </td>
                  </tr>
                ))}

                {memberData.recentSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                      Belum ada sesi kerja yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Identitas Korporat & Keamanan */}
      {activeTab === "corporate" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-2xs text-text-primary space-y-4">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <Building className="h-4 w-4 text-primary-500" />
              Afiliasi Perusahaan & Tenant
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block mb-0.5">Entitas Usaha</span>
                <p className="font-bold text-gray-900 dark:text-white">
                  {memberData.companyName || "Holding Company"}
                </p>
                <p className="text-[11px] text-primary-500 font-semibold">
                  Kode Tenant: [{memberData.companyCode || "WCH"}]
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block mb-0.5">Spesialisasi & Jabatan</span>
                <p className="font-bold text-gray-900 dark:text-white">
                  {memberData.jobTitle}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block mb-0.5">Tanggal Terdaftar</span>
                <p className="font-bold text-gray-900 dark:text-white">
                  {new Date(memberData.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-2xs text-text-primary space-y-4">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-500" />
              Hak Akses & Status Keamanan
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block mb-0.5">Status Persetujuan</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    memberData.isApproved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {memberData.isApproved ? "Disetujui & Aktif" : "Menunggu Persetujuan Admin"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block mb-0.5">Peran Otorisasi</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {memberData.roles?.map((r) => (
                    <span
                      key={r}
                      className="rounded-md bg-primary-50 border border-primary-500/30 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/60 dark:border-primary-500/30 dark:text-primary-300"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-[10px] text-gray-400 block mb-0.5">Identifikasi Unik Sistem</span>
                <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                  {memberData.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PROFIL ANGGOTA */}
      <Dialog isOpen={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-indigo-600" />
              <span>Edit Profil Anggota</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMemberMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Lengkap *
              </label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            {isAdmin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            )}

            {isAdmin && memberId !== "usr-superadmin" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Hak Akses
                </label>
                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value as "Member" | "DataPurgeAdmin" | "Administrator")
                  }
                  className="w-full text-xs rounded-xl border border-gray-300 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="Member">Pengguna Biasa (Member)</option>
                  <option value="DataPurgeAdmin">Admin Pembersihan Data (terbatas cleaning & purging)</option>
                  <option value="Administrator">Administrator Penuh</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Jabatan / Spesialisasi *
              </label>
              <Input
                value={editJobTitle}
                onChange={(e) => setEditJobTitle(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nomor WhatsApp / Telepon
              </label>
              <Input
                value={editPhoneNumber}
                onChange={(e) => setEditPhoneNumber(e.target.value)}
                placeholder="+62 812-..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Warna Aksen Avatar:
              </label>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_COLORS.map((col) => {
                  const isSelected = editAvatarColor.toLowerCase() === col.value.toLowerCase();
                  return (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setEditAvatarColor(col.value)}
                      style={{ backgroundColor: col.value }}
                      className="size-7 rounded-lg flex items-center justify-center text-white shadow-2xs hover:scale-110 transition"
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={updateMemberMutation.isPending}
                className="bg-indigo-600 text-white text-xs font-semibold"
              >
                {updateMemberMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL RESET SANDI (ADMIN ONLY) */}
      <Dialog isOpen={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <span>Reset Kata Sandi Anggota</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPassword || newPassword.length < 6) {
                toast.error("Kata sandi minimal 6 karakter.");
                return;
              }
              resetPasswordMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <p className="text-xs text-gray-500">
              Reset kredensial masuk untuk <strong>{memberData.fullName}</strong> ({memberData.email}).
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kata Sandi Baru
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Buat Acak
                </button>
              </div>

              <Input
                type="text"
                placeholder="Kata sandi baru (min. 6 karakter)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="bg-indigo-600 text-white text-xs font-semibold"
              >
                {resetPasswordMutation.isPending ? "Mereset..." : "Reset Sandi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

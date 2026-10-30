"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Users,
  CheckCircle2,
  XCircle,
  Unlock,
  Trash2,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  Search,
  UserCheck,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  List,
  Clock,
  BarChart3,
  Lock,
  Check,
  Briefcase,
  AlertCircle,
  Activity,
  Loader2,
  Code,
  Edit3,
  Save,
  RotateCcw,
  Palette,
  User,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface MemberItem {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  phoneNumber?: string | null;
  companyId: number;
  companyName: string;
  companyCode: string;
  isApproved: boolean;
  isLockedOut: boolean;
  createdAt: string;
  roles?: string[];
  canPurgeData?: boolean;
  avatarColor?: string | null;
  profilePictureUrl?: string | null;
  coverPictureUrl?: string | null;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  projects?: string[];
}

interface CompanyGroup {
  companyId: number;
  companyName: string;
  companyCode: string;
  totalMembers?: number;
  memberCount?: number;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  members: MemberItem[];
}

const AVATAR_COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

export default function MembersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filters & State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "locked">("all");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Modal Dialog States
  const [detailMember, setDetailMember] = useState<MemberItem | null>(null);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("#6366F1");
  const [editCompanyId, setEditCompanyId] = useState<number | undefined>(undefined);
  const [editRole, setEditRole] = useState<"Staff" | "Member" | "Project Manager" | "DataPurgeAdmin" | "Administrator">("Staff");

  const handleOpenDetail = (m: MemberItem) => {
    router.push(`/members/${m.id}`);
  };

  const handleStartEdit = (m: MemberItem) => {
    setDetailMember(m);
    setEditFullName(m.fullName);
    setEditEmail(m.email);
    setEditJobTitle(m.jobTitle);
    setEditPhoneNumber(m.phoneNumber || "");
    setEditAvatarColor(m.avatarColor || "#6366F1");
    setEditCompanyId(m.companyId);

    if (m.roles?.includes("Administrator") || m.id === "usr-superadmin") {
      setEditRole("Administrator");
    } else if (m.roles?.includes("Project Manager") || m.jobTitle?.toLowerCase().includes("project manager")) {
      setEditRole("Project Manager");
    } else if (m.roles?.includes("DataPurgeAdmin") || m.canPurgeData) {
      setEditRole("DataPurgeAdmin");
    } else {
      setEditRole("Staff");
    }
    setIsEditingMember(true);
  };

  const [resetTarget, setResetTarget] = useState<MemberItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemberItem | null>(null);
  const [confirmFullName, setConfirmFullName] = useState("");
  const [auditTarget, setAuditTarget] = useState<MemberItem | null>(null);

  // Admin Group Management States
  const [isManageAdminGroupOpen, setIsManageAdminGroupOpen] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");

  // Bulk Company Change States
  const [isBulkCompanyModalOpen, setIsBulkCompanyModalOpen] = useState(false);
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState<string[]>([]);
  const [bulkTargetCompanyId, setBulkTargetCompanyId] = useState<number | null>(null);
  const [bulkMemberSearch, setBulkMemberSearch] = useState("");

  // Member Audit Logs Query
  const { data: memberAuditLogs = [], isLoading: loadingMemberAudit } = useQuery<any[]>({
    queryKey: ["memberAuditLogs", auditTarget?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/audit-logs/member/${auditTarget?.id}`);
      return res.data?.data || [];
    },
    enabled: !!auditTarget?.id,
  });

  // Admin Group Members Query
  const {
    data: adminGroupMembers = [],
    isLoading: loadingAdminGroup,
    refetch: refetchAdminGroup,
  } = useQuery<any[]>({
    queryKey: ["adminGroupMembers"],
    queryFn: async () => {
      const res = await apiClient.get("/members/admin-group");
      return res.data?.data || [];
    },
    enabled: isManageAdminGroupOpen,
  });

  const addAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post("/members/admin-group/add", { email });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Hak akses Administrator berhasil diberikan!");
      setAdminEmailInput("");
      queryClient.invalidateQueries({ queryKey: ["adminGroupMembers"] });
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menambahkan pengguna ke group admin.");
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post("/members/admin-group/remove", { email });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Hak akses Administrator berhasil dicabut.");
      queryClient.invalidateQueries({ queryKey: ["adminGroupMembers"] });
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mencabut hak akses administrator.");
    },
  });

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

  // 2. Fetch Members & Company Groups
  const { data: membersResponse, isLoading } = useQuery<{
    data: MemberItem[];
    groups: CompanyGroup[];
  }>({
    queryKey: ["membersList"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return {
        data: res.data.data || [],
        groups: res.data.groups || [],
      };
    },
  });

  const members = membersResponse?.data || [];
  const groups = membersResponse?.groups || [];

  // 3. Fetch Master Companies for company reassignment
  const { data: allCompanies = [] } = useQuery<any[]>({
    queryKey: ["masterCompaniesList"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
  });

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = members.length;
    const pendingCount = members.filter((m) => !m.isApproved).length;
    const lockedCount = members.filter((m) => m.isLockedOut).length;
    const totalTasks = members.reduce((acc, m) => acc + (m.totalTasks || 0), 0);
    const completedTasks = members.reduce((acc, m) => acc + (m.completedTasks || 0), 0);
    const totalHours = members.reduce((acc, m) => acc + (m.totalHours || 0), 0);
    return { totalCount, pendingCount, lockedCount, totalTasks, completedTasks, totalHours };
  }, [members]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/members/${userId}/approve`, {
        adminNotes: "Disetujui oleh Administrator",
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Anggota berhasil disetujui!");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menyetujui anggota"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/members/${userId}/reject`, {
        reason: "Ditolak oleh Administrator",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pendaftaran anggota berhasil ditolak.");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menolak anggota"),
  });

  const unlockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/members/${userId}/unlock`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Akun anggota berhasil dibuka kuncinya!");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuka kunci akun"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, pass }: { userId: string; pass: string }) => {
      const res = await apiClient.post(`/members/${userId}/reset-password`, {
        newPassword: pass,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Kata sandi berhasil direset!");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mereset kata sandi"),
  });

  const deletePermanentMutation = useMutation({
    mutationFn: async ({ userId, targetFullName }: { userId: string; targetFullName: string }) => {
      const res = await apiClient.delete(`/members/${userId}/permanent`, {
        data: { targetFullName },
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Akun anggota berhasil dihapus permanen.");
      setDeleteTarget(null);
      setConfirmFullName("");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus anggota"),
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      fullName: string;
      email?: string | null;
      jobTitle: string;
      phoneNumber?: string | null;
      avatarColor?: string | null;
      companyId?: number | null;
      role?: string | null;
      canPurgeData?: boolean | null;
    }) => {
      const res = await apiClient.put(`/members/${payload.id}`, {
        fullName: payload.fullName,
        email: payload.email || undefined,
        jobTitle: payload.jobTitle,
        phoneNumber: payload.phoneNumber || null,
        avatarColor: payload.avatarColor || null,
        companyId: payload.companyId || null,
        role: payload.role || undefined,
        canPurgeData: payload.canPurgeData ?? undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Data profil anggota berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
      setIsEditingMember(false);
      if (detailMember) {
        setDetailMember({
          ...detailMember,
          fullName: editFullName,
          email: editEmail || detailMember.email,
          jobTitle: editJobTitle,
          phoneNumber: editPhoneNumber,
          avatarColor: editAvatarColor,
          roles: [editRole],
          canPurgeData: editRole === "DataPurgeAdmin" || editRole === "Administrator",
          companyId: editCompanyId || detailMember.companyId,
          companyName:
            groups.find((g) => g.companyId === editCompanyId)?.companyName ||
            detailMember.companyName,
          companyCode:
            groups.find((g) => g.companyId === editCompanyId)?.companyCode ||
            detailMember.companyCode,
        });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui profil"),
  });

  const bulkChangeCompanyMutation = useMutation({
    mutationFn: async ({ userIds, targetCompanyId }: { userIds: string[]; targetCompanyId: number }) => {
      const res = await apiClient.post("/members/bulk-change-company", {
        userIds,
        targetCompanyId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Perusahaan anggota dan tugas berhasil dipindahkan!");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
      setBulkSelectedUserIds([]);
      setIsBulkCompanyModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memindahkan perusahaan.");
    },
  });

  // Filter Logic
  const filterMember = (m: MemberItem) => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.jobTitle.toLowerCase().includes(q) ||
      (m.companyName && m.companyName.toLowerCase().includes(q)) ||
      (m.companyCode && m.companyCode.toLowerCase().includes(q)) ||
      (m.projects && m.projects.some((p) => p.toLowerCase().includes(q)));

    let matchesStatus = true;
    if (statusFilter === "pending") matchesStatus = !m.isApproved;
    if (statusFilter === "locked") matchesStatus = m.isLockedOut;

    return matchesSearch && matchesStatus;
  };

  const filteredFlatMembers = useMemo(() => {
    return members.filter(filterMember);
  }, [members, search, statusFilter]);

  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => ({
        ...g,
        filteredMembers: (g.members || []).filter(filterMember),
      }))
      .filter((g) => g.filteredMembers.length > 0 || (search === "" && statusFilter === "all"));
  }, [groups, search, statusFilter]);

  // Quick Random Password Generator
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let generated = "K3rja!";
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(generated);
    setShowPassword(true);
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Direktori Anggota Tim Enterprise
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              FSD 5.11
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pusat manajemen seluruh personel korporat, struktur grup perusahaan (*tenant*), persetujuan akun staf baru, dan reset kredensial.
          </p>
        </div>

        {/* View Mode Switcher & Admin Group Management */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setBulkSelectedUserIds([]);
                  setBulkTargetCompanyId(allCompanies[0]?.id || groups[0]?.companyId || null);
                  setBulkMemberSearch("");
                  setIsBulkCompanyModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition"
              >
                <Building className="h-4 w-4" />
                Pindah Perusahaan Staf
              </button>

              <button
                type="button"
                onClick={() => setIsManageAdminGroupOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-indigo-700 hover:to-purple-700 transition"
              >
                <ShieldCheck className="h-4 w-4" />
                Kelola Group Admin
              </button>
            </>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "grouped"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {isAdmin ? "Grup Perusahaan" : "Struktur Tim"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "flat"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Daftar Linier
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Anggota</span>
            <Users className="h-4 w-4 text-primary-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-text-primary">
            {metrics.totalCount}
          </p>
          <span className="text-[10px] text-gray-400">Seluruh unit tenant</span>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Antrean Approval</span>
            <UserCheck className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.pendingCount}
          </p>
          <span className="text-[10px] text-gray-400">Menunggu verifikasi admin</span>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Akun Terkunci</span>
            <Lock className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.lockedCount}
          </p>
          <span className="text-[10px] text-gray-400">Gagal login berturut-turut</span>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-2xs text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Tugas Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.completedTasks}{" "}
            <span className="text-xs font-semibold text-gray-400">/ {metrics.totalTasks}</span>
          </p>
          <span className="text-[10px] text-gray-400">
            {metrics.totalTasks > 0
              ? `${((metrics.completedTasks / metrics.totalTasks) * 100).toFixed(0)}% rasio tuntas`
              : "Belum ada tugas"}
          </span>
        </div>

        <div className="col-span-2 rounded-2xl border border-card-border bg-card-background p-4 shadow-2xs sm:col-span-1 text-text-primary">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Jam Kerja</span>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400">
            {metrics.totalHours.toFixed(1)} <span className="text-xs font-semibold text-gray-400">jam</span>
          </p>
          <span className="text-[10px] text-gray-400">Log waktu terdata</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card-background p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between text-text-primary">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari anggota, email, jabatan, atau perusahaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Semua ({metrics.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Menunggu Approval ({metrics.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("locked")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "locked"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Terkunci ({metrics.lockedCount})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "grouped" ? (
        // ----------------- GROUPED BY COMPANY VIEW -----------------
        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <div
              key={group.companyId}
              className="rounded-3xl border border-gray-200/90 bg-gray-50/60 p-5 shadow-2xs dark:border-gray-800 dark:bg-gray-950/40"
            >
              {/* Company Header Card */}
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 font-black text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Building className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                        {group.companyName}
                      </h2>
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        [{group.companyCode}]
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Entitas Korporat ID: #{group.companyId} • Total Staf: {group.totalMembers ?? group.memberCount ?? group.filteredMembers?.length ?? 0} Orang
                    </p>
                  </div>
                </div>

                {/* Company Mini KPI Metrics */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-800/60">
                    <span className="text-gray-400 block text-[10px]">Tugas Selesai</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {group.completedTasks} / {group.totalTasks}
                    </span>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-gray-800/60">
                    <span className="text-gray-400 block text-[10px]">Total Jam Log</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {group.totalHours.toFixed(1)} jam
                    </span>
                  </div>
                </div>
              </div>

              {/* Members Grid for This Company */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.filteredMembers.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    isAdmin={isAdmin}
                    currentUserId={userProfile?.id}
                    onOpenDetail={() => handleOpenDetail(m)}
                    onOpenEdit={() => handleStartEdit(m)}
                    onOpenAudit={() => setAuditTarget(m)}
                    onResetPassword={() => {
                      setResetTarget(m);
                      setNewPassword("");
                    }}
                    onDeletePermanent={() => {
                      setDeleteTarget(m);
                      setConfirmFullName("");
                    }}
                    onApprove={() => approveMutation.mutate(m.id)}
                    onReject={() => {
                      if (confirm(`Tolak dan hapus pendaftaran ${m.fullName}?`)) {
                        rejectMutation.mutate(m.id);
                      }
                    }}
                    onUnlock={() => unlockMutation.mutate(m.id)}
                    isApprovePending={approveMutation.isPending}
                    isUnlockPending={unlockMutation.isPending}
                  />
                ))}

                {group.filteredMembers.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-gray-400">
                    Tidak ada anggota di perusahaan ini yang cocok dengan filter pencarian.
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && !isLoading && (
            <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
              Tidak ada perusahaan atau anggota yang ditemukan.
            </div>
          )}
        </div>
      ) : (
        // ----------------- FLAT LIST VIEW -----------------
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFlatMembers.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              currentUserId={userProfile?.id}
              onOpenDetail={() => handleOpenDetail(m)}
              onOpenEdit={() => handleStartEdit(m)}
              onOpenAudit={() => setAuditTarget(m)}
              onResetPassword={() => {
                setResetTarget(m);
                setNewPassword("");
              }}
              onDeletePermanent={() => {
                setDeleteTarget(m);
                setConfirmFullName("");
              }}
              onApprove={() => approveMutation.mutate(m.id)}
              onReject={() => {
                if (confirm(`Tolak dan hapus pendaftaran ${m.fullName}?`)) {
                  rejectMutation.mutate(m.id);
                }
              }}
              onUnlock={() => unlockMutation.mutate(m.id)}
              isApprovePending={approveMutation.isPending}
              isUnlockPending={unlockMutation.isPending}
            />
          ))}

          {filteredFlatMembers.length === 0 && !isLoading && (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
              Tidak ada anggota yang ditemukan.
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: RESET PASSWORD DIRECT (ADMIN)                   */}
      {/* ======================================================== */}
      <Dialog isOpen={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <KeyRound className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                Reset Kata Sandi Anggota
              </DialogTitle>
            </div>
          </DialogHeader>

          {resetTarget && (
            <DialogBody className="space-y-4 py-2">
              {/* Target User Info */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                {resetTarget.profilePictureUrl ? (
                  <img
                    src={resetTarget.profilePictureUrl}
                    alt={resetTarget.fullName}
                    className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-2xs border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-2xs"
                    style={{ backgroundColor: resetTarget.avatarColor || "#6366F1" }}
                  >
                    {resetTarget.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                    {resetTarget.fullName}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{resetTarget.email}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    [{resetTarget.companyCode}] {resetTarget.jobTitle}
                  </p>
                </div>
              </div>

              {/* Password Input & Generator */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Kata Sandi Baru
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <Sparkles className="h-3 w-3" />
                    Buat Acak Aman
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi baru (min. 6 karakter)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-gray-400">
                  Minimal 6 karakter kombinasi huruf dan angka.
                </span>
              </div>

              {/* Information Notice */}
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="font-bold mb-0.5">Catatan Administrator:</p>
                Kata sandi akan diperbarui seketika dalam basis data. Anggota dapat langsung login menggunakan kata sandi ini tanpa perlu verifikasi email tambahan.
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetTarget(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              onClick={() => {
                if (resetTarget) {
                  resetPasswordMutation.mutate({
                    userId: resetTarget.id,
                    pass: newPassword,
                  });
                }
              }}
              className="gap-1.5 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {resetPasswordMutation.isPending ? "Menyimpan..." : "Terapkan Kata Sandi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: HAPUS PERMANEN (DOUBLE CONFIRMATION)             */}
      {/* ======================================================== */}
      <Dialog isOpen={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                Hapus Permanen Akun Anggota
              </DialogTitle>
            </div>
          </DialogHeader>

          {deleteTarget && (
            <DialogBody className="space-y-4 py-2">
              {/* Danger Warning Box */}
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="space-y-1">
                    <p className="font-extrabold">Tindakan ini tidak dapat dibatalkan!</p>
                    <p className="text-[11px] leading-relaxed">
                      Seluruh data kredensial login, sesi aktif, dan hak akses pengguna ini akan dimusnahkan secara permanen dari server.
                    </p>
                  </div>
                </div>
              </div>

              {/* Target User Info */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-2xs"
                  style={{ backgroundColor: deleteTarget.avatarColor || "#EF4444" }}
                >
                  {deleteTarget.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                    {deleteTarget.fullName}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{deleteTarget.email}</p>
                  <p className="text-[10px] text-gray-400">
                    {deleteTarget.jobTitle} • [{deleteTarget.companyCode}]
                  </p>
                </div>
              </div>

              {/* Double Confirmation Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug block">
                  Ketik nama lengkap anggota di bawah ini untuk konfirmasi:
                </label>
                <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-mono font-bold text-gray-800 dark:bg-gray-800 dark:text-gray-200 select-all">
                  {deleteTarget.fullName}
                </div>
                <Input
                  placeholder={`Ketik "${deleteTarget.fullName}" di sini...`}
                  value={confirmFullName}
                  onChange={(e) => setConfirmFullName(e.target.value)}
                  className="text-xs"
                />
                {confirmFullName === deleteTarget.fullName ? (
                  <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Nama cocok. Tombol hapus terbuka.
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400">
                    Ketik nama persis sama untuk mengaktifkan tombol hapus permanen.
                  </p>
                )}
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={
                !deleteTarget ||
                confirmFullName !== deleteTarget.fullName ||
                deletePermanentMutation.isPending
              }
              onClick={() => {
                if (deleteTarget) {
                  deletePermanentMutation.mutate({
                    userId: deleteTarget.id,
                    targetFullName: confirmFullName,
                  });
                }
              }}
              className="gap-1.5 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletePermanentMutation.isPending ? "Menghapus..." : "Hapus Akun Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: DETAIL PROFIL LENGKAP & EDIT ANGGOTA            */}
      {/* ======================================================== */}
      <Dialog isOpen={!!detailMember} onOpenChange={(open) => !open && setDetailMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
                <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                  {isEditingMember ? "Edit Profil Anggota" : "Detail Profil Anggota"}
                </DialogTitle>
              </div>

              {(isAdmin || detailMember?.id === userProfile?.id) && (
                <button
                  type="button"
                  onClick={() => setIsEditingMember(!isEditingMember)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400 transition-colors"
                >
                  {isEditingMember ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Lihat Ringkasan
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Data
                    </>
                  )}
                </button>
              )}
            </div>
          </DialogHeader>

          {detailMember && (
            <DialogBody className="space-y-5 py-2">
              {isEditingMember ? (
                /* FORM EDIT ANGGOTA */
                <form
                  id="edit-member-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editFullName.trim()) {
                      toast.error("Nama lengkap tidak boleh kosong.");
                      return;
                    }
                    if (!editJobTitle.trim()) {
                      toast.error("Spesialisasi / jabatan tidak boleh kosong.");
                      return;
                    }
                    updateMemberMutation.mutate({
                      id: detailMember.id,
                      fullName: editFullName.trim(),
                      email: isAdmin ? editEmail.trim() : undefined,
                      jobTitle: editJobTitle.trim(),
                      phoneNumber: editPhoneNumber.trim() || null,
                      avatarColor: editAvatarColor,
                      companyId: editCompanyId,
                      role: isAdmin ? editRole : undefined,
                      canPurgeData: isAdmin ? editRole === "DataPurgeAdmin" : undefined,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-indigo-500" />
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Nama lengkap anggota"
                      required
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-indigo-500" />
                      Alamat Email <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="nama@perusahaan.com"
                      required
                      disabled={!isAdmin}
                      className="text-xs font-medium"
                    />
                    {!isAdmin && (
                      <p className="text-[10px] text-gray-400">Hanya Administrator yang dapat mengubah email anggota.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                      Spesialisasi / Jabatan <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={editJobTitle}
                      onChange={(e) => setEditJobTitle(e.target.value)}
                      placeholder="contoh: Backend Engineer"
                      required
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-indigo-500" />
                      Nomor WhatsApp / Kontak
                    </label>
                    <Input
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(e.target.value)}
                      placeholder="+62 812-3456-7890"
                      className="text-xs font-medium"
                    />
                  </div>

                  {isAdmin && (allCompanies.length > 0 || groups.length > 0) && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-indigo-500" />
                        Perusahaan / Tenant
                      </label>
                      <select
                        value={editCompanyId ?? detailMember.companyId}
                        onChange={(e) => setEditCompanyId(Number(e.target.value))}
                        className="w-full text-xs font-medium rounded-xl border border-gray-300 bg-white p-2.5 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {(allCompanies.length > 0 ? allCompanies : groups).map((c: any) => {
                          const cId = c.id ?? c.companyId;
                          const cCode = c.code ?? c.companyCode;
                          const cName = c.name ?? c.companyName;
                          return (
                            <option key={cId} value={cId}>
                              [{cCode}] {cName}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-gray-400">
                        Memindahkan perusahaan anggota akan otomatis memindahkan seluruh tugas yang ditugaskan ke anggota ini.
                      </p>
                    </div>
                  )}

                  {/* Avatar Color Swatches */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-indigo-500" />
                      Warna Aksen Avatar
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {AVATAR_COLORS.map((col) => {
                        const isSelected = editAvatarColor.toLowerCase() === col.toLowerCase();
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setEditAvatarColor(col)}
                            style={{ backgroundColor: col }}
                            className="size-7 rounded-lg flex items-center justify-center text-white shadow-xs transition-transform hover:scale-110"
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hak Akses & Peran Sistem (Admin Only) */}
                  {isAdmin && (
                    <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                          Hak Akses & Peran Sistem
                        </label>
                        {detailMember.id === "usr-superadmin" && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                            Akun Root SuperAdmin
                          </span>
                        )}
                      </div>

                      {detailMember.id === "usr-superadmin" ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                          Peran akun SuperAdmin utama dilindungi secara permanen dan tidak dapat diubah demi stabilitas sistem.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Staff (Member) */}
                          <label
                            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                              editRole === "Staff" || editRole === "Member"
                                ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30"
                                : "border-gray-200 hover:bg-gray-50/60 dark:border-gray-700 dark:hover:bg-gray-800/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="editMemberRole"
                              value="Staff"
                              checked={editRole === "Staff" || editRole === "Member"}
                              onChange={() => setEditRole("Staff")}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="font-bold text-gray-900 dark:text-white">Staff (Pengguna Operasional)</div>
                              <p className="text-gray-500 text-[11px] leading-relaxed">
                                Anggota pelaksana non-admin. Menu disesuaikan khusus aktivitas kerja: tugas, timesheet, presensi, kalender, catatan, dan profil.
                              </p>
                            </div>
                          </label>

                          {/* Project Manager */}
                          <label
                            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                              editRole === "Project Manager"
                                ? "border-purple-500 bg-purple-50/50 dark:border-purple-500 dark:bg-purple-950/30"
                                : "border-gray-200 hover:bg-gray-50/60 dark:border-gray-700 dark:hover:bg-gray-800/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="editMemberRole"
                              value="Project Manager"
                              checked={editRole === "Project Manager"}
                              onChange={() => setEditRole("Project Manager")}
                              className="mt-0.5 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white">Project Manager</span>
                                <span className="rounded-full bg-purple-100 px-1.5 py-0.2 text-[9px] font-extrabold text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                                  Admin Perusahaan (Tampil di Dashboard)
                                </span>
                              </div>
                              <p className="text-gray-500 text-[11px] leading-relaxed">
                                Admin untuk perusahaan ini. Memiliki kebijakan seperti admin (kelola proyek, tugas tim, approval anggota, audit trail), wajib ditampilkan di dashboard sebagai anggota, kecuali menu Konfigurasi Sistem.
                              </p>
                            </div>
                          </label>

                          {/* Administrator */}
                          <label
                            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                              editRole === "Administrator"
                                ? "border-indigo-600 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40"
                                : "border-gray-200 hover:bg-gray-50/60 dark:border-gray-700 dark:hover:bg-gray-800/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="editMemberRole"
                              value="Administrator"
                              checked={editRole === "Administrator"}
                              onChange={() => setEditRole("Administrator")}
                              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white">Admin (Perawatan Aplikasi)</span>
                                <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[9px] font-extrabold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                                  System Admin Penuh
                                </span>
                              </div>
                              <p className="text-gray-500 text-[11px] leading-relaxed">
                                Berfokus pada perawatan aplikasi & konfigurasi enterprise menyeluruh. Datanya tidak diikutsertakan pada chart dashboard performa kerja.
                              </p>
                            </div>
                          </label>

                          {/* DataPurgeAdmin */}
                          <label
                            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                              editRole === "DataPurgeAdmin"
                                ? "border-amber-500 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-950/30"
                                : "border-gray-200 hover:bg-gray-50/60 dark:border-gray-700 dark:hover:bg-gray-800/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="editMemberRole"
                              value="DataPurgeAdmin"
                              checked={editRole === "DataPurgeAdmin"}
                              onChange={() => setEditRole("DataPurgeAdmin")}
                              className="mt-0.5 text-amber-600 focus:ring-amber-500"
                            />
                            <div className="min-w-0 flex-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white">
                                  Admin Pembersihan Data (Purge Admin)
                                </span>
                                <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-extrabold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                  Setingkat Admin (Terbatas)
                                </span>
                              </div>
                              <p className="text-gray-500 text-[11px] leading-relaxed">
                                Diberikan hak akses ke menu Konfigurasi &gt; Pembersihan Data untuk monitoring storage database, VACUUM maintenance, dan purging data log lama.
                              </p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              ) : (
                /* READ-ONLY RINGKASAN PROFIL */
                <>
                  {/* Header Profile Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md"
                      style={{ backgroundColor: detailMember.avatarColor || "#6366F1" }}
                    >
                      {detailMember.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white truncate">
                          {detailMember.fullName}
                        </h3>
                        {!detailMember.isApproved ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                            Pending
                          </span>
                        ) : detailMember.isLockedOut ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                            Terkunci
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {detailMember.jobTitle}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        ID Pengguna: <span className="font-mono">{detailMember.id}</span>
                      </p>
                    </div>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block mb-1">Email Korporat</span>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white truncate">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{detailMember.email}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block mb-1">Nomor Telepon</span>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white truncate">
                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>{detailMember.phoneNumber || "Tidak tercatat"}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block mb-1">Entitas Perusahaan</span>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white truncate">
                        <Building className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>
                          [{detailMember.companyCode}] {detailMember.companyName}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                      <span className="text-[10px] text-gray-400 block mb-1">Tanggal Terdaftar</span>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>
                          {new Date(detailMember.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Productivity & Work Performance */}
                  <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                      Ringkasan Kinerja & Beban Kerja
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/60">
                        <span className="text-[10px] text-gray-400 block">Total Tugas</span>
                        <span className="text-lg font-black text-gray-900 dark:text-white">
                          {detailMember.totalTasks}
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/60">
                        <span className="text-[10px] text-gray-400 block">Tugas Selesai</span>
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {detailMember.completedTasks}
                        </span>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/60">
                        <span className="text-[10px] text-gray-400 block">Total Jam Log</span>
                        <span className="text-lg font-black text-sky-600 dark:text-sky-400">
                          {detailMember.totalHours.toFixed(1)}j
                        </span>
                      </div>
                    </div>

                    {detailMember.totalTasks > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                          <span>Penyelesaian Tugas</span>
                          <span>
                            {(
                              (detailMember.completedTasks / detailMember.totalTasks) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                100,
                                (detailMember.completedTasks / detailMember.totalTasks) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {/* Alokasi Proyek */}
                    {detailMember.projects && detailMember.projects.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                        <span className="text-[10px] text-gray-400 block mb-1.5 font-bold uppercase tracking-wider">
                          Proyek yang Dikerjakan ({detailMember.projects.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {detailMember.projects.map((proj) => (
                            <span
                              key={proj}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                              {proj}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-center text-xs text-gray-400 italic dark:border-gray-800 dark:bg-gray-800/40">
                        Belum ada alokasi proyek aktif
                      </div>
                    )}
                  </div>
                </>
              )}
            </DialogBody>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {isEditingMember ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setIsEditingMember(false)}
                  className="text-xs"
                >
                  Batal
                </Button>

                <Button
                  size="sm"
                  type="submit"
                  form="edit-member-form"
                  disabled={updateMemberMutation.isPending}
                  className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {updateMemberMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const target = detailMember;
                    setDetailMember(null);
                    setAuditTarget(target);
                  }}
                  className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/40 dark:text-indigo-400"
                >
                  <Activity className="h-3.5 w-3.5" />
                  Buka Log Aktivitas
                </Button>

                <div className="flex items-center gap-2">
                  {(isAdmin || detailMember?.id === userProfile?.id) && (
                    <Button
                      size="sm"
                      onClick={() => setIsEditingMember(true)}
                      className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit Profil
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDetailMember(null)}
                    className="text-xs"
                  >
                    Tutup
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 4: DETAIL LOG AUDIT & AKTIVITAS ANGGOTA            */}
      {/* ======================================================== */}
      <Dialog isOpen={!!auditTarget} onOpenChange={(open) => !open && setAuditTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                Log Audit & Aktivitas Anggota
              </DialogTitle>
            </div>
          </DialogHeader>

          {auditTarget && (
            <DialogBody className="space-y-4 py-2">
              {/* Header Profile Info */}
              <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black text-white shadow-2xs"
                  style={{ backgroundColor: auditTarget.avatarColor || "#6366F1" }}
                >
                  {auditTarget.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                    {auditTarget.fullName}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">{auditTarget.email}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    [{auditTarget.companyCode}] {auditTarget.jobTitle} • User ID: {auditTarget.id}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Mutasi</span>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {memberAuditLogs.length}
                  </span>
                </div>
              </div>

              {/* Audit Activity List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Riwayat aksi sistem, mutasi data, dan keamanan:</span>
                </div>

                {loadingMemberAudit ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-600" />
                    Memuat riwayat aktivitas audit anggota...
                  </div>
                ) : memberAuditLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-xs text-gray-400 dark:border-gray-800">
                    <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    Belum ada riwayat aktivitas mutasi yang tercatat untuk anggota ini.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950/60 ml-3 space-y-4 py-1">
                    {memberAuditLogs.map((log: any) => {
                      let parsedDetails: any = null;
                      try {
                        if (log.details) parsedDetails = JSON.parse(log.details);
                      } catch {}

                      const date = new Date(log.timestamp);
                      const displaySummary =
                        parsedDetails?.actionSummary ||
                        `${log.controllerName} / ${log.actionName}`;
                      const isSuccess = log.statusCode >= 200 && log.statusCode < 300;

                      return (
                        <div key={log.id} className="relative pl-5">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                              isSuccess ? "bg-indigo-600" : "bg-rose-500"
                            }`}
                          />

                          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-800/40 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${
                                    log.httpMethod === "POST"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : log.httpMethod === "PUT"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : log.httpMethod === "DELETE"
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  }`}
                                >
                                  {log.httpMethod}
                                </span>
                                {parsedDetails?.module && (
                                  <span className="rounded-md bg-gray-200/80 px-1.5 py-0.5 text-[9px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    {parsedDetails.module}
                                  </span>
                                )}
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {displaySummary}
                                </span>
                              </div>

                              <span className="text-[10px] text-gray-400 font-mono">
                                {date.toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                •{" "}
                                {date.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 text-[10px] text-gray-400 font-mono">
                              <span>Endpoint: {log.path}</span>
                              <span>•</span>
                              <span>
                                Status:{" "}
                                <span
                                  className={`font-bold ${
                                    isSuccess ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {log.statusCode}
                                </span>
                              </span>
                              <span>•</span>
                              <span>Durasi: {log.durationMs}ms</span>
                            </div>

                            {parsedDetails?.parameters && (
                              <details className="mt-2 group">
                                <summary className="cursor-pointer text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                  Rincian Parameter
                                </summary>
                                <pre className="mt-1.5 max-h-32 overflow-y-auto rounded-lg bg-gray-900 p-2 text-[10px] font-mono text-emerald-400">
                                  {JSON.stringify(parsedDetails.parameters, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAuditTarget(null)}
              className="text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 5: KELOLA GROUP ADMINISTRATOR                      */}
      {/* ======================================================== */}
      <Dialog isOpen={isManageAdminGroupOpen} onOpenChange={setIsManageAdminGroupOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60">
                <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                  Kelola Group Administrator
                </DialogTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tambahkan email pengguna untuk memberikan hak akses setara Administrator sistem.
                </p>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4 py-2">
            {/* Form Tambah Admin */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1.5">
                Tambahkan Pengguna ke Group Admin
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminEmailInput.trim()) {
                    toast.error("Masukkan email pengguna.");
                    return;
                  }
                  addAdminMutation.mutate(adminEmailInput.trim());
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Contoh: staf@perusahaan.com..."
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
                <Button
                  size="sm"
                  type="submit"
                  disabled={!adminEmailInput.trim() || addAdminMutation.isPending}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
                >
                  {addAdminMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  Jadikan Admin
                </Button>
              </form>
              <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                Pengguna yang dimasukkan akan langsung memperoleh otoritas role Administrator penuh (FSD 5.11).
              </p>
            </div>

            {/* Daftar Anggota Group Admin */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Daftar Anggota Group Administrator ({adminGroupMembers.length})
                </h4>
                <button
                  type="button"
                  onClick={() => refetchAdminGroup()}
                  className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Refresh
                </button>
              </div>

              {loadingAdminGroup ? (
                <div className="flex items-center justify-center py-6 text-xs text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Memuat daftar admin...
                </div>
              ) : adminGroupMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500 dark:border-gray-800">
                  Belum ada anggota tambahan dalam group admin.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {adminGroupMembers.map((admin) => {
                    const isSuper = admin.email?.toLowerCase() === "admin@trackerkerja.local" || admin.id === "usr-superadmin";
                    const isCurrent = admin.id === userProfile?.id || admin.email?.toLowerCase() === userProfile?.email?.toLowerCase();
                    return (
                      <div
                        key={admin.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-800 dark:bg-gray-800/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: admin.avatarColor || "#6366F1" }}
                          >
                            {admin.fullName?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {admin.fullName}
                              </span>
                              {isSuper ? (
                                <span className="rounded-md bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                  Super Admin
                                </span>
                              ) : (
                                <span className="rounded-md bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  Admin
                                </span>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] text-gray-400 font-normal">(Anda)</span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                              {admin.email}
                            </span>
                          </div>
                        </div>

                        {!isSuper && !isCurrent && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Yakin ingin mencabut hak akses Administrator untuk ${admin.fullName} (${admin.email})?`)) {
                                removeAdminMutation.mutate(admin.email);
                              }
                            }}
                            disabled={removeAdminMutation.isPending}
                            className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          >
                            Cabut Akses
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsManageAdminGroupOpen(false)}
              className="text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL BULK PINDAH PERUSAHAAN ANGGOTA */}
      <Dialog isOpen={isBulkCompanyModalOpen} onOpenChange={setIsBulkCompanyModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                  Pindah Perusahaan Staf (Bulk Reassignment)
                </DialogTitle>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pindahkan staf dan otomatis sinkronkan seluruh tugas (*task*) yang ditugaskan ke perusahaan tujuan.
                </p>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4 py-2">
            {/* Target Company Selection */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Pilih Perusahaan Tujuan <span className="text-rose-500">*</span>
              </label>
              <select
                value={bulkTargetCompanyId ?? ""}
                onChange={(e) => setBulkTargetCompanyId(Number(e.target.value))}
                className="w-full text-xs font-semibold rounded-xl border border-gray-300 bg-white p-2.5 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(allCompanies.length > 0 ? allCompanies : groups).map((c: any) => {
                  const cId = c.id ?? c.companyId;
                  const cCode = c.code ?? c.companyCode;
                  const cName = c.name ?? c.companyName;
                  return (
                    <option key={cId} value={cId}>
                      [{cCode}] {cName}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Penting: Seluruh tugas yang ditugaskan ke staf yang dipindahkan akan otomatis dialihkan ke perusahaan ini agar timesheet dapat digenerate secara akurat.
              </p>
            </div>

            {/* Member Selection Search & Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    value={bulkMemberSearch}
                    onChange={(e) => setBulkMemberSearch(e.target.value)}
                    placeholder="Cari nama, email, atau jabatan staf..."
                    className="pl-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      const filteredIds = members
                        .filter((m) => {
                          const q = bulkMemberSearch.toLowerCase();
                          return (
                            m.fullName.toLowerCase().includes(q) ||
                            m.email.toLowerCase().includes(q) ||
                            m.jobTitle.toLowerCase().includes(q)
                          );
                        })
                        .map((m) => m.id);
                      setBulkSelectedUserIds(Array.from(new Set([...bulkSelectedUserIds, ...filteredIds])));
                    }}
                    className="text-[11px] h-8 px-2.5 font-semibold"
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => setBulkSelectedUserIds([])}
                    className="text-[11px] h-8 px-2.5 text-gray-500"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="text-[11px] font-semibold text-gray-500 flex items-center justify-between px-1">
                <span>Daftar Staf ({members.length})</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Terpilih: {bulkSelectedUserIds.length} staf
                </span>
              </div>

              {/* Members Scrollable List */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-900/40">
                {members
                  .filter((m) => {
                    if (!bulkMemberSearch) return true;
                    const q = bulkMemberSearch.toLowerCase();
                    return (
                      m.fullName.toLowerCase().includes(q) ||
                      m.email.toLowerCase().includes(q) ||
                      m.jobTitle.toLowerCase().includes(q)
                    );
                  })
                  .map((m) => {
                    const isSelected = bulkSelectedUserIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between rounded-lg border p-2.5 cursor-pointer transition ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-950/30"
                            : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700/60 dark:bg-gray-800/60 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBulkSelectedUserIds([...bulkSelectedUserIds, m.id]);
                              } else {
                                setBulkSelectedUserIds(bulkSelectedUserIds.filter((id) => id !== m.id));
                              }
                            }}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                          />
                          <div
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                            style={{ backgroundColor: m.avatarColor || "#6366F1" }}
                          >
                            {m.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {m.fullName}
                              </span>
                              <span className="rounded bg-gray-100 px-1 py-0.2 text-[9px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                [{m.companyCode}]
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                              {m.email} • {m.jobTitle}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="text-[10px] font-semibold text-gray-500 block">
                            {m.totalTasks} task
                          </span>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="flex items-center justify-between w-full">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setIsBulkCompanyModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>

            <Button
              size="sm"
              type="button"
              disabled={
                bulkSelectedUserIds.length === 0 ||
                !bulkTargetCompanyId ||
                bulkChangeCompanyMutation.isPending
              }
              onClick={() => {
                if (bulkTargetCompanyId && bulkSelectedUserIds.length > 0) {
                  bulkChangeCompanyMutation.mutate({
                    userIds: bulkSelectedUserIds,
                    targetCompanyId: bulkTargetCompanyId,
                  });
                }
              }}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {bulkChangeCompanyMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memindahkan...
                </>
              ) : (
                <>
                  <Building className="h-3.5 w-3.5" />
                  Pindahkan {bulkSelectedUserIds.length} Staf &amp; Tugas
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------- SUBCOMPONENT: MEMBER CARD -----------------
interface MemberCardProps {
  member: MemberItem;
  isAdmin: boolean;
  currentUserId?: string;
  onOpenDetail: () => void;
  onOpenEdit?: () => void;
  onOpenAudit?: () => void;
  onResetPassword: () => void;
  onDeletePermanent: () => void;
  onApprove: () => void;
  onReject: () => void;
  onUnlock: () => void;
  isApprovePending: boolean;
  isUnlockPending: boolean;
}

function MemberCard({
  member: m,
  isAdmin,
  currentUserId,
  onOpenDetail,
  onOpenEdit,
  onOpenAudit,
  onResetPassword,
  onDeletePermanent,
  onApprove,
  onReject,
  onUnlock,
  isApprovePending,
  isUnlockPending,
}: MemberCardProps) {
  const router = useRouter();
  const isSuperadmin = m.id === "usr-superadmin";
  const isSelf = m.id === currentUserId;

  return (
    <div
      onClick={() => router.push(`/members/${m.id}`)}
      className={`group flex flex-col justify-between rounded-2xl border bg-card-background text-text-primary p-5 shadow-2xs transition-all hover:shadow-md cursor-pointer hover:border-primary-400 ${
        !m.isApproved
          ? "border-amber-300 bg-amber-50/20 dark:border-amber-800/80"
          : m.isLockedOut
          ? "border-rose-300 bg-rose-50/20 dark:border-rose-800/80"
          : "border-card-border hover:border-primary-400 dark:hover:border-primary-500"
      }`}
    >
      <div>
        {/* Top Header: Avatar + Name + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {m.profilePictureUrl ? (
              <img
                src={m.profilePictureUrl}
                alt={m.fullName}
                className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-2xs border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-2xs text-sm"
                style={{ backgroundColor: m.avatarColor || "#6366F1" }}
              >
                {m.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/members/${m.id}`);
                }}
                className="font-bold text-sm text-text-primary hover:text-primary-500 dark:hover:text-primary-400 leading-tight truncate text-left block"
              >
                {m.fullName}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.jobTitle}</p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="shrink-0 flex items-center gap-1">
            {m.roles?.includes("Administrator") || m.roles?.includes("SuperAdmin") || m.id === "usr-superadmin" ? (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                Admin
              </span>
            ) : m.roles?.includes("Project Manager") || m.jobTitle?.toLowerCase().includes("project manager") ? (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-700 dark:bg-purple-950/60 dark:text-purple-400">
                Project Manager
              </span>
            ) : m.roles?.includes("DataPurgeAdmin") || m.canPurgeData ? (
              <span
                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                title="Admin Pembersihan & Purge Data"
              >
                Purge Admin
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Staff
              </span>
            )}
            {!m.isApproved ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                Pending
              </span>
            ) : m.isLockedOut ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                Terkunci
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Aktif
              </span>
            )}
          </div>
        </div>

        {/* Info Details: Email, Phone & Company */}
        <div className="mt-4 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{m.email}</span>
          </div>
          {m.phoneNumber && (
            <div className="flex items-center gap-2 truncate">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{m.phoneNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Building className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">
              [{m.companyCode || "WCH"}] {m.companyName || "Wahana Holding"}
            </span>
          </div>
        </div>

        {/* Work Metrics Bar */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5 text-center dark:border-gray-800 dark:bg-gray-800/40">
          <div>
            <span className="block text-[10px] text-gray-400">Tugas Tuntas</span>
            <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200">
              {m.completedTasks} / {m.totalTasks}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-gray-400">Waktu Log</span>
            <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200">
              {(m.totalHours || 0).toFixed(1)}j
            </span>
          </div>
        </div>
        {/* Assigned Projects */}
        {m.projects && m.projects.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {m.projects.map((proj) => (
              <span
                key={proj}
                className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-300 shadow-2xs"
              >
                {proj}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/members/${m.id}`);
            }}
            className="text-[11px] font-semibold text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            Profil
          </button>
          {isAdmin && onOpenEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit();
              }}
              className="text-[11px] font-semibold text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
              title="Edit Profil & Hak Akses"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAudit?.();
            }}
            className="text-[11px] font-semibold text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
            title="Log Audit Aktivitas Anggota"
          >
            <Activity className="h-3 w-3" />
            Log
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Approval Controls (Admin Only) */}
          {isAdmin && !m.isApproved && (
            <>
              <Button
                size="sm"
                className="h-7 gap-1 bg-emerald-600 px-2 text-[11px] font-semibold text-white hover:bg-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
                disabled={isApprovePending}
              >
                <CheckCircle2 className="h-3 w-3" />
                Setujui
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject();
                }}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {/* Unlock Controls (Admin Only) */}
          {isAdmin && m.isLockedOut && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-amber-500 text-amber-600 px-2 text-[11px]"
              onClick={(e) => {
                e.stopPropagation();
                onUnlock();
              }}
              disabled={isUnlockPending}
            >
              <Unlock className="h-3 w-3" />
              Buka Kunci
            </Button>
          )}

          {/* Admin Direct Password Reset */}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px] text-gray-600 hover:text-indigo-600 hover:border-indigo-400 dark:text-gray-300 dark:hover:text-indigo-400"
              onClick={(e) => {
                e.stopPropagation();
                onResetPassword();
              }}
              title="Reset Kata Sandi"
            >
              <KeyRound className="h-3 w-3" />
              Reset Pass
            </Button>
          )}

          {/* Admin Permanent Delete (Double confirmation) */}
          {isAdmin && !isSuperadmin && !isSelf && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePermanent();
              }}
              title="Hapus Permanen Akun"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Bell,
  Plus,
  AlertTriangle,
  AlertOctagon,
  Megaphone,
  Wrench,
  Calendar,
  CheckCircle2,
  Trash2,
  Eye,
  Search,
  Globe,
  Building,
  Users,
  Clock,
  Edit,
  ShieldCheck,
  Check,
  Radio,
  FileText,
  UserCheck,
  Sparkles,
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

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  type: string; // "Mendesak / Darurat", "Penting", "Informasi Umum", "Pemeliharaan Sistem"
  startDate: string;
  endDate: string;
  isActive: boolean;
  companyId?: number | null;
  companyName?: string | null;
  companyCode?: string | null;
  createdByUserName?: string | null;
  createdAt: string;
  readCount: number;
  hasRead?: boolean;
}

interface AnnouncementReader {
  userId: string;
  fullName: string;
  email: string;
  jobTitle: string;
  companyName?: string | null;
  companyCode?: string | null;
  readAt: string;
  dontShowAgain: boolean;
}

interface CompanyOption {
  id: number;
  name: string;
  code: string;
}

const URGENCY_TYPES = [
  { value: "Mendesak / Darurat", label: "🚨 Mendesak / Darurat", color: "rose" },
  { value: "Penting", label: "⚠️ Penting", color: "amber" },
  { value: "Informasi Umum", label: "📢 Informasi Umum", color: "indigo" },
  { value: "Pemeliharaan Sistem", label: "🛠️ Pemeliharaan Sistem", color: "sky" },
];

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Dialog States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementItem | null>(null);
  const [readersTarget, setReadersTarget] = useState<AnnouncementItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<AnnouncementItem | null>(null);
  const [dontShowAgainCheck, setDontShowAgainCheck] = useState(false);

  // Form State for Create & Edit
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("Informasi Umum");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [formCompanyId, setFormCompanyId] = useState<string>("global");
  const [formIsActive, setFormIsActive] = useState(true);

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

  // 2. Fetch Target Companies (for Admin target selection)
  const { data: targetCompanies = [] } = useQuery<CompanyOption[]>({
    queryKey: ["announcementTargetCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/announcements/target-companies");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  // 3. Query Announcements
  const { data: announcements = [], isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ["announcementsList", isAdmin],
    queryFn: async () => {
      const endpoint = isAdmin ? "/announcements" : "/announcements/active";
      const res = await apiClient.get(endpoint);
      return res.data.data || [];
    },
  });

  // 4. Query Readers for Specific Announcement (Audit Modal)
  const { data: readersList = [], isLoading: isLoadingReaders } = useQuery<AnnouncementReader[]>({
    queryKey: ["announcementReaders", readersTarget?.id],
    queryFn: async () => {
      if (!readersTarget) return [];
      const res = await apiClient.get(`/announcements/${readersTarget.id}/readers`);
      return res.data.data || [];
    },
    enabled: !!readersTarget && isAdmin,
  });

  // Summary KPI Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const total = announcements.length;
    const active = announcements.filter(
      (a) => a.isActive && new Date(a.startDate) <= now && new Date(a.endDate) >= now
    ).length;
    const urgent = announcements.filter(
      (a) => a.type === "Mendesak / Darurat" || a.type === "Informasi Penting" || a.type === "Penting"
    ).length;
    const totalReads = announcements.reduce((acc, a) => acc + (a.readCount || 0), 0);
    return { total, active, urgent, totalReads };
  }, [announcements]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const compId = formCompanyId === "global" ? null : parseInt(formCompanyId);
      const res = await apiClient.post("/announcements", {
        title: formTitle.trim(),
        content: formContent.trim(),
        type: formType,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
        isActive: formIsActive,
        companyId: compId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Pengumuman berhasil diterbitkan!");
      setCreateModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["announcementsList"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menerbitkan pengumuman"),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: number) => {
      const compId = formCompanyId === "global" ? null : parseInt(formCompanyId);
      const res = await apiClient.put(`/announcements/${id}`, {
        title: formTitle.trim(),
        content: formContent.trim(),
        type: formType,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
        isActive: formIsActive,
        companyId: compId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Pengumuman berhasil diperbarui!");
      setEditTarget(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["announcementsList"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memperbarui pengumuman"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.patch(`/announcements/${id}/toggle-active`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Status aktif pengumuman berhasil diubah.");
      queryClient.invalidateQueries({ queryKey: ["announcementsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/announcements/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Pengumuman berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["announcementsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus"),
  });

  const markReadMutation = useMutation({
    mutationFn: async ({ id, dontShow }: { id: number; dontShow: boolean }) => {
      const res = await apiClient.post(`/announcements/${id}/mark-read`, {
        dontShowAgain: dontShow,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Pengumuman ditandai telah dibaca.");
      setDetailTarget(null);
      queryClient.invalidateQueries({ queryKey: ["announcementsList"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menandai status baca"),
  });

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormType("Informasi Umum");
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setFormCompanyId("global");
    setFormIsActive(true);
  };

  const handleOpenEdit = (a: AnnouncementItem) => {
    setEditTarget(a);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormType(a.type);
    setFormStartDate(new Date(a.startDate).toISOString().slice(0, 10));
    setFormEndDate(new Date(a.endDate).toISOString().slice(0, 10));
    setFormCompanyId(a.companyId ? a.companyId.toString() : "global");
    setFormIsActive(a.isActive);
  };

  // Filter Logic
  const filteredAnnouncements = useMemo(() => {
    const q = search.toLowerCase();
    const now = new Date();

    return announcements.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.companyName && a.companyName.toLowerCase().includes(q));

      const matchesType = typeFilter === "all" || a.type === typeFilter;

      let matchesStatus = true;
      const isCurrentlyActive =
        a.isActive && new Date(a.startDate) <= now && new Date(a.endDate) >= now;

      if (statusFilter === "active") matchesStatus = isCurrentlyActive;
      if (statusFilter === "inactive") matchesStatus = !isCurrentlyActive;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [announcements, search, typeFilter, statusFilter]);

  const getUrgencyBadge = (type: string) => {
    switch (type) {
      case "Mendesak / Darurat":
        return {
          bg: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900",
          icon: <AlertOctagon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />,
        };
      case "Penting":
      case "Informasi Penting":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-900",
          icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
        };
      case "Pemeliharaan Sistem":
        return {
          bg: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-900",
          icon: <Wrench className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />,
        };
      default:
        return {
          bg: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-900",
          icon: <Megaphone className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
        };
    }
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Pengumuman Korporat & Broadcast Internal
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              FSD 5.12
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Penyiaran informasi penting, peringatan darurat, audit tanda terima baca (*Read Receipts*), dan kepatuhan anti-overlap modal.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            className="gap-2 bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Terbitkan Pengumuman
          </Button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Pengumuman</span>
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{metrics.total}</p>
          <span className="text-[10px] text-gray-400">Seluruh arsip tayang</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Aktif Tayang</span>
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.active}
          </p>
          <span className="text-[10px] text-gray-400">Dapat diakses oleh staf</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Mendesak & Penting</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.urgent}
          </p>
          <span className="text-[10px] text-gray-400">Prioritas tinggi / darurat</span>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Dibaca Staf</span>
            <UserCheck className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400">
            {metrics.totalReads}{" "}
            <span className="text-xs font-semibold text-gray-400">kali</span>
          </p>
          <span className="text-[10px] text-gray-400">Audit kepatuhan informasi</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari judul pengumuman atau konten..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">Semua Kategori</option>
            {URGENCY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            Aktif
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "inactive"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800"
            }`}
          >
            Non-Aktif / Arsip
          </button>
        </div>
      </div>

      {/* Announcements Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredAnnouncements.map((a) => {
          const badge = getUrgencyBadge(a.type);
          const now = new Date();
          const isCurrentlyActive =
            a.isActive && new Date(a.startDate) <= now && new Date(a.endDate) >= now;
          const isGlobal = !a.companyId;

          return (
            <div
              key={a.id}
              className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-2xs transition-all hover:shadow-md dark:bg-gray-900 ${
                a.type === "Mendesak / Darurat"
                  ? "border-rose-200/90 hover:border-rose-400 dark:border-rose-900/60"
                  : a.type === "Penting"
                  ? "border-amber-200/90 hover:border-amber-400 dark:border-amber-900/60"
                  : "border-gray-200/80 hover:border-indigo-300 dark:border-gray-800"
              }`}
            >
              <div>
                {/* Header: Urgency & Scope Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${badge.bg}`}
                    >
                      {badge.icon}
                      {a.type}
                    </span>

                    {/* Scope Badge */}
                    {isGlobal ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900">
                        <Globe className="h-3 w-3" />
                        Lintas Korporat (Global)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        <Building className="h-3 w-3" />
                        [{a.companyCode || "TENANT"}] {a.companyName || "Perusahaan"}
                      </span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isCurrentlyActive
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }`}
                  >
                    {isCurrentlyActive ? "Aktif Tayang" : "Non-Aktif / Arsip"}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-3.5 font-extrabold text-base text-gray-900 dark:text-white leading-snug">
                  {a.title}
                </h3>

                {/* Content snippet */}
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {a.content}
                </p>

                {/* Metadata info */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(a.startDate).toLocaleDateString("id-ID")} -{" "}
                    {new Date(a.endDate).toLocaleDateString("id-ID")}
                  </span>

                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setReadersTarget(a)}
                      className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline-offset-2 hover:underline"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {a.readCount} Staf Telah Membaca
                    </button>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      Dibaca: {a.readCount} kali
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between dark:border-gray-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDetailTarget(a);
                    setDontShowAgainCheck(false);
                  }}
                  className="h-7 text-xs font-bold gap-1 text-gray-700 hover:text-indigo-600 dark:text-gray-300"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Baca Lengkap
                </Button>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-semibold"
                      onClick={() => toggleActiveMutation.mutate(a.id)}
                    >
                      {a.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      onClick={() => handleOpenEdit(a)}
                      title="Edit Pengumuman"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => {
                        if (confirm(`Hapus pengumuman "${a.title}"?`)) {
                          deleteMutation.mutate(a.id);
                        }
                      }}
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredAnnouncements.length === 0 && !isLoading && (
          <div className="col-span-full rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
            Tidak ada pengumuman yang cocok dengan filter pencarian.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: TERBITKAN / EDIT PENGUMUMAN (ADMIN)             */}
      {/* ======================================================== */}
      <Dialog
        isOpen={createModalOpen || !!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setEditTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Megaphone className="h-5 w-5" />
              <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                {editTarget ? "Edit Pengumuman Korporat" : "Terbitkan Pengumuman Baru"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (editTarget) {
                updateMutation.mutate(editTarget.id);
              } else {
                createMutation.mutate();
              }
            }}
          >
            <DialogBody className="space-y-4 py-2">
              {/* Judul */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Judul Pengumuman *
                </label>
                <Input
                  required
                  placeholder="Contoh: Pemeliharaan Server Database Terjadwal"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1 text-xs font-semibold"
                />
              </div>

              {/* Kategori Urgensi & Target Cakupan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Kategori Urgensi
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  >
                    {URGENCY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Target Cakupan Penyiaran
                  </label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="global">🌐 Seluruh Entitas (Global)</option>
                    {targetCompanies.map((c) => (
                      <option key={c.id} value={c.id.toString()}>
                        🏢 [{c.code}] {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tanggal Tayang */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Mulai Tayang
                  </label>
                  <Input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Selesai Tayang
                  </label>
                  <Input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="formIsActiveCheckbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="formIsActiveCheckbox"
                  className="text-xs font-bold text-gray-700 dark:text-gray-300"
                >
                  Aktifkan Pengumuman Langsung (Siarkan Sekarang)
                </label>
              </div>

              {/* Konten */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Isi Rincian Pengumuman *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Rincian informasi lengkap yang akan disiarkan kepada seluruh anggota tim..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 leading-relaxed dark:border-gray-800 dark:text-white"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreateModalOpen(false);
                  setEditTarget(null);
                }}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Menyimpan..."
                  : editTarget
                  ? "Simpan Perubahan"
                  : "Terbitkan Pengumuman"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: DAFTAR PEMBACA / READ RECEIPTS AUDIT (ADMIN)    */}
      {/* ======================================================== */}
      <Dialog isOpen={!!readersTarget} onOpenChange={(open) => !open && setReadersTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Users className="h-5 w-5" />
              <div>
                <DialogTitle className="text-base font-extrabold text-gray-900 dark:text-white">
                  Audit Pembaca Pengumuman
                </DialogTitle>
                <p className="text-xs text-gray-500 font-normal">
                  {readersTarget?.title} • Total Dibaca: {readersList.length} Staf
                </p>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="py-2 max-h-[60vh] overflow-y-auto">
            {readersList.length > 0 ? (
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200/80 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {readersList.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {r.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-gray-900 dark:text-white leading-tight">
                          {r.fullName}
                        </p>
                        <p className="text-[11px] text-gray-500">{r.email}</p>
                        <p className="text-[10px] text-gray-400">
                          {r.jobTitle} • [{r.companyCode || "WCH"}]
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block text-[11px] font-mono text-gray-500 dark:text-gray-400">
                        {new Date(r.readAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {r.dontShowAgain && (
                        <span className="inline-block mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 dark:bg-gray-800">
                          Jangan Tayang Lagi
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : isLoadingReaders ? (
              <p className="py-8 text-center text-xs text-gray-400">Memuat data pembaca...</p>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 py-10 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
                Belum ada staf yang menandai atau membaca pengumuman ini.
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReadersTarget(null)}
              className="text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: BACA DETAIL LENGKAP PENGUMUMAN (SEMUA ANGGOTA)  */}
      {/* ======================================================== */}
      <Dialog isOpen={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
        <DialogContent className="max-w-xl">
          {detailTarget && (
            <>
              <DialogHeader>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        getUrgencyBadge(detailTarget.type).bg
                      }`}
                    >
                      {getUrgencyBadge(detailTarget.type).icon}
                      {detailTarget.type}
                    </span>

                    {!detailTarget.companyId ? (
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        Lintas Korporat
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        [{detailTarget.companyCode}] {detailTarget.companyName}
                      </span>
                    )}
                  </div>

                  <DialogTitle className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                    {detailTarget.title}
                  </DialogTitle>

                  <p className="text-[11px] text-gray-400">
                    Periode Tayang: {new Date(detailTarget.startDate).toLocaleDateString("id-ID")} -{" "}
                    {new Date(detailTarget.endDate).toLocaleDateString("id-ID")} • Diterbitkan oleh:{" "}
                    <strong>{detailTarget.createdByUserName || "Administrator"}</strong>
                  </p>
                </div>
              </DialogHeader>

              <DialogBody className="py-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200 font-sans">
                  {detailTarget.content}
                </div>

                {/* Mark as read option */}
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                  <input
                    type="checkbox"
                    id="dontShowAgainCheck"
                    checked={dontShowAgainCheck}
                    onChange={(e) => setDontShowAgainCheck(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="dontShowAgainCheck"
                    className="text-xs text-gray-600 dark:text-gray-300 select-none cursor-pointer"
                  >
                    Jangan munculkan pengumuman ini lagi di beranda/modal saya (*Don&apos;t Show Again*)
                  </label>
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailTarget(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>

                <Button
                  size="sm"
                  disabled={markReadMutation.isPending}
                  onClick={() =>
                    markReadMutation.mutate({
                      id: detailTarget.id,
                      dontShow: dontShowAgainCheck,
                    })
                  }
                  className="gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Check className="h-4 w-4" />
                  {markReadMutation.isPending
                    ? "Menyimpan..."
                    : "Saya Mengerti & Telah Membaca"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

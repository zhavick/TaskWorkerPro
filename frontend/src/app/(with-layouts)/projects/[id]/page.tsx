"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Filter,
  Layers,
  Plus,
  Save,
  Search,
  Trash2,
  Unlink,
  User,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
  Sparkles,
  Loader2,
  ShieldCheck,
  Activity,
  Code,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import Link from "next/link";

const COLOR_PRESETS = [
  "#6366F1", // Indigo
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Rose
  "#8B5CF6", // Purple
  "#EC4899", // Pink
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPriorityBadge(priority: number) {
  switch (priority) {
    case 3:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
          Critical
        </span>
      );
    case 2:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
          High
        </span>
      );
    case 1:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          Medium
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-500/10 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 border border-gray-500/20">
          Low
        </span>
      );
  }
}

function getStatusBadge(status: number) {
  switch (status) {
    case 2:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> Done
        </span>
      );
    case 1:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
          <Clock className="h-3 w-3" /> In Progress
        </span>
      );
    case 3:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="h-3 w-3" /> Overdue
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 border border-gray-500/20">
          Todo
        </span>
      );
  }
}

export default function ProjectStudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = Number(params.id);

  // Form states for project metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [status, setStatus] = useState(0);
  const [projectManagerId, setProjectManagerId] = useState<string>("");
  const [budget, setBudget] = useState("0");
  const [actualCost, setActualCost] = useState("0");
  const [deadline, setDeadline] = useState("");

  // Task workbench filters
  const [taskSearch, setTaskSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Bulk assignment modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<number[]>([]);

  // Workbench tab selector (Tasks vs Audit Trail)
  const [activeTab, setActiveTab] = useState<"tasks" | "audit">("tasks");

  // Delete project confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // 1. Fetch User Profile to check RBAC role
  const { data: userProfile } = useQuery<any>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      const res = await apiClient.get("/profile");
      return res.data.data;
    },
  });
  const isAdmin =
    userProfile?.roles?.includes("Administrator") ||
    userProfile?.role === "Administrator";

  // 2. Fetch Project Detail
  const {
    data: project,
    isLoading: isProjectLoading,
    isError,
  } = useQuery<any>({
    queryKey: ["projectDetail", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}`);
      return res.data.data;
    },
    enabled: !isNaN(projectId) && projectId > 0,
  });

  // 2b. Fetch Project Audit Logs Timeline
  const { data: projectAuditLogs = [], isLoading: loadingProjectAudit } = useQuery<any[]>({
    queryKey: ["projectAuditLogs", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/audit-logs/project/${projectId}`);
      return res.data?.data || [];
    },
    enabled: !isNaN(projectId) && projectId > 0,
  });

  // 3. Fetch Team Members for PM selector
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersForProject"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data;
    },
  });

  // 4. Fetch Unassigned Tasks for Bulk Modal
  const { data: unassignedTasks = [], refetch: refetchUnassigned } = useQuery<any[]>({
    queryKey: ["unassignedTasks", projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${projectId}/unassigned-tasks`);
      return res.data.data;
    },
    enabled: bulkModalOpen,
  });

  // Sync state with fetched project data
  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setClientName(project.clientName || "");
      setColor(project.color || "#6366F1");
      setStatus(Number(project.status ?? 0));
      setProjectManagerId(project.projectManagerId || "");
      setBudget(String(project.budget ?? 0));
      setActualCost(String(project.actualCost ?? 0));
      setDeadline(project.deadline ? project.deadline.split("T")[0] : "");
    }
  }, [project]);

  // Update Project Mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        color,
        status: Number(status),
        clientName: clientName.trim(),
        projectManagerId: projectManagerId || null,
        budget: parseFloat(budget) || 0,
        actualCost: parseFloat(actualCost) || 0,
        deadline: deadline && !isNaN(new Date(deadline).getTime()) ? new Date(deadline).toISOString() : null,
      };
      const res = await apiClient.put(`/projects/${projectId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Perubahan metadata proyek berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["projectDetail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Gagal memperbarui data proyek.");
    },
  });

  // Unassign Task Mutation
  const unassignTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiClient.post(`/projects/${projectId}/unassign-task/${taskId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas berhasil dilepaskan dari proyek.");
      queryClient.invalidateQueries({ queryKey: ["projectDetail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal melepaskan tugas dari proyek.");
    },
  });

  // Bulk Assign Tasks Mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/projects/${projectId}/assign-tasks`, {
        taskIds: selectedUnassignedIds,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas berhasil dialokasikan ke proyek.");
      setBulkModalOpen(false);
      setSelectedUnassignedIds([]);
      queryClient.invalidateQueries({ queryKey: ["projectDetail", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengalokasikan tugas.");
    },
  });

  // Delete Project Mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      if (!isAdmin) {
        throw new Error("Hanya Administrator yang memiliki akses untuk menghapus proyek.");
      }
      const res = await apiClient.delete(`/projects/${projectId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Proyek berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      router.push("/projects");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Gagal menghapus proyek.");
    },
  });

  // Filtered task items in workbench
  const filteredTasks = useMemo(() => {
    if (!project?.tasks) return [];
    return project.tasks.filter((t: any) => {
      const matchesSearch =
        !taskSearch ||
        t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.taskCode.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (t.assignedToUserName &&
          t.assignedToUserName.toLowerCase().includes(taskSearch.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === "todo") matchesStatus = t.status === 0;
      else if (statusFilter === "inprogress") matchesStatus = t.status === 1;
      else if (statusFilter === "done") matchesStatus = t.status === 2;
      else if (statusFilter === "overdue") matchesStatus = t.status === 3;

      return matchesSearch && matchesStatus;
    });
  }, [project?.tasks, taskSearch, statusFilter]);

  // Calculated Financial Metrics
  const numBudget = parseFloat(budget) || 0;
  const numActualCost = parseFloat(actualCost) || 0;
  const remainingBudget = numBudget - numActualCost;
  const burnRatePercent = numBudget > 0 ? (numActualCost / numBudget) * 100 : 0;
  const isOverbudget = burnRatePercent > 100;
  const isWarning = burnRatePercent >= 80 && burnRatePercent <= 100;

  // Deadline calculation
  const deadlineDays = useMemo(() => {
    if (!deadline) return null;
    const target = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [deadline]);

  if (isProjectLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Memuat studio proyek...
        </p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Proyek Tidak Ditemukan
        </h2>
        <p className="text-sm text-gray-500">
          Proyek dengan ID #{projectId} tidak dapat dimuat atau telah dihapus.
        </p>
        <Link href="/projects">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Proyek
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-3 py-4 lg:px-8">
      {/* 1. TOP HEADER & BREADCRUMBS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="rounded-xl border border-gray-200/80 bg-white p-2.5 text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Studio Proyek #{project.id}
              </span>
              {project.clientName && (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {project.clientName}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {project.name}
            </h1>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setBulkModalOpen(true)}
              variant="outline"
              className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
            >
              <Plus className="h-4 w-4" />
              Alokasi Tugas Massal
            </Button>

            <Button
              onClick={() => updateProjectMutation.mutate()}
              disabled={updateProjectMutation.isPending}
              className="gap-2 bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              {updateProjectMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Mode Hanya Lihat (Admin Only)
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-3 shadow-xs">
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Mode Hanya Lihat (Read-Only):</span> Informasi dan anggaran proyek ini hanya dapat diedit oleh <strong>Administrator</strong>. Anda dapat memantau serapan biaya dan mengelola tugas proyek.
          </div>
        </div>
      )}

      {/* 2. 12-COLUMN STUDIO LAYOUT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT WORKSPACE: 8 COLUMNS */}
        <div className="space-y-6 lg:col-span-8">
          {/* Executive Overview & Description Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Informasi Umum & Ruang Lingkup
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Proyek *
                </label>
                <Input
                  value={name}
                  disabled={!isAdmin}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama proyek..."
                  className="font-semibold text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Entitas Klien / Sponsor
                  </label>
                  <Input
                    value={clientName}
                    disabled={!isAdmin}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Contoh: PT Wahana Digital Pratama"
                    className="disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Aksen Warna Proyek
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => isAdmin && setColor(c)}
                        className={`h-7 w-7 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          color.toLowerCase() === c.toLowerCase()
                            ? "scale-110 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900"
                            : "hover:scale-105 opacity-80"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      disabled={!isAdmin}
                      onChange={(e) => setColor(e.target.value)}
                      className="ml-2 h-7 w-7 cursor-pointer rounded border-0 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Deskripsi Ruang Lingkup Kerja
                </label>
                <textarea
                  rows={3}
                  value={description}
                  disabled={!isAdmin}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan tujuan strategis, batasan kerja, dan target penyelesaian proyek ini..."
                  className="w-full rounded-xl border border-gray-200 bg-transparent p-3 text-xs leading-relaxed text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Financial Analytics & Adaptive Burn Rate Panel (FSD 5.4) */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  Analitik Finansial & Burn Rate Proyek
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pengawasan real-time pagu anggaran terhadap realisasi pengeluaran riil tim.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOverbudget && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="h-3.5 w-3.5" /> OVERBUDGET ({burnRatePercent.toFixed(1)}%)
                  </span>
                )}
                {isWarning && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle className="h-3.5 w-3.5" /> WARNING ({burnRatePercent.toFixed(1)}%)
                  </span>
                )}
                {!isOverbudget && !isWarning && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> SAFE ({burnRatePercent.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>

            {/* 3 Metric Tiles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Pagu Anggaran (Budget)
                </span>
                <div className="mt-1 text-lg font-black text-gray-900 dark:text-white">
                  {formatRupiah(numBudget)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Biaya Riil (Actual Cost)
                </span>
                <div
                  className={`mt-1 text-lg font-black ${
                    isOverbudget
                      ? "text-rose-600 dark:text-rose-400"
                      : isWarning
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {formatRupiah(numActualCost)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Sisa Saldo Anggaran
                </span>
                <div
                  className={`mt-1 text-lg font-black ${
                    remainingBudget < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatRupiah(remainingBudget)}
                </div>
              </div>
            </div>

            {/* Adaptive Burn Rate Progress Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-gray-700 dark:text-gray-300">
                  Tingkat Serapan Anggaran (Burn Rate)
                </span>
                <span
                  className={
                    isOverbudget
                      ? "font-black text-rose-600 dark:text-rose-400"
                      : isWarning
                      ? "font-black text-amber-600 dark:text-amber-400"
                      : "font-black text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {burnRatePercent.toFixed(1)}%
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full transition-all duration-500 ${
                    isOverbudget
                      ? "bg-rose-500"
                      : isWarning
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(burnRatePercent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>0% (Awal)</span>
                <span>80% (Batas Aman)</span>
                <span>100% (Pagu Maksimal)</span>
              </div>
            </div>
          </div>

          {/* Workload & Time Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Total Tugas Terikat
                </span>
                <Layers className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                {project.completedTasks}{" "}
                <span className="text-sm font-medium text-gray-400">
                  / {project.totalTasks} Selesai ({project.progressPercent}%)
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${project.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Akumulasi Jam Kerja Riil
                </span>
                <Clock className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {Math.round((project.totalWorkDurationSeconds / 3600) * 10) / 10}{" "}
                <span className="text-sm font-medium text-gray-400">
                  Jam ({((project.totalWorkDurationSeconds / 3600) / 8).toFixed(1)} Man-Days)
                </span>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">
                Total durasi dari seluruh sesi pencatatan waktu tugas proyek ini.
              </p>
            </div>
          </div>

          {/* Project Tasks & Audit Workbench */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            {/* Workbench Tabs Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    activeTab === "tasks"
                      ? "bg-indigo-50 text-indigo-700 shadow-xs dark:bg-indigo-950/80 dark:text-indigo-300"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Daftar Tugas Proyek</span>
                  <span className="rounded-full bg-indigo-200/60 px-2 py-0.5 text-[10px] font-black text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                    {filteredTasks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("audit")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    activeTab === "audit"
                      ? "bg-indigo-50 text-indigo-700 shadow-xs dark:bg-indigo-950/80 dark:text-indigo-300"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  <span>Log Aktivitas & Audit</span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {projectAuditLogs.length}
                  </span>
                </button>
              </div>

              {activeTab === "tasks" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      value={taskSearch}
                      onChange={(e) => setTaskSearch(e.target.value)}
                      placeholder="Cari tugas..."
                      className="h-8 w-44 pl-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50/50 p-0.5 text-xs dark:border-gray-800 dark:bg-gray-800">
                    {["all", "todo", "inprogress", "done"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                          statusFilter === st
                            ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        }`}
                      >
                        {st === "all"
                          ? "Semua"
                          : st === "todo"
                          ? "Todo"
                          : st === "inprogress"
                          ? "In Progress"
                          : "Done"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TAB 1: TASKS LIST */}
            {activeTab === "tasks" && (
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">
                        Kode & Tugas
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">
                        Prioritas
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">
                        Progress
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">
                        PIC
                      </th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">
                        Waktu
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredTasks.map((t: any) => (
                      <tr
                        key={t.id}
                        className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {t.taskCode}
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {t.title}
                          </div>
                          {t.categoryName && (
                            <span className="text-[10px] text-gray-400">
                              {t.categoryName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getPriorityBadge(t.priority)}</td>
                        <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full bg-indigo-600"
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-gray-500">
                              {t.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {t.assignedToUserName ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{
                                  backgroundColor:
                                    t.assignedToUserAvatarColor || "#6366F1",
                                }}
                              >
                                {t.assignedToUserName.charAt(0).toUpperCase()}
                              </span>
                              <span className="max-w-[100px] truncate font-medium text-gray-700 dark:text-gray-300">
                                {t.assignedToUserName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-500">
                          {Math.round((t.totalDurationSeconds / 3600) * 10) / 10}h
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/tasks/${t.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                title="Buka Studio Tugas"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Lepas Tugas dari Proyek"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Lepaskan tugas '${t.title}' dari proyek ini?`
                                  )
                                ) {
                                  unassignTaskMutation.mutate(t.id);
                                }
                              }}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTasks.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-gray-400"
                        >
                          <Layers className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                          Belum ada tugas yang cocok dengan filter.
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setBulkModalOpen(true)}
                              className="text-xs"
                            >
                              + Alokasi Tugas Sekarang
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: AUDIT LOG TIMELINE */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Riwayat kronologis mutasi data dan aksi administratif khusus terkait proyek ini.
                  </p>
                  <span className="text-[11px] font-mono text-gray-400">
                    Total: {projectAuditLogs.length} kejadian
                  </span>
                </div>

                {loadingProjectAudit ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-600" />
                    Memuat log aktivitas proyek...
                  </div>
                ) : projectAuditLogs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-xs text-gray-400 dark:border-gray-800">
                    <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                    Belum ada rekaman audit log untuk proyek ini.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 dark:border-indigo-950/60 ml-4 space-y-6 py-2">
                    {projectAuditLogs.map((log: any) => {
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
                        <div key={log.id} className="relative pl-6">
                          {/* Dot indicator */}
                          <div
                            className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 ${
                              isSuccess ? "bg-indigo-600" : "bg-rose-500"
                            }`}
                          />

                          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 transition-all hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-800/40">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ${
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
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                                  {displaySummary}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {date.toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}{" "}
                                  •{" "}
                                  {date.toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Actor & Telemetry */}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {log.userName || "Sistem / Anonim"}
                                </span>
                                {log.userEmail && (
                                  <span className="text-[10px] text-gray-400">
                                    ({log.userEmail})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 font-mono text-[10px]">
                                <span>Status:</span>
                                <span
                                  className={`font-bold ${
                                    isSuccess ? "text-emerald-600" : "text-rose-600"
                                  }`}
                                >
                                  {log.statusCode}
                                </span>
                                <span>•</span>
                                <span>{log.durationMs}ms</span>
                              </div>
                            </div>

                            {/* Details Payload if available */}
                            {parsedDetails?.parameters && (
                              <details className="mt-3 group">
                                <summary className="cursor-pointer text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                                  Lihat Rincian Parameter Mutasi
                                </summary>
                                <pre className="mt-2 max-h-36 overflow-y-auto rounded-lg bg-gray-900 p-2.5 text-[10px] font-mono text-emerald-400">
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
            )}
          </div>
        </div>

        {/* RIGHT CONTROL PANEL: 4 COLUMNS (STICKY) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Status & Workflow Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Status Alur Kerja Proyek
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0, label: "Active", color: "bg-emerald-500 text-white" },
                { val: 1, label: "Completed", color: "bg-indigo-500 text-white" },
                { val: 2, label: "Archived", color: "bg-gray-500 text-white" },
              ].map((st) => (
                <button
                  key={st.val}
                  type="button"
                  onClick={() => setStatus(st.val)}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${
                    status === st.val
                      ? `${st.color} border-transparent shadow-xs`
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Manager Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Project Manager (PM)
            </h3>

            {project.projectManagerName ? (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/75 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs"
                  style={{
                    backgroundColor:
                      project.projectManagerAvatarColor || "#6366F1",
                  }}
                >
                  {project.projectManagerName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-gray-900 dark:text-white">
                    {project.projectManagerName}
                  </div>
                  <div className="truncate text-xs text-gray-400">
                    {project.projectManagerEmail || "Project Lead"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mb-3 text-xs text-gray-400">
                Belum ada Project Manager ditugaskan.
              </p>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Ubah Project Manager
              </label>
              <select
                value={projectManagerId}
                disabled={!isAdmin}
                onChange={(e) => setProjectManagerId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">-- Tanpa Project Manager --</option>
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.jobTitle || "Member"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline & Schedule Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Target Deadline Proyek
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Batas Akhir
                </label>
                <Input
                  type="date"
                  value={deadline}
                  disabled={!isAdmin}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {deadlineDays !== null && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                    deadlineDays < 0
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      : deadlineDays <= 7
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  {deadlineDays < 0
                    ? `Terlambat ${Math.abs(deadlineDays)} hari dari jadwal!`
                    : deadlineDays === 0
                    ? "Batas akhir adalah hari ini!"
                    : `Sisa ${deadlineDays} hari lagi menuju target.`}
                </div>
              )}
            </div>
          </div>

          {/* Financial Inputs Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Penetapan Anggaran & Biaya
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Pagu Anggaran (IDR)
                </label>
                <Input
                  type="number"
                  value={budget}
                  disabled={!isAdmin}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="50000000"
                  className="text-xs font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Biaya Riil Terpakai (IDR)
                </label>
                <Input
                  type="number"
                  value={actualCost}
                  disabled={!isAdmin}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="10000000"
                  className="text-xs font-mono font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
            {isAdmin ? (
              <>
                <Button
                  onClick={() => updateProjectMutation.mutate()}
                  disabled={updateProjectMutation.isPending}
                  className="w-full gap-2 bg-indigo-600 py-2.5 font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  {updateProjectMutation.isPending
                    ? "Menyimpan Perubahan..."
                    : "Simpan Metadata Proyek"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setDeleteModalOpen(true)}
                  className="w-full gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Proyek Ini
                </Button>
              </>
            ) : (
              <Button
                disabled
                className="w-full gap-2 bg-gray-400 py-2.5 font-bold text-white cursor-not-allowed dark:bg-gray-700"
              >
                <ShieldCheck className="h-4 w-4" />
                Mode Hanya Lihat (Hanya Administrator)
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 3. DIALOG: ALOKASI TUGAS MASSAL (FSD 5.4) */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Alokasi Tugas Massal ke {project.name}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pilih tugas-tugas lepas yang belum memiliki proyek untuk ditautkan secara bersamaan.
          </p>

          <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        unassignedTasks.length > 0 &&
                        selectedUnassignedIds.length === unassignedTasks.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUnassignedIds(
                            unassignedTasks.map((t: any) => t.id)
                          );
                        } else {
                          setSelectedUnassignedIds([]);
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-bold">Judul Tugas</th>
                  <th className="px-3 py-2.5 font-bold">Prioritas</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {unassignedTasks.map((t: any) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUnassignedIds.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUnassignedIds((prev) => [...prev, t.id]);
                          } else {
                            setSelectedUnassignedIds((prev) =>
                              prev.filter((id) => id !== t.id)
                            );
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                      {t.title}
                    </td>
                    <td className="px-3 py-2.5">{getPriorityBadge(t.priority)}</td>
                    <td className="px-3 py-2.5">{getStatusBadge(t.status)}</td>
                    <td className="px-3 py-2.5 font-mono">{t.progress}%</td>
                  </tr>
                ))}

                {unassignedTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-gray-400"
                    >
                      Tidak ada tugas lepas tanpa proyek yang tersedia saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">
              {selectedUnassignedIds.length} tugas dipilih
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setBulkModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                onClick={() => bulkAssignMutation.mutate()}
                disabled={
                  selectedUnassignedIds.length === 0 ||
                  bulkAssignMutation.isPending
                }
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {bulkAssignMutation.isPending
                  ? "Mengalokasikan..."
                  : `Alokasikan ${selectedUnassignedIds.length} Tugas`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. DIALOG: KONFIRMASI HAPUS PROYEK (ADMIN ONLY) */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400">
              Hapus Proyek {project.name}?
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-600 dark:text-gray-300">
            Tindakan ini akan menghapus entitas proyek secara permanen. Tugas-tugas di dalamnya tidak akan terhapus, melainkan akan dilepaskan menjadi tugas lepas tanpa proyek.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={() => deleteProjectMutation.mutate()}
              disabled={deleteProjectMutation.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteProjectMutation.isPending
                ? "Menghapus..."
                : "Ya, Hapus Proyek"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

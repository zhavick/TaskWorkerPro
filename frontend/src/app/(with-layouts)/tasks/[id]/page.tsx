"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Lightbulb,
  CheckSquare,
  ShieldCheck,
  Calendar,
  User,
  FolderKanban,
  Tag,
  Flag,
  Milestone as MilestoneIcon,
  RotateCcw,
  Sparkles,
  Loader2,
  History,
  Lock,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { toast } from "sonner";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";

const MILESTONE_OPTIONS = [
  "Requirement Analysis",
  "System Design",
  "Implementation",
  "Testing & QA",
  "Deployment",
  "Maintenance",
];

export default function TaskStudioPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isAdmin, userId: currentUserId } = useCurrentUser();
  const taskId = Number(params.id);

  // Main task fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [status, setStatus] = useState(0);
  const [progress, setProgress] = useState(0);
  const [milestone, setMilestone] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [solution, setSolution] = useState("");
  const [projectId, setProjectId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  // Unified Manual Work Session parameters
  const [logManualSession, setLogManualSession] = useState(false);
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Subtask form
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // 1. Query Task Detail
  const { data: detailData, isLoading } = useQuery<any>({
    queryKey: ["taskDetail", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskId}`);
      return res.data.data;
    },
    enabled: !!taskId,
  });

  // 2. Query Projects list
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsDropdown"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data || [];
    },
  });

  // 3. Query Members list for Assignee (PIC)
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersDropdown"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data || [];
    },
  });

  // 4. Query Master Data (Categories, Priorities, Statuses, Milestones)
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["masterCategories"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/master/categories");
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: masterPriorities = [] } = useQuery<any[]>({
    queryKey: ["masterPriorities"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/master/priorities");
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: masterStatuses = [] } = useQuery<any[]>({
    queryKey: ["masterStatuses"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/master/statuses");
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: masterMilestones = [] } = useQuery<any[]>({
    queryKey: ["masterMilestones"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/master/milestones");
        return res.data.data || [];
      } catch {
        return [];
      }
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

  // 5. Query Task Audit Timeline (FSD 5.17)
  const { data: taskTimeline = [], isLoading: loadingTimeline } = useQuery<any[]>({
    queryKey: ["taskAuditTimeline", taskId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/audit-logs/task/${taskId}`);
        return res.data.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!taskId,
  });

  // Populate form when data loads
  useEffect(() => {
    if (detailData?.task) {
      const t = detailData.task;
      setTitle(t.title || "");
      setDescription(t.description || "");
      setPriority(t.priority ?? 1);
      setStatus(t.status ?? 0);
      setProgress(t.progress ?? 0);
      setMilestone(t.milestone || "");
      setObstacle(t.obstacle || "");
      setSolution(t.solution || "");
      setProjectId(t.projectId || undefined);
      setCategoryId(t.categoryId || undefined);
      setAssignedToUserId(t.assignedToUserId || "");
      setStartDate(t.startDate ? t.startDate.split("T")[0] : "");
      setDueDate(t.dueDate ? t.dueDate.split("T")[0] : "");
    }
  }, [detailData]);

  // Handle Quick Progress Preset (0%, 25%, 50%, 75%, 100%) - FSD 5.5
  const handleProgressPreset = (val: number) => {
    setProgress(val);
    if (val === 100) {
      setStatus(2); // Done
    } else if (val === 0) {
      setStatus(0); // Todo
    } else if (status === 0 || status === 2) {
      setStatus(1); // InProgress
    }
  };

  // Handle Quick Manual Time Presets (+30m, +1h, +2h, +4h, Reset) - FSD 5.5 & 5.21
  const handleTimePreset = (minutes: number) => {
    const now = new Date();
    const start = new Date(now.getTime() - minutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setManualEndTime(formatLocal(now));
    setManualStartTime(formatLocal(start));
    setLogManualSession(true);
  };

  const handleTimeReset = () => {
    setManualStartTime("");
    setManualEndTime("");
    setManualNotes("");
    setLogManualSession(false);
  };

  // Safe ISO date formatter helper
  const formatIsoOrNull = (dStr?: string | null) => {
    if (!dStr || !dStr.trim()) return null;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const task = detailData?.task;
  const subtasks = detailData?.subtasks || [];
  const sessions = detailData?.recentSessions || [];
  const totalSeconds = sessions.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  // Creator & Admin authorization check (User Request #4)
  const isCreator = task?.createdByUserId
    ? task.createdByUserId === currentUserId
    : task?.assignedToUserId === currentUserId;
  const canEdit = Boolean(isAdmin || isCreator);

  // Past month completed task protection (User Request #5)
  // If task status === 2 (Done), and its dueDate or createdAt is before the 1st of the current month, deletion is locked!
  const isPastMonthDone = Boolean(
    task?.status === 2 &&
      (task?.dueDate || task?.createdAt) &&
      new Date(task.dueDate || task.createdAt) < new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );

  // Unified Save Mutation (FSD 5.5 & 5.21)
  const unifiedSaveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error("Judul tugas wajib diisi.");
      }
      if (!canEdit) {
        throw new Error("Hanya pembuat tugas atau Administrator yang dapat menyimpan perubahan data tugas.");
      }

      const payload: any = {
        title: title.trim(),
        description: description.trim() || title.trim(),
        priority: Number(priority),
        status: Number(status),
        progress: Number(progress),
        milestone: milestone || null,
        obstacle: obstacle.trim() || null,
        solution: solution.trim() || null,
        projectId: projectId ? Number(projectId) : null,
        categoryId: categoryId ? Number(categoryId) : null,
        assignedToUserId: assignedToUserId || null,
        startDate: formatIsoOrNull(startDate),
        dueDate: formatIsoOrNull(dueDate),
        logManualSession,
      };

      if (logManualSession && manualStartTime && manualEndTime) {
        payload.manualSessionStartTime = formatIsoOrNull(manualStartTime);
        payload.manualSessionEndTime = formatIsoOrNull(manualEndTime);
        payload.manualSessionNotes = manualNotes.trim() || null;
      }

      const res = await apiClient.put(`/tasks/${taskId}/unified-save`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas dan sesi jam kerja berhasil disimpan!");
      setLogManualSession(false);
      setManualNotes("");
      queryClient.invalidateQueries({ queryKey: ["taskDetail", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Gagal menyimpan perubahan tugas");
    },
  });

  // Toggle Subtask Status Mutation
  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, currentStatus }: { subtaskId: number; currentStatus: number }) => {
      if (!canEdit) {
        throw new Error("Hanya pembuat tugas atau Administrator yang dapat mengubah sub-tugas ini.");
      }
      const nextStatus = currentStatus === 2 ? 0 : 2;
      const res = await apiClient.patch(`/tasks/${subtaskId}/status`, { status: nextStatus });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status sub-tugas diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["taskDetail", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Gagal mengubah status sub-tugas");
    },
  });

  // Create Subtask Mutation
  const addSubtaskMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("Hanya pembuat tugas atau Administrator yang dapat menambah sub-tugas.");
      }
      const res = await apiClient.post(`/tasks/${taskId}/subtasks`, {
        title: subtaskTitle.trim(),
        priority: 1,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Sub-tugas berhasil ditambahkan!");
      setSubtaskTitle("");
      queryClient.invalidateQueries({ queryKey: ["taskDetail", taskId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || "Gagal menambah sub-tugas"),
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      if (!canEdit) {
        throw new Error("Hanya pembuat tugas atau Administrator yang dapat menghapus tugas ini.");
      }
      if (isPastMonthDone) {
        throw new Error("Data tugas bulan lalu yang sudah selesai dilindungi arsip dan tidak dapat dihapus.");
      }
      const res = await apiClient.delete(`/tasks/${taskId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tugas berhasil dihapus.");
      router.push("/tasks");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || "Gagal menghapus tugas"),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Memuat kanvas studio tugas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-28">
      {/* 1. Executive Topbar Banner (Full-Width Studio Layout - FSD 5.21) */}
      <div className="border-b border-gray-200/80 bg-white px-3 py-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/tasks">
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs">
                <ArrowLeft className="h-4 w-4" />
                Daftar Tugas
              </Button>
            </Link>
            <Link href="/calendar">
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                <Calendar className="h-4 w-4" />
                Kalender
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black tracking-wider text-indigo-600 dark:text-indigo-400">
                TASK #TK-{taskId}
              </span>
              {task?.projectName && (
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                  style={{ backgroundColor: task.projectColor || "#4F46E5" }}
                >
                  {task.projectName}
                </span>
              )}
              {task?.assignedToUserName ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Ditugaskan: {task.assignedToUserName}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  Belum Ditugaskan
                </span>
              )}
              {task?.createdByUserName && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Pembuat: <strong className="text-gray-900 dark:text-white">{task.createdByUserName}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              Total Durasi: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{totalHours} Jam</span>
            </span>
            <span>•</span>
            <span>
              Diperbarui: {new Date(task?.updatedAt || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Hanya Lihat (Read-Only) Notification Banner */}
      {!canEdit && (
        <div className="mx-3 mt-4 sm:mx-6 lg:mx-8 xl:mx-10 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-3 shadow-xs">
          <Lock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Mode Hanya Lihat (Read-Only):</span> Anda tidak memiliki hak akses untuk mengedit tugas ini. Tugas ini dibuat oleh <strong>{task?.createdByUserName || "pengguna lain"}</strong>. Hanya pembuat tugas tersebut atau Administrator yang dapat memperbarui atau menghapus tugas ini.
          </div>
        </div>
      )}

      {/* 2. Full-Width Responsive Studio Grid (FSD 5.21) */}
      <div className="w-full px-3 py-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Main Form Canvas (8 Columns on lg/xl, 9 on 2xl) */}
          <div className="space-y-6 lg:col-span-8 xl:col-span-8 2xl:col-span-9">
            {/* Judul Tugas */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Judul Tugas Pekerjaan <span className="text-red-500">*</span>
              </label>
              <Input
                value={title}
                disabled={!canEdit}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  if (!description.trim() || description.trim() === title.trim()) {
                    setDescription(newTitle);
                  }
                  setTitle(newTitle);
                }}
                placeholder="Masukkan judul tugas pekerjaan lengkap..."
                className="mt-2.5 w-full text-base sm:text-lg font-bold py-3.5 px-4 text-gray-900 dark:text-white rounded-xl border-gray-300 dark:border-gray-700 shadow-xs focus:ring-4 focus:ring-indigo-500/10"
                required
              />
            </div>

            {/* Deskripsi Lengkap */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Deskripsi Lengkap & Kriteria Penerimaan
              </label>
              <textarea
                rows={5}
                value={description}
                disabled={!canEdit}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan detail pekerjaan, deliverable yang diharapkan, dan instruksi teknis..."
                className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent p-3 text-sm text-gray-900 leading-relaxed dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Kendala (Obstacle) & Solusi Teknis (Solution) - FSD 5.5 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Kendala */}
              <div className="rounded-2xl border border-red-200/70 bg-red-50/40 p-5 shadow-xs dark:border-red-900/40 dark:bg-red-950/20">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <label className="text-xs font-bold uppercase tracking-wider">
                    Catatan Kendala (Obstacle Log)
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={obstacle}
                  disabled={!canEdit}
                  onChange={(e) => setObstacle(e.target.value)}
                  placeholder="Contoh: Menunggu akses database development server atau API specification..."
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white/90 p-2.5 text-xs text-gray-900 dark:border-red-900/60 dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Solusi Teknis */}
              <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-5 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  <label className="text-xs font-bold uppercase tracking-wider">
                    Solusi Teknis (Solution Log)
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={solution}
                  disabled={!canEdit}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Contoh: Koordinasi dengan tim devops untuk pembukaan firewall port 5432..."
                  className="mt-2 w-full rounded-xl border border-emerald-200 bg-white/90 p-2.5 text-xs text-gray-900 dark:border-emerald-900/60 dark:bg-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Penyatuan Jam Kerja Manual Terpadu (Unified Session Log) - FSD 5.5 & 5.21 */}
            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-5 shadow-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <Clock className="h-5 w-5" />
                  <div>
                    <h4 className="text-sm font-bold">
                      Pencatatan Jam Kerja Manual Terpadu (Unified Session)
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Simpan perubahan data tugas dan log sesi jam kerja sekaligus dalam 1 request atomik.
                    </p>
                  </div>
                </div>

                <label className={`flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-300 ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} self-start sm:self-center`}>
                  <Checkbox
                    checked={logManualSession}
                    disabled={!canEdit}
                    onCheckedChange={(checked) => canEdit && setLogManualSession(!!checked)}
                  />
                  <span>Sertakan Log Sesi</span>
                </label>
              </div>

              {/* Quick Time Preset Buttons (FSD 5.5: +30m, +1h, +2h, +4h, Reset) */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-indigo-200/60 pt-3 dark:border-indigo-900/60">
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Preset Cepat:</span>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && handleTimePreset(30)}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +30 Menit
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && handleTimePreset(60)}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +1 Jam
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && handleTimePreset(120)}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +2 Jam
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && handleTimePreset(240)}
                  className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +4 Jam
                </button>
                {logManualSession && canEdit && (
                  <button
                    type="button"
                    onClick={handleTimeReset}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-500 hover:text-red-600 dark:text-gray-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                )}
              </div>

              {logManualSession && (
                <div className="mt-3.5 space-y-3 pt-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                        Waktu Mulai Sesi
                      </label>
                      <Input
                        type="datetime-local"
                        value={manualStartTime}
                        disabled={!canEdit}
                        onChange={(e) => setManualStartTime(e.target.value)}
                        className="mt-1 text-xs bg-white dark:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                        Waktu Selesai Sesi
                      </label>
                      <Input
                        type="datetime-local"
                        value={manualEndTime}
                        disabled={!canEdit}
                        onChange={(e) => setManualEndTime(e.target.value)}
                        className="mt-1 text-xs bg-white dark:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                      Catatan Deskripsi Sesi Kerja
                    </label>
                    <Input
                      value={manualNotes}
                      disabled={!canEdit}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Contoh: Diskusi teknis review arsitektur dan penulisan test case..."
                      className="mt-1 text-xs bg-white dark:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Sesi Jam Kerja Tugas Ini */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Riwayat Sesi Jam Kerja Tugas Ini ({sessions.length})
                </h4>
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Total: {totalHours} Jam
                </span>
              </div>

              <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                {sessions.map((s: any) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {s.userName}
                      </span>
                      <span className="ml-2 text-gray-400">
                        {new Date(s.startTime).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {s.notes && <p className="text-gray-500 mt-0.5">{s.notes}</p>}
                    </div>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round((s.duration / 3600) * 10) / 10} Jam
                    </span>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">
                    Belum ada sesi kerja tercatat untuk tugas ini.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Metadata Inspector Sidebar (4 Columns) - FSD 5.21 */}
          <div className="space-y-6 lg:col-span-4 xl:col-span-4 2xl:col-span-3">
            <div className="sticky top-20 space-y-6">
              {/* Properties Card */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                {/* Status Tugas */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Status Alur Kerja
                  </label>
                  <select
                    value={status}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const newStatus = Number(e.target.value);
                      setStatus(newStatus);
                      if (newStatus === 2 && progress < 100) setProgress(100);
                      if (newStatus === 0 && progress === 100) setProgress(0);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {masterStatuses.length > 0 ? (
                      masterStatuses.map((s: any, idx: number) => (
                        <option key={s.id} value={resolveStatusValue(s, idx)}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={0}>Todo</option>
                        <option value={1}>InProgress</option>
                        <option value={2}>Done</option>
                        <option value={3}>Overdue</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Slider Progres & Tombol Cepat (FSD 5.5: 0%, 25%, 50%, 75%, 100%) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>Kemajuan Progres</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    disabled={!canEdit}
                    onChange={(e) => handleProgressPreset(Number(e.target.value))}
                    className="mt-2 w-full accent-indigo-600 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {/* Preset Buttons */}
                  <div className="mt-1.5 flex justify-between gap-1">
                    {[0, 25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => canEdit && handleProgressPreset(preset)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          progress === preset
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prioritas */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <Flag className="h-3.5 w-3.5 text-amber-500" />
                    Tingkat Prioritas
                  </label>
                  <select
                    value={priority}
                    disabled={!canEdit}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {masterPriorities.length > 0 ? (
                      masterPriorities.map((p: any, idx: number) => (
                        <option key={p.id} value={resolvePriorityValue(p, idx)}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={0}>Rendah (Low)</option>
                        <option value={1}>Sedang (Medium)</option>
                        <option value={2}>Tinggi (High)</option>
                        <option value={3}>Kritis (Critical)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* PIC Penanggung Jawab (Assignee) */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    PIC Penanggung Jawab
                  </label>
                  <select
                    value={assignedToUserId}
                    disabled={!canEdit}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Belum Ditugaskan --</option>
                    {members.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.userName} ({u.jobTitle || "Member"})
                      </option>
                    ))}
                  </select>

                  {/* Active Selected Assignee Card */}
                  {(() => {
                    const activeAssignee = members.find((m: any) => m.id === assignedToUserId);
                    if (!activeAssignee) return null;
                    const initials = (activeAssignee.fullName || activeAssignee.userName || "U")
                      .substring(0, 2)
                      .toUpperCase();
                    return (
                      <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-xs text-white">
                          {initials}
                        </div>
                        <div className="truncate">
                          <span className="block truncate text-xs font-bold text-gray-900 dark:text-white">
                            {activeAssignee.fullName || activeAssignee.userName}
                          </span>
                          <span className="block text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
                            {activeAssignee.jobTitle || "Anggota Tim"} {activeAssignee.email ? `• ${activeAssignee.email}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Proyek Terkait */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
                    Proyek Terkait
                  </label>
                  <select
                    value={projectId || ""}
                    disabled={!canEdit}
                    onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Tanpa Proyek --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori Pekerjaan */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <Tag className="h-3.5 w-3.5 text-emerald-500" />
                    Kategori Tugas
                  </label>
                  <select
                    value={categoryId || ""}
                    disabled={!canEdit}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Tanpa Kategori --</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Milestone SDLC */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <MilestoneIcon className="h-3.5 w-3.5 text-purple-500" />
                    Milestone SDLC
                  </label>
                  <select
                    value={milestone}
                    disabled={!canEdit}
                    onChange={(e) => setMilestone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Pilih Milestone --</option>
                    {masterMilestones.length > 0
                      ? masterMilestones.map((m: any) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))
                      : MILESTONE_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Tanggal Mulai & Deadline (Due Date) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      Tanggal Mulai
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      disabled={!canEdit}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      Tenggat Waktu
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      disabled={!canEdit}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-1 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Subtasks Checklist Card (Interactive Checkbox) */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Checklist Sub-Tugas ({subtasks.filter((s: any) => s.status === 2).length}/{subtasks.length})
                  </h4>
                  <span className="text-[10px] text-gray-400">{canEdit ? "Klik untuk centang" : "Hanya lihat"}</span>
                </div>

                <div className="mt-3 space-y-2">
                  {subtasks.map((st: any) => (
                    <div
                      key={st.id}
                      onClick={() => canEdit && toggleSubtaskMutation.mutate({ subtaskId: st.id, currentStatus: st.status })}
                      className={`flex items-center gap-2 rounded-lg p-2 text-xs text-gray-700 dark:text-gray-300 select-none ${
                        canEdit
                          ? "hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition"
                          : "opacity-80 cursor-default"
                      }`}
                    >
                      {st.status === 2 ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-gray-300 hover:text-gray-400" />
                      )}
                      <span className={`flex-1 truncate ${st.status === 2 ? "line-through text-gray-400 dark:text-gray-500" : "font-medium"}`}>
                        {st.title}
                      </span>
                    </div>
                  ))}

                  <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Input
                      placeholder={canEdit ? "Tambah sub-tugas baru..." : "Sub-tugas terkunci"}
                      value={subtaskTitle}
                      disabled={!canEdit}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canEdit) {
                          e.preventDefault();
                          if (subtaskTitle.trim()) addSubtaskMutation.mutate();
                        }
                      }}
                      className="text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <Button
                      size="sm"
                      onClick={() => canEdit && addSubtaskMutation.mutate()}
                      disabled={!canEdit || !subtaskTitle.trim() || addSubtaskMutation.isPending}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Task Activity & Audit Timeline Card (FSD 5.17) */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Riwayat Aktivitas ({taskTimeline.length})</span>
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">Audit Trail</span>
                </div>

                <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
                  {loadingTimeline ? (
                    <div className="py-4 text-center text-xs text-gray-400">Memuat riwayat...</div>
                  ) : taskTimeline.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400 italic">
                      Belum ada rekaman mutasi untuk tugas ini.
                    </div>
                  ) : (
                    taskTimeline.map((item: any) => {
                      const date = new Date(item.timestamp);
                      const formattedTime = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
                      const formattedDate = date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

                      return (
                        <div key={item.id} className="relative flex items-start gap-2.5 text-xs">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mt-0.5">
                            {item.userName ? item.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                                {item.userName || "Pengguna"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                {formattedDate} {formattedTime}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.httpMethod}</span>{" "}
                              {item.actionName || item.controllerName}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sticky Bottom Action Bar (Full Width & Responsive - FSD 5.21) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200/80 bg-white/95 p-3 sm:p-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 shadow-lg">
        <div className="w-full flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/tasks">
              <Button variant="outline" size="sm">
                Kembali ke Daftar
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="outline" size="sm" className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                Kalender
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!canEdit ? (
              <Button
                size="sm"
                disabled
                className="gap-2 bg-gray-400 font-bold text-white cursor-not-allowed dark:bg-gray-700"
              >
                <Lock className="h-4 w-4" />
                Mode Hanya Lihat (Terkunci)
              </Button>
            ) : (
              <>
                {isPastMonthDone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-1.5 border-amber-300 bg-amber-50/80 text-amber-800 opacity-70 cursor-not-allowed dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                    title="Data tugas bulan berlalu yang sudah selesai (Done) tidak boleh dihapus sesuai kebijakan proteksi arsip."
                  >
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Hapus Terkunci (Selesai Bulan Lalu)
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat dibatalkan.")) {
                        deleteTaskMutation.mutate();
                      }
                    }}
                    disabled={deleteTaskMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Hapus Tugas
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => unifiedSaveMutation.mutate()}
                  disabled={unifiedSaveMutation.isPending}
                  className="gap-2 bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
                >
                  {unifiedSaveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Seluruh Perubahan
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

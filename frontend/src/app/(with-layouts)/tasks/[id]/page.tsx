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
  Clock,
  AlertCircle,
  Lightbulb,
  CheckSquare,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { toast } from "sonner";
import Link from "next/link";

export default function TaskStudioPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
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

  // Unified Manual Work Session parameters
  const [logManualSession, setLogManualSession] = useState(false);
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Subtask form
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // Query Task Detail
  const { data: detailData, isLoading } = useQuery<any>({
    queryKey: ["taskDetail", taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskId}`);
      return res.data.data;
    },
    enabled: !!taskId,
  });

  // Query Projects list for dropdown
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsDropdown"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
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
    }
  }, [detailData]);

  // Unified Save Mutation
  const unifiedSaveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title,
        description,
        priority,
        status,
        progress,
        milestone,
        obstacle,
        solution,
        projectId: projectId || null,
        logManualSession,
      };

      if (logManualSession && manualStartTime && manualEndTime) {
        payload.manualSessionStartTime = new Date(manualStartTime).toISOString();
        payload.manualSessionEndTime = new Date(manualEndTime).toISOString();
        payload.manualSessionNotes = manualNotes;
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
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menyimpan perubahan");
    },
  });

  // Create Subtask Mutation
  const addSubtaskMutation = useMutation({
    mutationFn: async () => {
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
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menambah sub-tugas"),
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete(`/tasks/${taskId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tugas berhasil dihapus.");
      router.push("/tasks");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus tugas"),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-400">Memuat studio tugas...</div>;
  }

  const task = detailData?.task;
  const subtasks = detailData?.subtasks || [];
  const sessions = detailData?.recentSessions || [];

  return (
    <div className="relative pb-24">
      {/* Studio Header Bar */}
      <div className="border-b border-gray-200/80 bg-white px-4 py-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/tasks">
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs">
                <ArrowLeft className="h-4 w-4" />
                Daftar Tugas
              </Button>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              TASK #TK-{taskId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Diperbarui: {new Date(task?.updatedAt || Date.now()).toLocaleTimeString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* 12-Column Grid Container */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Content Area (8 Columns) */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. Judul Tugas */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Judul Tugas
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masukkan judul tugas..."
                className="mt-2 text-base font-bold text-gray-900 dark:text-white"
              />
            </div>

            {/* 2. Deskripsi Lengkap */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Deskripsi Lengkap (Rich Text Area)
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan detail pekerjaan, kriteria penerimaan, dan catatan teknis..."
                className="mt-2 w-full rounded-xl border border-gray-200 bg-transparent p-3 text-sm text-gray-900 leading-relaxed dark:border-gray-800 dark:text-white"
              />
            </div>

            {/* 3 & 4. Kendala & Solusi Teknis */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Kendala */}
              <div className="rounded-2xl border border-red-200/60 bg-red-50/30 p-5 shadow-xs dark:border-red-900/40 dark:bg-red-950/20">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <label className="text-xs font-bold uppercase tracking-wider">
                    Catatan Kendala (Obstacle Log)
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={obstacle}
                  onChange={(e) => setObstacle(e.target.value)}
                  placeholder="Contoh: Lock contention pada transaksi sesi..."
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white/80 p-2.5 text-xs text-gray-900 dark:border-red-900/60 dark:bg-gray-900 dark:text-white"
                />
              </div>

              {/* Solusi Teknis */}
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/30 p-5 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Lightbulb className="h-4 w-4" />
                  <label className="text-xs font-bold uppercase tracking-wider">
                    Solusi Teknis (Solution Log)
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="Contoh: Menggunakan IDbContextTransaction dan pooling..."
                  className="mt-2 w-full rounded-xl border border-emerald-200 bg-white/80 p-2.5 text-xs text-gray-900 dark:border-emerald-900/60 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* 5. Unified Manual Session Form */}
            <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-5 shadow-xs dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                  <Clock className="h-5 w-5" />
                  <h4 className="text-sm font-bold">
                    Catat Jam Kerja Manual Terpadu (Unified Session)
                  </h4>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-300 cursor-pointer">
                  <Checkbox
                    checked={logManualSession}
                    onCheckedChange={(checked) => setLogManualSession(!!checked)}
                  />
                  <span>Simpan Sesi Jam Kerja Sekaligus</span>
                </label>
              </div>

              {logManualSession && (
                <div className="mt-4 space-y-3 border-t border-indigo-200/60 pt-3 dark:border-indigo-900/60">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                        Waktu Mulai
                      </label>
                      <Input
                        type="datetime-local"
                        value={manualStartTime}
                        onChange={(e) => setManualStartTime(e.target.value)}
                        className="mt-1 text-xs bg-white dark:bg-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                        Waktu Selesai
                      </label>
                      <Input
                        type="datetime-local"
                        value={manualEndTime}
                        onChange={(e) => setManualEndTime(e.target.value)}
                        className="mt-1 text-xs bg-white dark:bg-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                      Catatan Sesi Jam Kerja
                    </label>
                    <Input
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Contoh: Diskusi arsitektur dan refactoring query backend..."
                      className="mt-1 text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Riwayat Sesi Kerja Terkait */}
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Riwayat Sesi Jam Kerja Tugas Ini ({sessions.length})
              </h4>

              <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                {sessions.map((s: any) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {s.userName}
                      </span>
                      <span className="ml-2 text-gray-400">
                        {new Date(s.startTime).toLocaleString("id-ID")}
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

          {/* Sticky Sidebar (4 Columns) */}
          <div className="space-y-6 lg:col-span-4">
            <div className="sticky top-20 space-y-6">
              {/* Properties Card */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Status Tugas
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white"
                  >
                    <option value={0}>Todo</option>
                    <option value={1}>InProgress</option>
                    <option value={2}>Done</option>
                    <option value={3}>Overdue</option>
                  </select>
                </div>

                {/* Progres Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>Progres Penyelesaian</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="mt-2 w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Prioritas */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white"
                  >
                    <option value={0}>Rendah (Low)</option>
                    <option value={1}>Sedang (Medium)</option>
                    <option value={2}>Tinggi (High)</option>
                    <option value={3}>Kritis (Critical)</option>
                  </select>
                </div>

                {/* Proyek */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Proyek Terkait
                  </label>
                  <select
                    value={projectId || ""}
                    onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs font-semibold text-gray-900 dark:border-gray-800 dark:text-white"
                  >
                    <option value="">-- Tanpa Proyek --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Milestone */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                    Milestone / Tahapan
                  </label>
                  <Input
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value)}
                    className="mt-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Subtasks Checklist Card */}
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Checklist Sub-Tugas ({subtasks.filter((s: any) => s.status === 2).length}/{subtasks.length})
                  </h4>
                </div>

                <div className="mt-3 space-y-2">
                  {subtasks.map((st: any) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    >
                      <CheckCircle2
                        className={`h-4 w-4 ${st.status === 2 ? "text-emerald-500" : "text-gray-300"}`}
                      />
                      <span className={st.status === 2 ? "line-through text-gray-400" : ""}>
                        {st.title}
                      </span>
                    </div>
                  ))}

                  <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Input
                      placeholder="Tambah sub-tugas..."
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => addSubtaskMutation.mutate()}
                      disabled={!subtaskTitle.trim() || addSubtaskMutation.isPending}
                      className="bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200/80 bg-white/95 p-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              Kembali ke Daftar
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
                  deleteTaskMutation.mutate();
                }
              }}
              disabled={deleteTaskMutation.isPending}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Hapus Tugas
            </Button>

            <Button
              size="sm"
              onClick={() => unifiedSaveMutation.mutate()}
              disabled={unifiedSaveMutation.isPending}
              className="gap-2 bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              Simpan Seluruh Perubahan (Unified Save)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

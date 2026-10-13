"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  Play,
  ArrowRight,
  Kanban,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { ImportExcelDialog } from "@/components/tasks/import-excel-dialog";
import { ExportTasksDialog } from "@/components/tasks/export-excel-dialog";
import { toast } from "sonner";
import Link from "next/link";

const priorityLabels = ["Rendah", "Sedang", "Tinggi", "Kritis"];
const priorityColors = ["bg-gray-500", "bg-blue-500", "bg-amber-500", "bg-red-500"];
const statusLabels = ["Todo", "InProgress", "Done", "Overdue"];
const statusColors = ["bg-slate-500", "bg-indigo-500", "bg-emerald-500", "bg-rose-500"];

export default function TasksListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(1);
  const [milestone, setMilestone] = useState("Development");
  const [projectId, setProjectId] = useState<number | undefined>(undefined);

  // 1. Tasks Query
  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["tasksList", search],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks${search ? `?search=${search}` : ""}`);
      return res.data.data;
    },
  });

  // 2. Projects Query for select
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsSelect"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // 3. Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/tasks", {
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 0,
        progress: 0,
        milestone,
        projectId: projectId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tugas berhasil dibuat!");
      setCreateModalOpen(false);
      setTitle("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat tugas"),
  });

  // 4. Start Live Timer Mutation
  const startTimerMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await apiClient.post("/timesheets/start", { taskId });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Live timer dimulai!");
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memulai timer"),
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Daftar Tugas Operasional
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pusat manajemen pekerjaan harian, estimasi, dan pencatatan riwayat sesi jam kerja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Impor Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setExportModalOpen(true)}
            className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Ekspor Excel
          </Button>
          <Link href="/tasks/kanban">
            <Button variant="outline" className="gap-2">
              <Kanban className="h-4 w-4" />
              Papan Kanban
            </Button>
          </Link>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Tugas Baru
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari tugas berdasarkan judul atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Tugas</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Proyek</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Prioritas</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Status</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Progres</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Durasi Kerja</th>
                <th className="px-5 py-3.5 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {tasks.map((t) => {
                const hours = Math.round((t.totalDurationSeconds / 3600) * 10) / 10;
                return (
                  <tr
                    key={t.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                      >
                        {t.title}
                      </Link>
                      {t.obstacle && (
                        <span className="ml-2 inline-flex items-center rounded bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          Ada Kendala
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {t.projectName ? (
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: t.projectColor || "#4680FF" }}
                        >
                          {t.projectName}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                          priorityColors[t.priority] || "bg-gray-500"
                        }`}
                      >
                        {priorityLabels[t.priority]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                          statusColors[t.status] || "bg-gray-500"
                        }`}
                      >
                        {statusLabels[t.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full bg-indigo-600"
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                        <span className="font-mono text-gray-500">{t.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-medium text-gray-600 dark:text-gray-300">
                      {hours} Jam
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => startTimerMutation.mutate(t.id)}
                          disabled={startTimerMutation.isPending}
                        >
                          <Play className="h-3 w-3 text-emerald-600 fill-emerald-600" />
                          Timer
                        </Button>
                        <Link href={`/tasks/${t.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                            Studio Edit &rarr;
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {tasks.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Belum ada tugas ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Tugas */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Buat Tugas Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTaskMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Judul Tugas *
              </label>
              <Input
                required
                placeholder="Contoh: Implementasi Index Database"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Proyek
              </label>
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              >
                <option value="">-- Tanpa Proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
                >
                  <option value={0}>Rendah</option>
                  <option value={1}>Sedang</option>
                  <option value={2}>Tinggi</option>
                  <option value={3}>Kritis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Milestone
                </label>
                <Input
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <textarea
                rows={2}
                placeholder="Rincian teknis tugas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Buat Tugas
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Impor Excel */}
      <ImportExcelDialog
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />

      {/* Modal Ekspor Excel */}
      <ExportTasksDialog
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Plus,
  Layers,
  FolderKanban,
  Flag,
  Milestone as MilestoneIcon,
  Calendar,
  AlertCircle,
  Lightbulb,
  User,
  Loader2,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
import { SearchableSelect } from "@/components/tailgrids/core/searchable-select";
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: number;
}

const DEFAULT_MILESTONES = [
  "Perencanaan",
  "Analisis & Desain",
  "Pengembangan",
  "Pengujian QA",
  "Rilis Produksi",
  "Pemeliharaan",
];

const DEFAULT_PRIORITIES = [
  { id: 0, value: 0, name: "Rendah (Low)", color: "#10B981" },
  { id: 1, value: 1, name: "Sedang (Medium)", color: "#3B82F6" },
  { id: 2, value: 2, name: "Tinggi (High)", color: "#F59E0B" },
  { id: 3, value: 3, name: "Kritis (Critical)", color: "#EF4444" },
];

const DEFAULT_STATUSES = [
  { id: 0, value: 0, name: "To Do", color: "#64748B" },
  { id: 1, value: 1, name: "In Progress", color: "#6366F1" },
  { id: 2, value: 2, name: "Done", color: "#10B981" },
  { id: 3, value: 3, name: "Overdue", color: "#EF4444" },
];

export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultStatus = 0,
}: CreateTaskDialogProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [priority, setPriority] = useState<number>(1); // 1 = Medium
  const [status, setStatus] = useState<number>(defaultStatus);
  const [milestone, setMilestone] = useState<string>("Pengembangan");
  const [assignedToUserId, setAssignedToUserId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [obstacle, setObstacle] = useState<string>("");
  const [solution, setSolution] = useState<string>("");

  // Update status when defaultStatus prop changes
  React.useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
    }
  }, [defaultStatus, open]);

  // 1. Projects Query
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["createTaskProjects"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data || [];
    },
    enabled: open,
  });

  // 2. Members Query for Assignee
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["createTaskMembers"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data || [];
    },
    enabled: open,
  });

  // 3. Master Data Queries (Priorities, Statuses, Milestones, Categories)
  const { data: masterPriorities = [] } = useQuery<any[]>({
    queryKey: ["masterPriorities"],
    queryFn: async () => {
      const res = await apiClient.get("/master/priorities");
      return res.data.data || [];
    },
    enabled: open,
  });

  const { data: masterStatuses = [] } = useQuery<any[]>({
    queryKey: ["masterStatuses"],
    queryFn: async () => {
      const res = await apiClient.get("/master/statuses");
      return res.data.data || [];
    },
    enabled: open,
  });

  const { data: masterMilestones = [] } = useQuery<any[]>({
    queryKey: ["masterMilestones"],
    queryFn: async () => {
      const res = await apiClient.get("/master/milestones");
      return res.data.data || [];
    },
    enabled: open,
  });

  const { data: masterCategories = [] } = useQuery<any[]>({
    queryKey: ["masterCategories"],
    queryFn: async () => {
      const res = await apiClient.get("/master/categories");
      return res.data.data || [];
    },
    enabled: open,
  });

  const projectOptions = React.useMemo(() => [
    { value: "", label: "-- Tanpa Proyek --" },
    ...projects.map((p) => ({
      value: String(p.id),
      label: p.name,
      badge: p.status,
      description: p.companyName ? `Perusahaan: ${p.companyName}` : undefined,
    })),
  ], [projects]);

  const memberOptions = React.useMemo(() => [
    { value: "", label: "-- Diri Sendiri / Belum Ditugaskan --" },
    ...members.map((u: any) => ({
      value: String(u.id),
      label: `${u.fullName || u.userName}`,
      description: `${u.email || ""}${u.jobTitle ? ` • ${u.jobTitle}` : ""}`,
    })),
  ], [members]);

  // Helper to map MasterPriority to enum value (0..3)
  const resolvePriorityValue = (p: any, idx: number) => {
    const n = (p.name || "").toLowerCase();
    if (n.includes("rendah") || n.includes("low")) return 0;
    if (n.includes("sedang") || n.includes("med")) return 1;
    if (n.includes("tinggi") || n.includes("high")) return 2;
    if (n.includes("kritis") || n.includes("crit") || n.includes("urgent")) return 3;
    return (p.orderIndex ?? (idx + 1)) - 1;
  };

  // Helper to map MasterStatus to enum value (0..3)
  const resolveStatusValue = (s: any, idx: number) => {
    const n = (s.name || "").toLowerCase();
    if (n.includes("to do") || n.includes("todo") || n.includes("siap")) return 0;
    if (n.includes("progress") || n.includes("kerja") || n.includes("jalan")) return 1;
    if (s.isDoneState || n.includes("done") || n.includes("selesai")) return 2;
    if (n.includes("overdue") || n.includes("lewat") || n.includes("terlambat")) return 3;
    return (s.orderIndex ?? (idx + 1)) - 1;
  };

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const finalDesc = description.trim() || title.trim();
      const formatIsoOrNull = (dStr?: string | null) => {
        if (!dStr || !dStr.trim()) return null;
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
      };
      const payload: any = {
        title: title.trim(),
        description: finalDesc,
        priority: Number(priority),
        status: Number(status),
        progress: Number(status) === 2 ? 100 : 0,
        milestone: milestone || null,
        projectId: projectId ? Number(projectId) : null,
        categoryId: categoryId ? Number(categoryId) : null,
        assignedToUserId: assignedToUserId || null,
        dueDate: formatIsoOrNull(dueDate),
        obstacle: obstacle.trim() || null,
        solution: solution.trim() || null,
      };

      const res = await apiClient.post("/tasks", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas baru berhasil dibuat!");
      onOpenChange(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["calendarTasks"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal membuat tugas baru");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectId("");
    setCategoryId("");
    setPriority(1);
    setStatus(defaultStatus);
    setMilestone("Pengembangan");
    setAssignedToUserId("");
    setDueDate("");
    setObstacle("");
    setSolution("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Judul tugas wajib diisi.");
      return;
    }
    createTaskMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Buat Tugas Baru
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Isi parameter pekerjaan untuk dialokasikan ke anggota tim atau proyek kerja.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Judul Tugas */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Judul Tugas <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                if (!description.trim() || description.trim() === title.trim()) {
                  setDescription(newTitle);
                }
                setTitle(newTitle);
              }}
              placeholder="Contoh: Implementasi modul autentikasi ganda JWT..."
              className="mt-1 text-sm font-semibold"
              required
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Deskripsi Tugas
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian instruksi kerja, batasan teknis, atau deliverable..."
              className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-3 text-xs text-gray-900 leading-relaxed dark:border-gray-800 dark:text-white"
            />
          </div>

          {/* Grid Proyek & Kategori */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Proyek */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
                Proyek Terkait
              </label>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onChange={(val) => setProjectId(val ? String(val) : "")}
                searchPlaceholder="Cari nama proyek..."
              />
            </div>

            {/* Kategori Tugas */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Tag className="h-3.5 w-3.5 text-emerald-500" />
                Kategori Pekerjaan
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="">-- Tanpa Kategori --</option>
                {masterCategories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid Prioritas, Status, Milestone */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Prioritas */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Flag className="h-3.5 w-3.5 text-amber-500" />
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {masterPriorities.length > 0
                  ? masterPriorities.map((p: any, idx: number) => (
                      <option key={p.id} value={resolvePriorityValue(p, idx)}>
                        {p.name}
                      </option>
                    ))
                  : DEFAULT_PRIORITIES.map((p) => (
                      <option key={p.id} value={p.value}>
                        {p.name}
                      </option>
                    ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Status Awal
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {masterStatuses.length > 0
                  ? masterStatuses.map((s: any, idx: number) => (
                      <option key={s.id} value={resolveStatusValue(s, idx)}>
                        {s.name}
                      </option>
                    ))
                  : DEFAULT_STATUSES.map((s) => (
                      <option key={s.id} value={s.value}>
                        {s.name}
                      </option>
                    ))}
              </select>
            </div>

            {/* Milestone SDLC */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <MilestoneIcon className="h-3.5 w-3.5 text-purple-500" />
                Milestone SDLC
              </label>
              <select
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {masterMilestones.length > 0
                  ? masterMilestones.map((m: any) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))
                  : DEFAULT_MILESTONES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Grid PIC & Due Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* PIC Penanggung Jawab */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                <User className="h-3.5 w-3.5 text-blue-500" />
                PIC Penanggung Jawab
              </label>
              <SearchableSelect
                options={memberOptions}
                value={assignedToUserId}
                onChange={(val) => setAssignedToUserId(val ? String(val) : "")}
                searchPlaceholder="Cari nama staf atau email..."
              />
            </div>

            {/* Tenggat Waktu (Due Date) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Calendar className="h-3.5 w-3.5 text-rose-500" />
                Tenggat Waktu (Due Date)
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Kendala & Solusi (Opsional) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" />
                Catatan Kendala (Obstacle - Opsional)
              </label>
              <Input
                value={obstacle}
                onChange={(e) => setObstacle(e.target.value)}
                placeholder="Hambatan yang diperkirakan..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Lightbulb className="h-3.5 w-3.5" />
                Solusi Teknis (Solution - Opsional)
              </label>
              <Input
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="Rencana resolusi teknis..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={createTaskMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createTaskMutation.isPending}
              className="gap-2 bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
            >
              {createTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Simpan Tugas
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

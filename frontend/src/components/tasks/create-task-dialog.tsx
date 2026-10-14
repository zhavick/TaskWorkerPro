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
import { toast } from "sonner";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: number;
}

const MILESTONE_OPTIONS = [
  "Requirement Analysis",
  "System Design",
  "Implementation",
  "Testing & QA",
  "Deployment",
  "Maintenance",
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
  const [priority, setPriority] = useState<number>(1); // 1 = Medium
  const [status, setStatus] = useState<number>(defaultStatus);
  const [milestone, setMilestone] = useState<string>("Implementation");
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

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        priority: Number(priority),
        status: Number(status),
        progress: Number(status) === 2 ? 100 : 0,
        milestone: milestone || null,
        projectId: projectId ? Number(projectId) : null,
        assignedToUserId: assignedToUserId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
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
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal membuat tugas baru");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProjectId("");
    setPriority(1);
    setStatus(defaultStatus);
    setMilestone("Implementation");
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
              onChange={(e) => setTitle(e.target.value)}
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

          {/* Grid Proyek, Prioritas, Status */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Proyek */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <FolderKanban className="h-3.5 w-3.5 text-indigo-500" />
                Proyek
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="">-- Tanpa Proyek --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

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
                <option value={0}>Rendah (Low)</option>
                <option value={1}>Sedang (Medium)</option>
                <option value={2}>Tinggi (High)</option>
                <option value={3}>Kritis (Critical)</option>
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
                <option value={0}>Todo</option>
                <option value={1}>InProgress</option>
                <option value={2}>Done</option>
                <option value={3}>Overdue</option>
              </select>
            </div>
          </div>

          {/* Grid Milestone, PIC, Due Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Milestone */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <MilestoneIcon className="h-3.5 w-3.5 text-indigo-500" />
                Milestone SDLC
              </label>
              <select
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {MILESTONE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* PIC Penanggung Jawab */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <User className="h-3.5 w-3.5 text-blue-500" />
                PIC (Assignee)
              </label>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="">-- Diri Sendiri / Belum Ditugaskan --</option>
                {members.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.userName} ({u.jobTitle || "Member"})
                  </option>
                ))}
              </select>
            </div>

            {/* Tenggat Waktu (Due Date) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Calendar className="h-3.5 w-3.5 text-rose-500" />
                Tenggat Waktu
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

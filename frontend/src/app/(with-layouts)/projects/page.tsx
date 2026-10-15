"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Briefcase,
  Plus,
  Pencil,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
  DollarSign,
  User,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { toast } from "sonner";

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedProjectForAssign, setSelectedProjectForAssign] = useState<any | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form New Project state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [color, setColor] = useState("#4680FF");
  const [budget, setBudget] = useState("50000000");
  const [actualCost, setActualCost] = useState("10000000");

  // Form Edit Project state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editColor, setEditColor] = useState("#4680FF");
  const [editStatus, setEditStatus] = useState("0");
  const [editBudget, setEditBudget] = useState("0");
  const [editActualCost, setEditActualCost] = useState("0");
  const [editDeadline, setEditDeadline] = useState("");

  const handleOpenEditModal = (p: any) => {
    setEditingProject(p);
    setEditName(p.name || "");
    setEditDescription(p.description || "");
    setEditClientName(p.clientName || "");
    setEditColor(p.color || "#4680FF");
    setEditStatus(String(p.status ?? 0));
    setEditBudget(String(p.budget ?? 0));
    setEditActualCost(String(p.actualCost ?? 0));
    setEditDeadline(p.deadline ? p.deadline.split("T")[0] : "");
    setEditModalOpen(true);
  };

  // 1. Projects Query
  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["projectsList", search],
    queryFn: async () => {
      const res = await apiClient.get(`/projects${search ? `?search=${search}` : ""}`);
      return res.data.data;
    },
  });

  // 2. Unassigned Tasks Query for Modal
  const { data: unassignedTasks = [] } = useQuery<any[]>({
    queryKey: ["unassignedTasks", selectedProjectForAssign?.id],
    queryFn: async () => {
      if (!selectedProjectForAssign) return [];
      const res = await apiClient.get(`/projects/${selectedProjectForAssign.id}/unassigned-tasks`);
      return res.data.data;
    },
    enabled: !!selectedProjectForAssign,
  });

  // 3. Create Project Mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/projects", {
        name: name.trim(),
        description: description.trim(),
        clientName: clientName.trim(),
        color,
        status: 0,
        budget: parseFloat(budget) || 0,
        actualCost: parseFloat(actualCost) || 0,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Proyek berhasil dibuat!");
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      setClientName("");
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat proyek"),
  });

  // 3b. Update Project Mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      if (!editingProject) return;
      const res = await apiClient.put(`/projects/${editingProject.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        clientName: editClientName.trim(),
        color: editColor,
        status: parseInt(editStatus, 10),
        budget: parseFloat(editBudget) || 0,
        actualCost: parseFloat(editActualCost) || 0,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Data proyek berhasil diperbarui!");
      setEditModalOpen(false);
      setEditingProject(null);
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui proyek"),
  });

  // 4. Bulk Assign Tasks Mutation
  const assignTasksMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/projects/${selectedProjectForAssign.id}/assign-tasks`, {
        taskIds: selectedTaskIds,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Tugas berhasil dialokasikan!");
      setSelectedProjectForAssign(null);
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengalokasikan tugas"),
  });

  const toggleSelectTask = (taskId: number) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Manajemen Proyek & Analitik Finansial
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Monitoring serapan anggaran (*Financial Burn Rate*), progres penyelesaian, dan alokasi tugas tim.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Proyek Baru
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nama proyek atau klien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const isOver = p.burnRateStatus === "Overbudget";
          const isWarning = p.burnRateStatus === "Warning";

          return (
            <div
              key={p.id}
              className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                {/* Title & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color || "#4680FF" }}
                    />
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-bold text-base text-gray-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 leading-tight"
                    >
                      {p.name}
                    </Link>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white ${
                      isOver ? "bg-red-600" : isWarning ? "bg-amber-600" : "bg-emerald-600"
                    }`}
                  >
                    {p.burnRateStatus} ({p.burnRatePercent}%)
                  </span>
                </div>

                {p.clientName && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Klien: <span className="font-medium text-gray-700 dark:text-gray-300">{p.clientName}</span>
                  </p>
                )}

                {p.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                    {p.description}
                  </p>
                )}

                {/* Financial Burn Rate Bar */}
                <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      Serapan Biaya:
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      Rp {Number(p.actualCost).toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full transition-all ${
                        isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, p.burnRatePercent)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Budget: Rp {Number(p.budget).toLocaleString("id-ID")}</span>
                    <span>{p.burnRatePercent}% terpakai</span>
                  </div>
                </div>

                {/* Task Progress Bar */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Progres Tugas:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {p.completedTasks}/{p.totalTasks} Selesai ({p.progressPercent}%)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 border-t border-gray-100 pt-4 flex flex-wrap items-center justify-between gap-2 dark:border-gray-800">
                <Link href={`/projects/${p.id}`}>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Buka Studio
                  </Button>
                </Link>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                    onClick={() => handleOpenEditModal(p)}
                    title="Edit Metadata Cepat"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                    onClick={() => {
                      setSelectedProjectForAssign(p);
                      setSelectedTaskIds([]);
                    }}
                    title="Alokasikan Tugas Cepat"
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">
            Tidak ada proyek yang sesuai dengan pencarian.
          </div>
        )}
      </div>

      {/* Modal Buat Proyek Baru */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Buat Proyek Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProjectMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Proyek *
              </label>
              <Input
                required
                placeholder="Core Platform 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Klien
              </label>
              <Input
                placeholder="PT Wahana Central"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <textarea
                rows={2}
                placeholder="Tujuan dan ruang lingkup proyek..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Anggaran Budget (Rp)
                </label>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Biaya Berjalan (Rp)
                </label>
                <Input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan Proyek
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Bulk Assign Tasks */}
      <Dialog
        open={!!selectedProjectForAssign}
        onOpenChange={(open) => !open && setSelectedProjectForAssign(null)}
      >
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Alokasikan Tugas ke Proyek: {selectedProjectForAssign?.name}
            </DialogTitle>
          </DialogHeader>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pilih tugas-tugas yang belum memiliki asosiasi proyek untuk dimasukkan ke dalam proyek ini:
          </p>

          <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
            {unassignedTasks.map((t) => (
              <label
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 hover:bg-gray-50 cursor-pointer dark:border-gray-800 dark:hover:bg-gray-800/40"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTaskIds.includes(t.id)}
                    onCheckedChange={() => toggleSelectTask(t.id)}
                  />
                  <div>
                    <h5 className="font-semibold text-xs text-gray-900 dark:text-white">
                      {t.title}
                    </h5>
                    <span className="text-[10px] text-gray-400">Progres: {t.progress}%</span>
                  </div>
                </div>
              </label>
            ))}

            {unassignedTasks.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">
                Semua tugas sudah teralokasi ke dalam proyek.
              </p>
            )}
          </div>

          <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-3 dark:border-gray-800">
            <span className="text-xs text-gray-500">
              {selectedTaskIds.length} tugas terpilih
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProjectForAssign(null)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={selectedTaskIds.length === 0 || assignTasksMutation.isPending}
                onClick={() => assignTasksMutation.mutate()}
              >
                Terapkan Alokasi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Proyek */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-indigo-600" />
              Edit Data Proyek
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Proyek *
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="cth. Core Banking Revamp"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Klien / Stakeholder
              </label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="cth. Bank Mandiri Syariah"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Deskripsi singkat ruang lingkup proyek..."
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:text-white"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Status Proyek
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="0">0 - Aktif</option>
                  <option value="1">1 - Selesai (Completed)</option>
                  <option value="2">2 - Diarsipkan (Archived)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Warna Label
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-8 w-12 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-xs text-gray-500">{editColor}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Budget (Rp)
                </label>
                <Input
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Actual Cost (Rp)
                </label>
                <Input
                  type="number"
                  value={editActualCost}
                  onChange={(e) => setEditActualCost(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Target Deadline
              </label>
              <Input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditModalOpen(false);
                setEditingProject(null);
              }}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={!editName.trim() || updateProjectMutation.isPending}
              onClick={() => updateProjectMutation.mutate()}
            >
              Simpan Perubahan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

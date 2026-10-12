"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Bell,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New announcement form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("Informasi Penting");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );

  // Query Announcements
  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["announcementsAdminList"],
    queryFn: async () => {
      const res = await apiClient.get("/announcements");
      return res.data.data;
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/announcements", {
        title: title.trim(),
        content: content.trim(),
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isActive: true,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengumuman resmi berhasil diterbitkan!");
      setCreateModalOpen(false);
      setTitle("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["announcementsAdminList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menerbitkan pengumuman"),
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.patch(`/announcements/${id}/toggle-active`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["announcementsAdminList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah status"),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/announcements/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengumuman berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["announcementsAdminList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus"),
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Pengumuman Resmi & Broadcast Manajemen
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Penyiaran informasi penting, periode tayang, dan kepatuhan aturan anti-overlap modal.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Terbitkan Pengumuman
        </Button>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {announcements.map((a) => {
          const isEmergency = a.type === "Informasi Penting";
          return (
            <div
              key={a.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition hover:shadow-md dark:bg-gray-900 ${
                isEmergency
                  ? "border-red-200/80 bg-red-50/20 dark:border-red-900/60"
                  : "border-gray-200/80 bg-white dark:border-gray-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      isEmergency
                        ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                    }`}
                  >
                    {a.type}
                  </span>

                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      a.isActive
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                    }`}
                  >
                    {a.isActive ? "Aktif Tayang" : "Non-Aktif"}
                  </span>
                </div>

                <h3 className="mt-3 font-bold text-base text-gray-900 dark:text-white leading-snug">
                  {a.title}
                </h3>

                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {a.content}
                </p>

                <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(a.startDate).toLocaleDateString("id-ID")} -{" "}
                    {new Date(a.endDate).toLocaleDateString("id-ID")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    Dibaca: {a.readCount} kali
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between dark:border-gray-800">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => toggleActiveMutation.mutate(a.id)}
                >
                  {a.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => {
                    if (confirm("Hapus pengumuman ini?")) deleteMutation.mutate(a.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {announcements.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">
            Belum ada pengumuman yang diterbitkan.
          </div>
        )}
      </div>

      {/* Modal Buat Pengumuman */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Terbitkan Pengumuman Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Judul Pengumuman *
              </label>
              <Input
                required
                placeholder="Contoh: Pemeliharaan Server Database Malam Ini"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Jenis Pengumuman
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              >
                <option value="Informasi Penting">🚨 Informasi Penting (Merah)</option>
                <option value="Pengumuman Umum">📢 Pengumuman Umum (Indigo)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Mulai Tayang
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Selesai Tayang
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Isi Pengumuman
              </label>
              <textarea
                rows={4}
                required
                placeholder="Rincian informasi yang akan disiarkan kepada seluruh staf..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Terbitkan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

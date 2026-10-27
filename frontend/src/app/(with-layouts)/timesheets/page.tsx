"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Clock,
  Download,
  Plus,
  Play,
  Calendar,
  Layers,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { SearchableTaskPicker } from "@/components/common/searchable-task-picker";
import { CompanyTimesheetExportModal } from "@/components/timesheets/company-timesheet-export-modal";
import { toast } from "sonner";

export default function TimesheetsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [startTimerModalOpen, setStartTimerModalOpen] = useState(false);
  const [companyExportModalOpen, setCompanyExportModalOpen] = useState(false);

  // Start Timer state
  const [timerTaskId, setTimerTaskId] = useState<number | undefined>(undefined);
  const [timerNotes, setTimerNotes] = useState("");

  // Manual Session Form state
  const [taskId, setTaskId] = useState<number | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  // Query Sessions
  const { data: timesheetData, isLoading } = useQuery<any>({
    queryKey: ["timesheetSessions", page],
    queryFn: async () => {
      const res = await apiClient.get(`/timesheets/sessions?page=${page}&pageSize=15`);
      return res.data;
    },
  });

  // Start Live Timer Mutation
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      if (!timerTaskId) throw new Error("Silakan cari dan pilih tugas terlebih dahulu.");
      const res = await apiClient.post("/timesheets/start", {
        taskId: timerTaskId,
        notes: timerNotes?.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Live timer berhasil dimulai!");
      setStartTimerModalOpen(false);
      setTimerTaskId(undefined);
      setTimerNotes("");
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSessions"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memulai timer"),
  });

  // Query Tasks for selection
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["tasksForTimesheet"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks");
      return res.data.data;
    },
  });

  // Manual Session Mutation
  const createManualMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error("Silakan pilih tugas terlebih dahulu.");
      if (!startTime || !endTime) throw new Error("Waktu mulai dan selesai wajib diisi.");
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Format tanggal waktu mulai atau selesai tidak valid.");
      }
      if (end <= start) {
        throw new Error("Waktu selesai harus lebih besar dari waktu mulai.");
      }
      const res = await apiClient.post("/timesheets/manual", {
        taskId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: notes?.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Sesi jam kerja manual berhasil disimpan!");
      setManualModalOpen(false);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["timesheetSessions"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mencatat jam kerja"),
  });

  // Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiClient.delete(`/timesheets/sessions/${sessionId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Sesi jam kerja berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["timesheetSessions"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus sesi"),
  });

  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      toast.loading("Menyiapkan file spreadsheet laporan resmi...", { id: "exportExcel" });
      const response = await apiClient.get("/timesheets/export/excel", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Timesheet_TrackerKerja_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("File Excel berhasil diunduh!", { id: "exportExcel" });
    } catch {
      toast.error("Gagal mengunduh laporan excel", { id: "exportExcel" });
    }
  };

  const summary = timesheetData?.summary;
  const sessions = timesheetData?.data || [];

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Log Timesheet & Rekap Jam Kerja
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Riwayat pengerjaan tugas harian, estimasi Man-Days (MD), dan ekspor spreadsheet resmi ClosedXML.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Ekspor Excel Resmi (.xlsx)
          </Button>

          <Button
            onClick={() => setCompanyExportModalOpen(true)}
            variant="outline"
            className="gap-2 border-indigo-600/30 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Ekspor Standar Perusahaan (ELISTEC)
          </Button>

          <Button
            onClick={() => setStartTimerModalOpen(true)}
            className="gap-2 bg-emerald-600 font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
          >
            <Play className="h-4 w-4 fill-current" />
            Mulai Timer
          </Button>

          <Button
            onClick={() => setManualModalOpen(true)}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Catat Jam Manual
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Hari Ini</span>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {summary ? Math.round((summary.todaySeconds / 3600) * 10) / 10 : 0}{" "}
            <span className="text-sm font-medium text-gray-400">Jam</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Minggu Ini</span>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summary ? Math.round((summary.thisWeekSeconds / 3600) * 10) / 10 : 0}{" "}
            <span className="text-sm font-medium text-gray-400">Jam</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Jam Bulan Ini</span>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {summary ? Math.round((summary.thisMonthSeconds / 3600) * 10) / 10 : 0}{" "}
            <span className="text-sm font-medium text-gray-400">Jam</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Konversi Man-Days</span>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary ? summary.totalManDays : 0}{" "}
            <span className="text-sm font-medium text-gray-400">MD (8h/hari)</span>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Waktu</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Personel</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Tugas</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Proyek</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Durasi (Jam)</th>
                <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Catatan</th>
                <th className="px-5 py-3.5 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sessions.map((s: any) => (
                <tr key={s.sessionId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="px-5 py-3.5 font-mono text-gray-500">
                    {new Date(s.startTime).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    {new Date(s.startTime).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">
                    {s.userName}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                    {s.taskTitle}
                  </td>
                  <td className="px-5 py-3.5">
                    {s.projectName ? (
                      <span
                        className="rounded px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: s.projectColor || "#4680FF" }}
                      >
                        {s.projectName}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {s.durationHours} Jam
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">
                    {s.notes || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={() => {
                        if (confirm("Hapus sesi jam kerja ini?")) {
                          deleteSessionMutation.mutate(s.sessionId);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}

              {sessions.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Belum ada sesi timesheet tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Jam Manual */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Catat Jam Kerja Manual
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createManualMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Pilih Tugas *
              </label>
              <SearchableTaskPicker
                value={taskId ?? null}
                onChange={(id) => setTaskId(id ?? undefined)}
                required
                placeholder="Ketik untuk mencari tugas (judul atau kode TK-xxxx)..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Waktu Mulai *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Waktu Selesai *
                </label>
                <Input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Pekerjaan
              </label>
              <textarea
                rows={2}
                placeholder="Rincian aktivitas yang diselesaikan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setManualModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!taskId || !startTime || !endTime || createManualMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan Jam Kerja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal Mulai Timer Langsung */}
      <Dialog open={startTimerModalOpen} onOpenChange={setStartTimerModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400 fill-current" />
              Mulai Timer Tugas Langsung
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTimerMutation.mutate();
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Pilih Tugas yang Dikerjakan *
              </label>
              <SearchableTaskPicker
                value={timerTaskId ?? null}
                onChange={(id) => setTimerTaskId(id ?? undefined)}
                required
                placeholder="Ketik untuk mencari tugas (judul atau kode TK-xxxx)..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Aktivitas (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Fokus pengerjaan sesi ini..."
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStartTimerModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!timerTaskId || startTimerMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Mulai Timer Sekarang
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ekspor Standar Perusahaan ELISTEC */}
      <CompanyTimesheetExportModal
        open={companyExportModalOpen}
        onOpenChange={setCompanyExportModalOpen}
      />
    </div>
  );
}

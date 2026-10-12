"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Home,
  MapPin,
  Globe,
  Edit2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

const locationLabels: Record<number, string> = {
  1: "WFO (Kantor)",
  2: "WFH (Rumah)",
  3: "Dinas Lapangan",
  4: "Remote",
};

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"personal" | "reconciliation">("personal");
  const [workLocation, setWorkLocation] = useState(1);
  const [notes, setNotes] = useState("");

  // Reconcile modal state
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [reconcileType, setReconcileType] = useState(1);
  const [reconcileLoc, setReconcileLoc] = useState(1);
  const [reconcileClockIn, setReconcileClockIn] = useState("");
  const [reconcileClockOut, setReconcileClockOut] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  // 1. Status Today
  const { data: todayStatus } = useQuery<any>({
    queryKey: ["attendanceTodayStatus"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/today");
      return res.data.data;
    },
  });

  // 2. Personal History
  const { data: myHistory = [] } = useQuery<any[]>({
    queryKey: ["attendanceMyHistory"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/my-history");
      return res.data.data;
    },
  });

  // 3. Team Reconciliation (Admin)
  const { data: reconciliation = [] } = useQuery<any[]>({
    queryKey: ["attendanceReconciliation"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/reconciliation");
      return res.data.data;
    },
  });

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-in", {
        workLocation,
        notes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Clock In berhasil!");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal clock in"),
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-out", { notes });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Clock Out berhasil! Total jam kerja: ${data.totalHours} Jam.`);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal clock out"),
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/attendances/reconciliation/${selectedRecord.id}`, {
        id: selectedRecord.id,
        type: reconcileType,
        workLocation: reconcileLoc,
        clockIn: reconcileClockIn ? new Date(reconcileClockIn).toISOString() : null,
        clockOut: reconcileClockOut ? new Date(reconcileClockOut).toISOString() : null,
        notes: reconcileNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Presensi berhasil direkonsiliasi!");
      setReconcileModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["attendanceReconciliation"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal rekonsiliasi"),
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Presensi Terpadu & Rekonsiliasi Tim
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pencatatan 1-click Clock In / Out, lokasi kerja (WFO/WFH/Dinas/Remote), dan audit absensi tim.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("personal")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "personal"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            Presensi Mandiri
          </button>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "reconciliation"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            Rekonsiliasi Tim (Admin)
          </button>
        </div>
      </div>

      {activeTab === "personal" ? (
        <div className="space-y-6">
          {/* Quick Clock In/Out Hero Card */}
          <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-6 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:to-purple-950/20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Status Presensi Hari Ini
                </span>
                <h3 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">
                  {todayStatus?.hasClockedOut
                    ? `Presensi Selesai (${todayStatus.totalHours} Jam)`
                    : todayStatus?.hasClockedIn
                    ? "Sedang Bekerja (Clock In Aktif)"
                    : "Belum Melakukan Presensi"}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {todayStatus?.clockInTime &&
                    `Masuk: ${new Date(todayStatus.clockInTime).toLocaleTimeString("id-ID")} | Lokasi: ${
                      locationLabels[todayStatus.workLocation]
                    }`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {!todayStatus?.hasClockedIn ? (
                  <>
                    <select
                      value={workLocation}
                      onChange={(e) => setWorkLocation(Number(e.target.value))}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    >
                      <option value={1}>🏢 WFO (Kantor)</option>
                      <option value={2}>🏠 WFH (Rumah)</option>
                      <option value={3}>🚗 Dinas Lapangan</option>
                      <option value={4}>🌐 Remote</option>
                    </select>

                    <Button
                      onClick={() => clockInMutation.mutate()}
                      disabled={clockInMutation.isPending}
                      className="gap-2 bg-emerald-600 font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Clock In (Masuk)
                    </Button>
                  </>
                ) : !todayStatus?.hasClockedOut ? (
                  <Button
                    onClick={() => clockOutMutation.mutate()}
                    disabled={clockOutMutation.isPending}
                    className="gap-2 bg-amber-600 font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-700"
                  >
                    <Clock className="h-4 w-4" />
                    Clock Out (Pulang)
                  </Button>
                ) : (
                  <div className="rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Selesai Bekerja Hari Ini
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal History Table */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
              Riwayat Kehadiran Bulan Ini
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Tanggal</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Lokasi</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Masuk</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Pulang</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Total Jam</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {myHistory.map((h: any) => (
                    <tr key={h.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {h.date}
                      </td>
                      <td className="px-4 py-3">{locationLabels[h.workLocation]}</td>
                      <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                        {h.clockIn ? new Date(h.clockIn).toLocaleTimeString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">
                        {h.clockOut ? new Date(h.clockOut).toLocaleTimeString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                        {h.totalHours} Jam
                      </td>
                      <td className="px-4 py-3 text-gray-500">{h.notes || "-"}</td>
                    </tr>
                  ))}

                  {myHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Belum ada riwayat kehadiran bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Team Reconciliation Tab (Admin Only) */
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
              Tabel Rekonsiliasi Presensi Seluruh Anggota Tim
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Anggota</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Tanggal</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Lokasi</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Masuk</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Pulang</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Total Jam</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reconciliation.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {r.userName}
                    </td>
                    <td className="px-4 py-3 font-mono">{r.date}</td>
                    <td className="px-4 py-3">{locationLabels[r.workLocation]}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {r.clockIn ? new Date(r.clockIn).toLocaleTimeString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">
                      {r.clockOut ? new Date(r.clockOut).toLocaleTimeString("id-ID") : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                      {r.totalHours} Jam
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => {
                          setSelectedRecord(r);
                          setReconcileType(r.type);
                          setReconcileLoc(r.workLocation);
                          setReconcileNotes(r.notes || "");
                          setReconcileModalOpen(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                        Koreksi
                      </Button>
                    </td>
                  </tr>
                ))}

                {reconciliation.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Belum ada data rekonsiliasi untuk hari ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Koreksi Rekonsiliasi */}
      <Dialog open={reconcileModalOpen} onOpenChange={setReconcileModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Koreksi Presensi: {selectedRecord?.userName}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              reconcileMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Lokasi Kerja
              </label>
              <select
                value={reconcileLoc}
                onChange={(e) => setReconcileLoc(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              >
                <option value={1}>WFO (Kantor)</option>
                <option value={2}>WFH (Rumah)</option>
                <option value={3}>Dinas Lapangan</option>
                <option value={4}>Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Alasan Koreksi
              </label>
              <Input
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="Contoh: Koreksi lupa clock in karena gangguan jaringan..."
                className="mt-1 text-xs"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReconcileModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={reconcileMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan Koreksi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
